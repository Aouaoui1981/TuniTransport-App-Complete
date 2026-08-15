// ──────────────────────────────────────────────────────────────────────────
// TuniTransport — règles métier de tarification
//
// Deux régimes de prix :
//  1. Colis standard (type 'small') : tarif fixe au poids, PRICE_PER_KG €/kg.
//     Réservé aux effets personnels SANS caractère commercial — l'expéditeur
//     doit le certifier avant publication (checkbox obligatoire).
//  2. Objet hors gabarit (type 'large') : impossible à tarifer au poids
//     (réfrigérateur, TV, vélo, vélo électrique, pièces auto…). Le prix
//     résulte d'un accord personnalisé : devis négociable du transporteur
//     (enchère) et/ou négociation directe via la messagerie interne.
// ──────────────────────────────────────────────────────────────────────────

export const PRICE_PER_KG = 4; // € par kg — bagages personnels uniquement

// Frais de déplacement quand le transporteur vient chercher le colis chez
// l'expéditeur. Montant FIXE, et non proportionnel au poids : un trajet dans
// la ville coûte au transporteur la même chose qu'il emporte 3 kg ou 15.
// Déposer soi-même au point de collecte reste gratuit.
export const HOME_PICKUP_FEE = 8; // €

export function computeWeightPrice(weightKg: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return 0;
  return Math.round(weightKg * PRICE_PER_KG * 100) / 100;
}

// Exemples affichés à l'utilisateur pour orienter vers le régime "accord
// personnalisé" plutôt que le tarif au poids.
export const OVERSIZED_EXAMPLES = [
  'Réfrigérateur',
  'Téléviseur',
  'Vélo',
  'Vélo électrique',
  'Pièces automobiles',
  'Meubles et bagages volumineux',
] as const;

/** Prix total d'un colis au poids, frais de déplacement compris. */
export function computeTotalPrice(weightKg: number, handoverMode: 'home' | 'point'): number {
  const base = computeWeightPrice(weightKg);
  return Math.round((base + (handoverMode === 'home' ? HOME_PICKUP_FEE : 0)) * 100) / 100;
}
