// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Supabase Edge Function : create-payment-intent
//
// Deploy :  supabase functions deploy create-payment-intent
// Secrets:  supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//           supabase secrets set PLATFORM_FEE_PERCENT=10   (optional)
//
// Creates a PaymentIntent for the in-app Stripe Payment Sheet. Same security
// model as create-checkout-session: the client sends only a shipmentId, the
// caller must be the shipment's sender, and the amount comes from the
// shipment row — a tampered client can never choose its own price. The
// platform commission / transporter split is applied at charge time, and the
// booking is confirmed by the stripe-webhook function, not by the client.
// ──────────────────────────────────────────────────────────────────────────
import { servePost, readJsonBody, json } from '../_shared/http.ts';
import { getPlatformFeePercent } from '../_shared/env.ts';
import { PaymentError } from '../_shared/errors.ts';
import { stripeRequest, StripeParams } from '../_shared/stripe.ts';
import { toCents, computeSplit, normalizeCurrency } from '../_shared/split.ts';
import {
  createAdminClient,
  getAuthenticatedUser,
  loadPayableShipment,
  recordPaymentAttempt,
} from '../_shared/db.ts';

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

  const params: StripeParams = {
    amount: split.totalCents,
    currency,
    automatic_payment_methods: { enabled: true },
    metadata: {
      shipment_id: shipment.id,
      sender_id: shipment.senderId,
      transporter_id: shipment.transporterId,
    },
    // Financial split (see create-checkout-session for the fallback rule).
    ...(shipment.transporterStripeAccountId
      ? {
          application_fee_amount: split.platformFeeCents,
          transfer_data: { destination: shipment.transporterStripeAccountId },
        }
      : {}),
  };

  const intent = await stripeRequest<{ id: string; client_secret: string; status: string }>(
    'POST',
    '/payment_intents',
    params,
    { idempotencyKey: crypto.randomUUID() }
  );

  await recordPaymentAttempt(admin, {
    shipment,
    split,
    currency,
    paymentIntentId: intent.id,
  });

  return json({
    id: intent.id,
    clientSecret: intent.client_secret,
    amount: shipment.price,
    currency,
    status: intent.status,
  });
});
