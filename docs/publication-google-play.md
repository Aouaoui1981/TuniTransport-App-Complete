# Publication sur Google Play (bêta)

Guide de mise en test de l'app Android via **EAS Build** puis **Google Play
Console**.

Le projet est en workflow managé : `eas.json` produit déjà un **AAB** (Android
App Bundle) sur le profil `production`, format exigé par le Play Store. Les
dossiers `android/` et `ios/` sont regénérés à chaque build et ne sont pas
versionnés.

---

## Étape 0 — Prérequis (à faire une fois)

| Élément | Où | Coût |
|---|---|---|
| Compte Expo | <https://expo.dev> | gratuit |
| Compte Google Play Console | <https://play.google.com/console> | **25 $ une fois** |
| Clé Google Maps Android | Google Cloud Console | gratuit (quota) |

### Clé Google Maps

Les écrans carte (`MapScreen`, `RouteMapScreen`, `LiveTrackingScreen`) utilisent
`react-native-maps`, qui passe par Google Maps sur Android. **Sans clé, les
cartes s'affichent en gris.**

1. <https://console.cloud.google.com> → créer un projet.
2. **APIs & Services** → activer **Maps SDK for Android**.
3. **Credentials** → **Create credentials** → **API key**.
4. Restreindre la clé (recommandé) : *Android apps* → nom de package
   `com.tunitransport.app` + empreinte SHA-1 du certificat de signature
   (récupérable via `eas credentials`).

Puis l'enregistrer comme secret EAS :

```bash
eas secret:create --scope project \
  --name GOOGLE_MAPS_API_KEY_ANDROID --value <votre-clé>
```

`app.config.js` l'injecte dans la config Android au moment du build. Si la
variable est absente, le build réussit quand même — seules les cartes restent
vides, avec un avertissement en console.

---

## Étape 1 — Construire l'AAB

```bash
npm install -g eas-cli
eas login
cd TuniTransport
eas build --platform android --profile production
```

Le build tourne sur les serveurs d'Expo (~15–25 min). À la première exécution,
EAS propose de générer le **keystore** de signature : accepter, et le laisser
géré par EAS.

> ⚠️ Ce keystore est définitif : une fois l'app publiée, il est impossible de
> livrer une mise à jour signée avec un autre keystore. EAS le sauvegarde ;
> `eas credentials` permet d'en récupérer une copie.

Le build terminé, télécharger le fichier `.aab` depuis le lien fourni.

---

## Étape 2 — Créer l'app sur Play Console

1. <https://play.google.com/console> → **Créer une application**.
2. Nom : `THL`, langue par défaut : français, type : **Application**, **Gratuite**.
3. Renseigner les sections obligatoires du tableau de bord (voir Étape 3).

### Choisir la piste de test

| Piste | Testeurs | Examen | Usage |
|---|---|---|---|
| **Test interne** | jusqu'à 100, par e-mail | quasi immédiat | ✅ **commencer ici** |
| Test fermé | listes d'e-mails | examen complet | étape suivante |
| Production | tout le monde | examen complet | plus tard |

Pour une bêta, commencer par le **test interne** : disponible en quelques
minutes, sans attendre l'examen complet.

> **Comptes développeur personnels** : Google impose généralement une phase de
> test fermé (de l'ordre de 12 testeurs pendant 14 jours) avant d'autoriser la
> publication en production. Cela ne bloque pas le test interne, mais il faut
> l'anticiper. Vérifier la règle en vigueur dans la console — elle évolue.

---

## Étape 3 — Formulaires obligatoires

### Politique de confidentialité (URL publique requise)

Google exige une **URL accessible publiquement**. Le contenu existe déjà dans
l'app (`src/content/legal.ts` → *Politique de confidentialité*) mais n'est pas
encore exposé à une URL stable. À traiter avant soumission : publier la page,
puis renseigner son URL dans **Contenu de l'application → Politique de
confidentialité**.

### Sécurité des données (*Data safety*)

Déclarer les données collectées. Pour cette app :

| Donnée | Collectée | Raison |
|---|---|---|
| Nom, e-mail, téléphone | oui | compte utilisateur |
| Position précise | oui | suivi de livraison en direct |
| Photos | oui | photos de colis, pièce d'identité (KYC) |
| Informations de paiement | traitées par **Stripe** | l'app ne stocke aucune carte |
| Messages | oui | messagerie expéditeur/transporteur |

Cocher : données chiffrées en transit ✅, suppression de compte possible ✅
(la fonction existe déjà, cf. migration `delete_own_account`).

### ⚠️ Localisation en arrière-plan — point le plus sensible

Le manifeste généré contient `ACCESS_BACKGROUND_LOCATION` : le transporteur
partage sa position pendant la livraison (`useLiveTracking.ts`, avec service au
premier plan et notification permanente).

C'est un usage **légitime et accepté** (suivi de livraison), mais Google exige
une **déclaration d'autorisation sensible** comprenant :

1. une justification écrite de l'usage ;
2. une **vidéo de démonstration** montrant le parcours dans l'app qui déclenche
   le partage de position ;
3. la preuve que l'app fonctionne si l'utilisateur refuse.

C'est la **première cause de rejet**. Prévoir la vidéo à l'avance.

### Autres sections

- **Classification du contenu** : questionnaire (l'app n'a pas de contenu sensible).
- **Public cible** : 18 ans et plus.
- **Fiche du Store** : description courte + longue, icône 512×512, bannière
  1024×500, **au moins 2 captures d'écran** par format.

---

## Étape 4 — Envoyer la build

Manuellement : **Test interne** → **Créer une version** → téléverser l'`.aab`.

Ou automatiquement depuis EAS :

```bash
eas submit --platform android --profile production
```

`eas submit` demande un **compte de service Google** (Play Console → *Accès à
l'API* → créer un compte de service → télécharger la clé JSON). Pour une
première publication, le téléversement manuel est plus simple.

Ajouter ensuite les adresses e-mail des testeurs, copier le lien d'opt-in et le
leur transmettre.

---

## Ce qui a été préparé côté code

| Point | État |
|---|---|
| `eas.json` — profil `production` en AAB, `autoIncrement` | ✅ déjà en place |
| Clé Maps sortie du dépôt, injectée au build (`app.config.js`) | ✅ |
| `RECORD_AUDIO` bloqué — l'app ne capture que des images | ✅ |
| `SYSTEM_ALERT_WINDOW` bloqué — hérité du menu dev React Native | ✅ |
| `android/` et `ios/` ignorés par git | ✅ |
| URL publique de politique de confidentialité | ❌ à faire |
| Clé Google Maps réelle | ❌ à fournir |
| Vidéo de démo pour la localisation en arrière-plan | ❌ à produire |

### Vérification effectuée

`npx expo prebuild --platform android` a servi à contrôler le manifeste généré :

- sans la variable d'environnement, plus aucune trace de
  `YOUR_GOOGLE_MAPS_API_KEY` ; avec elle, la clé est bien injectée dans
  `com.google.android.geo.API_KEY` ;
- `RECORD_AUDIO` et `SYSTEM_ALERT_WINDOW` apparaissent avec
  `tools:node="remove"`, ce qui les retire du manifeste fusionné lors du build
  Gradle — ils seront absents de l'AAB livré.
