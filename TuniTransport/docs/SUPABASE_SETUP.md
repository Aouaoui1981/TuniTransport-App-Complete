# Guide pas à pas — Connecter Supabase (mode live)

Ce guide détaille **chaque étape**, y compris la toute première (créer le
projet Supabase), pour faire passer TuniTransport du mode démo au mode live.
Aucune modification de code n'est nécessaire.

---

## Étape 1 — Créer un compte et un projet Supabase

C'est la première étape : elle se fait **dans le navigateur**, pas dans le code.

1. Ouvrez [https://supabase.com](https://supabase.com) et cliquez sur
   **Start your project** (ou **Sign in** si vous avez déjà un compte).
2. Connectez-vous avec GitHub ou avec votre e-mail.
3. Une fois sur le tableau de bord ([https://supabase.com/dashboard](https://supabase.com/dashboard)),
   cliquez sur le bouton vert **New project**.
4. Remplissez le formulaire :
   - **Organization** : votre organisation par défaut (créée automatiquement).
   - **Project name** : `tunitransport` (ou le nom de votre choix).
   - **Database password** : choisissez un mot de passe fort et **notez-le**
     (il ne sera plus affiché ensuite).
   - **Region** : choisissez `West EU (Paris)` ou une région proche de vos
     utilisateurs.
   - Le plan **Free** suffit pour démarrer.
5. Cliquez sur **Create new project** et patientez 1 à 2 minutes pendant le
   provisionnement de la base de données.

✅ Résultat attendu : le tableau de bord du projet s'affiche avec un menu
latéral (Table Editor, SQL Editor, Authentication, Storage, Settings…).

---

## Étape 2 — Créer les tables (exécuter `schema.sql`)

1. Dans le menu latéral du projet, cliquez sur **SQL Editor**.
2. Cliquez sur **New query**.
3. Ouvrez le fichier [`../supabase/schema.sql`](../supabase/schema.sql) de ce
   dépôt, copiez **tout son contenu** (les ~790 lignes), et collez-le dans
   l'éditeur.
4. Cliquez sur **Run** (ou `Ctrl+Entrée`).

✅ Résultat attendu : le message `Success. No rows returned`. Dans
**Table Editor**, vous devez voir les tables `profiles`, `shipments`, `bids`,
`routes`, `messages`, `payments`, etc.

> ⚠️ Le script est prévu pour un **projet neuf**. Si vous l'avez déjà exécuté
> et que vous relancez tout le fichier, des erreurs « already exists »
> apparaîtront — c'est normal, ne l'exécutez qu'une seule fois.

---

## Étape 3 — Récupérer les deux clés du projet

1. Dans le menu latéral, cliquez sur **Project Settings** (l'engrenage en bas).
2. Ouvrez l'onglet **API** (ou **API Keys** selon la version du dashboard).
3. Copiez deux valeurs :
   - **Project URL** — de la forme `https://xxxxx.supabase.co`
   - **anon public** key — une longue chaîne commençant par `eyJ...`

> Ne copiez jamais la clé `service_role` dans l'application : elle est
> secrète et réservée au serveur.

---

## Étape 4 — Créer le fichier `.env` dans le projet

1. Dans le dossier `TuniTransport/` du dépôt (celui qui contient
   `package.json`), copiez le fichier d'exemple :
   ```bash
   cp .env.example .env
   ```
2. Ouvrez `.env` et collez vos deux valeurs :
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
   (laissez `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` vide pour l'instant — Stripe
   est une étape séparée, voir la section 3 du [README](../README.md).)

---

## Étape 5 — Redémarrer l'application

```bash
npx expo start --clear
```

L'application détecte automatiquement les clés (`IS_LIVE === true` dans
`src/services/supabase.ts`) et bascule en mode live : l'inscription crée un
vrai compte Supabase Auth, et les envois sont enregistrés dans Postgres.

✅ Vérification rapide : créez un compte depuis l'écran d'inscription, puis
regardez dans le dashboard Supabase → **Authentication → Users** : votre
utilisateur doit apparaître, et une ligne correspondante dans la table
`profiles`.

---

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| L'app reste en mode démo | `.env` absent, mal placé ou variables vides | Le fichier doit être `TuniTransport/.env`, puis relancez `npx expo start --clear` |
| `Invalid API key` | Clé `anon` mal copiée (tronquée) | Recopiez la clé entière depuis Project Settings → API |
| Erreurs `relation ... does not exist` | `schema.sql` non exécuté | Refaites l'étape 2 |
| Erreurs `already exists` dans SQL Editor | Script exécuté deux fois | Sans gravité si la première exécution était complète |
