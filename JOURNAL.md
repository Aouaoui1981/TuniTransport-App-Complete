# JOURNAL — TuniTransport

Règle: mettre à jour ce fichier À LA FIN de chaque session
(fait / reste à faire / fichiers touchés), puis commit + push.

---

## 2026-08-11 (soir) — Play Console : application créée, « App content » bouclé

### Fait
- [x] **Application créée** dans la Play Console — `THL — Colis France
      Tunisie`, gratuite (choix irréversible), package `com.tunitransport.app`.
- [x] **Les dix déclarations « App content » passées à zéro** : politique de
      confidentialité, accès à l'app, publicité, classification du contenu,
      ID publicitaire, sécurité des données, public cible, fonctionnalités
      financières, santé, applications gouvernementales.
- [x] **Page publique de suppression de compte** créée — elle manquait et
      bloquait le formulaire *Data safety*. (PR #127)
- [x] **Compte de démonstration pour le relecteur Google** :
      `google.review@tunitransport.app`, rôle transporteur, identité forcée à
      `verified` en base. Sans lui, le relecteur bute sur l'écran de
      vérification d'identité et rejette — c'est une cause de refus courante.
      Rôle transporteur choisi à dessein : le partage de position en
      arrière-plan, point le plus sensible du dossier, n'est visible que là.
- [x] **Deux erreurs interceptées avant envoi.** Le questionnaire IARC avait
      été rempli avec « oui » à *partage public de nudité* **et** « oui » à
      *est-ce l'objet principal de l'app* — soit la déclaration d'une
      plateforme pornographique. Corrigé avant soumission.

### Constat qui engage la suite
- L'app déclare (à juste titre) que le contenu généré par les utilisateurs
  est sa source principale de contenu. La politique UGC de Google attend
  alors trois choses : contenu interdit défini ✅, **signalement** ✅
  (`ReportProblemScreen`, six catégories), **blocage** ❌ — absent.
  Ce n'est plus un confort mais une **condition de conformité**, et c'est
  aussi une vraie lacune produit : la messagerie met en relation de parfaits
  inconnus, et la seule réponse offerte à un utilisateur harcelé est
  aujourd'hui de signaler puis d'attendre.

### Reste à faire
- [ ] **Bouton « bloquer cet utilisateur »** — à implémenter avant l'envoi en
      revue (masque les messages, empêche toute nouvelle conversation).
- [ ] **Vidéo de démonstration de la localisation en arrière-plan.** La
      déclaration `Sensitive permissions` n'apparaîtra qu'**après** le premier
      envoi d'AAB, Google lisant les autorisations dans le fichier. Ne pas
      croire le compteur à zéro : il remontera.
- [ ] **Captures d'écran, icône 512, bannière 1024×500** pour la fiche Store.
- [ ] **Réunir 12 testeurs** — les 14 jours courent à partir du lancement du
      test fermé, en parallèle du reste. C'est le chemin critique.
- [ ] `support@tunitransport.app` est cité dans les pages légales alors que le
      domaine n'est pas détenu : le courrier d'un utilisateur se perd. À
      remplacer par une adresse réelle, ou à faire suivre.
- [ ] Détacher l'intégration Vercel (statut rouge permanent sur chaque PR).

### Fichiers touchés
- `TuniTransport/src/content/legal.ts`, `public/legal/delete-account.html`
  (+ régénération des huit autres pages)

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
- [ ] **AVANT D'OUVRIR LA BÊTA — faire tourner le secret OAuth Google.**
      Reporté sciemment, pas oublié. Le secret a transité par une
      conversation ; le risque réel est faible (il ne donne accès ni à la
      base, ni aux comptes, ni au compte Google — et Google ne délivre les
      jetons qu'à l'URL de rappel déjà enregistrée, que seul le titulaire du
      projet peut modifier). Ce qui reste possible est l'usurpation du nom de
      l'app dans un écran de consentement. Tant qu'il n'existe que les
      comptes du propriétaire, l'enjeu est nul ; il change le jour où des
      testeurs réels lient leur compte Google.
      Procédure sans coupure : Google Cloud → Credentials → client Web →
      `ADD SECRET` (Google accepte deux secrets simultanés) → coller dans
      Supabase → Google → tester une connexion → **puis seulement** supprimer
      l'ancien (`0WbH`).
- [ ] **Comprendre l'origine de la suspension.** Si elle ne vient pas d'un
      essai du bouton « suspendre » dans l'écran admin, il faut chercher plus
      loin avant d'ouvrir la bêta.
- [ ] **Détacher l'intégration Vercel du dépôt**
      (github.com/settings/installations) : le compte est bloqué, elle pose un
      statut « Account is blocked » en échec sur chaque PR. Sans danger, mais
      un rouge permanent finit par masquer un vrai échec.
- [ ] Bucket `id-documents` (0 fichier, 0 policy) : suppression depuis le
      tableau de bord.
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
- [x] ~~Activer « Leaked password protection »~~ — **impossible sur le plan
      gratuit** : le réglage (Authentication → Sign In / Providers → Email)
      est réservé au plan Pro. L'advisor restera donc en WARN, ce n'est pas
      un oubli. Compensé par les réglages gratuits de la même page :
      longueur minimale portée de 6 à 10 caractères et exigence de lettres +
      chiffres — ce qui rejette de fait les mots de passe des fuites
      publiques, qui sont courts et simples. À reprendre le jour d'un passage
      au plan Pro.
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

---

## 2026-08-13 — Publication Play Store : preparation de la beta fermee
### Fait
- [x] Durcissement securite livre (RLS `profiles` restreinte a son propre
      profil + admin, RPC `contact_phone`, policies storage par dossier
      `auth.uid()`, bucket `id-documents` retire du schema).
- [x] Sept correctifs UI/UX remontes par l'utilisateur sur appareil :
      clavier qui disparait sur Login/Register (OnboardingOverlay montait un
      `Modal` meme invisible), barre d'onglets collee au bord (safe area),
      alertes systeme grises -> AppAlertHost sur toutes les plateformes,
      fenetre Google habillee aux couleurs de l'app, cartes de la carte,
      bouton « Imprimer l'etiquette » (expediteur + statut `accepted`),
      double `StatusBar` sur WelcomeScreen.
- [x] Retrait des coordonnees bancaires du formulaire d'inscription
      transporteur (demandees au moment du retrait des gains uniquement).
- [x] Page publique « suppression de compte » + 10 declarations
      « App content » completees dans la Play Console.
- [x] Assets store generes : icone 512x512 et feature graphic 1024x500.
- [x] Build production AAB `1.0.0 (21)` depuis `936a291` — termine.
- [x] Livre blanc remis a jour : la publication Android passe en Phase 1
      (en cours) au lieu de Phase 2 (prevu) ; Phase 2 renommee
      « Automatisation & iOS » ; ligne capacites scindee Android (fait) /
      iOS (prevu).
### Reste a faire
- [ ] Tester l'APK `preview` sur appareil avant d'ouvrir la beta.
- [ ] Supprimer les donnees de demonstration (tous les id commencent par
      `5eed`) avant l'ouverture de la beta.
- [ ] Faire tourner le secret client Google OAuth (depuis un ordinateur).
- [ ] Supprimer le bucket `id-documents` cote dashboard Supabase.
- [ ] Main store listing : icone, feature graphic, 5 captures, descriptions.
- [ ] Collecter les 12 adresses Gmail des testeurs (compte a rebours 14 j).
- [ ] Acheter le domaine + boite `support@tunitransport.app` (cite dans les
      pages legales, le courrier se perd aujourd'hui).
- [ ] Fonction « bloquer un utilisateur » (condition de conformite UGC).
- [ ] Detacher les integrations GitHub Vercel et Expo (echecs permanents).
### Fichiers touches
- src/content/whitepaper.ts

---

## 2026-08-13 (suite) — Blocage d'un membre (conformite UGC Google Play)
### Fait
- [x] Table `blocked_users` (blocker_id, blocked_id) + RLS : chacun ne voit et
      ne gere que sa propre liste, personne ne peut savoir qui l'a bloque.
- [x] Fonctions `is_blocked_between(a,b)` et `conversation_is_blocked(conv)`
      en SECURITY DEFINER (elles doivent lire des lignes masquees par la RLS).
- [x] Policy `messages_insert` renforcee : un blocage dans un sens ou dans
      l'autre coupe l'envoi. Verrou serveur, pas seulement visuel.
      L'historique deja echange reste lisible ; seul l'envoi est coupe.
- [x] api.ts : fetchBlockedUserIds / blockUser / unblockUser.
- [x] DataContext : blockedUserIds, isBlocked, blockUser, unblockUser
      (mise a jour optimiste, rollback si le serveur refuse).
- [x] ChatScreen : bouton bloquer/debloquer dans l'en-tete, double
      confirmation, bandeau a la place de la barre de saisie quand bloque.
- [x] MessagesScreen : les conversations avec un membre bloque disparaissent
      de la liste et reviennent apres deblocage.
- [x] Nouvel ecran BlockedUsersScreen + entree « Membres bloques » dans le
      profil. Le nom vient de conversation_participants, la RLS interdisant
      depuis le durcissement de lire le profil d'un autre membre.
- [x] Migration appliquee en production sur `leuntmiyxqvetksfrjfm`.
      Verifie : table presente, 3 policies, 2 fonctions, `messages_insert`
      contient bien `conversation_is_blocked`. Un couple de participants
      reel renvoie `is_blocked_between = false`, donc la messagerie
      ordinaire n'est pas affectee.
### Piege a retenir
- Le compte Supabase contient DEUX projets. Celui de l'application est
      `leuntmiyxqvetksfrjfm` (« TronsporTN »). Les « timeouts » rencontres
      pendant cette session venaient d'un mauvais ref
      (`wocxvszzdfpbqlanpbgj`, projet vide), pas du reseau. Note ajoutee
      dans CLAUDE.md.
### Reste a faire
- [ ] Hors perimetre assume : un membre bloque peut encore enchérir sur un
      envoi. Le blocage ne couvre aujourd'hui que la messagerie.
### Fichiers touches
- supabase/migrations/20260813200000_block_users.sql, supabase/schema.sql
- src/services/api.ts, src/context/DataContext.tsx
- src/screens/shared/ChatScreen.tsx, MessagesScreen.tsx, ProfileScreen.tsx
- src/screens/shared/BlockedUsersScreen.tsx (nouveau)
- src/navigation/AppNavigator.tsx

---

## 2026-08-15 — Beta : build (23), nettoyage des donnees de demo
### Fait
- [x] Build production `1.0.0 (23)` depuis 8653e7d (merge #141) : contient le
      blocage, la correction du livre blanc et les sept correctifs UI.
      Build `preview` (APK) lance ensuite — teste sur appareil par
      l'utilisateur : « tout fonctionne ».
- [x] Donnees de demo supprimees en production (choix de l'utilisateur :
      lignes `5eed` uniquement). 3 envois, 1 conversation, 4 messages,
      1 avis, 1 offre, 2 trajets, 7 evenements de suivi. Verifie : 0 reste,
      10 comptes intacts, 2 envois et 2 trajets conserves.
### Erreur corrigee
- Les captures du store ne venaient PAS des lignes `5eed` : le bundle web
      exporte localement n'embarque aucune URL Supabase (pas de `.env`, donc
      IS_LIVE=false) et affiche les donnees fictives du code. J'avais donc
      differe le nettoyage pour une mauvaise raison. Corollaire : les gros
      aplats de couleur de l'ecran « Avis » viennent de MOCK_REVIEWS, pas de
      la base — les vider en base n'aurait rien change.
### Reste a faire
- [ ] Deux envois d'essai restent visibles : `9dc2` (Paris → « Sossa »,
      faute de frappe, 200 EUR) et `ae4c` (Paris → Sfax, 112 EUR). L'utilisateur
      a choisi de les garder.
- [ ] Main store listing + televersement de l'AAB (23).
- [ ] Rotation du secret Google OAuth ; suppression du bucket id-documents.
- [ ] Groupe Google des testeurs, puis Start rollout.
- [ ] Capture de la carte + video de la localisation en arriere-plan.

---

## 2026-08-16 — Etiquette : jeton de scan, papier minimal, scanner integre
### Fait
- [x] `shipments.label_token` (16 octets aleatoires, unique, defaut en base)
      + RPC `resolve_label(id, token)` SECURITY DEFINER. Rend les details
      complets a l'expediteur, au transporteur ATTITRE ou a un admin ;
      refuse les autres avec un code distinct (`LABEL_ASSIGNED_TO_OTHER`,
      `LABEL_TOKEN_INVALID`, `LABEL_FORBIDDEN`) pour un message juste.
- [x] Etiquette imprimee reduite : expediteur, ville de destination,
      destinataire, reference. Plus d'adresses completes, ni contenu, ni
      poids, ni prix, ni nom du transporteur.
- [x] QR = lien opaque `/l/<id>?k=<jeton>`. Un QR en clair ne cachait rien :
      toute application appareil photo en affichait le contenu.
- [x] `expo-camera` 57.0.3 + ecran ScanLabelScreen (scan sans ouvrir
      l'appareil photo du telephone), entree « Scanner une etiquette » dans
      le profil, permission declaree dans app.json.
- [x] Migration appliquee et VERIFIEE sur `leuntmiyxqvetksfrjfm` :
      expediteur -> sender, transporteur attitre -> transporter,
      autre membre -> REFUS LABEL_ASSIGNED_TO_OTHER,
      jeton errone -> REFUS LABEL_TOKEN_INVALID.
### Defaut trouve par le test
- `hmac()` est dans le schema `extensions` sur Supabase. La fonction fixant
      `search_path = public`, hmac etait introuvable et TOUT scan echouait.
      Corrige par une qualification explicite `extensions.hmac`. Le defaut
      n'aurait pas ete vu sans essai reel : tsc et l'export web passaient.
### Reste a faire / a discuter
- [ ] Confirmation de prise en charge par scan (le transporteur scanne,
      l'envoi passe en `collected`, l'expediteur est notifie). Statut
      `collected` deja dans le type mais RIEN ne le pose aujourd'hui : il
      n'existe aucune transition accepted -> collected dans l'application.
- [ ] Notification a l'expediteur : expo-notifications est installe mais il
      n'existe aucun envoi push serveur (aucune edge function). A batir.
- [ ] Accord du transporteur attitre pour qu'un autre prenne le colis.
### Fichiers touches
- supabase/migrations/20260816090000_label_token_and_scan.sql
- src/config/app.ts, src/services/shippingLabel.ts, src/services/api.ts
- src/types/index.ts, src/screens/shared/ScanLabelScreen.tsx (nouveau)
- src/screens/shared/ProfileScreen.tsx, src/navigation/AppNavigator.tsx
- app.json, package.json

---

## 2026-08-16 (suite) — Remise du colis : mode, point de collecte, preuve
### Fait
- [x] Deux modes de remise choisis a la creation : `point` (l'expediteur
      depose, sans frais) et `home` (le transporteur se deplace,
      +8 € fixes — HOME_PICKUP_FEE). Montant FIXE et non proportionnel au
      poids : le trajet coute pareil au transporteur quel que soit le colis.
- [x] Statut `dropped_off` ajoute a l'enum. Comblait un vrai trou : le
      statut `collected` existait mais RIEN ne le posait, une expedition
      passait de `accepted` a `delivered` sans que la prise en charge ne
      soit jamais constatee.
- [x] `declare_dropoff(id, photo)` — l'expediteur declare son depot avec
      photo. `confirm_collection(id, jeton, photo)` — le transporteur
      ATTITRE confirme, jeton de l'etiquette et photo obligatoires.
      Les deux ecrivent un evenement de suivi : l'IN-APP notification en
      decoule automatiquement (NotificationsScreen derive de
      trackingHistory), donc rien a batir de ce cote.
- [x] Point de collecte habituel, facultatif, dans le profil transporteur.
- [x] Carte « Preuve de remise » dans le detail : photo du depot + photo de
      la prise en charge.
- [x] Categorie de litige `handover_disputed` (« Prise en charge
      contestee ») : c'est le recours de l'expediteur, contrepartie du
      choix de NE PAS suspendre le statut a sa confirmation.
### Decisions assumees
- Pas d'attente de confirmation de l'expediteur (j'avais propose l'inverse
      puis me suis ravise) : suspendre le statut a la reponse d'un
      expediteur endormi bloquerait un transporteur deja au port. Le scan
      + la photo FONT la preuve ; le recours est le signalement.
- Limite connue : un transporteur qui aurait photographie l'etiquette a
      l'avance peut confirmer sans tenir le colis. La photo obligatoire
      releve le cout sans supprimer le risque. Pas de solution complete
      sans presence des deux parties — ce qui contredirait le cas d'usage.
### Verifie en base
- confirm_collection : expediteur -> REFUS, autre transporteur -> REFUS,
      jeton faux -> REFUS, sans photo -> PHOTO_REQUIRED, transporteur
      attitre -> statut `collected` + evenement de suivi (essai joue puis
      annule par sous-transaction, aucune donnee reelle modifiee).
### Reste a faire
- [ ] Notification push hors application (aucune edge function d'envoi).
- [ ] Transfert d'un colis a un autre transporteur avec accord du premier.
- [ ] Reprendre automatiquement le point de collecte du transporteur dans
      `handover_point` a l'acceptation (aujourd'hui le champ existe mais
      n'est rempli par aucun flux).
### Fichiers touches
- supabase/migrations/20260816110000_status_dropped_off.sql (nouveau)
- supabase/migrations/20260816120000_handover.sql (nouveau), schema.sql
- src/types/index.ts, src/utils/pricing.ts, src/services/api.ts
- src/screens/sender/CreateShipmentScreen.tsx
- src/screens/shared/ShipmentDetailScreen.tsx, ScanLabelScreen.tsx,
  EditProfileScreen.tsx, ReportProblemScreen.tsx, TrackingScreen.tsx
- src/components/index.tsx, src/content/disputes.ts

---

## 2026-08-16 (suite) — Le QR vise a la camera ne menait nulle part
### Le defaut
- Le QR imprime contient une URL `/l/<id>?k=<jeton>`. Concu pour le scanner
  integre — mais le premier reflexe de tout le monde est de viser avec
  l'appareil photo du telephone, qui ouvre le navigateur. Or aucune route
  `/l/` n'existait : on atterrissait sur la page d'accueil, sans rapport
  visible avec le colis. Impression d'un lien casse.
- Manque de conception de ma part, pas une erreur d'utilisation.
### Fait
- [x] `usePendingLabelLink` : retient le lien d'etiquette (URL initiale ou
      recue a chaud), y compris quand il arrive AVANT la connexion. Le
      navigateur passe par Welcome, l'utilisateur se connecte, et
      l'etiquette s'ouvre ensuite d'elle-meme.
- [x] Nouvel ecran `LabelViewScreen` (route `LabelView`) : meme contenu que
      le scanner, sans camera. Pas de bouton de prise en charge : confirmer
      exige le scanner de l'application, donc le colis sous les yeux.
- [x] Rendu extrait dans `components/LabelDetails.tsx`, partage par les deux
      chemins — le scanner ne duplique plus 80 lignes.
### Verifie
- Export web servi localement : `/l/<id>?k=<jeton>` repond 200 ; deconnecte
  -> page d'accueil ; apres connexion -> ecran « Etiquette » s'ouvre tout
  seul (« Lecture impossible » attendu ici, le build local est en mode demo).
### Attention
- Les builds `1.0.0 (24)` ont ete lances AVANT ce correctif : ils ne le
  contiennent pas. Un nouveau build est necessaire.
### Fichiers touches
- src/hooks/usePendingLabelLink.ts (nouveau)
- src/screens/shared/LabelViewScreen.tsx (nouveau)
- src/components/LabelDetails.tsx (nouveau)
- src/screens/shared/ScanLabelScreen.tsx, src/navigation/AppNavigator.tsx

---

## 2026-08-16 (suite) — Le contenu du colis n'etait JAMAIS demande
### Le defaut, trouve en scannant une vraie etiquette
- `items` existait dans le type, dans la table, s'affichait dans le detail
  de l'envoi ET dans l'etiquette scannee — mais AUCUN ecran ne le
  remplissait. Verifie en base : les deux envois reels ont `items = null`
  et `description = null`. Le scan ne montrait donc que le poids.
- Consequence reelle : le transporteur emporte un colis dont il ignore le
  contenu, alors que c'est lui qui repond a la douane. C'est exactement le
  risque discute a propos des objets interdits.
### Fait
- [x] Liste de contenu obligatoire a la creation d'un colis au poids :
      designation + quantite + poids par ligne, lignes ajoutables.
- [x] Le poids factures vient desormais de la SOMME des lignes. Afficher
      deux chiffres (total saisi vs somme declaree) aurait ete une
      invitation a la contestation.
- [x] Le contenu suit aussi a l'edition d'une annonce.
- [x] Livre blanc corrige : il affirmait « Le QR contient poids, contenu,
      expediteur, destinataire et transporteur » — faux deux fois depuis
      que le QR ne porte qu'un jeton, et faux de toute facon puisque le
      contenu n'etait jamais saisi.
### Reste a discuter
- [ ] « Signature de l'expediteur » demandee : voir la reponse — une
      signature au doigt a peu de valeur probante, et surtout elle est
      impossible dans le cas `point` ou l'expediteur depose et repart.
### Fichiers touches
- src/screens/sender/CreateShipmentScreen.tsx, src/content/whitepaper.ts

---

## 2026-08-16 — CLOTURE de la phase « developpement avant beta »
Derniere modification fonctionnelle avant la collecte des testeurs.
Build final : **1.0.0 (26)**, profils `production` (AAB) et `preview` (APK),
lances depuis `2b9f95f` (merge #146) — le HEAD exact de `main`.
Les builds (21) a (25) sont perimes : ne rien televerser d'autre que (26).

### Ce que contient (26) et que ne contenait pas (21)
- Durcissement securite : RLS `profiles`, storage par dossier, RPC
  `contact_phone`, bucket `id-documents` retire du schema.
- Sept correctifs UI releves sur appareil (clavier Login/Register, barre
  d'onglets, alertes aux couleurs de l'app, fenetre Google, etc.).
- Coordonnees bancaires retirees de l'inscription transporteur.
- Blocage d'un membre (conformite UGC Google Play).
- Etiquette : papier minimal + QR a jeton opaque + scanner integre.
- Lien d'etiquette ouvert a la camera -> ecran Etiquette (au lieu de la
  page d'accueil).
- Remise du colis : deux modes, `dropped_off`, preuve photo des deux cotes,
  point de collecte au profil, litige `handover_disputed`.
- Contenu du colis declare ligne par ligne ; poids = somme des lignes.
- Livre blanc remis en accord avec la realite (publication Android en
  phase 1, description exacte de l'etiquette).

### CHEMIN CRITIQUE — rien de tout cela n'a bouge
- [ ] Collecter 12 adresses Gmail (le compte a rebours de 14 jours ne
      demarre qu'une fois les 12 inscrits, PAS a la publication).
- [ ] Main store listing : icone, feature graphic, captures, textes.
      Assets deja produits et livres.
- [ ] Televerser l'AAB (26) dans Closed testing, SANS Start rollout.
- [ ] Creer le groupe Google `THL Beta` et le brancher comme liste de
      testeurs (evite d'ajouter les adresses une par une).
- [ ] Faire tourner le secret client Google OAuth (depuis un ordinateur) —
      l'ancien a transite par une conversation.
- [ ] Supprimer le bucket `id-documents` cote dashboard Supabase.
- [ ] Capture de la carte + video du suivi en arriere-plan (impossibles
      depuis le web : react-native-maps ne rend pas, la camera non plus).
- [ ] Domaine + `support@tunitransport.app` : cite dans les pages legales,
      le courrier se perd aujourd'hui.

### Idees mises en attente explicite
- Bon de remise (propose en remplacement d'une signature au doigt, dont la
  valeur probante est faible et qui est de toute facon impossible dans le
  mode `point`).
- Reprise automatique du point de collecte du transporteur dans
  `handover_point` a l'acceptation (le champ existe, aucun flux ne le
  remplit).
- Transfert d'un colis a un autre transporteur avec accord du premier.
- Notification push hors application (aucune edge function d'envoi).
- IA : filtrage des contenus interdits a la creation, puis traduction dans
  la messagerie. Rien avant la beta — et toute IA oblige a refaire les
  declarations App content / Data safety.

### Decision figee : identifiant de l'application
`com.tunitransport.app` est CONSERVE. Choix pris en connaissance de cause
avant le premier deploiement, seul moment ou il etait encore modifiable :
apres publication, l'identifiant de paquet Android est definitif, et en
changer reviendrait a publier une autre application (installations, notes
et avis perdus).

Le projet est ne « TuniTransport » puis a ete renomme THL ; l'interface a
suivi, les identifiants techniques non. Sans consequence visible : ce que
l'utilisateur voit s'appelle THL partout (nom sur le telephone, fiche du
store, logo). L'identifiant n'apparait que dans l'URL du store et dans
Parametres > Applications > details.

Ce qui, lui, reste libre :
- `slug` et `scheme` (internes, invisibles).
- Le nom de domaine. Il se change sans toucher au code : definir
  `EXPO_PUBLIC_APP_URL` au build suffit, et l'URL du QR des etiquettes
  suit automatiquement (cf. src/config/app.ts). A decider avant d'imprimer
  beaucoup d'etiquettes — le papier deja colle ne se met pas a jour.
- Les pages legales citent `support@tunitransport.app`, ce qui suppose ce
  domaine ; a trancher si la marque doit plutot vivre sur un `thl.*`.

### Bloqueur beta trouve et leve : OAuth Google etait en « Testing »
Google Auth Platform > Audience affichait `Publishing status: Testing`.
Consequences si la beta avait ete ouverte ainsi :
- seuls les comptes ajoutes a la main comme « test users » auraient pu se
  connecter avec Google — les 12 testeurs auraient ete refuses ;
- les sessions expirent au bout de 7 JOURS en mode Testing : les testeurs
  auraient ete deconnectes au milieu de la fenetre de 14 jours, ce qui
  aurait ressemble a un bug de l'application et non a un reglage Google.
Corrige : `Publish app` -> `In production`, sans demande de verification
(un seul domaine, et seulement les scopes de base email/profile/openid ;
la verification n'est exigee qu'au-dela de 10 domaines, avec un logo, ou
pour des scopes sensibles). C'etait aussi l'origine du triangle
d'avertissement sur le client OAuth `THL Supabase`.
Le plafond de 100 utilisateurs affiche sur cette page ne s'applique qu'aux
scopes sensibles non approuves : sans objet ici.

Note pour plus tard : la cle API Google (Maps) est restreinte a « Android
apps, 35 APIs ». C'est large pour une cle qui ne sert qu'aux cartes ; la
restreindre aux seuls SDK Maps limiterait les degats en cas de fuite.

---

## 2026-08-16 (suite) — Inscription Google : le role choisi etait ignore
### Le defaut, vu sur une video de l'utilisateur
Ecran « Creer un compte », role **transporteur** coche, bouton Google :
l'utilisateur se retrouvait connecte a un compte EXISTANT (Kamel Timoumi,
expediteur) sans un mot d'explication. Il croyait s'etre inscrit comme
transporteur et se retrouvait expediteur — de quoi conclure que
l'application est cassee.
Comportement normal d'OAuth (un compte Google = un compte), mais
presentation trompeuse.
### Fait
- [x] `SocialAuthButtons` accepte `preferredRole`, transmis par
      RegisterScreen depuis le role coche.
- [x] `signInWithProvider(provider, preferredRole?)` le memorise.
- [x] Au retour, si le compte existait deja avec un autre role, un message
      le dit explicitement au lieu de laisser l'utilisateur deviner.
- Pour un compte NEUF, rien ne change : l'ecran CompleteProfile demande le
  role juste apres, comme avant.
### Non traite, et pourquoi
L'ecran gris vide pendant l'ouverture de Google. Ce n'est pas notre rendu :
c'est le Chrome Custom Tab qui charge accounts.google.com. Le seul vrai
remede est la connexion Google NATIVE (selecteur de compte du systeme, sans
navigateur). Elle exige un client OAuth Android avec le SHA-1 du certificat
de signature — et avec Play App Signing, le SHA-1 qui compte pour les
testeurs est celui de Google Play, LISIBLE SEULEMENT APRES le televersement
de l'AAB. L'implementer a l'aveugle transformerait une gene visuelle en
echec total de la connexion Google (DEVELOPER_ERROR) pour les 12 testeurs.
A faire apres le televersement, avec le bon SHA-1 sous les yeux.
### Fichiers touches
- src/components/SocialAuthButtons.tsx, src/screens/auth/RegisterScreen.tsx
- src/context/AuthContext.tsx

---

## 2026-08-16 — SHA-1 de la cle de signature Google Play
AAB `1.0.0 (27)` televerse dans Closed testing (release encore en brouillon).
Play App Signing actif, donc l'empreinte qui compte pour les utilisateurs
installant depuis le Play Store est celle de GOOGLE, pas celle d'EAS :

    App signing key certificate — Classical key — SHA-1
    5F:CA:30:8A:8F:94:D6:E1:2A:44:E5:33:30:4A:38:57:84:14:09:90

Ce n'est pas un secret : une empreinte de certificat est publique par
nature, elle sert justement a etre declaree.

### Ce qu'elle debloque
1. **Cle API Maps** — aujourd'hui restreinte a « Android apps » avec la
   seule empreinte du build EAS (E5:D1:C6:76:AA:60:C...). Une application
   installee depuis le Play Store est resignee par Google : sans cette
   empreinte-ci ajoutee A COTE de l'autre, la carte restera VIDE chez les
   testeurs alors qu'elle fonctionne en APK local. Panne invisible depuis
   le poste du developpeur.
2. **Connexion Google native** — exige un client OAuth **Android** dans
   Google Cloud (package `com.tunitransport.app` + cette empreinte). Tant
   que ce client n'existe pas, tout code natif echouerait en
   DEVELOPER_ERROR ; l'ordre est donc : creer le client, puis coder.

### Reste bloquant pour la release (vu a l'ecran)
- Description complete manquante (Main store listing).
- Aucun pays/region selectionne sur le track.
- Permissions sensibles non declarees — tres probablement la localisation
  en arriere-plan, qui exige un formulaire ET une VIDEO de demonstration
  (YouTube non repertorie). C'est desormais un bloqueur dur, plus une
  tache optionnelle.
- Question Advertising ID a repondre (l'application n'en utilise pas).

---

## 2026-08-16 — Fiche Play Store et localisation en arriere-plan
Journee sans code : uniquement la constitution du dossier Google Play.

### Fait
- [x] **Video de demonstration** de la localisation en arriere-plan
      (83 s, telephone reel). Cinq prises ont ete jetees avant celle-ci :
      mauvais compte (expediteur au lieu du transporteur), arret avant
      l'ecran de suivi, arret sur la boite de dialogue, ecran d'accueil.
      La prise retenue montre la chaine complete : connexion transporteur,
      `Livraisons` > `Detail de l'envoi` > `Suivi de l'envoi` >
      `Suivi en direct sur la carte`, activation de `Partager ma position`,
      dialogue d'autorisation Android, page Parametres avec
      « Toujours autoriser », carte qui bouge (14 km/h), et le volet de
      notifications avec « Suivi THL actif ».
      Publiee en **Unlisted** (verifie en navigation privee) :
      https://www.youtube.com/watch?v=tZnJ9iaqt9w
- [x] **Main store listing** complete : nom `THL — Colis France Tunisie`,
      description courte et complete (fr-FR), icone, feature graphic,
      quatre captures telephone, lien video.
- [x] **AI asset declaration** : `Don't label assets`. Verifie a la source —
      l'icone vient de `icon512.html` et le bandeau de `banner.html`, deux
      rendus HTML/CSS captures par Playwright ; les captures et la video
      sont des enregistrements reels de l'application. Aucun modele
      generatif d'images n'est intervenu.

### Piege evite
Sur Android 11+, l'option « Toujours autoriser » **n'existe pas** dans la
premiere boite de dialogue : celle-ci ne propose que « Lorsque vous utilisez
l'appli » / « Uniquement cette fois-ci ». L'acces permanent se donne ensuite
dans une page de Parametres ouverte par l'application. Une video qui
s'arrete a la premiere boite ne montre donc pas ce que le relecteur cherche.

Autre piege : sur YouTube, **`Private` n'est pas `Unlisted`**. Un lien prive
affiche « Video unavailable » au relecteur, qui rejette la declaration sans
que la cause soit visible depuis la console.

### Reste avant `Start rollout`
- Coller le lien video + le texte anglais dans
  `App content` > `Sensitive app permissions` > background location.
- `App content` > Advertising ID : **No**.
- Pays/regions du track de test fermé.
- Douze adresses Gmail de testeurs, puis `Select testers`.

---

## 2026-08-16 (soir) — Dossier Play Console termine, beta lancee
Suite de la journee : tous les blocages de publication leves.

### Fait
- [x] **Declaration localisation en arriere-plan** (Sensitive app
      permissions). Champs limites a 500 caracteres — les textes ont du
      etre reecrits courts. Video YouTube en Unlisted fournie.
- [x] **Declaration Foreground service** — exigence Android 14 decouverte
      seulement a l'ecran « Preview and confirm » du track. Type declare :
      `Location`, tache : **User-initiated location sharing** (le
      transporteur active lui-meme le partage ; ce n'est ni de la
      navigation ni du geofencing).
- [x] Pays du track ferme : France + Tunisie.
- [x] Categorie `Travel & Local`, coordonnees de contact publiques.
- [x] Store listing fr-FR complet, AI asset declaration = « Don't label ».

### Deux pieges trouves sur le compte de revue Google
Le compte fourni au relecteur dans « App access » etait
`google.review@tuni-transport.app`. Le compte reel en base est
`google.review@tunitransport.app` — **sans tiret**. Un relecteur qui ne
peut pas se connecter rejette l'application sans autre explication.

Second piege, plus grave : ce compte, bien que transporteur verifie
(`identity_status = verified`), n'avait **aucune expedition**. Sans colis
accepte, l'onglet Livraisons est vide, donc ni `Detail de l'envoi`, ni
`Suivi de l'envoi`, ni `Suivi en direct sur la carte`. Le relecteur aurait
cherche la fonctionnalite decrite dans la declaration ET dans la video, ne
l'aurait pas trouvee, et aurait rejete sur ce point precis.

Une expedition de demonstration a donc ete inseree :

    id 29da0b3d-d275-471a-967c-46c621852ed6
    Paris -> Sfax, 6 kg / 24 EUR, statut `accepted`
    expediteur test@test.com, transporteur google.review@tunitransport.app

**A SUPPRIMER apres acceptation de l'application :**
`delete from shipments where id = '29da0b3d-d275-471a-967c-46c621852ed6';`

### Ce que « 12 testeurs / 14 jours » veut dire exactement
Ce n'est PAS une condition pour lancer le test ferme — c'est la condition
pour demander plus tard l'acces a la **production**, le compte etant un
compte personnel. Le test ferme peut donc demarrer avec trois testeurs,
et la liste s'enrichit ensuite. Le compteur de 14 jours ne court qu'a
partir du moment ou douze testeurs sont inscrits SIMULTANEMENT.
Conclusion : rien ne justifiait d'attendre douze adresses pour lancer.

### Navigation Play Console — a ne pas rechercher a nouveau
`App content` n'est ni sous `Test and release`, ni sous `Protected with
Play` (section securite : Play Integrity), ni sous `Setup`. Le chemin
fiable est `Publishing overview` > section `What you've told us`, ou les
mots « App content » sont des liens. Plus simple encore : la page
« Preview and confirm » du track liste chaque erreur bloquante AVEC un
lien direct vers le formulaire qui la corrige.

Identifiants de la console (publics) :
developer `6432491093805773697`, app `4975919036721887169`.

### Reste
- Liste d'e-mails testeurs, `Send changes for review`, `Start rollout`.
- Neuf testeurs supplementaires a trouver (les utilisateurs reels de la
  version web sont les meilleurs candidats).
- Non traite : connexion Google native, domaine propre + support@, bon de
  remise, notifications push serveur, filtrage IA des objets interdits.

### Soumis a Google — 16 aout 2026, 18h46
14 modifications envoyees pour revue depuis `Publishing overview`
(`Managed publishing off`, donc mise a disposition automatique des
testeurs des l'acceptation).

Track ferme : `Closed testing - Alpha`, AAB `1.0.0 (27)`, France + Tunisie,
liste `THL Beta` (3 testeurs), notes de version fr-FR.

A surveiller : les « quick checks » automatiques (~13 min) peuvent
signaler un probleme avant la revue humaine. Reponse de Google attendue
sous quelques heures a trois jours, par mail.

L'`opt-in URL` n'apparait dans l'onglet `Testers` qu'APRES acceptation —
inutile de le chercher avant.

### ACCEPTE — 16 aout 2026, ~19h50
Submission 1 : statut **Published**. Une heure entre l'envoi (18h47) et
l'acceptation. Les 14 modifications sont passees : piste `Closed testing -
Alpha` en `Start full rollout`, France + Tunisie, liste `THL Beta`, fiche
fr-FR, et les deux declarations sensibles (localisation en arriere-plan,
service au premier plan).

THL est desormais reellement present sur Google Play, en test ferme.

### Prochaines etapes
- Recuperer l'`opt-in URL` (onglet `Testers`) et inviter les trois
  testeurs ; en trouver neuf autres pour declencher le compteur des
  14 jours qui ouvre l'acces a la production.
- Apres stabilisation, supprimer l'expedition de demonstration
  `29da0b3d-d275-471a-967c-46c621852ed6`.

### Piege du lien de test — resolu le 16 aout au soir
Apres l'acceptation, le lien envoye aux testeurs etait

    play.google.com/store/apps/details?id=com.tunitransport.app

c'est-a-dire la fiche ordinaire du Store. Tout compte qui l'ouvre sans
etre INSCRIT au programme voit « Cet article n'est pas disponible dans
votre pays » — message trompeur, qui fait chercher un probleme de pays
ou de propagation la ou il n'y en a aucun. Deux personnes differentes ont
vu le meme ecran, ce qui a d'abord fait croire a un defaut de
configuration.

Le bon lien est le lien d'inscription (`opt-in URL`) :

    https://play.google.com/apps/testing/com.tunitransport.app

Il affiche « Become a tester » ; une fois clique, la page repond
« You are a tester » et la fiche Store devient installable. C'est CE
lien-la qu'il faut envoyer aux douze testeurs, jamais l'autre.

Verifie au passage cote console : release `27` = `Available to testers on
Google Play`, `Full rollout`, bundle `Active`. Rien n'etait casse.

### Pourquoi « pas disponible dans votre pays » — la vraie cause
Le lien d'inscription corrige, la page repondait bien « You are a tester »,
mais la fiche Store restait barree du message « Cet article n'est pas
disponible dans votre pays ».

Cause reelle, lue dans `Play Store > Parametres > General > Preferences
relatives au compte > Pays et profils` : le compte du testeur est
enregistre aux **Etats-Unis**. Le Play Store determine le pays d'apres le
pays du COMPTE Google (lie au moyen de paiement), pas d'apres la
localisation, la carte SIM ou la langue. Or la piste ne ciblait que la
France et la Tunisie.

Changer le pays d'un compte Google n'est possible qu'une fois par an et
exige un moyen de paiement local : ce n'est pas une solution.

Solution retenue : ouvrir la piste de test ferme a **tous les pays**
(174 + « rest of world »). C'est sans risque — la distribution d'un test
ferme est gouvernee par la LISTE D'E-MAILS, pas par la geographie :
personne hors de `THL Beta` ne peut installer, quel que soit son pays.
Le ciblage precis se fera au passage en production.

A retenir pour les douze testeurs : beaucoup de comptes Google de la
diaspora sont enregistres dans un pays tiers. Sans cette ouverture, le
probleme se serait repete testeur par testeur, avec a chaque fois un
message trompeur parlant de pays au lieu d'inscription.

### KYC des testeurs — verification artificielle, A ANNULER AVANT LE LANCEMENT
Trois ecrans sont fermes tant que `identity_status <> 'verified'` :
publier un envoi (`CreateShipmentScreen:358`), consulter les envois
disponibles (`AvailableShipmentsScreen:77`), publier un trajet
(`CreateRouteScreen:105`). Un testeur non verifie bute donc sur un mur des
la premiere minute et conclut que l'application ne marche pas.

Plutot que de collecter de vraies pieces d'identite aupres d'amis — des
donnees personnelles sensibles, avec les obligations que cela entraine —
les comptes de test sont passes a `verified` directement en base, sans
qu'aucun document ne soit televerse ni stocke.

Comptes ainsi verifies le 16 aout 2026 :
- benmohamedwajdi07@gmail.com (Wajdi Ben mohamed)
- walidchamkhi1981@gmail.com (Ala Aoioui)

Pas encore inscrits dans l'application, a traiter de la meme facon quand
ils le seront : timoumikamel75@gmail.com, amna.dahmanitn@gmail.com,
alac6878@gmail.com.

**A EXECUTER AVANT L'OUVERTURE AU PUBLIC :**

    update public.profiles
    set identity_status = 'unsubmitted', identity_reviewed_at = null
    where lower(email) in (
      'benmohamedwajdi07@gmail.com',
      'walidchamkhi1981@gmail.com',
      'timoumikamel75@gmail.com',
      'amna.dahmanitn@gmail.com',
      'alac6878@gmail.com'
    );

La fiche Play annonce « Identités vérifiées » et le livre blanc « 100 %
transporteurs verifies (KYC) ». Laisser en production des comptes marques
verifies sans piece justificative viderait cette promesse de sa substance
au premier litige.

## 2026-08-17 — Carte vide en production : cause trouvee
L'application installee depuis le Play Store affichait un cadre vide a la
place de la carte, alors que la meme carte fonctionnait dans la video
tournee la veille depuis un APK `preview`.

Quatre pistes explorees et ecartees une a une, toutes du cote Google Cloud :
empreinte SHA-1 de Play absente (elle etait deja enregistree), cle
differente de celle de l'application (identique), `Maps SDK for Android`
desactivee (activee), facturation non liee (liee). Aucune ne tenait.

La preuve est venue du journal de build EAS, phase **`Read app config`**.
La section `android` de la configuration resolue au moment du build ne
contenait **aucune entree `config.googleMaps`** — exactement ce que fait
`app.config.js` lorsque la variable manque :

    delete config.android?.config?.googleMaps;

L'AAB `1.0.0 (27)` a donc ete construit **sans aucune cle Maps**. Aucun
reglage dans la console Google Cloud ne pouvait y changer quoi que ce soit :
l'application n'envoyait pas de cle du tout.

### Pourquoi la variable n'arrivait pas
`GOOGLE_MAPS_API_KEY_ANDROID` existe bien dans EAS, cochee pour les trois
environnements. Mais les profils de `eas.json` ne declaraient **aucun**
environnement. Les variables d'environnement EAS etant rattachees a un
environnement, leur injection dependait d'un comportement implicite.
Corrige en ajoutant `"environment"` a chacun des trois profils.

### Ce que cet episode apprend
Un build `preview` qui marche ne prouve rien sur un build `production` :
ce sont deux environnements distincts. Et `app.config.js` a ete ecrit pour
ne PAS faire echouer le build quand la cle manque — choix defendable, mais
la panne devient alors silencieuse et n'apparait que chez l'utilisateur
final. Le journal `Read app config` est l'endroit ou la verifier.

### Verification a faire sur le build 28
Phase `Read app config` : la section `android` doit contenir

    "config": { "googleMaps": { "apiKey": "AIza..." } }

Sans cela, ne pas televerser.

### La cle Maps passe en clair dans app.json — 17 aout 2026
Le correctif precedent (declarer `environment` dans les profils de
`eas.json`) n'a rien change : le build `1.0.0 (30)`, construit sur le commit
de fusion de la PR #148, affiche bien `Environment: production` dans ses
metadonnees, et pourtant la section `android` de `Read app config` ne
contient toujours **aucune** entree `config.googleMaps`.

La variable `GOOGLE_MAPS_API_KEY_ANDROID` existe dans EAS, est bien
rattachee a l'environnement `production` (verifie en filtrant la liste sur
`production`), porte exactement ce nom — et n'arrive quand meme pas jusqu'a
`app.config.js`. La configuration est juste, l'acheminement ne fonctionne
pas, et il n'y avait plus rien a corriger de ce cote.

Decision : **ecrire la cle directement dans `app.json` et supprimer
`app.config.js`.**

Une cle Maps Android n'est pas un secret. Elle est extractible de n'importe
quel APK avec un outil gratuit ; sa seule protection reelle est la
restriction par nom de paquet (`com.tunitransport.app`) et par empreinte
SHA-1, deja en place pour la cle d'EAS et celle de Play. C'est aussi ce que
recommande Google : restreindre, pas dissimuler. Le depot etant public, la
cle y est visible — un scanner GitHub peut alerter, sans consequence.

Ce que l'indirection coutait : `app.config.js` etait ecrit pour ne PAS
faire echouer le build quand la cle manquait. La panne devenait donc
silencieuse et ne se manifestait que chez l'utilisateur final, apres
publication. Un jour entier et un AAB casse en production.

### AAB `1.0.0 (31)` soumis — 17 aout 2026, 19h08
Premier build ou la cle Maps est ecrite dans `app.json` (commit `5fd5d9b`,
fusion de la PR #149). Verifie a la source plutot que dans les journaux :
sur `origin/main`, `app.config.js` est bien supprime et `app.json` porte la
cle. Plus aucun code n'est en mesure de la retirer.

Televerse en test ferme, zero erreur (seul le message deobfuscation
subsiste, sans effet), envoye en revue.

Test decisif apres acceptation : ouvrir THL sur un telephone testeur,
onglet `Carte`. Si la carte s'affiche, l'affaire est close. Sinon, la cause
est ailleurs et il faudra lire `adb logcat` sur l'appareil — la
bibliotheque Maps y imprime le motif exact du refus.

### Carte : DEUX pannes superposees — 17 aout 2026, 19h40
Apres la mise a jour vers `1.0.0 (31)`, la carte n'etait plus noire mais
**grise avec le logo Google** dans un coin. Ce changement d'apparence etait
le signe que le premier correctif avait marche : la bibliotheque Maps
s'initialise desormais, donc la cle est bien presente dans le paquet.

Restait un refus cote serveur. Cause trouvee par un mail de Google : le
compte de facturation `01CCB1-5C710F-4DA6BE` etait **suspendu**, et vient
d'etre retabli apres paiement.

Les deux pannes etaient reelles et independantes :

1. l'AAB `27` etait construit sans aucune cle Maps (la variable EAS
   n'atteignait pas `app.config.js`) — ecran **noir** ;
2. la facturation Google Cloud etait suspendue — ecran **gris avec le
   logo Google**.

Corriger l'une sans l'autre n'aurait rien montre. C'est ce qui a rendu le
diagnostic si long : chaque verification cote Google Cloud (empreintes,
cle, API activee, facturation « liee ») paraissait correcte, et la
facturation affichait bien un compte LIE — un compte suspendu reste lie.

A retenir : sur une carte vide, distinguer les deux signatures.
Noir = pas de cle dans l'application. Gris + logo Google = cle presente,
refus du serveur (facturation, restrictions, quota).

Aucun nouveau build n'est necessaire : la cle est dans le paquet installe,
la facturation est active. Vider le cache de l'application suffit.

### RAPPEL — connexion Google native, a faire apres les 12 testeurs
Reporte le 18 aout 2026 a la demande de l'utilisateur, a reprendre des que
le test ferme atteint douze testeurs.

Aujourd'hui la connexion Google ouvre un Chrome Custom Tab qui affiche
« to continue to leuntmiyxqvetksfrjfm.supabase.co » : l'utilisateur voit une
chaine aleatoire au lieu du nom de l'application, precedee d'un ecran gris
de chargement. C'est le premier point de friction de tout le parcours.

La connexion native remplace cela par le selecteur de comptes du systeme :
pas de navigateur, pas d'URL, pas d'ecran gris.

Le prerequis qui manquait est desormais rempli : le client OAuth **Android**
existe dans Google Cloud avec l'empreinte SHA-1 de la cle de signature Play
(`5F:CA:30:8A:8F:94:D6:E1:2A:44:E5:33:30:4A:38:57:84:14:09:90`).

Cout : quelques heures de code, un build, une revue. La connexion par
e-mail et mot de passe reste inchangee — le risque est faible.

## 2026-08-18 — Carte : la cause etait la restriction de la cle
Apres avoir elimine une a une toutes les autres pistes, le test decisif a
ete de passer `Application restrictions` de `Android apps` a **`None`** sur
la cle Maps, sans rien reconstruire. Cinq minutes plus tard, cache de
l'application vide et application relancee : **la carte s'affiche**, avec
la France, la Tunisie, les marqueurs Paris et Tunis et la polyligne.

La cle, la facturation, l'API activee et le code etaient donc tous corrects.
Seul le VERROU de la cle bloquait.

### Ce que le test a permis d'ecarter
L'intuition etait de supprimer la cle et de tout recreer. Cela aurait coute
une cle a recreer, a restreindre, un `app.json` a modifier, un build, un
televersement et une revue — pour reproduire exactement la meme panne,
puisque la valeur de la cle n'etait pas en cause. Le test a `None` coute
deux clics et repond a la meme question.

### L'empreinte n'etait pourtant pas fausse
Comparee caractere par caractere avec celle du `App signing key
certificate` de la Play Console, l'empreinte enregistree etait identique
(20 octets, exacte). Le defaut se trouvait donc ailleurs dans l'entree —
tres probablement le NOM DE PAQUET, jamais visible en entier : la colonne
etait tronquee (`com.tunitran...`) sur toutes les captures. Une espace ou
un caractere manquant y suffit.

Impossible de le verifier apres coup : en enregistrant `None`, Google a
**supprime** les entrees de restriction (« No rows to display »). Elles ont
donc ete resaisies proprement, par copier-coller.

### Signature a retenir pour la prochaine fois
- Carte **noire**, pas de logo Google — aucune cle dans l'application.
- Carte **grise ou noire AVEC le logo Google** — cle presente, refus du
  serveur : facturation suspendue, ou restriction de cle.

### Piege des metriques
Les metriques de `Maps SDK for Android` accusent un retard pouvant aller
jusqu'a 24 h, contrairement aux API web. Une fenetre « 1 hour » vide ne
prouve donc RIEN. J'en avais conclu a tort que l'application n'emettait
aucune requete.

## 2026-08-19 — Connexion Google native
La connexion Google ouvrait un Chrome Custom Tab affichant « to continue to
leuntmiyxqvetksfrjfm.supabase.co » : une chaine aleatoire montree a
l'utilisateur au moment precis ou on lui demande son compte Google, precedee
d'un ecran gris de chargement. Premier point de friction du parcours.

### Fait
- [x] `@react-native-google-signin/google-signin` 16.1.4 + son plugin Expo
      declare dans `app.json`.
- [x] `GOOGLE_WEB_CLIENT_ID` dans `src/config/app.ts`. C'est le client
      **web** qu'il faut : Supabase verifie le jeton d'identite contre lui.
      Le client Android existe aussi mais ne s'ecrit nulle part — Google le
      reconnait au nom de paquet et a l'empreinte de signature. Un
      identifiant de client n'est pas un secret ; le secret associe, si.
- [x] `src/services/googleSignIn.ts` : sélecteur natif, puis
      `supabase.auth.signInWithIdToken`. Variante `.web.ts` qui se declare
      indisponible, pour que le module natif n'entre jamais dans le bundle
      navigateur (verifie : aucune trace dans `dist/`).
- [x] `logout()` coupe aussi la session Google locale — sinon Google
      reprend le dernier compte en silence et changer de compte devient
      impossible depuis l'application.

### Le parcours navigateur reste en place
Toute defaillance du natif — services Google Play absents, configuration
incomplete, `DEVELOPER_ERROR` — renvoie `unavailable`, et l'ancien parcours
prend le relais. Une connexion qui passe par un ecran laid vaut mieux
qu'une connexion qui ne passe pas. Le web est inchange.

### A verifier sur l'appareil apres le build
Le selecteur de comptes doit s'ouvrir SANS navigateur. S'il ouvre encore
Chrome, c'est que le natif a echoue en silence et que le repli a joue :
verifier alors le client OAuth Android (paquet + empreinte SHA-1 de la cle
de signature Play).

## 2026-08-19 — Domaine propre : thlcolis.com
Enregistre chez Cloudflare (10,46 $/an, renouvellement automatique jusqu'au
19 aout 2027, WHOIS masque). Court, sans tiret, et il dit ce que fait
l'application — trois defauts evites d'un coup : `thl-logistic` portait un
tiret (dont on a vu ce qu'il coute : `tuni-transport` a failli faire
echouer la revue Google) et un `logistic` au singulier, faute de langue en
francais comme en anglais.

### Fait
- [x] `thlcolis.com` et `www.thlcolis.com` relies au Worker
      `tunitransport-app-complete` (domaines personnalises, SSL emis).
- [x] Routage d'e-mails Cloudflare : `support@thlcolis.com` arrive dans la
      boite de l'equipe. Teste avec un vrai message.
- [x] `SUPPORT_EMAIL` corrige dans `legal.ts`, dix pages statiques
      regenerees.
- [x] `FALLBACK_APP_URL` passe de `…lasaadawewi2.workers.dev` a
      `https://thlcolis.com`.

### Deux vrais defauts corriges au passage
1. **Les pages legales promettaient une adresse morte.** Dix pages —
   conditions, confidentialite, remboursement, suppression de compte —
   citaient `support@tunitransport.app`, sur un domaine jamais achete.
   La page de suppression de compte demandait meme d'ecrire a cette
   adresse pour exercer ses droits. Chaque message rebondissait.
2. **L'ancienne adresse exposait le nom du compte.** Le QR d'une etiquette
   collee sur un colis menait a `…lasaadawewi2.workers.dev` : le nom du
   proprietaire, lisible par tout destinataire.

L'ancienne adresse reste servie par le meme Worker : aucune etiquette deja
imprimee ne casse.

### Reste
- Play Console > Store settings > Contact details : e-mail et site a
  basculer sur le nouveau domaine.
- Verifier l'e-mail ICANN dans les 14 jours, sous peine de suspension.

### Connexion Google sur le web — Google Identity Services
Le web souffrait du meme defaut que le mobile, en pire : la redirection
Supabase quittait entierement le site pour afficher
« to continue to leuntmiyxqvetksfrjfm.supabase.co ».

`googleSignIn.web.ts` — jusqu'ici un simple « indisponible » — implemente
desormais Google Identity Services : une fenetre legere par-dessus le
site, intitulee **du nom du site** (« Se connecter a thlcolis.com »), parce
que Google lit l'ORIGINE de la page et non l'URL de retour. On ne quitte
plus l'application.

Le bloc Google d'`AuthContext` a ete deplace AVANT la branche web : il
retournait auparavant trop tot et la variante web n'etait jamais appelee.
Un seul chemin couvre maintenant les deux plateformes, chacune resolvant
son propre fichier.

Replis en cascade, aucun fatal : script bloque, origine non declaree dans
la console Google, invite refusee recemment — tout renvoie `unavailable`
et la redirection Supabase reprend la main.

**Prerequis cote Google Cloud :** ajouter `https://thlcolis.com` (et
`https://www.thlcolis.com`) aux **Authorized JavaScript origins** du client
OAuth web. Sans cela l'invite ne s'affiche pas et le repli joue — donc
aucune casse, mais aucun gain non plus.

Verifie apres `expo export --platform web` : `gsi/client` present dans le
bundle, module natif absent.

## 2026-08-19 (soir) — Inscription bloquee sur l'indicateur de chargement
Deux testeurs ont signale que la creation de compte « restait en
chargement ». La base a tranche : les deux comptes existaient, confirmes,
avec leur profil — et les deux se sont reconnectes quelques minutes plus
tard sans difficulte. Ce n'etait donc ni le reseau ni le serveur.

### La course
Le profil est ecrit par un declencheur sur `auth.users`. `register()`
appelait `fetchProfile()` immediatement apres `signUp()` : sur une
connexion lente, la lecture precedait l'ecriture, `fetchProfile` renvoyait
`null`, `setUser` n'etait jamais appele — et le navigateur restait sur la
pile d'authentification. L'utilisateur voyait un ecran fige alors que son
compte venait d'etre cree. Il fermait l'application, la rouvrait, et se
retrouvait connecte : exactement ce qu'ils ont decrit.

### Corrige
- `fetchProfileWithRetry` : cinq tentatives sur ~2 s, le temps que le
  declencheur commite.
- Repli : si le profil manque toujours, la session etant valide, on ouvre
  l'application avec les donnees du formulaire. Le profil complet sera relu
  au rafraichissement suivant. Mieux vaut entrer avec un profil partiel que
  rester dehors avec un compte qui existe.
- `applyReferralCode` n'est plus attendu. Il etait annote « best-effort, ne
  bloque jamais l'inscription » et bloquait pourtant, le temps d'un
  aller-retour reseau de plus, juste avant la lecture du profil.

### Testeurs inscrits ce soir
- zainebchamkhi47@gmail.com (Zaineb Chamkhi)
- othmanmont@gmail.com (MONA OTHMAN)
Verifies en base comme les precedents. Total : six comptes.

### Aperçu des liens partagés — Open Graph
Un lien vers `thlcolis.com` colle dans WhatsApp, Messenger ou Facebook
n'affichait qu'un rectangle noir : `expo export` genere un `index.html`
minimal, en anglais, sans description ni image de partage. C'est la
premiere impression de quiconque recoit le lien — et le canal principal
de recrutement, puisque l'application ne sort pas dans les recherches
tant qu'elle est en test ferme.

`public/index.html` sert desormais de gabarit (verifie : Expo le reprend
et y injecte l'icone et le script). Il ajoute :
- `lang="fr"`, un titre parlant, une description
- les balises Open Graph et Twitter Card
- `theme-color` et un fond `#0A1420`, pour ne plus voir un flash blanc au
  chargement sur fond sombre

`public/og-image.png` (1200x630) est rendu aux couleurs de la marque.

### AAB `1.0.0 (38)` soumis — 20 aout 2026
Construit sur `68f04d0` (fusion de la PR #152). Contient, dans l'ordre
d'importance : le correctif de l'inscription bloquee sur l'indicateur de
chargement, la connexion Google native sur Android, la connexion Google
sans redirection sur le web, le domaine `thlcolis.com`, l'adresse
`support@thlcolis.com` et l'apercu Open Graph des liens partages.

Le correctif d'inscription est le plus urgent : deux testeurs sur six
l'avaient rencontre, et chaque nouveau testeur y etait expose.

### Origines JavaScript declarees
`https://thlcolis.com` et `https://www.thlcolis.com` ajoutees aux
**Authorized JavaScript origins** du client OAuth web.

Piege evite de justesse : l'origine `www` avait d'abord ete saisie dans
**Authorized redirect URIs**, en remplacant
`https://leuntmiyxqvetksfrjfm.supabase.co/auth/v1/callback`. Enregistrer
cela aurait casse la connexion Google partout, mobile compris — Supabase
renvoie l'utilisateur sur cette URL exacte et Google refuse toute adresse
non declaree. Corrige avant le `Save`.

A retenir : **origins** = depuis quel site le navigateur peut ouvrir
Google. **redirect URIs** = ou Google renvoie l'utilisateur, c'est-a-dire
le serveur Supabase, jamais le site.

### A verifier apres acceptation
1. Creer un compte neuf — l'application doit s'ouvrir sans rester figee.
2. Bouton Google — selecteur de comptes sans navigateur.
3. Onglet `Carte` — verification toujours en attente depuis la remise en
   place de la restriction de cle.

## 2026-08-21 — Inscription par Google sans accepter les conditions
Signale par l'utilisateur, enregistrement d'ecran a l'appui : creer un
compte via Google aboutissait **sans qu'aucun consentement n'ait ete
donne**.

La verification existait bien — `RegisterScreen.tsx:112` refusait la
soumission tant que la case n'etait pas cochee — mais elle vivait a
l'interieur de `handleRegister()`, c'est-a-dire sur le seul chemin
e-mail + mot de passe. `SocialAuthButtons` etait rendu plus bas, en
dehors de ce controle, et appelait `signInWithProvider` directement.

Ce n'est pas un defaut d'interface. Les Conditions generales et la
Politique de confidentialite fondent le statut d'intermediaire technique
de THL, la liste des objets interdits et la decharge de responsabilite.
Un compte cree sans les avoir acceptees affaiblit tout cela au premier
litige — et la fiche Play declare pourtant que ces textes s'appliquent.

### Corrige
- `SocialAuthButtons` accepte `blocked` et `onBlockedPress`. Bouton grise
  mais toujours pressable : une pression explique ce qui manque, la ou un
  bouton inerte n'aurait rien dit.
- `RegisterScreen` passe `blocked={!acceptedTerms}` et partage le meme
  message de refus entre les deux chemins (`warnTermsRequired`).
- `LoginScreen` reste inchange : les comptes existants ont deja accepte.

### Reste a faire un jour
Rien ne conserve la DATE d'acceptation cote profil. Les expeditions ont
`terms_accepted_at`, pas les comptes. En cas de contestation, on ne peut
prouver que la personne a accepte a l'inscription. A ajouter quand le
sujet reviendra.
