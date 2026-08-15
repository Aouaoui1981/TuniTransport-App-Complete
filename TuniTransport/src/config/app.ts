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

/** Lien de suivi d'un envoi, encodé dans le QR code de l'étiquette. */
export function trackingUrl(shipmentId: string): string {
  return `${APP_URL}/?shipment=${encodeURIComponent(shipmentId)}`;
}
