// ──────────────────────────────────────────────────────────────────────────
// THL — Repli natif : le suivi Sentry web n'est pas chargé sur iOS/Android.
// (Le SDK natif pourra être ajouté plus tard, lors des builds mobiles.)
// ──────────────────────────────────────────────────────────────────────────
export function initMonitoring(): void {
  // no-op sur natif
}

export function captureError(_error: unknown): void {
  // no-op sur natif
}
