-- ──────────────────────────────────────────────────────────────────────────
-- La vérification d'identité cesse d'être une condition d'accès.
--
-- Elle se refermait au pire endroit : quelqu'un installe l'application,
-- s'inscrit, veut envoyer un colis à sa mère — et on lui demande de
-- photographier une pièce d'identité avant qu'il ait rien vu du service.
-- Avec seize comptes débloqués à la main en quelques semaines pour que les
-- tests avancent, la porte ne protégeait plus personne : elle décourageait
-- seulement ceux qui n'avaient personne pour la leur ouvrir.
--
-- Ce qui est levé : les trois policies RESTRICTIVE qui barraient la
-- publication d'un envoi, d'une offre et d'un trajet.
--
-- Ce qui ne bouge pas, et c'est délibéré :
--   • la colonne `identity_status` et tout l'historique KYC ;
--   • le bucket `identity-documents` et les pièces déjà déposées ;
--   • l'écran de vérification, désormais volontaire ;
--   • l'écran d'administration qui valide ou refuse ;
--   • `is_identity_verified()`, conservée inutilisée — refermer la porte
--     plus tard ne demandera qu'une migration qui recrée ces trois
--     policies, pas de reconstruire la fonctionnalité.
--
-- La vérification devient un signal (un badge au profil) au lieu d'un
-- péage. Les textes de l'application sont corrigés dans le même lot :
-- promettre « identités vérifiées » quand plus rien ne l'impose serait
-- faux, et l'un de ces textes est une page légale.
-- ──────────────────────────────────────────────────────────────────────────

drop policy if exists "Must be verified to post a shipment" on public.shipments;
drop policy if exists "Must be verified to place a bid"     on public.bids;
drop policy if exists "Must be verified to post a route"    on public.routes;
