// ──────────────────────────────────────────────────────────────────────────
// THL — Libellés des signalements / litiges (catégories & statuts)
// ──────────────────────────────────────────────────────────────────────────
import { DisputeCategory, DisputeStatus } from '../types';

export const DISPUTE_CATEGORY_LABEL: Record<DisputeCategory, string> = {
  lost: 'Colis perdu',
  damaged: 'Colis endommagé',
  delay: 'Retard important',
  not_as_described: 'Non conforme à l’annonce',
  no_show: 'Rendez-vous manqué',
  other: 'Autre',
};

export const DISPUTE_STATUS_LABEL: Record<DisputeStatus, string> = {
  open: 'Ouvert',
  in_review: 'En cours de traitement',
  resolved: 'Résolu',
  rejected: 'Rejeté',
};
