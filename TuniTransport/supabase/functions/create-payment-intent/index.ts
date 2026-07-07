// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Supabase Edge Function : create-payment-intent (STEP 13)
//
// Deploy :  supabase functions deploy create-payment-intent
// Secret :  supabase secrets set STRIPE_SECRET_KEY=sk_live_...
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
//
// Security model: the client sends only a shipmentId. The function
// authenticates the caller from the JWT, verifies they are the shipment's
// sender, and derives the amount from the shipment row — a tampered client
// can never choose its own price.
// ──────────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return json({ error: 'STRIPE_SECRET_KEY non configurée.' }, 500);
    }

    // ── Authenticate the caller from the Authorization header ────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return json({ error: 'Non autorisé.' }, 401);
    }

    const { shipmentId, currency = 'eur' } = await req.json();
    if (!shipmentId) {
      return json({ error: 'shipmentId requis.' }, 400);
    }

    // ── Derive the amount from the shipment (never from the client) ──────
    const { data: shipment, error: shipmentError } = await supabaseAdmin
      .from('shipments')
      .select('id, sender_id, price, status, paid_at')
      .eq('id', shipmentId)
      .single();
    if (shipmentError || !shipment) {
      return json({ error: 'Envoi introuvable.' }, 404);
    }
    if (shipment.sender_id !== userData.user.id) {
      return json({ error: "Seul l'expéditeur peut payer cet envoi." }, 403);
    }
    if (shipment.paid_at) {
      return json({ error: 'Cet envoi a déjà été payé.' }, 409);
    }
    if (shipment.status !== 'accepted') {
      return json({ error: "Cet envoi n'est pas prêt pour le paiement." }, 400);
    }
    const amount = Number(shipment.price);
    if (!amount || amount <= 0) {
      return json({ error: 'Montant invalide pour cet envoi.' }, 400);
    }

    // Stripe expects amounts in the smallest currency unit (cents).
    const body = new URLSearchParams({
      amount: String(Math.round(amount * 100)),
      currency,
      'automatic_payment_methods[enabled]': 'true',
      'metadata[shipment_id]': String(shipmentId),
      'metadata[sender_id]': String(userData.user.id),
    });

    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const intent = await stripeResponse.json();

    if (!stripeResponse.ok) {
      const message = intent?.error?.message ?? 'Erreur Stripe.';
      return json({ error: message }, stripeResponse.status);
    }

    return json({
      id: intent.id,
      clientSecret: intent.client_secret,
      amount,
      currency,
      status: intent.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue.';
    return json({ error: message }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
