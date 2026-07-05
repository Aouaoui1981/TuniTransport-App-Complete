// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — Supabase Edge Function : create-payment-intent (STEP 13)
//
// Deploy :  supabase functions deploy create-payment-intent
// Secret :  supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//
// Calls the Stripe REST API directly with fetch (no SDK needed in Deno).
// Amounts are received in euros and converted to cents for Stripe.
// ──────────────────────────────────────────────────────────────────────────

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

    const { amount, currency = 'eur', shipmentId } = await req.json();

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return json({ error: 'Montant invalide.' }, 400);
    }

    // Stripe expects amounts in the smallest currency unit (cents).
    const body = new URLSearchParams({
      amount: String(Math.round(parsedAmount * 100)),
      currency,
      'automatic_payment_methods[enabled]': 'true',
    });
    if (shipmentId) {
      body.set('metadata[shipment_id]', String(shipmentId));
    }

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
      amount: parsedAmount,
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
