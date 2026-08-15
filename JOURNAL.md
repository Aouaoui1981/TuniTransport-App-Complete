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
