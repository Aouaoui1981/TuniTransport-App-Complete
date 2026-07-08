// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — payment gateway client
//
// Client-side facade over the payment Edge Functions. Live mode talks to
// create-payment-intent / create-checkout-session and lets the stripe-webhook
// function confirm bookings server-side; demo mode (no env keys) simulates
// the same flow so the UI keeps working in Expo Go.
//
// Security invariant: the client only ever sends a shipmentId. Amounts,
// commission split and booking confirmation are decided on the server.
// ──────────────────────────────────────────────────────────────────────────
import { supabase, IS_LIVE } from './supabase';
import { PaymentStatus } from '../types';

export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
export const IS_STRIPE_LIVE = IS_LIVE && Boolean(STRIPE_PUBLISHABLE_KEY);

/** Structured error mirrored from the Edge Functions' { error, code } payload. */
export class PaymentApiError extends Error {
  readonly code: string;
  constructor(message: string, code = 'internal') {
    super(message);
    this.name = 'PaymentApiError';
    this.code = code;
  }
}

export interface PaymentIntentResult {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface CheckoutSessionResult {
  id: string;
  url: string;
  amount: number;
  currency: string;
  platformFee: number;
  transporterAmount: number;
}

async function invokePaymentFunction<T>(name: string, body: object): Promise<T> {
  if (!supabase) throw new PaymentApiError('Service de paiement non configuré.', 'config');
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // FunctionsHttpError keeps the raw Response in `context` — surface the
    // structured { error, code } the functions return instead of a generic
    // "non-2xx status code" message.
    let message = 'Le service de paiement a répondu par une erreur.';
    let code = 'internal';
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const payload = (await context.json()) as { error?: string; code?: string };
        if (payload?.error) message = payload.error;
        if (payload?.code) code = payload.code;
      } catch {
        // Non-JSON error body — keep the generic message.
      }
    }
    throw new PaymentApiError(message, code);
  }
  return data as T;
}

/** PaymentIntent for the native Stripe Payment Sheet (in-app flow). */
export async function createPaymentIntent(
  amount: number,
  currency: string = 'eur',
  shipmentId?: string
): Promise<PaymentIntentResult> {
  if (IS_STRIPE_LIVE) {
    if (!shipmentId) throw new PaymentApiError('Envoi introuvable pour ce paiement.', 'not_found');
    // The server derives the amount from the shipment row — the client-side
    // amount is display-only and deliberately not trusted.
    return invokePaymentFunction<PaymentIntentResult>('create-payment-intent', {
      shipmentId,
      currency,
    });
  }

  // Demo mode — simulate a PaymentIntent after ~1s
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const fakeId = `pi_demo_${Date.now()}`;
  return {
    id: fakeId,
    clientSecret: `${fakeId}_secret_demo`,
    amount,
    currency,
    status: 'requires_payment_method',
  };
}

/** Hosted Stripe Checkout session (web / redirect flow). */
export async function createCheckoutSession(
  shipmentId: string,
  currency: string = 'eur'
): Promise<CheckoutSessionResult> {
  if (IS_STRIPE_LIVE) {
    return invokePaymentFunction<CheckoutSessionResult>('create-checkout-session', {
      shipmentId,
      currency,
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));
  const fakeId = `cs_demo_${Date.now()}`;
  return {
    id: fakeId,
    url: `https://checkout.stripe.com/demo/${fakeId}`,
    amount: 0,
    currency,
    platformFee: 0,
    transporterAmount: 0,
  };
}

/** Latest payment status for a shipment, from the server-managed ledger. */
export async function getShipmentPaymentStatus(shipmentId: string): Promise<PaymentStatus | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('payments')
    .select('status')
    .eq('shipment_id', shipmentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.status as PaymentStatus;
}

/**
 * Poll the ledger until the stripe-webhook function settles the payment.
 * Returns the terminal status, or 'timeout' if confirmation hasn't landed
 * yet (webhook latency) — callers should treat 'timeout' as "pending, will
 * reconcile on next refresh", never as a failure.
 */
export async function waitForPaymentConfirmation(
  shipmentId: string,
  { attempts = 6, delayMs = 1500 }: { attempts?: number; delayMs?: number } = {}
): Promise<PaymentStatus | 'timeout'> {
  for (let i = 0; i < attempts; i++) {
    const status = await getShipmentPaymentStatus(shipmentId);
    if (status === 'succeeded' || status === 'failed' || status === 'refunded') {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return 'timeout';
}
