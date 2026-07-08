# TuniTransport

Application mobile React Native / Expo qui connecte des expéditeurs en France à des
transporteurs voyageant en ferry vers la Tunisie. Colis légers facturés 4€/kg,
objets volumineux mis aux enchères entre transporteurs. Interface entièrement en
français, devise EUR.

L'application démarre **immédiatement en mode démo** (aucune clé requise, données
simulées en mémoire) et devient **entièrement fonctionnelle en mode live** dès que
les clés Supabase et Stripe sont renseignées — sans modifier une seule ligne d'écran.

---

## 1. Démarrage rapide (mode démo)

```bash
npm install
npx expo install --fix   # aligne chaque paquet Expo sur votre version du SDK installée
npx expo start
```

Scannez le QR code avec l'app **Expo Go** (Android/iOS), ou lancez un émulateur.

> `npx expo install --fix` est indispensable : les versions figées dans
> `package.json` sont un point de départ raisonnable au moment de la génération de
> ce projet, mais l'écosystème Expo évolue vite. Cette commande recalcule
> automatiquement la bonne version de chaque paquet Expo pour le SDK réellement
> installé chez vous.

**Comptes de démonstration** (écran de connexion — boutons de pré-remplissage) :

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Expéditeur | `sender@demo.com` | `demo123` |
| Transporteur | `transport@demo.com` | `demo123` |

En mode démo, **n'importe quel e-mail/mot de passe** fonctionne : le rôle est
déterminé par la présence du mot « transport » dans l'e-mail saisi.

---

## 2. Comment fonctionne le mode démo / live

`src/services/supabase.ts` exporte :

```ts
export const IS_LIVE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
```

- **`IS_LIVE === false`** (aucune variable d'environnement) : `AuthContext` simule
  les comptes avec `AsyncStorage`, `DataContext` charge les données depuis
  `src/services/mockData.ts` et garde l'état en mémoire.
- **`IS_LIVE === true`** : `AuthContext` utilise Supabase Auth (session, profils),
  `DataContext` lit/écrit dans Postgres via `src/services/api.ts`, et les
  identifiants (`sender_id`, `transporter_id`, etc.) sont **toujours** dérivés de
  l'utilisateur authentifié — jamais d'un ID codé en dur.

Le même principe s'applique à Stripe (`src/services/stripe.ts`) via
`IS_STRIPE_LIVE`, et aux notifications push (`src/services/notifications.ts`).
**Aucun écran ne teste `IS_LIVE` directement** — toute la bascule est isolée dans
la couche `services/`.

---

## 3. Activer le mode live — Supabase

> 📖 **Guide détaillé pas à pas** (avec la création du compte et du projet
> Supabase, écran par écran) : [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md)

1. Créez un projet sur [supabase.com](https://supabase.com) (voir l'étape 1
   du guide détaillé ci-dessus).
2. Dans **SQL Editor**, exécutez le contenu de `supabase/schema.sql` (tables,
   enums, triggers, RLS, buckets Storage — tout est inclus, un seul script).
3. Dans **Project Settings → API**, copiez `Project URL` et `anon public key`.
4. Copiez `.env.example` en `.env` et renseignez :
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
5. Redémarrez `npx expo start` — l'app bascule automatiquement en mode live.

### Passerelle de paiement (Stripe)

La passerelle vit dans `supabase/functions/` (Deno, TypeScript) avec des
modules partagés dans `_shared/` (env strict, client Stripe REST avec
idempotence + retries, split financier, vérification de signature webhook,
accès données) :

- **`create-payment-intent`** — PaymentIntent pour le Payment Sheet natif
  (flux in-app actuel).
- **`create-checkout-session`** — session Stripe Checkout hébergée
  (flux web / redirection).
- **`stripe-webhook`** — source de vérité : vérifie la signature HMAC,
  déduplique les livraisons (`webhook_events`), enregistre l'issue dans le
  grand livre `payments` et **confirme automatiquement la réservation**
  (`paid_at` + événement de suivi) au `payment_intent.succeeded` /
  `checkout.session.completed`. Les échecs (`payment_failed`, session
  expirée, remboursement) sont journalisés avec le code d'erreur Stripe.

**Split financier** : chaque transaction est découpée en centimes entiers
entre la commission plateforme (`PLATFORM_FEE_PERCENT`, 10 % par défaut) et
la part du transporteur. Si le transporteur a un compte Stripe Connect
(`profiles.stripe_account_id`, géré côté serveur), le versement est routé à
la charge via `transfer_data[destination]` + `application_fee_amount` ;
sinon le montant reste sur la plateforme et le dû est tracé dans `payments`.

```bash
npx supabase login
npx supabase link --project-ref xxxxx

# Secrets — les clés ne vivent QUE dans les variables d'environnement serveur
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...      # ou sk_test_... en test
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...    # Dashboard → Webhooks
npx supabase secrets set PLATFORM_FEE_PERCENT=10            # optionnel (défaut 10)

npx supabase functions deploy create-payment-intent
npx supabase functions deploy create-checkout-session
npx supabase functions deploy stripe-webhook --no-verify-jwt   # auth = signature Stripe
```

Déclarez ensuite l'endpoint dans le Dashboard Stripe (**Developers →
Webhooks**) : `https://xxxxx.supabase.co/functions/v1/stripe-webhook`, avec
les événements `payment_intent.succeeded`, `payment_intent.payment_failed`,
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, `checkout.session.expired`,
`charge.refunded`.

