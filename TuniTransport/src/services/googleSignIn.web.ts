// ──────────────────────────────────────────────────────────────────────────
// THL — connexion Google sur le web
//
// La redirection Supabase envoie l'utilisateur sur accounts.google.com, qui
// affiche « to continue to leuntmiyxqvetksfrjfm.supabase.co » : une chaîne
// technique montrée à l'endroit exact où l'on demande son compte à
// quelqu'un, et une page entière quittée au passage.
//
// Google Identity Services fait mieux : une fenêtre légère par-dessus le
// site, intitulée du NOM DU SITE — « Se connecter à thlcolis.com » — parce
// que Google lit l'origine de la page et non l'URL de retour. On n'a jamais
// quitté l'application.
//
// Rien n'est fatal ici. Si le script ne charge pas, si l'origine n'est pas
// déclarée dans la console Google, ou si l'invite est refusée, on renvoie
// `unavailable` et l'appelant reprend la redirection Supabase d'origine.
// ──────────────────────────────────────────────────────────────────────────
import { GOOGLE_WEB_CLIENT_ID } from '../config/app';

export type NativeGoogleResult =
  | { status: 'ok'; idToken: string }
  | { status: 'cancelled' }
  | { status: 'unavailable'; reason: string };

const GSI_SRC = 'https://accounts.google.com/gsi/client';

type GsiNotification = {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
  isDismissedMoment?: () => boolean;
};

// Filet de sécurité : l'invite Google peut se fermer sans qu'aucun de ses
// rappels ne soit déclenché. Sans cette limite, la promesse ne se résoudrait
// jamais et le bouton tournerait indéfiniment.
const PROMPT_TIMEOUT_MS = 20000;

type GsiId = {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    cancel_on_tap_outside?: boolean;
    auto_select?: boolean;
  }) => void;
  prompt: (listener?: (notification: GsiNotification) => void) => void;
  cancel: () => void;
};

function gsi(): GsiId | null {
  const g = (window as unknown as { google?: { accounts?: { id?: GsiId } } }).google;
  return g?.accounts?.id ?? null;
}

/** Charge le script une seule fois ; les appels suivants réutilisent la promesse. */
let loader: Promise<GsiId | null> | null = null;

function loadGsi(): Promise<GsiId | null> {
  if (loader) return loader;
  loader = new Promise((resolve) => {
    if (gsi()) return resolve(gsi());
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(gsi());
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return loader;
}

export async function signInWithGoogleNatively(): Promise<NativeGoogleResult> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { status: 'unavailable', reason: 'Pas de navigateur.' };
  }

  const id = await loadGsi();
  if (!id) {
    return { status: 'unavailable', reason: 'Script Google Identity indisponible.' };
  }

  return new Promise<NativeGoogleResult>((resolve) => {
    // Une seule résolution : l'invite peut se fermer après avoir déjà répondu.
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = (r: NativeGoogleResult) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      resolve(r);
    };

    timer = setTimeout(
      () => settle({ status: 'unavailable', reason: 'Invite Google sans réponse.' }),
      PROMPT_TIMEOUT_MS
    );

    try {
      id.initialize({
        client_id: GOOGLE_WEB_CLIENT_ID,
        cancel_on_tap_outside: true,
        auto_select: false,
        callback: (response) => {
          if (response.credential) settle({ status: 'ok', idToken: response.credential });
          else settle({ status: 'cancelled' });
        },
      });

      // L'invite ne s'affiche pas toujours : navigateur sans session Google,
      // origine non déclarée, refus récent. Ce n'est pas un échec — on rend
      // la main à la redirection Supabase, qui fonctionne partout.
      id.prompt((notification) => {
        // Fermée par l'utilisateur : ce n'est pas une panne, on ne bascule
        // pas sur la redirection derrière son dos.
        if (notification.isDismissedMoment?.()) {
          settle({ status: 'cancelled' });
          return;
        }
        if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
          settle({ status: 'unavailable', reason: 'Invite Google non affichée.' });
        }
      });
    } catch (e) {
      settle({
        status: 'unavailable',
        reason: e instanceof Error ? e.message : 'Google Identity indisponible.',
      });
    }
  });
}

export async function signOutFromGoogleNatively(): Promise<void> {
  // Ferme une invite restée ouverte ; il n'y a pas de session Google locale
  // à couper sur le web, Supabase gère la sienne.
  try {
    gsi()?.cancel();
  } catch {
    // Sans conséquence : rien à annuler.
  }
}
