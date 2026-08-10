# Fiche Google Play — textes prêts à copier

Contenus de la fiche Store, à coller dans **Play Console → Développer sa
présence → Fiche principale du Store**.

> Positionnement volontairement prudent : THL est une **plateforme de mise en
> relation**, pas un transporteur. Les textes ne promettent ni assurance, ni
> délai garanti, ni prise en charge des marchandises — cohérent avec la
> *Décharge de responsabilité* de `src/content/legal.ts`, et sans promesse
> intenable en cas de litige.

---

## Nom de l'application (30 caractères max)

```
THL — Colis France Tunisie
```
*26 caractères.* Le nom seul (`THL`) n'évoque rien pour un utilisateur qui
découvre l'app ; y accoler la destination améliore nettement la découverte.

---

## Description courte (80 caractères max)

```
Envoyez vos colis entre la France et la Tunisie via des voyageurs vérifiés.
```
*75 caractères.* C'est le texte le plus lu de la fiche : il apparaît sous le
nom dans les résultats de recherche.

---

## Description complète (4 000 caractères max)

```
THL met en relation des expéditeurs en France et des voyageurs qui se rendent en Tunisie. Plutôt que de laisser des valises à moitié vides traverser la Méditerranée, la plateforme permet d'y confier un colis — et au voyageur d'être rémunéré pour la place disponible.

━━━━━━━━━━━━━━━━━━━━━━

POUR LES EXPÉDITEURS

• Publiez votre envoi en quelques minutes : photos, dimensions, adresses de collecte et de livraison.
• Tarif au kilo affiché avant validation, sans frais cachés.
• Pour les objets volumineux, recevez plusieurs offres de transporteurs et choisissez la vôtre.
• Suivez votre colis en temps réel sur une carte pendant le trajet.
• Échangez directement avec le transporteur via la messagerie intégrée.

POUR LES TRANSPORTEURS

• Déclarez votre trajet et l'espace disponible dans vos bagages.
• Consultez les envois qui correspondent à votre itinéraire.
• Proposez votre prix sur les objets volumineux.
• Suivez vos gains et demandez leur versement depuis l'application.

━━━━━━━━━━━━━━━━━━━━━━

CONFIANCE ET SÉCURITÉ

• Vérification d'identité : chaque compte est contrôlé par notre équipe avant toute mise en relation.
• Paiement sécurisé par carte via Stripe, ou en espèces à la remise du colis.
• Évaluations mutuelles après chaque livraison.
• Signalement d'un problème directement depuis l'envoi, traité par notre équipe.
• Liste claire des objets interdits, consultable à tout moment dans l'application.

━━━━━━━━━━━━━━━━━━━━━━

PARRAINAGE

Invitez vos proches : votre filleul et vous recevez un crédit utilisable sur vos prochains envois.

━━━━━━━━━━━━━━━━━━━━━━

COMMENT ÇA MARCHE

1. Créez votre compte et vérifiez votre identité.
2. Publiez un envoi, ou déclarez un trajet.
3. Mettez-vous d'accord sur le prix et la date.
4. Suivez la livraison jusqu'à la remise, puis évaluez.

━━━━━━━━━━━━━━━━━━━━━━

BON À SAVOIR

THL est une plateforme de mise en relation : le transport est assuré par les voyageurs inscrits, qui restent responsables des biens qui leur sont confiés. Les conditions générales, la politique de remboursement et la liste des objets interdits sont consultables dans l'application avant tout envoi.

L'application est en français et les montants sont affichés en euros.

Une question ? Écrivez-nous depuis l'onglet Assistance de l'application.
```

*≈ 2 200 caractères.*

---

## Autres champs

| Champ | Valeur |
|---|---|
| Catégorie | **Style de vie** (ou *Voyages et infos locales*) |
| Type | Application |
| Tarification | Gratuite |
| Public cible | **18 ans et plus** |
| E-mail d'assistance | l'adresse du compte développeur |
| Politique de confidentialité | `https://tunitransport-app-complete.lasaadawewi2.workers.dev/legal/privacy.html` |
| Site web | `https://tunitransport-app-complete.lasaadawewi2.workers.dev` |

> **Public cible : 18 ans et plus.** L'app implique paiements, vérification
> d'identité et messagerie entre inconnus. Déclarer une tranche d'âge
> inférieure déclencherait les obligations « Familles » de Google Play, bien
> plus contraignantes.

---

## Visuels à fournir

| Élément | Format | Note |
|---|---|---|
| Icône | 512 × 512 PNG | `assets/icon.png` existe — à exporter à cette taille |
| Bannière | 1024 × 500 PNG | En-tête de la fiche |
| Captures téléphone | min. 2, jusqu'à 8 | 16:9 ou 9:16, ≥ 320 px |

Captures à privilégier, dans cet ordre — les deux premières sont les seules
visibles sans faire défiler :

1. Accueil expéditeur (l'offre est immédiatement lisible)
2. Suivi en direct sur la carte (la fonctionnalité la plus parlante)
3. Création d'un envoi
4. Messagerie
5. Écran de paiement (illustre le côté sécurisé)

> Elles se capturent depuis la version web (mode mobile du navigateur) ou
> depuis l'APK de test — inutile d'attendre la publication.

---

## Rappel — déclaration d'autorisation sensible

`ACCESS_BACKGROUND_LOCATION` impose une justification écrite **et une vidéo de
démonstration**. Proposition de justification :

```
L'autorisation de localisation en arrière-plan permet au transporteur de partager sa position avec l'expéditeur pendant l'acheminement du colis, afin que celui-ci puisse suivre sa livraison en temps réel.

Le partage est strictement volontaire : il est déclenché manuellement par le transporteur pour un envoi donné, et s'arrête à la livraison. Une notification permanente reste affichée tant que le partage est actif. L'application reste pleinement utilisable si l'utilisateur refuse cette autorisation : seule la carte de suivi en direct devient indisponible.
```

La vidéo doit montrer le parcours dans l'app qui déclenche le partage, et la
notification permanente qui l'accompagne.
