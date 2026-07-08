// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — shared: HTTP helpers (CORS, JSON responses, body parsing)
// ──────────────────────────────────────────────────────────────────────────
import { asPaymentError, PaymentError } from './errors.ts';

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
