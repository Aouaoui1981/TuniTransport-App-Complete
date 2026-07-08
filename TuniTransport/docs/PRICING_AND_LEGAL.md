# TuniTransport — Tarification & conformité légale

Document de référence pour l'équipe backend et pour l'intégration dans les
Conditions générales. Implémenté côté app dans `src/utils/pricing.ts`,
`src/content/legal.ts`, `src/components/LegalConsent.tsx` et
`src/screens/shared/LegalPageScreen.tsx`.

## 1. Règles de tarification

### 1.1 Colis standard — tarif au poids (`type = 'small'`)

| Règle | Valeur |
| --- | --- |
| Tarif | **4 € / kg** (`PRICE_PER_KG`) |
| Calcul | `prix = poids_kg × 4`, arrondi au centime (`computeWeightPrice`) |
| Condition d'éligibilité | Effets **personnels et ordinaires, sans caractère commercial** |
| Contrôle | Déclaration obligatoire de l'expéditeur (checkbox) à chaque publication |

Un envoi à caractère commercial est exclu du tarif au poids : il peut être
refusé ou requalifié par le transporteur, et engage la responsabilité de
l'expéditeur en cas de fausse déclaration.

### 1.2 Objets hors gabarit — accord personnalisé (`type = 'large'`)

Concerne tout objet impossible à tarifer au poids : réfrigérateurs,
téléviseurs, vélos, vélos électriques, pièces automobiles, meubles et
bagages volumineux (`OVERSIZED_EXAMPLES`).

Le prix résulte d'un **accord personnalisé**, selon deux mécanismes
complémentaires proposés par l'application :

1. **Entente directe** entre expéditeur et transporteur via la messagerie
   interne (in-app chat) ;
2. **Devis (quote) du transporteur**, toujours **négociable** par
   l'expéditeur avant acceptation.

## 2. Flux utilisateur — devis d'un objet hors gabarit

```
Expéditeur                          Plateforme                       Transporteur
────────────                        ──────────                       ────────────
1. Crée l'envoi "Gros objet"
   (description, dimensions,
   photos) + accepte les
   conditions (checkbox)  ────────► Annonce publiée  ──────────────► 2. Voit la demande dans
                                                                        "Demandes disponibles"
                                                                     3. Accepte les conditions
                                                                        (checkbox) puis envoie
                                    Devis enregistré  ◄──────────────   un devis NÉGOCIABLE
4. Reçoit le devis dans   ◄──────── (statut: pending)                   (prix + message + délai)
   "Offres reçues"
5a. « Négocier » ─────────────────► Conversation liée à l'envoi ◄──── répond, ajuste son offre
    (aller-retour libre dans le chat ; le transporteur peut
     soumettre un nouveau devis au prix convenu)
5b. ou « Accepter » directement ──► Devis accepté → transporteur
                                    assigné → paiement via la
                                    plateforme → suivi → livraison
```

Points de blocage (checkbox obligatoire, opération refusée sinon) :

- **Expéditeur** : à la publication de tout envoi (+ déclaration
  « non commercial » pour le tarif au poids).
- **Transporteur** : à l'envoi de tout devis et à toute prise en charge
  d'un colis standard.

Le consentement couvre trois documents : Conditions générales, Objets
interdits, Décharge de responsabilité.

### Persistance du consentement (mode live)

Les horodatages de consentement sont enregistrés en base au moment de
l'action (section « Consentement légal » de `supabase/schema.sql`) :

| Colonne | Table | Posé quand |
| --- | --- | --- |
| `terms_accepted_at` | `shipments` | l'expéditeur publie un envoi |
| `non_commercial_declared_at` | `shipments` | déclaration « non commercial » (colis au poids) |
| `transporter_terms_accepted_at` | `shipments` | le transporteur prend en charge un colis standard |
| `terms_accepted_at` | `bids` | le transporteur envoie un devis |

Côté client, les champs `termsAcceptedAt` / `nonCommercialDeclaredAt` /
`transporterTermsAcceptedAt` (types `Shipment` et `Bid`) sont renseignés par
les écrans au moment où la checkbox bloquante est validée, et transitent par
`api.ts` (`createShipment`, `updateShipment`, `createBid`). En mode démo, ils
restent en mémoire comme le reste des données simulées.

## 3. Pages de l'application

Six pages statiques (`src/content/legal.ts`), accessibles depuis
Profil et via les liens de la checkbox de consentement :

| Clé | Page | Consentement requis |
| --- | --- | --- |
| `terms` | Conditions générales | ✔ |
| `prohibited` | Objets interdits | ✔ |
| `disclaimer` | Décharge de responsabilité | ✔ |
| `privacy` | Politique de confidentialité | — |
| `about` | À propos de nous | — |
| `contact` | Nous contacter | — |
