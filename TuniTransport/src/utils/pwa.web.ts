// ──────────────────────────────────────────────────────────────────────────
// THL — Support « installer sur l'écran d'accueil » (PWA) sur le web.
// Injecte au démarrage les balises Apple (icône, mode plein écran, titre) et
// un manifeste web, pour que « Ajouter à l'écran d'accueil » (iOS/Android)
// affiche le nom et l'icône THL et lance l'app en plein écran.
// ──────────────────────────────────────────────────────────────────────────
import { Image } from 'react-native';

export function injectPWA(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('thl-pwa')) return;

  const head = document.head;
  const marker = document.createElement('meta');
  marker.id = 'thl-pwa';
  head.appendChild(marker);

  // URL de l'icône, résolue par le bundler (asset hashé en prod).
  let iconUri = '';
  try {
    iconUri = Image.resolveAssetSource(require('../../assets/icon.png')).uri;
  } catch {
    iconUri = '';
  }

  const metas: [string, string][] = [
    ['apple-mobile-web-app-capable', 'yes'],
    ['mobile-web-app-capable', 'yes'],
    ['apple-mobile-web-app-status-bar-style', 'black-translucent'],
    ['apple-mobile-web-app-title', 'THL'],
    ['theme-color', '#0A1420'],
  ];
  for (const [name, content] of metas) {
    const m = document.createElement('meta');
    m.setAttribute('name', name);
    m.setAttribute('content', content);
    head.appendChild(m);
  }

  if (iconUri) {
    const appleIcon = document.createElement('link');
    appleIcon.setAttribute('rel', 'apple-touch-icon');
    appleIcon.setAttribute('href', iconUri);
    head.appendChild(appleIcon);
  }

  const manifest = {
    name: 'THL — Transport en toute confiance',
    short_name: 'THL',
    description: 'Envoi de colis entre la France et la Tunisie, en toute confiance.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0A1420',
    theme_color: '#0A1420',
    lang: 'fr',
    icons: iconUri
      ? [{ src: iconUri, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }]
      : [],
  };
  try {
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    const link = document.createElement('link');
    link.setAttribute('rel', 'manifest');
    link.setAttribute('href', URL.createObjectURL(blob));
    head.appendChild(link);
  } catch {
    // sans blob/URL, on garde au moins les balises Apple ci-dessus
  }
}
