// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — create-checkout-session (single-file bundle for Supabase Dashboard deploys)
// GENERATED from supabase/functions/ — do not edit by hand; the sources in
// supabase/functions/ (with _shared/) remain the canonical version.
// ──────────────────────────────────────────────────────────────────────────
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

// ═══ inlined from _shared/errors.ts ═══
// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — shared: typed payment errors
//
// One error type flows through the whole gateway. Each error carries a
// machine-readable code (for the client and for logs) and the HTTP status
// it should map to, so every function converts failures the same way.
// ──────────────────────────────────────────────────────────────────────────

export type PaymentErrorCode =
  | 'config' // missing/invalid environment variable — operator problem
  | 'unauthorized' // caller not authenticated / bad webhook signature
  | 'forbidden' // authenticated but not allowed on this resource
  | 'not_found' // shipment / payment does not exist
  | 'invalid_request' // malformed body, bad amount, bad currency…
  | 'conflict' // already paid / concurrent duplicate
  | 'stripe_error' // Stripe rejected the request
  | 'stripe_unavailable' // Stripe unreachable after retries
  | 'internal'; // anything unexpected

export class PaymentError extends Error {
  readonly code: PaymentErrorCode;
  readonly status: number;

  constructor(code: PaymentErrorCode, message: string, status: number) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Normalise any thrown value into a PaymentError. Unexpected errors are
 * logged with their real message but exposed to the client as an opaque
 * internal error — stack details never leave the server.
 */
export function asPaymentError(err: unknown): PaymentError {
  if (err instanceof PaymentError) return err;
  console.error('[payments] unexpected error:', err);
  return new PaymentError('internal', 'Erreur interne du service de paiement.', 500);
}

// ═══ inlined from _shared/env.ts ═══
// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — shared: strict environment access
//
// Every secret is read exclusively from environment variables (set with
// `supabase secrets set NAME=value`). Nothing here has a hard-coded default
// for a secret: a missing required variable fails fast with a ConfigError
// instead of letting the function run half-configured.
// ──────────────────────────────────────────────────────────────────────────

/** Read a required environment variable or throw a non-retryable config error. */
export function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new PaymentError('config', `Variable d'environnement manquante : ${name}`, 500);
  }
  return value;
}

/** Read an optional environment variable, falling back to a non-secret default. */
export function optionalEnv(name: string, fallback: string): string {
  const value = Deno.env.get(name)?.trim();
  return value || fallback;
}

/**
 * Platform commission, as a percentage of the shipment price, retained by
 * TuniTransport on every transaction. The remainder is owed to the
 * transporter. Bounded so a typo in the secret can never confiscate the
 * whole payout.
 */
export function getPlatformFeePercent(): number {
  const raw = optionalEnv('PLATFORM_FEE_PERCENT', '10');
  const percent = Number(raw);
  if (!Number.isFinite(percent) || percent < 0 || percent > 50) {
    throw new PaymentError(
      'config',
      `PLATFORM_FEE_PERCENT invalide (${raw}) — attendu un nombre entre 0 et 50.`,
      500
    );
  }
  return percent;
}

// ═══ inlined from _shared/http.ts ═══
// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — shared: HTTP helpers (CORS, JSON responses, body parsing)
// ──────────────────────────────────────────────────────────────────────────

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(err: unknown): Response {
  const e = asPaymentError(err);
  return json({ error: e.message, code: e.code }, e.status);
}

/** Parse the JSON request body, mapping malformed input to a 400. */
export async function readJsonBody<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new PaymentError('invalid_request', 'Corps de requête JSON invalide.', 400);
  }
}

/**
 * Standard wrapper for a POST-only function: handles the CORS preflight,
 * rejects other methods, and converts every thrown error into a clean
 * JSON error response.
 */
export function servePost(handler: (req: Request) => Promise<Response>): void {
  Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }
    if (req.method !== 'POST') {
      return json({ error: 'Méthode non autorisée.', code: 'invalid_request' }, 405);
    }
    try {
      return await handler(req);
    } catch (err) {
      return errorResponse(err);
    }
  });
}

// ═══ inlined from _shared/split.ts ═══
// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — shared: financial split (platform fee vs transporter)
//
// Every payment is divided into the platform's commission and the amount
// owed to the transporter. All arithmetic happens on integer cents — never
// floats — so the two parts always add up to exactly the charged total.
// ──────────────────────────────────────────────────────────────────────────

export interface PaymentSplit {
  /** Full amount charged to the sender, in cents. */
  totalCents: number;
  /** Commission retained by TuniTransport, in cents. */
  platformFeeCents: number;
  /** Amount owed to the transporter, in cents (total − fee). */
  transporterCents: number;
  /** Fee percentage the split was computed with. */
  feePercent: number;
}

