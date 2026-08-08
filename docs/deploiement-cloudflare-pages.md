# Déploiement sur Cloudflare Pages

Guide de mise en ligne de l'app web (export Expo statique) sur **Cloudflare Pages**,
en alternative gratuite à Vercel.

L'app est exportée en mode `single` (single-page app) : le build produit un
`index.html` + un bundle JS statique. Aucun serveur n'est nécessaire.

---

## 1. Créer le projet

1. Aller sur <https://dash.cloudflare.com> → **Workers & Pages** → **Create** →
   onglet **Pages** → **Connect to Git**.
2. Autoriser Cloudflare à accéder à GitHub, puis sélectionner le dépôt
   **`TuniTransport-App-Complete`**.
3. Branche de production : **`main`**.

## 2. Réglages de build

| Champ | Valeur |
|---|---|
| Framework preset | `None` |
| Build command | `npx expo export --platform web` |
| Build output directory | `dist` |
| Root directory | `TuniTransport` |

> **Root directory** est le réglage important : le projet Expo vit dans le
> sous-dossier `TuniTransport/`, pas à la racine du dépôt.

## 3. Variables d'environnement

À ajouter dans **Settings → Environment variables** (environnement
*Production*, puis *Preview* si souhaité).

Ces trois clés sont **publiques par conception** — elles sont déjà embarquées
dans le bundle client et protégées côté serveur (RLS Supabase, clé secrète
Stripe conservée uniquement dans les secrets Supabase).

| Nom | Valeur |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://leuntmiyxqvetksfrjfm.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_jLRE6NoomvAG_0WtN3Tcgg_FlI1qcwr` |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | voir `vercel.json` à la racine du dépôt (`pk_live_…`) |

> Sans ces variables, le build réussit mais l'app démarre en **mode démo**
> (données simulées, aucun appel réseau).

## 4. Déployer

**Save and Deploy**. Le premier build prend ~3–5 min. L'URL finale est de la
forme `https://<nom-du-projet>.pages.dev`.

Chaque push sur `main` redéclenche automatiquement un déploiement.

---

## Notes

### Repli SPA
`TuniTransport/public/_redirects` contient la règle `/*  /index.html  200`.
Les fichiers de `public/` sont copiés à la racine de `dist/` par
`expo export`, donc la règle est bien prise en compte par Cloudflare Pages.
Sans elle, un rafraîchissement sur une route interne renverrait une 404.

### URLs de redirection Stripe (optionnel)
Après le paiement web, Stripe renvoie l'utilisateur vers les URLs définies par
les secrets Supabase `CHECKOUT_SUCCESS_URL` / `CHECKOUT_CANCEL_URL`. Si le
domaine change, les mettre à jour :

```
supabase secrets set CHECKOUT_SUCCESS_URL=https://<projet>.pages.dev
supabase secrets set CHECKOUT_CANCEL_URL=https://<projet>.pages.dev
```

### Vercel
Le fichier `vercel.json` à la racine reste valide : les deux hébergeurs
peuvent coexister, ou Vercel peut être retiré une fois la migration validée.
