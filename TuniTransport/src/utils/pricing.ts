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
