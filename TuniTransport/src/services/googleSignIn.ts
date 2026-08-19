// ──────────────────────────────────────────────────────────────────────────
// THL — connexion Google native (Android / iOS)
//
// Le parcours par navigateur reste en place, mais il affichait au passage
// « to continue to leuntmiyxqvetksfrjfm.supabase.co » : une chaîne
// aléatoire à l'endroit exact où l'on demande à quelqu'un son compte
// Google. Ici, c'est le sélecteur de comptes du système qui s'ouvre —
// pas de navigateur, pas d'écran gris, pas d'adresse technique.
//
// Ce module ne fait qu'obtenir le jeton d'identité ; c'est Supabase qui
// l'échange ensuite contre une session (`signInWithIdToken`).
//
// Rien n'est jamais fatal ici : tout échec renvoie `unavailable`, et
// l'appelant retombe sur le navigateur. Une connexion qui passe par un
// écran laid vaut mieux qu'une connexion qui ne passe pas.
// ──────────────────────────────────────────────────────────────────────────
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { GOOGLE_WEB_CLIENT_ID } from '../config/app';

export type NativeGoogleResult =
  | { status: 'ok'; idToken: string }
  | { status: 'cancelled' }
  | { status: 'unavailable'; reason: string };

let configured = false;

function configureOnce() {
  if (configured) return;
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  configured = true;
}

export async function signInWithGoogleNatively(): Promise<NativeGoogleResult> {
  try {
    configureOnce();

    // Sans les services Google Play (appareils Huawei, ROM sans GMS), le
    // sélecteur natif n'existe pas. On le découvre ici plutôt qu'en plein
    // milieu du parcours.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });

    // Repartir d'une session propre : sinon Google réutilise le dernier
    // compte sans rien demander, et l'utilisateur qui voulait en changer
    // n'en a pas la possibilité.
    await GoogleSignin.signOut().catch(() => undefined);

    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') return { status: 'cancelled' };

    const idToken = response.data.idToken;
    if (!idToken) {
      return { status: 'unavailable', reason: "Google n'a pas renvoyé de jeton d'identité." };
    }
    return { status: 'ok', idToken };
  } catch (e) {
    const code = (e as { code?: string })?.code;
    // L'utilisateur a fermé le sélecteur : ce n'est pas une panne.
    if (code === 'SIGN_IN_CANCELLED' || code === '12501') return { status: 'cancelled' };
    return {
      status: 'unavailable',
      reason: e instanceof Error ? e.message : 'Connexion Google native indisponible.',
    };
  }
}

/** Coupe la session Google locale, pour que le prochain choix reparte à zéro. */
export async function signOutFromGoogleNatively(): Promise<void> {
  if (!configured) return;
  await GoogleSignin.signOut().catch(() => undefined);
}
