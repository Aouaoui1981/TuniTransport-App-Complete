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
import { PaymentError } from './errors.ts';
import { requireEnv } from './env.ts';

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
