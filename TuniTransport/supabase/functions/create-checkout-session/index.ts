// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Supabase Edge Function : create-checkout-session
//
// Deploy :  supabase functions deploy create-checkout-session
// Secrets:  supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//           supabase secrets set PLATFORM_FEE_PERCENT=10          (optional)
//           supabase secrets set CHECKOUT_SUCCESS_URL=...         (optional)
//           supabase secrets set CHECKOUT_CANCEL_URL=...          (optional)
//
// Creates a hosted Stripe Checkout Session for a shipment. The client sends
// only a shipmentId — the caller is authenticated from the JWT, must be the
// shipment's sender, and the amount is derived from the shipment row. The
// transaction is split at charge time: the platform commission is kept as
// an application fee and the remainder is routed to the transporter's
// Stripe Connect account when they are onboarded. Actual booking
// confirmation happens exclusively in the stripe-webhook function.
// ──────────────────────────────────────────────────────────────────────────
import { servePost, readJsonBody, json } from '../_shared/http.ts';
import { optionalEnv, getPlatformFeePercent } from '../_shared/env.ts';
import { PaymentError } from '../_shared/errors.ts';
import { stripeRequest, StripeParams } from '../_shared/stripe.ts';
import { toCents, computeSplit, normalizeCurrency } from '../_shared/split.ts';
import {
  createAdminClient,
  getAuthenticatedUser,
  loadPayableShipment,
  recordPaymentAttempt,
} from '../_shared/db.ts';

interface CheckoutSessionResponse {
  id: string;
  url: string;
  amount: number;
  currency: string;
  platformFee: number;
  transporterAmount: number;
}

// Stripe rejects malformed redirect URLs ("Not a valid URL"). Secrets pasted
// from a phone often carry a trailing newline/space or drop the scheme, so
// sanitize: trim whitespace, fall back when empty, and assume https:// when a
// bare domain (no scheme) slipped in.
function sanitizeCheckoutUrl(raw: string, fallback: string): string {
  const v = (raw ?? '').trim();
  if (!v) return fallback;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return v;
  return `https://${v}`;
}

const DEFAULT_CHECKOUT_URL = 'https://thl-colis-app-complete.vercel.app';

servePost(async (req) => {
  const admin = createAdminClient();
  const user = await getAuthenticatedUser(admin, req);

  const body = await readJsonBody<{ shipmentId?: string; currency?: string }>(req);
  if (!body.shipmentId || typeof body.shipmentId !== 'string') {
    throw new PaymentError('invalid_request', 'shipmentId requis.', 400);
  }
  const currency = normalizeCurrency(body.currency);

  const shipment = await loadPayableShipment(admin, body.shipmentId, user.id);
  const split = computeSplit(toCents(shipment.price), getPlatformFeePercent());

  const shortId = shipment.id.slice(-4).toUpperCase();
  const successUrl = sanitizeCheckoutUrl(
    optionalEnv('CHECKOUT_SUCCESS_URL', DEFAULT_CHECKOUT_URL),
    DEFAULT_CHECKOUT_URL
  ).replace('{SHIPMENT_ID}', shipment.id);
  const cancelUrl = sanitizeCheckoutUrl(
    optionalEnv('CHECKOUT_CANCEL_URL', DEFAULT_CHECKOUT_URL),
    DEFAULT_CHECKOUT_URL
  ).replace('{SHIPMENT_ID}', shipment.id);

  const metadata = {
    shipment_id: shipment.id,
    sender_id: shipment.senderId,
    transporter_id: shipment.transporterId,
  };

  const params: StripeParams = {
    mode: 'payment',
    client_reference_id: shipment.id,
    customer_email: user.email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: split.totalCents,
          product_data: { name: `THL — Envoi #${shortId}` },
        },
      },
    ],
    metadata,
    payment_intent_data: {
      metadata,
      // Financial split: our commission stays on the platform account, the
      // rest is transferred to the transporter's connected account. Without
      // a connected account the full amount lands on the platform and the
      // payout is settled later from the payments ledger.
      ...(shipment.transporterStripeAccountId
        ? {
            application_fee_amount: split.platformFeeCents,
            transfer_data: { destination: shipment.transporterStripeAccountId },
          }
        : {}),
    },
  };

  const session = await stripeRequest<{ id: string; url: string }>(
    'POST',
    '/checkout/sessions',
    params,
    { idempotencyKey: crypto.randomUUID() }
  );

  await recordPaymentAttempt(admin, {
    shipment,
    split,
    currency,
    checkoutSessionId: session.id,
  });

  const response: CheckoutSessionResponse = {
    id: session.id,
    url: session.url,
    amount: shipment.price,
    currency,
    platformFee: split.platformFeeCents / 100,
    transporterAmount: split.transporterCents / 100,
  };
  return json(response);
});
