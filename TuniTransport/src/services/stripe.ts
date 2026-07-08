// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Stripe service (compatibility re-export)
// The payment gateway now lives in ./payments — import from there directly;
// this module keeps the historical import path working.
// ──────────────────────────────────────────────────────────────────────────
export {
  STRIPE_PUBLISHABLE_KEY,
  IS_STRIPE_LIVE,
  createPaymentIntent,
  PaymentApiError,
} from './payments';
export type { PaymentIntentResult } from './payments';
