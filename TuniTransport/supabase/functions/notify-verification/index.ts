// ──────────────────────────────────────────────────────────────────────────
// THL — notify-verification
//
// Envoie un e-mail à un utilisateur lorsque son identité vient d'être
// APPROUVÉE par un administrateur. Appelée depuis l'écran d'administration
// (« Approuver ») juste après le RPC review_identity.
//
// Sécurité : seul un administrateur authentifié peut l'invoquer. La fonction
// lit l'e-mail et le nom de l'utilisateur cible avec la clé service-role
// (jamais fournis par le client) puis délègue l'envoi à Resend.
//
// Envoi best-effort : si Resend n'est pas encore configuré (RESEND_API_KEY
// absent), la fonction répond 200 { ok:false, skipped:true } pour ne pas
// faire échouer l'approbation côté client.
// ──────────────────────────────────────────────────────────────────────────
import { servePost, json, readJsonBody } from '../_shared/http.ts';
import { createAdminClient, getAuthenticatedUser } from '../_shared/db.ts';
import { optionalEnv } from '../_shared/env.ts';
import { PaymentError } from '../_shared/errors.ts';

interface Body {
  userId?: string;
}

const APP_URL = 'https://thl-colis-app-complete.vercel.app';

function buildEmail(firstName: string): { subject: string; html: string; text: string } {
  const hello = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
  const subject = 'THL — Votre identité a été vérifiée ✅';
  const text =
    `${hello}\n\n` +
    `Bonne nouvelle : votre pièce d'identité a été vérifiée et approuvée par notre équipe.\n\n` +
    `Vous pouvez dès maintenant profiter pleinement de THL :\n` +
    `• Expéditeur : publier vos envois France → Tunisie.\n` +
    `• Transporteur : publier vos trajets et recevoir des demandes.\n\n` +
    `Ouvrir l'application : ${APP_URL}\n\n` +
    `Merci de votre confiance,\nL'équipe THL — Transport en toute confiance`;
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0A1420;">
    <div style="text-align:center;margin-bottom:16px;">
      <span style="font-size:28px;font-weight:800;color:#2DD4BF;">THL</span>
    </div>
    <div style="background:#F0FDFA;border-radius:16px;padding:20px;text-align:center;">
      <div style="font-size:40px;">✅</div>
      <h1 style="font-size:20px;margin:8px 0;color:#0A1420;">Identité vérifiée</h1>
    </div>
    <p style="font-size:15px;line-height:1.6;margin-top:20px;">${hello}</p>
    <p style="font-size:15px;line-height:1.6;">
      Bonne nouvelle : votre pièce d'identité a été <strong>vérifiée et approuvée</strong>
      par notre équipe.
    </p>
    <p style="font-size:15px;line-height:1.6;">Vous pouvez dès maintenant profiter pleinement de THL :</p>
    <ul style="font-size:15px;line-height:1.7;padding-left:18px;">
      <li><strong>Expéditeur</strong> : publier vos envois France → Tunisie.</li>
      <li><strong>Transporteur</strong> : publier vos trajets et recevoir des demandes.</li>
    </ul>
    <div style="text-align:center;margin:24px 0;">
      <a href="${APP_URL}" style="background:#2DD4BF;color:#03211E;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:12px;display:inline-block;">Ouvrir THL</a>
    </div>
    <p style="font-size:13px;color:#5B6B7B;text-align:center;margin-top:24px;">
      Transport en toute confiance — L'équipe THL
    </p>
  </div>`;
  return { subject, html, text };
}

servePost(async (req) => {
  const admin = createAdminClient();

  // 1) Authentifier l'appelant et vérifier qu'il est administrateur.
  const caller = await getAuthenticatedUser(admin, req);
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', caller.id)
    .single();
  if (!callerProfile?.is_admin) {
    throw new PaymentError('forbidden', 'Réservé aux administrateurs.', 403);
  }

  // 2) Charger l'utilisateur cible.
  const { userId } = await readJsonBody<Body>(req);
  if (!userId) {
    throw new PaymentError('invalid_request', 'userId manquant.', 400);
  }
  const { data: target, error } = await admin
    .from('profiles')
    .select('email, first_name, identity_status')
    .eq('id', userId)
    .single();
  if (error || !target) {
    throw new PaymentError('not_found', 'Utilisateur introuvable.', 404);
  }
  if (!target.email) {
    return json({ ok: false, skipped: true, reason: 'no_email' });
  }

  // 3) Envoyer via Resend — best-effort si non configuré.
  const resendKey = optionalEnv('RESEND_API_KEY', '');
  const from = optionalEnv('RESEND_FROM', 'THL <onboarding@resend.dev>');
  if (!resendKey) {
    console.warn('[notify-verification] RESEND_API_KEY absent — e-mail non envoyé.');
    return json({ ok: false, skipped: true, reason: 'resend_not_configured' });
  }

  const { subject, html, text } = buildEmail(target.first_name ?? '');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [target.email], subject, html, text }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('[notify-verification] Resend a échoué:', res.status, detail);
    throw new PaymentError('internal', "L'envoi de l'e-mail a échoué.", 502);
  }

  return json({ ok: true });
});
