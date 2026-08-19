// ──────────────────────────────────────────────────────────────────────────
// THL — connexion Google native : variante web
//
// Le sélecteur de comptes du système n'existe pas dans un navigateur, et
// le module natif ne s'y charge pas. Sur le web, la redirection Supabase
// habituelle fait déjà le travail sans écran intermédiaire disgracieux :
// on déclare simplement le natif indisponible et l'appelant l'emprunte.
// ──────────────────────────────────────────────────────────────────────────
export type NativeGoogleResult =
  | { status: 'ok'; idToken: string }
  | { status: 'cancelled' }
  | { status: 'unavailable'; reason: string };

export async function signInWithGoogleNatively(): Promise<NativeGoogleResult> {
  return { status: 'unavailable', reason: 'Sélecteur de comptes indisponible sur le web.' };
}

export async function signOutFromGoogleNatively(): Promise<void> {
  // Rien à couper : aucune session Google native sur le web.
}
