-- ──────────────────────────────────────────────────────────────────────────
-- THL — nouvelles valeurs d'énumération
--
-- `ALTER TYPE ... ADD VALUE` ne peut pas être suivi, dans la même
-- transaction, d'une requête qui utilise la valeur ajoutée. D'où ce fichier
-- séparé, appliqué avant la migration `handover` qui s'en sert.
--
--  • `dropped_off` : l'expéditeur a déposé le colis au point de collecte et
--    est reparti ; le transporteur ne l'a pas encore pris en charge. Sans
--    cet état intermédiaire, l'expéditeur pressé n'aurait aucune trace de
--    son dépôt.
--  • `handover_disputed` : recours de l'expéditeur contre une prise en
--    charge qu'il conteste. C'est la contrepartie du choix de ne PAS
--    suspendre le statut à sa confirmation.
-- ──────────────────────────────────────────────────────────────────────────

alter type shipment_status  add value if not exists 'dropped_off'       after 'accepted';
alter type dispute_category add value if not exists 'handover_disputed' after 'no_show';
