# JOURNAL — TuniTransport

Règle: mettre à jour ce fichier À LA FIN de chaque session
(fait / reste à faire / fichiers touchés), puis commit + push.

---

## 2026-07-17 (suite) — Refonte UI « Dark Premium » complète
### Fait
- [x] Redesign de `WelcomeScreen` (landing) : badge ferry, bandeau stats en
      dégradé, cartes de confiance, CTA dégradé. (PR #71)
- [x] Style « Dark Premium » (Méditerranée nuit) : ajout des tokens `DARK`
      dans `theme.ts` (fond dégradé cinématique, surfaces de verre, bordures
      hairline, accents bleu/sarcelle, halo CTA), Welcome refait en sombre.
      (PR #72)
- [x] Photo hero du ferry THL (`assets/ferry-hero.png`) en plein cadre sur
      Welcome, fondu vers le fond sombre. (PR #73)
- [x] **Application entière passée en sombre** en inversant les valeurs des
      tokens `COLORS` dans `theme.ts` (toutes les clés conservées). Correctifs
      ciblés : 1 fond blanc (AdminVerifications), 4 couleurs ambre codées en
      dur → `COLORS.accent`, `App.tsx` StatusBar `light` + thème de navigation
      sombre. (PR #74)
- [x] Lancement sombre : `app.json` `userInterfaceStyle: dark`, fonds splash /
      icône adaptative Android / racine en `#0A1420` (supprime le flash blanc).
      Logo vérifié lisible sur sombre. (PR #75)
- [x] `.gitignore` ajouté (caches Python des scripts skill). (PR #70)
### Reste à faire
- [ ] (optionnel) Micro-animations « scale » au press sur boutons/cartes.
- [ ] (optionnel) Empty states illustrés en sombre.
- [ ] Vérifier le contraste des écrans denses (Création d'envoi, Admin) sur device.
### Fichiers touchés
- TuniTransport/src/utils/theme.ts, TuniTransport/App.tsx,
  TuniTransport/app.json, TuniTransport/src/screens/auth/WelcomeScreen.tsx,
  TuniTransport/assets/ferry-hero.png (nouveau), + correctifs sombres :
  AdminVerificationsScreen, UserReviewsScreen, SenderHomeScreen,
  TransporterHomeScreen, CreateShipmentScreen. .gitignore (nouveau).

---

## 2026-07-17 — Config MCP + thème « Méditerranée »
### Fait
- [x] Ajout du serveur MCP `21st` (HTTP) au scope projet dans `.mcp.json`,
      clé API stockée en référence `${API_KEY_21ST}` (pas de secret commité).
      → PR #68 mergée dans `main`.
- [x] Rafraîchissement complet des design tokens (`utils/theme.ts`) via la
      skill `ui-ux-pro-max` : palette « Méditerranée » WCAG-AA (bleu mer
      profond `#1257A5` ~7:1, sarcelle `#0D9488`, ambre/sable `#E8890C`),
      ombres teintées marine, dégradés `GRADIENTS` (sea/sunset/mist),
      tokens ajoutés (onPrimary, accentDark, muted, overlay, poids de
      police, interlignes). Toutes les clés historiques conservées → tous
      les écrans profitent du rafraîchissement sans autre modification.
- [x] `theme.ts` sans erreur de type (typecheck complet impossible ici :
      `node_modules` non installé dans le clone frais — erreurs uniquement
      « Cannot find module », non liées au changement).
### À faire côté utilisateur (pour activer le MCP 21st)
- Définir `API_KEY_21ST` dans les variables d'environnement (claude.ai/code).
- Approuver le serveur MCP au prochain démarrage de session.
### Reste à faire
- [ ] (optionnel) Charger la police « Plus Jakarta Sans » via expo-font et
      brancher `FONTS.family` (placeholder « System » pour l'instant).
- [ ] Vérifier le rendu des écrans avec la nouvelle palette sur device.
### Fichiers touchés
- .mcp.json (nouveau), TuniTransport/src/utils/theme.ts, JOURNAL.md.

---

## 2026-07-16 — Session interrompue (limite hebdomadaire)
### Fait
- Typecheck en cours, non terminé (classifier Bash indisponible côté infra)
### Appliqué hors repo (via Claude chat, directement sur Supabase prod)
- Migration `create_admin_stats_function`: fonction `public.admin_stats()`
- Migration `create_payout_admin_functions`: fonctions
  `public.list_payout_requests_admin()` et `public.set_payout_status(uuid, text)`
- Les 3 fonctions sont SECURITY DEFINER, réservées aux admins
  (`profiles.is_admin = true`), EXECUTE retiré à `anon`
### Reste à faire
- [ ] Intégrer le nouveau theme "Méditerranée" (fichiers fournis séparément)

---

## 2026-07-16 (suite) — Reprise et finalisation
### Fait
- [x] 2 migrations admin rapatriées dans `TuniTransport/supabase/migrations/`
      (`20260716120000_create_admin_stats_function.sql`,
       `20260716120100_create_payout_admin_functions.sql`) — SQL déjà en prod,
      NON ré-appliqué.
- [x] `JOURNAL.md` + `CLAUDE.md` (règle « Journal de bord ») créés.
- [x] Typecheck terminé : `npx tsc --noEmit` → OK (0 erreur).
- [x] Build « Panneau admin — pouvoirs étendus » (commit `5bc9adf`) :
      gestion des utilisateurs (suspendre / vérifier / nommer admin),
      supervision des envois (annuler), modération des avis (supprimer),
      annonces diffusées à tous (broadcast → notifications).
### Base de données — À EXÉCUTER en prod (pas encore appliqué)
- La section « Panneau d'administration : pouvoirs étendus » à la fin de
  `TuniTransport/supabase/schema.sql` (colonne `profiles.suspended`, table
  `announcements`, RPC `list_users_admin`, `set_user_suspended`,
  `set_user_admin`, `admin_set_identity`, `list_shipments_admin`,
  `admin_cancel_shipment`, `list_reviews_admin`, `admin_delete_review`,
  `create_announcement`).
### Fichiers touchés (session)
- src/context/AuthContext.tsx, src/navigation/AppNavigator.tsx,
  src/services/api.ts, src/types/index.ts,
  src/screens/shared/AdminDashboardScreen.tsx, NotificationsScreen.tsx,
  + nouveaux : AdminUsersScreen, AdminShipmentsScreen, AdminReviewsScreen,
  AdminBroadcastScreen ; supabase/schema.sql.
### Reste à faire
- [ ] Theme "Méditerranée" (en attente des fichiers).

---

## 2026-07-17 — Connexion sociale (Google / Apple / Facebook)
### Fait
- [x] Boutons de connexion sociale (Google/Apple/Facebook) sur Login + Register
      (`SocialAuthButtons`, `supabase.auth.signInWithOAuth`).
- [x] Écran « Compléter mon profil » (`CompleteProfileScreen`) : après une
      connexion sociale, choix du rôle + nom + téléphone avant d'entrer.
- [x] Colonne `profiles.onboarded` + `handle_new_user` compatible OAuth
      (récupère nom/avatar du provider, `onboarded=false` si pas de rôle).
- [x] Gate de navigation : `isAuthenticated && !onboarded` → CompleteProfile.
- [x] `updateProfile` accepte désormais `role` et `onboarded`.
- [x] Typecheck OK.
### Base de données — À EXÉCUTER en prod (pas encore appliqué)
- Section « Connexion sociale + onboarding » à la fin de `schema.sql`
  (colonne `onboarded` + nouvelle version de `handle_new_user`).
### Setup Supabase requis (côté utilisateur, hors code)
- Activer chaque provider dans Auth → Providers (Google/Apple/Facebook) avec
  Client ID + Secret de chaque console développeur, et Redirect URL Supabase.
### Fichiers touchés
- src/components/SocialAuthButtons.tsx (nouveau),
  src/screens/auth/CompleteProfileScreen.tsx (nouveau),
  LoginScreen.tsx, RegisterScreen.tsx, AuthContext.tsx, AppNavigator.tsx,
  services/api.ts, types/index.ts, supabase/schema.sql.
### Reste à faire
- [ ] Exécuter la section SQL « connexion sociale » sur prod.
- [ ] Configurer les providers OAuth dans Supabase (Google d'abord).
- [ ] Theme "Méditerranée" (en attente des fichiers).

---

## 2026-07-17 (suite) — Nouveau logo THL
### Fait
- [x] Nouveau logo THL (boîte orange + THL bleu marine, fourni par
      l'utilisateur, fond transparent) intégré.
- [x] Régénération des assets via PIL depuis le PNG source :
      icon.png (fond blanc, iOS), adaptive-icon.png (transparent, zone sûre
      Android), favicon.png, splash-icon.png, logo-mark.png, logo-full.png.
- [x] WelcomeScreen (logo-mark) et WhitePaper (logo-full) affichent le
      nouveau logo automatiquement (resizeMode contain).
### Reste à faire
- [ ] SQL « connexion sociale » + providers OAuth (Google).
- [ ] Theme "Méditerranée".
