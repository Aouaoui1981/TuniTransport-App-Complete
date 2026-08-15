-- ──────────────────────────────────────────────────────────────────────────
-- THL — Blocage d'utilisateur
--
-- Google Play exige, pour toute application dont le contenu principal est
-- produit par les utilisateurs, un moyen de bloquer un autre membre depuis
-- l'application. Le signalement existe déjà (disputes) ; il manquait le
-- blocage.
--
-- Le blocage est unidirectionnel dans la table, mais ses effets sont
-- symétriques : dès que l'un des deux a bloqué l'autre, plus aucun message
-- ne circule dans les deux sens. C'est volontaire — sinon la personne
-- bloquée continuerait d'écrire dans le vide et le bloqueur découvrirait la
-- pile de messages en débloquant.
-- ──────────────────────────────────────────────────────────────────────────

create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocked_users_not_self check (blocker_id <> blocked_id)
);

create index if not exists blocked_users_blocked_idx
  on public.blocked_users (blocked_id);

alter table public.blocked_users enable row level security;

-- Chacun ne voit et ne gère que sa propre liste. Personne ne peut savoir
-- qui l'a bloqué : c'est la règle qui rend le blocage sûr.
drop policy if exists "blocked_users_select" on public.blocked_users;
create policy "blocked_users_select" on public.blocked_users
  for select to authenticated using (blocker_id = auth.uid());

drop policy if exists "blocked_users_insert" on public.blocked_users;
create policy "blocked_users_insert" on public.blocked_users
  for insert to authenticated with check (blocker_id = auth.uid());

drop policy if exists "blocked_users_delete" on public.blocked_users;
create policy "blocked_users_delete" on public.blocked_users
  for delete to authenticated using (blocker_id = auth.uid());

-- Vrai si l'un des deux a bloqué l'autre, dans un sens ou dans l'autre.
-- SECURITY DEFINER : la fonction doit lire les lignes de l'autre membre,
-- que la RLS ci-dessus masque.
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.blocked_users
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

revoke all on function public.is_blocked_between(uuid, uuid) from public;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

-- Vrai si un blocage existe entre l'appelant et un autre participant de la
-- conversation.
create or replace function public.conversation_is_blocked(conv_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conv_id
      and cp.user_id <> auth.uid()
      and public.is_blocked_between(auth.uid(), cp.user_id)
  );
$$;

revoke all on function public.conversation_is_blocked(uuid) from public;
grant execute on function public.conversation_is_blocked(uuid) to authenticated;

-- Le verrou serveur : même en contournant l'application, un membre bloqué
-- ne peut plus écrire. L'historique déjà échangé reste lisible ; seul
-- l'envoi est coupé.
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
    and not public.conversation_is_blocked(conversation_id)
  );
