# Déploiement sur Cloudflare

Mise en ligne de l'app web (export Expo statique) sur **Cloudflare Workers**,
en alternative gratuite à Vercel.

L'app est exportée en mode `single` (single-page app) : le build produit un
`index.html` + un bundle JS statique. Le Worker ne sert que des fichiers, il n'a
aucun code serveur.

> Le tableau de bord Cloudflare oriente désormais les nouveaux projets Git vers
> **Workers** (commande `npx wrangler deploy`) plutôt que vers Pages. C'est ce
> parcours qui est décrit ici ; la configuration vit dans
> `TuniTransport/wrangler.jsonc`.

---

## 1. Créer le projet

1. <https://dash.cloudflare.com> → **Workers & Pages** → **Create application**.
2. **Import a repository** → autoriser GitHub → choisir
   **`Aouaoui1981/TuniTransport-App-Complete`**.

## 2. Réglages

| Champ | Valeur |
|---|---|
| Project name | `tunitransport-app-complete` |
| Build command | `npx expo export --platform web` |
| Deploy command | `npx wrangler deploy` |
| Root directory *(Advanced settings)* | `TuniTransport` |

> **Root directory** est le réglage critique : le projet Expo vit dans le
> sous-dossier `TuniTransport/`, pas à la racine du dépôt. Il se règle en
> dépliant **Advanced settings**.

## 3. Variables d'environnement

**Aucune à saisir.** Les trois variables `EXPO_PUBLIC_*` sont versionnées dans
`TuniTransport/.env.production`, chargé automatiquement par `expo export`.

Ce fichier ne contient que des clés **publiques par conception** (clé Supabase
« publishable » verrouillée par les politiques RLS, clé Stripe `pk_`), déjà
embarquées dans le bundle livré au navigateur. Les véritables secrets
(`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, service role) vivent uniquement
dans les secrets Supabase et ne sont jamais commités.

## 4. Déployer

**Deploy**. Le premier build prend ~4 min. L'URL finale est de la forme
`https://tunitransport-app-complete.<sous-domaine>.workers.dev`.

Chaque push sur `main` redéclenche automatiquement un déploiement.

---

## Notes

### Repli SPA
Assuré par `wrangler.jsonc` → `assets.not_found_handling:
"single-page-application"`. Sans ce repli, un rafraîchissement sur une route
interne renverrait une 404.

> **Ne pas ajouter de fichier `_redirects`.** La règle `/*  /index.html  200`,
> habituelle sur Pages et Netlify, est **rejetée** par Workers : l'API répond
> `Invalid _redirects configuration — Infinite loop detected in this rule`
> (code 100324), car `/index.html` correspond lui-même à `/*` et le traitement
> des assets retire `.html` / `/index`, ce qui redéclenche la règle. Le
> déploiement échoue alors *après* un build réussi. `not_found_handling` couvre
> déjà le besoin.

### Cache Metro en local
En local, un build précédent peut être resservi depuis le cache Metro et ignorer
une modification de `.env.production`. Forcer avec :

```bash
npx expo export --platform web --clear
```

Sans objet sur Cloudflare, dont chaque build part d'un clone neuf.

### URLs de redirection Stripe
Après un paiement web, Stripe renvoie l'utilisateur vers les URLs définies par
les secrets Supabase. Si le domaine change :

```bash
supabase secrets set CHECKOUT_SUCCESS_URL=https://<domaine>
supabase secrets set CHECKOUT_CANCEL_URL=https://<domaine>
```

### Vercel
`vercel.json` est conservé : les deux hébergeurs peuvent coexister, ou Vercel
peut être retiré une fois la migration validée.
