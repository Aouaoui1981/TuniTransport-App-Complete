// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — shared: strict environment access
//
// Every secret is read exclusively from environment variables (set with
// `supabase secrets set NAME=value`). Nothing here has a hard-coded default
// for a secret: a missing required variable fails fast with a ConfigError
// instead of letting the function run half-configured.
// ──────────────────────────────────────────────────────────────────────────
import { PaymentError } from './errors.ts';

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
