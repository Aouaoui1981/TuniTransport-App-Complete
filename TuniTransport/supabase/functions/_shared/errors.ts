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
