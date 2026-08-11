-- ──────────────────────────────────────────────────────────────────────────
-- Durcissement de sécurité — audit du 11/08/2026
--
-- 1. profiles : la policy de lecture était `using (true)`. N'importe quel
--    compte authentifié pouvait donc lire la table entière (e-mails,
--    téléphones, URL des pièces d'identité, stripe_account_id, is_admin) par
--    un simple GET /rest/v1/profiles. Fuite de données personnelles et
--    manquement RGPD.
-- 2. Stockage : les buckets publics acceptaient n'importe quel fichier de
--    n'importe quel utilisateur, sans contrainte de dossier.
-- 3. Surface `anon` inutile sur des fonctions SECURITY DEFINER.
-- ──────────────────────────────────────────────────────────────────────────

-- ── 1. profiles : lecture restreinte ──────────────────────────────────────
drop policy if exists profiles_select on public.profiles;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Le seul besoin légitime de lire le profil d'autrui est le numéro de
-- téléphone du correspondant, pour l'appeler pendant une livraison
-- (ChatScreen). On l'expose par une fonction qui vérifie qu'une conversation
-- est bien partagée, plutôt que d'ouvrir la table.
create or replace function public.contact_phone(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.phone
  from public.profiles p
  where p.id = p_user_id
    and exists (
      -- une conversation commune suffit : elle n'existe qu'entre un
      -- expéditeur et le transporteur de son envoi.
      select 1
      from public.conversation_participants me
      join public.conversation_participants other
        on other.conversation_id = me.conversation_id
      where me.user_id = auth.uid()
        and other.user_id = p_user_id
    );
$$;

revoke execute on function public.contact_phone(uuid) from public, anon;
grant execute on function public.contact_phone(uuid) to authenticated;

-- ── 2. Stockage : rattacher chaque fichier à son propriétaire ─────────────
-- Le chemin d'upload est déjà `<user_id>/<fichier>` côté application ; on se
-- contente de l'imposer. Sans cela, tout compte pouvait déposer des fichiers
-- arbitraires dans un bucket public servi sous notre domaine.
drop policy if exists shipment_photos_insert on storage.objects;
create policy shipment_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shipment-photos'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

drop policy if exists review_photos_insert on storage.objects;
create policy review_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Permettre à chacun de supprimer ses propres fichiers (droit à l'effacement).
drop policy if exists own_photos_delete on storage.objects;
create policy own_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('shipment-photos', 'review-photos')
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

-- Plafonner les fichiers : 8 Mo, images uniquement.
update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('shipment-photos', 'review-photos', 'identity-documents');

-- ── 3. Réduire la surface exposée à `anon` ───────────────────────────────
-- accept_bid_transaction modifie des données ; sa garde interne rejette déjà
-- un appelant anonyme, mais le GRANT n'a aucune raison d'exister.
revoke execute on function public.accept_bid_transaction(uuid, uuid) from anon, public;
revoke execute on function public.is_admin() from anon, public;
revoke execute on function public.is_identity_verified() from anon, public;
revoke execute on function public.is_conversation_participant(uuid) from anon, public;

grant execute on function public.accept_bid_transaction(uuid, uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_identity_verified() to authenticated;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

-- ── 4. Bucket `id-documents` : doublon inutilisé ─────────────────────────
-- 0 fichier (l'application écrit dans `identity-documents`), et aucune policy
-- de lecture pour les administrateurs. On retire ses policies, ce qui le rend
-- inaccessible. La suppression du bucket lui-même passe obligatoirement par
-- l'API Storage — Supabase bloque le DELETE SQL direct sur storage.buckets.
drop policy if exists id_docs_insert on storage.objects;
drop policy if exists id_docs_select on storage.objects;
