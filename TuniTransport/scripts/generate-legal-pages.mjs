// ──────────────────────────────────────────────────────────────────────────
// Génère les pages légales statiques à partir de src/content/legal.ts.
//
//   node scripts/generate-legal-pages.mjs      (ou : npm run legal:html)
//
// Sortie : public/legal/<clé>.html + public/legal/index.html
// `expo export` recopie public/ à la racine de dist/, les pages sont donc
// servies à https://<domaine>/legal/privacy.html (et /legal/privacy, Cloudflare
// résolvant l'extension automatiquement).
//
// Pourquoi des fichiers statiques plutôt qu'une route de l'app : Google Play
// exige une URL de politique de confidentialité atteignable publiquement, sans
// connexion ni exécution de JavaScript. Une route interne de la SPA ne remplit
// pas ce critère de façon fiable.
//
// Les fichiers générés sont versionnés : la commande de build de l'hébergeur
// reste `npx expo export --platform web`, sans étape supplémentaire. Après
// toute modification de legal.ts, relancer ce script et commiter le résultat.
// ──────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(root, 'src/content/legal.ts');
const OUT_DIR = resolve(root, 'public/legal');

// ── Charger legal.ts ──────────────────────────────────────────────────────
// Le fichier n'importe `Ionicons` que pour un type ; la transpilation isolée
// élide cet import, le module s'évalue donc sans dépendance native.
const { outputText } = ts.transpileModule(readFileSync(SOURCE, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
if (/@expo\/vector-icons/.test(outputText)) {
  throw new Error(
    "L'import @expo/vector-icons n'a pas été élidé : legal.ts l'utilise désormais " +
      'comme valeur, ce script doit être adapté.'
  );
}
const { LEGAL_PAGES, SUPPORT_EMAIL } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);

// ── Rendu ─────────────────────────────────────────────────────────────────
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Rend cliquables les adresses e-mail présentes dans le texte.
const linkify = (s) =>
  esc(s).replace(/([\w.+-]+@[\w-]+\.[\w.]+)/g, '<a href="mailto:$1">$1</a>');

const STYLES = `
:root{--bg:#0A1420;--surface:#111E2E;--border:#1E3049;--text:#E8EEF6;--muted:#93A6BE;--accent:#4C9AFF}
*{box-sizing:border-box}
body{margin:0;padding:0;background:var(--bg);color:var(--text);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.65}
.wrap{max-width:760px;margin:0 auto;padding:32px 20px 72px}
header{border-bottom:1px solid var(--border);padding-bottom:20px;margin-bottom:28px}
.brand{font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);
  font-weight:700;text-decoration:none;display:inline-block;margin-bottom:10px}
h1{font-size:1.75rem;line-height:1.25;margin:0 0 8px}
.updated{color:var(--muted);font-size:.85rem;margin:0}
.intro{background:var(--surface);border:1px solid var(--border);border-radius:12px;
  padding:16px 18px;margin:0 0 32px;color:#C7D5E6}
h2{font-size:1.12rem;margin:32px 0 10px;color:#fff}
p{margin:0 0 14px}
ul{margin:0 0 16px;padding-left:22px}
li{margin-bottom:7px}
a{color:var(--accent)}
footer{border-top:1px solid var(--border);margin-top:48px;padding-top:20px;
  color:var(--muted);font-size:.88rem}
nav.pages{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
nav.pages a{background:var(--surface);border:1px solid var(--border);border-radius:999px;
  padding:7px 14px;font-size:.85rem;text-decoration:none}
@media(prefers-color-scheme:light){
  :root{--bg:#FFF;--surface:#F4F7FB;--border:#DCE5F0;--text:#16212E;--muted:#5A6B80;--accent:#1257A5}
  .intro{color:#33475F}
  h2{color:#0F1923}
}
`.trim();

function page({ title, bodyHtml, updatedAt }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — THL</title>
<meta name="description" content="${esc(title)} de THL, plateforme de transport de colis entre la France et la Tunisie.">
<style>${STYLES}</style>
</head>
<body>
<div class="wrap">
<header>
  <a class="brand" href="/">THL — TuniTransport</a>
  <h1>${esc(title)}</h1>
  ${updatedAt ? `<p class="updated">Dernière mise à jour : ${esc(updatedAt)}</p>` : ''}
</header>
${bodyHtml}
<footer>
  <p>THL — mise en relation entre expéditeurs et transporteurs, France ↔ Tunisie.<br>
  Contact : <a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a></p>
  <nav class="pages">
${Object.entries(LEGAL_PAGES)
  .map(([key, p]) => `    <a href="/legal/${key}.html">${esc(p.title)}</a>`)
  .join('\n')}
  </nav>
  <p style="margin-top:16px"><a href="/">← Retour à l'application</a></p>
</footer>
</div>
</body>
</html>
`;
}

function renderSections(sections) {
  return sections
    .map((s) => {
      const parts = [];
      if (s.heading) parts.push(`<h2>${esc(s.heading)}</h2>`);
      if (s.body) parts.push(`<p>${linkify(s.body)}</p>`);
      if (s.bullets?.length) {
        parts.push(`<ul>\n${s.bullets.map((b) => `  <li>${linkify(b)}</li>`).join('\n')}\n</ul>`);
      }
      return parts.join('\n');
    })
    .join('\n');
}

mkdirSync(OUT_DIR, { recursive: true });

let count = 0;
for (const [key, p] of Object.entries(LEGAL_PAGES)) {
  const bodyHtml = `<p class="intro">${linkify(p.intro)}</p>\n${renderSections(p.sections)}`;
  writeFileSync(
    resolve(OUT_DIR, `${key}.html`),
    page({ title: p.title, bodyHtml, updatedAt: p.updatedAt })
  );
  count++;
}

// Index listant toutes les pages.
const indexBody = `<p class="intro">Informations légales et conditions d'utilisation de THL.</p>
<ul>
${Object.entries(LEGAL_PAGES)
  .map(([key, p]) => `  <li><a href="/legal/${key}.html">${esc(p.title)}</a></li>`)
  .join('\n')}
</ul>`;
writeFileSync(resolve(OUT_DIR, 'index.html'), page({ title: 'Informations légales', bodyHtml: indexBody }));

console.log(`${count} pages légales générées + index → public/legal/`);
