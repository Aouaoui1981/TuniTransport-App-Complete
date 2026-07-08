// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — shared: data access for the payment gateway
//
// Everything here runs with the service-role key (bypassing RLS), so this
// module is the single place that enforces the business rules: who may pay,
// what may be paid, and how a confirmed payment is recorded. The client is
// never trusted with amounts or state transitions.
// ──────────────────────────────────────────────────────────────────────────
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { PaymentError } from './errors.ts';
import { requireEnv } from './env.ts';
import type { PaymentSplit } from './split.ts';

export function createAdminClient(): SupabaseClient {
  // SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}

/** Resolve the calling user from the request's JWT, or 401. */
export async function getAuthenticatedUser(
  admin: SupabaseClient,
  req: Request
): Promise<{ id: string; email?: string }> {
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    throw new PaymentError('unauthorized', 'Non autorisé.', 401);
  }
  return { id: data.user.id, email: data.user.email ?? undefined };
}

export interface PayableShipment {
  id: string;
  senderId: string;
  transporterId: string;
  transporterName: string;
  /** Decimal price as stored on the shipment row. */
  price: number;
  /** Stripe Connect account of the transporter, when onboarded. */
  transporterStripeAccountId: string | null;
}

/**
 * Load a shipment and assert it is payable by this caller: the caller is the
 * sender, a bid has been accepted (so a transporter and a price exist), and
 * it has not already been paid. The price returned here — never a
 * client-supplied amount — is what gets charged.
 */
export async function loadPayableShipment(
  admin: SupabaseClient,
  shipmentId: string,
  callerId: string
): Promise<PayableShipment> {
  const { data: shipment, error } = await admin
    .from('shipments')
    .select('id, sender_id, transporter_id, transporter_name, price, status, paid_at')
    .eq('id', shipmentId)
    .single();
  if (error || !shipment) {
    throw new PaymentError('not_found', 'Envoi introuvable.', 404);
  }
  if (shipment.sender_id !== callerId) {
    throw new PaymentError('forbidden', "Seul l'expéditeur peut payer cet envoi.", 403);
  }
  if (shipment.paid_at) {
    throw new PaymentError('conflict', 'Cet envoi a déjà été payé.', 409);
  }
  if (shipment.status !== 'accepted') {
    throw new PaymentError('invalid_request', "Cet envoi n'est pas prêt pour le paiement.", 400);
  }
  if (!shipment.transporter_id) {
    throw new PaymentError('invalid_request', 'Aucun transporteur assigné à cet envoi.', 400);
  }
  const price = Number(shipment.price);
  if (!price || price <= 0) {
    throw new PaymentError('invalid_request', 'Montant invalide pour cet envoi.', 400);
  }

  const { data: transporter } = await admin
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', shipment.transporter_id)
    .single();

  return {
    id: shipment.id,
    senderId: shipment.sender_id,
    transporterId: shipment.transporter_id,
    transporterName: shipment.transporter_name ?? '',
    price,
    transporterStripeAccountId: transporter?.stripe_account_id ?? null,
  };
}

// ── payments ledger ───────────────────────────────────────────────────────

export interface NewPaymentRow {
  shipment: PayableShipment;
  split: PaymentSplit;
  currency: string;
  paymentIntentId?: string;
  checkoutSessionId?: string;
}

/**
 * Record a freshly created payment attempt. Any previous attempt still
 * sitting in 'pending'/'processing' for this shipment is superseded (marked
 * canceled) so the ledger keeps exactly one live attempt per shipment; the
 * partial unique index on succeeded payments guarantees at most one success.
 */
