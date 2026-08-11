# JOURNAL — TuniTransport

Règle: mettre à jour ce fichier À LA FIN de chaque session
(fait / reste à faire / fichiers touchés), puis commit + push.

---

## 2026-08-11 (suite) — « La connexion Google ne marche pas » (elle marchait)

### Fait
- [x] **Diagnostic par les logs, pas par intuition.** Le symptôme disait
      « Google est cassé » ; les logs d'auth Supabase disaient l'inverse —
      `/authorize → /callback 302 → Login → /user 200`, cinq fois de suite en
      trois minutes, chaque cycle suivi d'un `/logout` une seconde plus tard.
      La couche OAuth était saine ; **c'est l'app qui se déconnectait
      elle-même**. En base : `suspended = true` sur les deux profils.
      Sans les logs on aurait cherché du côté du client secret ou du redirect
      URI, c'est-à-dire pendant des heures au mauvais endroit.
- [x] **Déconnexion muette corrigée.** `login()` (mot de passe) expliquait déjà
      la suspension ; le listener `onAuthStateChange` — donc tout le chemin
      Google/Apple — se contentait d'un `signOut()` sans un mot. Même message
      affiché désormais. (PR #125)
- [x] **Trou dans la restauration de session.** La branche `getSession()` au
      démarrage ne vérifiait pas `suspended` du tout : une session déjà
      stockée rouvrait l'app à un compte suspendu entre-temps, la suspension
      ne prenant effet qu'au renouvellement du jeton. Même garde ajoutée.
- [x] Les deux comptes de test du propriétaire réactivés
      (`suspended = false`).

### Reste à faire
- [ ] **Comprendre l'origine de la suspension.** Si elle ne vient pas d'un
      essai du bouton « suspendre » dans l'écran admin, il faut chercher plus
      loin avant d'ouvrir la bêta.
- [ ] `tsc` n'a pas pu être exécuté en fin de session (refus de
      l'environnement) ; le build Cloudflare de la PR est passé.

### Fichiers touchés
- `TuniTransport/src/context/AuthContext.tsx`

---

## 2026-08-11 — Audit de sécurité + durcissement

### Fait
- [x] **Fuite de données personnelles corrigée (critique).** La policy de
      lecture de `profiles` était `using (true)` : n'importe quel compte
      authentifié — donc n'importe quel futur testeur de la bêta — pouvait
      lire la table entière par un simple `GET /rest/v1/profiles` : e-mails,
      téléphones, URL des pièces d'identité, `stripe_account_id`, `is_admin`.
      Lecture désormais restreinte à son propre profil (ou administrateur).
- [x] **Le seul besoin légitime préservé** : le téléphone du correspondant,
      pour l'appeler pendant une livraison. Il passe par la fonction
      `contact_phone(uuid)`, qui vérifie qu'une conversation est bien partagée
      avec la personne appelée avant de renvoyer le numéro.
- [x] **Stockage** : les buckets acceptaient n'importe quel fichier de
      n'importe qui, sans contrainte de dossier — un compte pouvait déposer
      des fichiers arbitraires servis publiquement sous notre domaine. Le
      chemin `<user_id>/…` est maintenant imposé. Ajout d'une policy de
      suppression de ses propres fichiers (droit à l'effacement), et
      plafonnement à 8 Mo / images uniquement.
- [x] **Surface `anon` réduite** : `accept_bid_transaction`, `is_admin`,
      `is_identity_verified`, `is_conversation_participant` ne sont plus
      exécutables que par un compte authentifié.
- [x] **Bucket `id-documents`** (doublon inutilisé, 0 fichier) : policies
      retirées. Le KYC écrit dans `identity-documents`.
- [x] **Vérifié en conditions réelles** : un utilisateur normal voit 1 profil
      (contre 8 avant), le téléphone d'un inconnu revient vide, celui d'un
      vrai correspondant revient bien (testé via une conversation temporaire,
      puis nettoyée).
- [x] Fausse alerte levée en cours d'audit : `set_payout_status` et
      `list_payout_requests_admin` semblaient sans garde, mais vérifient
      `profiles.is_admin` en interne. Aucune faille sur les paiements.

### Reste à faire
- [ ] **Activer « Leaked password protection »** (Supabase → Authentication →
      Passwords) : refuse les mots de passe connus des fuites publiques.
      Toujours signalé par les advisors.
- [ ] **Supprimer le bucket `id-documents`** depuis le tableau de bord :
      Supabase interdit le `DELETE` SQL direct sur `storage.buckets`.
- [ ] Tester l'appel téléphonique depuis une conversation réelle sur appareil.

### Fichiers touchés
- `TuniTransport/supabase/migrations/20260811100000_security_hardening_profiles_storage.sql` (nouveau)
- `TuniTransport/supabase/schema.sql`
- `TuniTransport/src/services/api.ts`, `src/screens/shared/ChatScreen.tsx`

---

## 2026-08-09/11 — Publication Google Play + connexion Google

### Fait
- [x] **Préparation Android** : l'inspection du manifeste généré par
      `expo prebuild` a révélé trois problèmes — la clé Maps était restée sur
      le littéral `YOUR_GOOGLE_MAPS_API_KEY` (cartes grises), et deux
      permissions sensibles inutiles étaient demandées (`RECORD_AUDIO`, ajoutée
      par expo-image-picker alors que l'app ne capture que des images, et
      `SYSTEM_ALERT_WINDOW`, héritée du menu dev React Native). Clé sortie du
      dépôt via `app.config.js`, permissions bloquées. (PR #120)
- [x] **Build depuis GitHub** : workflow `android-build.yml` déclenchable
      depuis l'onglet Actions, donc sans machine de développement — tout le
      travail de cette session s'est fait depuis un téléphone. (PR #121)
- [x] **Premier AAB produit** — keystore généré automatiquement par EAS.
- [x] **Pages légales publiques** générées depuis `src/content/legal.ts`
      (`npm run legal:html`) : Google Play exige une URL de politique de
      confidentialité atteignable sans connexion ni JavaScript, ce qu'une route
      interne de la SPA ne garantit pas. (PR #120)
- [x] **Textes de la fiche Store** rédigés, longueurs vérifiées contre les
      limites du Store. (PR #122)
- [x] **Compte développeur Play Console** créé (personnel, 25 $).
- [x] **Clé Google Maps** créée et restreinte (Maps SDK for Android + package
      `com.tunitransport.app` + SHA-1 du keystore de upload).
- [x] **Connexion Google réparée et fonctionnelle.** Les boutons étaient câblés,
      mais `signInWithOAuth` ne définissait `redirectTo` que sur le web : sur
      natif, Supabase renvoyait vers l'URL du site et l'app ne recevait jamais
      la session. Ajout du flux natif (expo-web-browser + lien profond
      `tunitransport://auth-callback`). Apple masqué hors iOS — le fournisseur
      suppose un compte Apple Developer payant, et un bouton qui échoue à coup
      sûr est pire que pas de bouton. (PR #122)
      Côté configuration, trois causes successives ont dû être levées, chacune
      identifiée dans les logs d'auth Supabase : provider non activé, puis
      `invalid_client` (secret non enregistré), puis Site URL pointant encore
      vers le Vercel hors service. **Vérifié : première identité `google` en
      base.**

### Reste à faire
- [ ] **Faire tourner le secret OAuth Google** — il a transité par une
      conversation. Le remplacer depuis un poste fixe et supprimer l'ancien
      (`0WbH`), l'interface Google Cloud étant difficilement utilisable sur
      mobile.
- [ ] **Après le premier envoi sur le Play Store** : Google re-signe l'app avec
      sa propre clé. Récupérer le SHA-1 dans *Play Console → Intégrité de
      l'application* et l'ajouter **à côté** de celui du keystore d'upload dans
      la clé Maps — sinon les cartes cesseront de fonctionner dans la version
      distribuée par le Store.
- [ ] **`Confirm email`** est actif alors qu'aucun service d'envoi n'est
      configuré : les rate limits de l'envoi intégré Supabase sont très bas et
      les messages partent souvent en spam. À désactiver pour la bêta, ou à
      faire précéder de la mise en place de Resend.
- [ ] Tester le flux OAuth natif sur un appareil (non exerçable depuis
      l'environnement de développement).
- [ ] Visuels du Store (captures, bannière 1024×500) et vidéo de démonstration
      pour la déclaration de localisation en arrière-plan.
- [ ] Vérifier les secrets Stripe avant tout paiement réel.

### Fichiers touchés
- `TuniTransport/app.config.js`, `app.json`, `.gitignore` (natifs générés),
  `src/context/AuthContext.tsx`, `src/components/SocialAuthButtons.tsx`,
  `scripts/generate-legal-pages.mjs` + `public/legal/*` (nouveaux),
  `package.json`.
- `.github/workflows/android-build.yml` (nouveau).
- `docs/publication-google-play.md`, `docs/fiche-store-google-play.md` (nouveaux).

---

## 2026-08-08 — Tableau de bord admin + remise en ligne (Cloudflare)

### Fait
- [x] **Tableau de bord admin enrichi** : `admin_stats()` étendue avec
      `open_disputes` et un résumé financier en euros (GMV, commissions, gains
      transporteurs, séquestre, versé, crédits de parrainage). Nouvelle section
      « Finances » (6 tuiles) + pastille de signalements ouverts. (PR #115)
- [x] **Supabase restauré** : le projet était `INACTIVE` (mise en pause
      automatique après ~7 jours d'inactivité sur l'offre gratuite), ce qui
      faisait aussi apparaître l'app comme cassée. Restauré → `ACTIVE_HEALTHY`,
      base vérifiée (8 comptes).
- [x] **Keep-alive Supabase** : workflow GitHub Actions quotidien (04h17 UTC)
      qui ping l'API REST pour empêcher la remise en pause. Premier run manuel
      vérifié `success`. (PR #116)
- [x] **Migration Vercel → Cloudflare** : le compte Vercel est suspendu pour
      solde impayé (« This deployment is temporarily paused » → *Your team has
      an overdue balance*). Bascule vers Cloudflare Workers :
      `wrangler.jsonc` (Worker d'assets statiques, repli SPA via
      `not_found_handling`) + `.env.production` versionné pour éviter toute
      saisie de variables côté hébergeur. (PR #117, #118)
- [x] **Correctif déploiement** : suppression de `public/_redirects` — Workers
      rejette la règle `/* /index.html 200` (boucle infinie, code 100324) et le
      déploiement échouait *après* un build réussi. (PR #119)
- [x] **Déploiement réussi** sur `tunitransport-app-complete`.

### Reste à faire
- [ ] Tester l'app en ligne de bout en bout (connexion, section Finances admin).
- [ ] Vérifier que les secrets Stripe côté Supabase sont toujours en place :
      5 `webhook_events` de juillet (dont un `payment_intent.succeeded`)
      prouvent que la config a fonctionné, mais la table `payments` est vide et
      rien n'a été testé depuis. Seul un vrai paiement le confirmera.
- [ ] Mettre à jour `CHECKOUT_SUCCESS_URL` / `CHECKOUT_CANCEL_URL` (secrets
      Supabase) vers le nouveau domaine Cloudflare.
- [ ] Domaine + Resend (e-mails de confirmation / réinitialisation) — non démarré.
- [ ] Décider du sort de Vercel : payer le solde ou retirer `vercel.json`.

### Fichiers touchés
- `TuniTransport/supabase/migrations/20260719230000_admin_stats_finance_and_actions.sql`
  (nouveau), `supabase/schema.sql`, `src/types/index.ts`, `src/services/api.ts`,
  `src/screens/shared/AdminDashboardScreen.tsx`.
- `.github/workflows/supabase-keepalive.yml` (nouveau).
- `TuniTransport/wrangler.jsonc`, `TuniTransport/.env.production` (nouveaux),
  `docs/deploiement-cloudflare.md` (nouveau).

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

---

## 2026-07-17 (suite) — Fix: logo redondant sur WelcomeScreen
### Fait
- [x] Rebase de la branche sur origin/main (redesign « Dark Premium » + font
      Plus Jakarta Sans déjà mergés via #80-#82).
- [x] WelcomeScreen : suppression du texte « THL. » redondant à côté du logo
      (le nouveau logo contient déjà « THL »); logo agrandi (52px).
### Note
- Erreur tsc locale « @expo-google-fonts/plus-jakarta-sans » = module non
      installé en local seulement (déclaré dans package.json, installé par CI).

---

## 2026-07-17 (suite) — Logo THL recolore en teal
### Fait
- [x] Lettres « THL » du logo recolorees en teal #2DD4BF (couleur accent),
      boite gardee orange. Regeneration de tous les assets (icon, favicon,
      splash, adaptive-icon, logo-mark, logo-full).

---

## 2026-07-17 (suite) — Fond fixe (fourgon THL) sur WelcomeScreen
### Fait
- [x] Nouvelle image de fond (fourgon THL, cote mediterranee) -> assets/hero-van.jpg.
- [x] WelcomeScreen : image de fond FIXE (ne defile plus) + voile sombre
      pour lisibilite ; le contenu scrolle par-dessus. Titre avec ombre.

---

## 2026-07-17 (suite) — Suppression de compte + e-mail d'approbation KYC
### Fait
- [x] Suppression de compte en libre-service (expediteur/transporteur) :
      RPC delete_own_account() SECURITY DEFINER supprime auth.users -> cascade
      sur profil et toutes les donnees. Garde-fous : refus si envoi en cours
      ou demande de retrait en attente. AuthContext.deleteAccount() + bouton
      « Supprimer mon compte » (double confirmation) dans ProfileScreen.
- [x] E-mail auto quand l'admin approuve une identite : edge function
      notify-verification (Resend, best-effort), invoquee apres reviewIdentity.
      api.notifyIdentityApproved().
- [x] Message « delai de verification 24 h max » ajoute : IdentityVerification
      (statut + alerte d'envoi), VerificationRequired (etat pending).
### Reste a faire
- [ ] Appliquer la migration delete_own_account en prod (via MCP ou SQL editor).
- [ ] Deployer la edge function notify-verification.
- [ ] Configurer Resend : secret RESEND_API_KEY (+ RESEND_FROM) sur le projet
      Supabase ; sans cela l'e-mail est simplement ignore (no-op).
### Fichiers touches
- supabase/schema.sql, supabase/migrations/20260717090000_delete_own_account.sql
- supabase/functions/notify-verification/index.ts
- src/services/api.ts, src/context/AuthContext.tsx
- src/screens/shared/ProfileScreen.tsx, AdminVerificationsScreen.tsx,
  IdentityVerificationScreen.tsx, src/components/VerificationRequired.tsx
