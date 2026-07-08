// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — shared: financial split (platform fee vs transporter)
//
// Every payment is divided into the platform's commission and the amount
// owed to the transporter. All arithmetic happens on integer cents — never
// floats — so the two parts always add up to exactly the charged total.
// ──────────────────────────────────────────────────────────────────────────
import { PaymentError } from './errors.ts';

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
