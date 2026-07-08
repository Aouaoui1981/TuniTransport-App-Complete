// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Supabase Edge Function : stripe-webhook
//
// Deploy :  supabase functions deploy stripe-webhook --no-verify-jwt
//           (Stripe cannot send a Supabase JWT — auth is the signature.)
// Secrets:  supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//
// Single source of truth for payment outcomes. Stripe calls this endpoint;
// we verify the HMAC signature, deduplicate deliveries via the
// webhook_events table, and translate events into ledger + booking updates:
//
//   payment succeeded  → payments.status = 'succeeded', shipment.paid_at
//                        stamped once, tracking event appended — the
//                        reservation is confirmed automatically.
//   payment failed     → payments.status = 'failed' with Stripe's error
//                        code/message kept for support and retry UX.
//   session expired    → payments.status = 'canceled'.
//   charge refunded    → payments.status = 'refunded'.
//
// On a processing error the idempotency claim is released and a 500 is
// returned so Stripe retries the delivery.
// ──────────────────────────────────────────────────────────────────────────
import { json, errorResponse } from '../_shared/http.ts';
import { requireEnv } from '../_shared/env.ts';
import { verifyStripeSignature } from '../_shared/webhook.ts';
import {
  createAdminClient,
  claimWebhookEvent,
  releaseWebhookEvent,
  markPaymentStatus,
  attachPaymentIntent,
  confirmShipmentPaid,
} from '../_shared/db.ts';

// Minimal shapes for the event payloads we consume.
interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}
interface PaymentIntentObject {
  id: string;
  last_payment_error?: { code?: string; message?: string } | null;
}
interface CheckoutSessionObject {
  id: string;
  payment_intent?: string | null;
  payment_status?: string;
}
interface ChargeObject {
  payment_intent?: string | null;
  refunded?: boolean;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return json({ error: 'Méthode non autorisée.' }, 405);
  }

  let event: StripeEvent;
  try {
    // The signature covers the raw bytes — read the body before parsing.
    const rawBody = await req.text();
    await verifyStripeSignature(
      rawBody,
      req.headers.get('Stripe-Signature'),
      requireEnv('STRIPE_WEBHOOK_SECRET')
    );
    event = JSON.parse(rawBody) as StripeEvent;
  } catch (err) {
    return errorResponse(err);
  }

  const admin = createAdminClient();

  // Deduplicate: Stripe retries aggressively and may deliver an event twice.
  const isFirstDelivery = await claimWebhookEvent(admin, event.id, event.type).catch(
    (err) => {
      console.error('[webhook] claim error:', err);
      return null;
    }
  );
  if (isFirstDelivery === null) return errorResponse(new Error('Erreur interne.'));
  if (!isFirstDelivery) return json({ received: true, duplicate: true });

  try {
    await handleEvent(admin, event);
    return json({ received: true });
  } catch (err) {
    // Undo the claim so Stripe's retry is not swallowed as a "duplicate".
    console.error(`[webhook] processing failed for ${event.type} (${event.id}):`, err);
    await releaseWebhookEvent(admin, event.id).catch(() => {});
    return errorResponse(err);
  }
});

async function handleEvent(
  admin: ReturnType<typeof createAdminClient>,
  event: StripeEvent
): Promise<void> {
  switch (event.type) {
    // ── success paths ────────────────────────────────────────────────────
    case 'payment_intent.succeeded': {
      const intent = event.data.object as unknown as PaymentIntentObject;
      await settleSuccess(admin, { paymentIntentId: intent.id });
      break;
    }
    case 'payment_intent.processing': {
      const intent = event.data.object as unknown as PaymentIntentObject;
      await markPaymentStatus(admin, { paymentIntentId: intent.id }, 'processing');
      break;
    }
    case 'checkout.session.completed': {
      const session = event.data.object as unknown as CheckoutSessionObject;
      if (session.payment_intent) {
        await attachPaymentIntent(admin, session.id, session.payment_intent);
      }
      if (session.payment_status === 'paid') {
        await settleSuccess(admin, { checkoutSessionId: session.id });
      } else {
        // Delayed payment method (e.g. bank transfer): confirmed later by
        // checkout.session.async_payment_succeeded.
        await markPaymentStatus(admin, { checkoutSessionId: session.id }, 'processing');
      }
      break;
    }
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as unknown as CheckoutSessionObject;
      await settleSuccess(admin, { checkoutSessionId: session.id });
      break;
    }

    // ── failure paths ────────────────────────────────────────────────────
    case 'payment_intent.payment_failed': {
      const intent = event.data.object as unknown as PaymentIntentObject;
      await markPaymentStatus(admin, { paymentIntentId: intent.id }, 'failed', {
        errorCode: intent.last_payment_error?.code ?? 'payment_failed',
        errorMessage: intent.last_payment_error?.message ?? 'Le paiement a été refusé.',
      });
      break;
    }
    case 'checkout.session.async_payment_failed': {
      const session = event.data.object as unknown as CheckoutSessionObject;
      await markPaymentStatus(admin, { checkoutSessionId: session.id }, 'failed', {
        errorCode: 'async_payment_failed',
        errorMessage: 'Le paiement différé a échoué.',
      });
      break;
    }
    case 'checkout.session.expired': {
      const session = event.data.object as unknown as CheckoutSessionObject;
      await markPaymentStatus(admin, { checkoutSessionId: session.id }, 'canceled', {
        errorCode: 'session_expired',
        errorMessage: 'La session de paiement a expiré.',
      });
      break;
    }

    // ── refunds ──────────────────────────────────────────────────────────
    case 'charge.refunded': {
      const charge = event.data.object as unknown as ChargeObject;
      if (charge.refunded && charge.payment_intent) {
        await markPaymentStatus(admin, { paymentIntentId: charge.payment_intent }, 'refunded', {
          errorCode: 'refunded',
          errorMessage: 'Paiement remboursé.',
        });
      }
      break;
    }

    default:
      // Not ours to handle — acknowledge so Stripe stops retrying.
      console.warn(`[webhook] unhandled event type: ${event.type}`);
      break;
  }
}

/** Mark the ledger row succeeded and confirm the booking exactly once. */
async function settleSuccess(
  admin: ReturnType<typeof createAdminClient>,
  lookup: { paymentIntentId: string } | { checkoutSessionId: string }
): Promise<void> {
  const payment = await markPaymentStatus(admin, lookup, 'succeeded');
  if (!payment) {
    // Event about an object we never created (other env, other product) —
    // nothing to confirm, and not worth a retry storm.
    console.warn('[webhook] success event for unknown payment:', lookup);
    return;
  }
  await confirmShipmentPaid(admin, payment.shipmentId, payment.amountCents, payment.currency);
}
