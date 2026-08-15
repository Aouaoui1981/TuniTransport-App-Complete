// ──────────────────────────────────────────────────────────────────────────
// THL — lien d'étiquette ouvert depuis l'extérieur
//
// Le QR imprimé contient une URL. On voulait qu'il soit lu par le scanner
// intégré, mais le premier réflexe de tout le monde est de viser avec
// l'appareil photo du téléphone — qui ouvre le navigateur. Sans ce
// crochet, on atterrissait sur la page d'accueil, sans rapport visible
// avec le colis scanné : l'impression d'un lien cassé.
//
// Le lien est donc retenu, y compris quand il arrive avant la connexion :
// l'utilisateur se connecte, et l'étiquette s'ouvre ensuite d'elle-même.
// ──────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';

import { parseLabelUrl } from '../config/app';

export interface PendingLabel {
  shipmentId: string;
  token: string;
}

export function usePendingLabelLink(): {
  pending: PendingLabel | null;
  clear: () => void;
} {
  const [pending, setPending] = useState<PendingLabel | null>(null);

  useEffect(() => {
    let alive = true;

    // Lien qui a lancé l'application (ou l'URL courante sur le web).
    Linking.getInitialURL()
      .then((url) => {
        if (!alive || !url) return;
        const parsed = parseLabelUrl(url);
        if (parsed) setPending(parsed);
      })
      .catch(() => undefined);

    // Lien reçu alors que l'application tourne déjà.
    const sub = Linking.addEventListener('url', ({ url }) => {
      const parsed = parseLabelUrl(url);
      if (parsed) setPending(parsed);
    });

    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return { pending, clear: () => setPending(null) };
}