/** Convert a decimal price (as stored on the shipment) to integer cents. */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PaymentError('invalid_request', 'Montant invalide pour cet envoi.', 400);
  }
  const cents = Math.round(amount * 100);
  if (cents < 50) {
    // Stripe rejects charges under ~0.50 € — fail with a clear message instead.
    throw new PaymentError('invalid_request', 'Montant trop faible pour un paiement en ligne.', 400);
  }
  return cents;
}

export function computeSplit(totalCents: number, feePercent: number): PaymentSplit {
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    throw new PaymentError('invalid_request', 'Montant invalide pour cet envoi.', 400);
  }
  if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 50) {
    throw new PaymentError('config', 'Pourcentage de commission invalide.', 500);
  }
  // Round the fee (not the payout) so rounding drift lands on the platform
  // side by at most one cent, and the payout is always total − fee exactly.
  const platformFeeCents = Math.round((totalCents * feePercent) / 100);
  const transporterCents = totalCents - platformFeeCents;
  if (transporterCents < 0) {
    throw new PaymentError('config', 'La commission dépasse le montant de la transaction.', 500);
  }
  return { totalCents, platformFeeCents, transporterCents, feePercent };
}

const SUPPORTED_CURRENCIES = new Set(['eur']);

/** Validate the requested currency against the currencies the app supports. */
export function normalizeCurrency(raw: unknown): string {
  const currency = typeof raw === 'string' && raw ? raw.toLowerCase() : 'eur';
  if (!SUPPORTED_CURRENCIES.has(currency)) {
    throw new PaymentError('invalid_request', `Devise non prise en charge : ${currency}.`, 400);
  }
  return currency;
}

// ═══ inlined from _shared/stripe.ts ═══
// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — shared: minimal Stripe REST client
//
// A thin, dependency-free wrapper over the Stripe HTTP API (the pattern the
// project already used in create-payment-intent, now centralised):
//   • form-encodes nested params the way Stripe expects,
//   • sends an Idempotency-Key so retries can never double-charge,
//   • retries transient failures (429 / 5xx / network) with backoff,
//   • maps Stripe error payloads to typed PaymentErrors.
// The secret key is read from the STRIPE_SECRET_KEY environment variable at
// call time and never appears in any response or log.
// ──────────────────────────────────────────────────────────────────────────

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [500, 2000];

export type StripeParamValue = string | number | boolean | StripeParams | StripeParamValue[];
export interface StripeParams {
  [key: string]: StripeParamValue | undefined;
}

/** Flatten nested params into Stripe's bracket form encoding. */
export function encodeStripeParams(params: StripeParams, prefix = ''): URLSearchParams {
  const out = new URLSearchParams();
  const append = (key: string, value: StripeParamValue | undefined) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => append(`${key}[${i}]`, item));
    } else if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) append(`${key}[${k}]`, v);
    } else {
      out.append(key, String(value));
    }
  };
  for (const [k, v] of Object.entries(params)) {
    append(prefix ? `${prefix}[${k}]` : k, v);
  }
  return out;
}

interface StripeRequestOptions {
  /**
   * Sent as Stripe's Idempotency-Key. Mandatory for POSTs: it makes our
   * internal retries (and any duplicated network delivery) safe — Stripe
   * replays the original result instead of creating a second object.
   */
  idempotencyKey?: string;
}

/**
 * Call the Stripe API. GETs and idempotent POSTs are retried on transient
 * failures; definitive Stripe rejections (card declined, bad params…) are
 * surfaced immediately as PaymentErrors.
 */
