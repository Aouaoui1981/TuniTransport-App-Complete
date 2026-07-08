// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — shared: Stripe webhook signature verification
//
// Implements Stripe's signing scheme with WebCrypto: the `Stripe-Signature`
// header carries a timestamp `t` and one or more `v1` HMAC-SHA256 signatures
// of `${t}.${rawBody}` keyed with the endpoint secret. We verify with a
// constant-time comparison and reject stale timestamps to block replays.
// Docs: https://docs.stripe.com/webhooks#verify-manually
// ──────────────────────────────────────────────────────────────────────────
import { PaymentError } from './errors.ts';

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