Puis ajoutez la clé **publique** Stripe dans `.env` :
```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

⚠️ La clé secrète Stripe et le secret du webhook ne doivent **jamais**
apparaître dans le code client ni dans `.env` — ils vivent uniquement côté
serveur via `supabase secrets set` (chargés par `_shared/env.ts`, qui échoue
immédiatement si une variable requise manque).

---

## 4. Build & déploiement (EAS)

```bash
npm install -g eas-cli   # si pas déjà installé
eas login
eas build:configure      # renseigne extra.eas.projectId dans app.json
eas build --platform android --profile production
eas submit --platform android
```

`eas.json` définit trois profils : `development` (APK + dev client),
`preview` (APK interne) et `production` (AAB pour le Play Store).

### Cartes (react-native-maps sur Android)

Android exige une clé Google Maps pour afficher la carte (iOS utilise Apple
Maps par défaut, aucune clé requise). Remplacez le placeholder dans `app.json` :
```
android.config.googleMaps.apiKey
```
par une clé obtenue sur [Google Cloud Console](https://console.cloud.google.com/)
(API « Maps SDK for Android » activée).

### Suivi en direct (live tracking)

L'écran **Suivi en direct** (`LiveTrackingScreen`, accessible depuis l'écran de
suivi d'un envoi) affiche la position du transporteur en temps réel sur la carte :

- **Base de données** : table `shipment_locations` + RPC groupée
  `get_latest_shipment_locations(uuid[])` — la dernière position de N envois
  est lue en **une seule requête** (pas de N+1). Un trigger de rétention ne
  conserve que les 200 derniers points par envoi, et la table est publiée sur
  Supabase Realtime (la RLS s'applique aussi aux événements temps réel).
  Projet existant : exécutez la section « Suivi en direct » ajoutée à la fin
  de `supabase/schema.sql` ; projet neuf : le script complet suffit.
- **Frontend** : `src/hooks/useLiveTracking.ts` — abonnement Realtime avec
  repli par sondage, commits d'état throttlés (max 1 re-render / 2 s) et
  pattern `isMounted` (aucun setState/timer après démontage). Le transporteur
  assigné publie sa position via `expo-location` (interrupteur « Partager ma
  position »).
- **Cache** : `src/services/routeCache.ts` — les tracés d'itinéraires
  (arcs orthodromiques, données statiques) sont calculés une fois puis mis en
  cache RAM + AsyncStorage avec un TTL de 7 jours.
- **Mode démo** : sans Supabase, un véhicule simulé avance le long du tracé
  pour les envois `collected` / `in_transit` / `arrived`.

---

## 5. Structure du projet

```
App.tsx, index.ts          — point d'entrée, providers (Auth → Data → Navigation)
src/types/                 — modèles de données (User, Shipment, Bid, Route, …)
src/utils/theme.ts         — COLORS, SPACING, RADIUS, FONTS, SHADOWS
src/components/            — StatusBadge, RatingStars, Card, SectionHeader, EmptyState
src/context/                — AuthContext, DataContext (API identique démo/live)
src/services/               — supabase, api, payments, stripe, notifications, mockData
src/navigation/              — stack racine + tabs par rôle (expéditeur/transporteur)
src/screens/auth/            — Welcome, Login, Register
src/screens/sender/          — SenderHome, Shipments, CreateShipment
src/screens/transporter/     — TransporterHome, AvailableShipments, CreateRoute
src/screens/shared/          — ShipmentDetail, Tracking, BidList, Messages, Chat,
                                Payment, Profile, RateUser, EditProfile, Map
