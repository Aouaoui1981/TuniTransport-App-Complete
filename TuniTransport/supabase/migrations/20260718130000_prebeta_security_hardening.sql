-- ──────────────────────────────────────────────────────────────────────────
-- Sécurisation pré-bêta (recommandations de l'advisor Supabase)
-- 1) search_path fixe sur les fonctions concernées (aucun changement de comportement)
-- 2) Retrait de l'exécution directe des fonctions internes (triggers/maintenance)
-- 3) Fin de l'énumération des fichiers dans les buckets publics (URL publique OK)
-- ──────────────────────────────────────────────────────────────────────────

-- 1)
alter function public.get_latest_shipment_locations(uuid[]) set search_path = public;
alter function public.review_identity(uuid, boolean, text) set search_path = public;
alter function public.list_pending_identities() set search_path = public;
alter function public.enforce_shipment_update() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.is_identity_verified() set search_path = public;
alter function public.is_admin() set search_path = public;
alter function public.protect_profile_columns() set search_path = public;

-- 2)
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.recompute_rating() from public, anon, authenticated;
revoke all on function public.protect_profile_columns() from public, anon, authenticated;
revoke all on function public.enforce_shipment_update() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.prune_shipment_locations() from public, anon, authenticated;

-- 3)
drop policy if exists "shipment_photos_select" on storage.objects;
drop policy if exists "review_photos_read" on storage.objects;
