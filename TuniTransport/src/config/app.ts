// ──────────────────────────────────────────────────────────────────────────
// THL — adresse publique de l'application
//
// Une seule source de vérité pour l'URL imprimée sur les étiquettes (QR de
// suivi) et partagée dans les liens de parrainage. Elle vivait en dur, en
// double, et pointait encore vers un ancien déploiement Vercel mis en
// pause : le QR d'une étiquette collée sur un colis affichait
// « This deployment is temporarily paused ». Une étiquette est imprimée
// puis collée — elle survit au code, d'où l'importance d'une adresse qui
// ne bouge plus.
//
// Surchargeable par `EXPO_PUBLIC_APP_URL` au moment du build : le jour où
// le domaine propre est acheté, il n'y a rien à recompiler à la main.
// ──────────────────────────────────────────────────────────────────────────

const FALLBACK_APP_URL = 'https://tunitransport-app-complete.lasaadawewi2.workers.dev';

/** Adresse publique de l'application, sans barre oblique finale. */
export const APP_URL = (process.env.EXPO_PUBLIC_APP_URL || FALLBACK_APP_URL).replace(/\/+$/, '');

/** La même, sans le schéma — pour l'affichage sur l'étiquette. */
export const APP_DOMAIN = APP_URL.replace(/^https?:\/\//, '');

/** Lien de suivi simple d'un envoi (partage, notification). */
export function trackingUrl(shipmentId: string): string {
  return `${APP_URL}/?shipment=${encodeURIComponent(shipmentId)}`;
}

/**
 * Lien encodé dans le QR de l'étiquette : identifiant + jeton, rien
 * d'autre. Sans le jeton — étiquette d'une ancienne version — on retombe
 * sur le lien de suivi, qui ne divulgue rien non plus.
 */
export function labelUrl(shipmentId: string, labelToken?: string): string {
  if (!labelToken) return trackingUrl(shipmentId);
  return `${APP_URL}/l/${encodeURIComponent(shipmentId)}?k=${encodeURIComponent(labelToken)}`;
}

/** Lecture inverse de `labelUrl` — utilisée par le scanner de l'application. */
export function parseLabelUrl(raw: string): { shipmentId: string; token: string } | null {
  const match = raw.match(/\/l\/([0-9a-fA-F-]{36})\?k=([0-9a-fA-F]{32})/);
  if (!match) return null;
  return { shipmentId: match[1], token: match[2] };
}