export async function recordPaymentAttempt(
  admin: SupabaseClient,
  row: NewPaymentRow
): Promise<string> {
  const { error: supersedeError } = await admin
    .from('payments')
    .update({ status: 'canceled', error_code: 'superseded', error_message: 'Remplacé par une nouvelle tentative.' })
    .eq('shipment_id', row.shipment.id)
    .in('status', ['pending', 'processing']);
  if (supersedeError) {
    throw new PaymentError('internal', 'Impossible de préparer le paiement.', 500);
  }

  const { data, error } = await admin
    .from('payments')
    .insert({
      shipment_id: row.shipment.id,
      sender_id: row.shipment.senderId,
      transporter_id: row.shipment.transporterId,
      provider: 'stripe',
      payment_intent_id: row.paymentIntentId ?? null,
      checkout_session_id: row.checkoutSessionId ?? null,
      amount_cents: row.split.totalCents,
      currency: row.currency,
      platform_fee_cents: row.split.platformFeeCents,
      transporter_amount_cents: row.split.transporterCents,
      destination_account_id: row.shipment.transporterStripeAccountId,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[payments] insert failed:', error);
    throw new PaymentError('internal', "Impossible d'enregistrer le paiement.", 500);
  }
  return data.id;
}

type PaymentLookup = { paymentIntentId: string } | { checkoutSessionId: string };

function paymentFilter(admin: SupabaseClient, lookup: PaymentLookup) {
  const query = admin.from('payments');
  return 'paymentIntentId' in lookup
    ? { query, column: 'payment_intent_id', value: lookup.paymentIntentId }
    : { query, column: 'checkout_session_id', value: lookup.checkoutSessionId };
}

/** Attach the PaymentIntent id once Stripe reveals it (Checkout flow). */
export async function attachPaymentIntent(
  admin: SupabaseClient,
  checkoutSessionId: string,
  paymentIntentId: string
): Promise<void> {
  await admin
    .from('payments')
    .update({ payment_intent_id: paymentIntentId })
    .eq('checkout_session_id', checkoutSessionId)
    .is('payment_intent_id', null);
}

export async function markPaymentStatus(
  admin: SupabaseClient,
  lookup: PaymentLookup,
  status: 'processing' | 'succeeded' | 'failed' | 'refunded' | 'canceled',
  details: { errorCode?: string; errorMessage?: string } = {}
): Promise<{ shipmentId: string; amountCents: number; currency: string } | null> {
  const { query, column, value } = paymentFilter(admin, lookup);
  const patch: Record<string, unknown> = {
    status,
    error_code: details.errorCode ?? null,
    error_message: details.errorMessage ?? null,
  };
  if (status === 'succeeded') patch.paid_at = new Date().toISOString();

  const { data, error } = await query
    .update(patch)
    .eq(column, value)
    .select('shipment_id, amount_cents, currency')
    .maybeSingle();
  if (error) {
    console.error(`[payments] status update (${status}) failed:`, error);
    throw new PaymentError('internal', 'Mise à jour du paiement impossible.', 500);
  }
  if (!data) return null; // unknown to us (e.g. event from another product) — not an error
  return { shipmentId: data.shipment_id, amountCents: data.amount_cents, currency: data.currency };
}

/**
 * Confirm the booking after a successful payment: stamp paid_at (only once)
 * and append a tracking event so both parties see the confirmation. This is
 * what turns "payment succeeded at Stripe" into "reservation confirmed".
 */
export async function confirmShipmentPaid(
  admin: SupabaseClient,
  shipmentId: string,
  amountCents: number,
  currency: string
): Promise<void> {
  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from('shipments')
    .update({ paid_at: now })
    .eq('id', shipmentId)
    .is('paid_at', null) // idempotent: a replayed event must not re-confirm
    .select('id, status')
    .maybeSingle();
  if (error) {
    console.error('[payments] paid_at update failed:', error);
    throw new PaymentError('internal', 'Confirmation de la réservation impossible.', 500);
  }
  if (!updated) return; // already confirmed by an earlier delivery

  const amountLabel = `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  const { error: trackingError } = await admin.from('tracking_events').insert({
    shipment_id: shipmentId,
    status: updated.status,
    description: `Paiement de ${amountLabel} confirmé — réservation validée automatiquement.`,
  });
  if (trackingError) {
    // The booking IS confirmed; a missing history line must not fail the webhook.
    console.error('[payments] tracking event insert failed:', trackingError);
  }
}

// ── webhook idempotency ───────────────────────────────────────────────────

/**
 * Claim a webhook event id before processing. Returns false when the event
 * was already handled (Stripe retries and can deliver duplicates). If
 * processing later fails, release the claim so the retry gets through.
 */
export async function claimWebhookEvent(
  admin: SupabaseClient,
  eventId: string,
  eventType: string
): Promise<boolean> {
  const { error } = await admin.from('webhook_events').insert({ id: eventId, type: eventType });
  if (!error) return true;
  if (error.code === '23505') return false; // unique violation → duplicate delivery
  console.error('[payments] webhook claim failed:', error);
  throw new PaymentError('internal', 'Erreur interne du webhook.', 500);
}

export async function releaseWebhookEvent(admin: SupabaseClient, eventId: string): Promise<void> {
  await admin.from('webhook_events').delete().eq('id', eventId);
}
