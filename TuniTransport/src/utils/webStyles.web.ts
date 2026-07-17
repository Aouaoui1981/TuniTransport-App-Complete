// ──────────────────────────────────────────────────────────────────────────
// THL — Styles globaux web
// react-native-web rend les <TextInput> comme des <input>/<textarea> HTML.
// Les navigateurs (surtout Safari iOS) dessinent alors un contour bleu au
// focus + un halo de surbrillance au toucher, qui apparaît « dans » le champ.
// On neutralise ce comportement natif pour garder notre propre style de champ.
// ──────────────────────────────────────────────────────────────────────────
export function injectWebStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('thl-web-styles')) return;

  const style = document.createElement('style');
  style.id = 'thl-web-styles';
  style.textContent = `
    input, textarea, select, button, [contenteditable] {
      outline: none !important;
      -webkit-tap-highlight-color: transparent;
    }
    input:focus, textarea:focus, select:focus,
    input:focus-visible, textarea:focus-visible, select:focus-visible {
      outline: none !important;
      box-shadow: none !important;
    }
    /* Neutralise le fond jaune/bleu de l'autofill Chrome/Safari */
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus {
      -webkit-text-fill-color: #E7EEF5;
      transition: background-color 9999s ease-in-out 0s;
    }
  `;
  document.head.appendChild(style);
}