supabase/schema.sql           — tables, enums, triggers, RLS, buckets
supabase/functions/           — passerelle de paiement (Deno) : _shared/,
                                create-payment-intent, create-checkout-session,
                                stripe-webhook
assets/                       — icône, splash, favicon (placeholders — voir §6)
```

---

## 6. À savoir avant la mise en production

- **Icônes/splash** : `assets/icon.png`, `adaptive-icon.png`, `splash-icon.png` et
  `favicon.png` portent l'identité TuniTransport (colis sur ferry, croissant-étoile,
  dégradé bleu `#2563EB` aligné sur `src/utils/theme.ts`). L'icône adaptative Android
  respecte la zone de sécurité de 66 % ; le splash affiche le logo + le wordmark sur
  fond bleu.
- **Photos de colis** : le champ « Ajouter des photos » de `CreateShipmentScreen`
  est branché à `expo-image-picker` (caméra ou galerie, 5 photos max). En mode live,
  les photos sont téléversées dans le bucket public `shipment-photos` (Supabase
  Storage) via `uploadShipmentPhoto` et leurs URL publiques sont enregistrées dans
  `shipments.photos` ; en mode démo, les URI locales restent en mémoire. Les photos
  s'affichent dans la carte « Description » de `ShipmentDetailScreen`.
- **Messagerie** : conformément à la spec, il n'existe pas de fonction de création
  de conversation — les boutons « Message » retrouvent une conversation existante
  liée à l'envoi ou aux deux participants. S'il n'y en a pas, un message
  d'indisponibilité s'affiche.
- **Paiement 3-D Secure** : le Payment Sheet Stripe fonctionne pour les cartes
  standard. Pour les parcours d'authentification par redirection, pensez à passer
  un `returnURL` (basé sur le `scheme: "tunitransport"` déjà configuré) à
  `initPaymentSheet`.
- **Apple Pay** : `merchantIdentifier="merchant.com.tunitransport"` est déjà
  câblé dans `App.tsx` — sans effet tant qu'il n'est pas enregistré dans votre
  compte Apple Developer, mais prêt si vous activez Apple Pay.
- **Versions des dépendances** : générées pour l'écosystème Expo SDK 57 (juillet
  2026). `npx expo install --fix` reste la source de vérité si de nouvelles
  versions sont sorties entre-temps.

---

## 7. Règles métier (rappel)

- Petit colis : prix = `poids × 4€`, calculé en direct à la saisie.
- Gros objet : enchères entre transporteurs ; l'acceptation d'une offre fixe le
  prix, assigne le transporteur, passe le statut à `accepted`, et rejette les
  autres offres.
- Cycle de vie : `pending → accepted → collected → in_transit → arrived → delivered`
  (+ `cancelled`).
- La note moyenne d'un utilisateur et son nombre d'avis sont recalculés à chaque
  nouvelle évaluation (trigger SQL `recompute_rating`).
