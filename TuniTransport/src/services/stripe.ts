// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Stripe service (STEP 5)
// Live mode: Supabase Edge Function. Demo mode: simulated intent (~1s).
// ──────────────────────────────────────────────────────────────────────────
import { supabase, IS_LIVE } from './supabase';

export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
export const IS_STRIPE_LIVE = IS_LIVE && Boolean(STRIPE_PUBLISHABLE_KEY);

export interface PaymentIntentResult {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export async function createPaymentIntent(
  amount: number,
  currency: string = 'eur',
  shipmentId?: string
): Promise<PaymentIntentResult> {
  if (IS_STRIPE_LIVE && supabase) {
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: { amount, currency, shipmentId },
    });
    if (error) throw error;
    return data as PaymentIntentResult;
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
