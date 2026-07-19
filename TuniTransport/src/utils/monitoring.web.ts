// ──────────────────────────────────────────────────────────────────────────
// THL — Suivi des erreurs (Sentry) côté web.
// Activé uniquement si EXPO_PUBLIC_SENTRY_DSN est défini : sans DSN, tout est
// désactivé silencieusement (aucune erreur, aucune donnée envoyée). Idéal pour
// la bêta : on capture les plantages réels des testeurs pour les corriger.
// ──────────────────────────────────────────────────────────────────────────
import * as Sentry from '@sentry/browser';

let started = false;

export function initMonitoring(): void {
  if (started) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return; // pas de DSN → suivi désactivé
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENV ?? 'production',
    tracesSampleRate: 0, // pas de traçage de performance en bêta
    sendDefaultPii: false, // ne pas envoyer d'informations personnelles
  });
  started = true;
}

/** Capture manuelle d'une erreur (dans un catch), sans planter si Sentry est off. */
export function captureError(error: unknown): void {
  if (!started) return;
  try {
    Sentry.captureException(error);
  } catch {
    // le suivi ne doit jamais casser l'app
  }
}