export async function stripeRequest<T = Record<string, unknown>>(
  method: 'GET' | 'POST',
  path: string,
  params: StripeParams = {},
  options: StripeRequestOptions = {}
): Promise<T> {
  const secretKey = requireEnv('STRIPE_SECRET_KEY');
  if (method === 'POST' && !options.idempotencyKey) {
    throw new PaymentError('internal', 'Idempotency-Key requis pour les écritures Stripe.', 500);
  }

  const encoded = encodeStripeParams(params);
  const url =
    method === 'GET' && [...encoded].length > 0
      ? `${STRIPE_API_BASE}${path}?${encoded}`
      : `${STRIPE_API_BASE}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  let lastError: PaymentError | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? encoded.toString() : undefined,
      });
    } catch (networkErr) {
      lastError = new PaymentError(
        'stripe_unavailable',
        'Le service de paiement est momentanément injoignable.',
        502
      );
      console.error(`[stripe] network failure (attempt ${attempt}/${MAX_ATTEMPTS}):`, networkErr);
      await backoff(attempt);
      continue;
    }

    const body = (await response.json().catch(() => ({}))) as {
      error?: { type?: string; code?: string; message?: string };
    };

    if (response.ok) return body as T;

    // 429 / 5xx are transient — retry. Anything else is a real rejection.
    if (response.status === 429 || response.status >= 500) {
      lastError = new PaymentError(
        'stripe_unavailable',
        'Le service de paiement est momentanément indisponible. Réessayez.',
        502
      );
      console.error(
        `[stripe] transient ${response.status} (attempt ${attempt}/${MAX_ATTEMPTS}):`,
        body?.error?.message ?? ''
      );
      await backoff(attempt);
      continue;
    }

    console.error(`[stripe] rejected ${method} ${path}:`, body?.error);
    throw new PaymentError(
      'stripe_error',
      body?.error?.message ?? 'La demande de paiement a été refusée.',
      response.status === 401 ? 500 : 402 // a bad API key is our config problem, not the payer's
    );
  }

  throw lastError ?? new PaymentError('stripe_unavailable', 'Service de paiement indisponible.', 502);
}

function backoff(attempt: number): Promise<void> {
  if (attempt >= MAX_ATTEMPTS) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1] ?? 2000));
}

// ═══ inlined from _shared/webhook.ts ═══
// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — shared: Stripe webhook signature verification
//
// Implements Stripe's signing scheme with WebCrypto: the `Stripe-Signature`
// header carries a timestamp `t` and one or more `v1` HMAC-SHA256 signatures
// of `${t}.${rawBody}` keyed with the endpoint secret. We verify with a
// constant-time comparison and reject stale timestamps to block replays.
// Docs: https://docs.stripe.com/webhooks#verify-manually
// ──────────────────────────────────────────────────────────────────────────

const DEFAULT_TOLERANCE_SECONDS = 300;

function badSignature(reason: string): PaymentError {
  console.error(`[webhook] signature rejected: ${reason}`);
  // One opaque client-facing message for every failure mode — the header is
  // attacker-controlled, so we never echo details back.
  return new PaymentError('unauthorized', 'Signature du webhook invalide.', 400);
}

export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  endpointSecret: string,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS
): Promise<void> {
  if (!signatureHeader) throw badSignature('missing Stripe-Signature header');

  let timestamp = '';
  const candidates: string[] = [];
  for (const part of signatureHeader.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 't') timestamp = value;
    else if (key === 'v1') candidates.push(value);
  }
  if (!timestamp || candidates.length === 0) {
    throw badSignature('malformed Stripe-Signature header');
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) throw badSignature('non-numeric timestamp');
  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (ageSeconds > toleranceSeconds) throw badSignature('timestamp outside tolerance (replay?)');

  const expected = await hmacSha256Hex(endpointSecret, `${timestamp}.${rawBody}`);
  const match = candidates.some((candidate) => timingSafeEqualHex(candidate, expected));
  if (!match) throw badSignature('no v1 signature matched');
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time comparison of hex strings — no early exit to block timing attacks. */
function timingSafeEqualHex(a: string, b: string): boolean {
  // Use a fixed-length comparison where possible to avoid leaking length via timing.
  // We compare up to the length of the expected signature (b).
  const lenA = a.length;
  const lenB = b.length;
  let diff = lenA ^ lenB;
  for (let i = 0; i < lenB; i++) {
    // Compare char codes, using a dummy value if a is shorter than i.
    const charA = i < lenA ? a.charCodeAt(i) : 0;
    const charB = b.charCodeAt(i);
    diff |= charA ^ charB;
  }
  return diff === 0;
}

// ═══ inlined from _shared/db.ts ═══
// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — shared: data access for the payment gateway
//
// Everything here runs with the service-role key (bypassing RLS), so this
// module is the single place that enforces the business rules: who may pay,
// what may be paid, and how a confirmed payment is recorded. The client is
// never trusted with amounts or state transitions.
// ──────────────────────────────────────────────────────────────────────────

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

// ═══ function entrypoint (create-checkout-session/index.ts) ═══
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

interface CheckoutSessionResponse {
  id: string;
  url: string;
  amount: number;
  currency: string;
  platformFee: number;
  transporterAmount: number;
}

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
  const successUrl = optionalEnv(
    'CHECKOUT_SUCCESS_URL',
    'tunitransport://payment/success?shipment={SHIPMENT_ID}'
  ).replace('{SHIPMENT_ID}', shipment.id);
  const cancelUrl = optionalEnv(
    'CHECKOUT_CANCEL_URL',
    'tunitransport://payment/cancel?shipment={SHIPMENT_ID}'
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

