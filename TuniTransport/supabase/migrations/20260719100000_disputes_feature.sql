-- ──────────────────────────────────────────────────────────────────────────
-- Signalements / litiges sur un envoi (perte, dommage, retard, non conforme…)
-- Le rapporteur (expéditeur ou transporteur de l'envoi) crée un signalement ;
-- l'administrateur le traite (en cours / résolu / rejeté) avec une réponse.
-- ──────────────────────────────────────────────────────────────────────────

do $$ begin
  if not exists (select 1 from pg_type where typname = 'dispute_status') then
    create type dispute_status as enum ('open', 'in_review', 'resolved', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'dispute_category') then
    create type dispute_category as enum ('lost', 'damaged', 'delay', 'not_as_described', 'no_show', 'other');
  end if;
end $$;

create table if not exists public.disputes (
  id           uuid primary key default gen_random_uuid(),
  shipment_id  uuid not null references public.shipments(id) on delete cascade,
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  category     dispute_category not null,
  description  text not null default '',
  status       dispute_status not null default 'open',
  admin_note   text,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create index if not exists idx_disputes_reporter on public.disputes (reporter_id, created_at desc);
create index if not exists idx_disputes_status on public.disputes (status, created_at desc);

alter table public.disputes enable row level security;

drop policy if exists "disputes_select" on public.disputes;
create policy "disputes_select" on public.disputes
  for select using (reporter_id = auth.uid() or public.is_admin());
-- Insertion uniquement via le RPC create_dispute (security definer).

create or replace function public.create_dispute(p_shipment_id uuid, p_category text, p_description text)
returns public.disputes
language plpgsql security definer set search_path = public as $$
declare v_d public.disputes; v_is_party boolean;
begin
  if auth.uid() is null then raise exception 'Non authentifié.'; end if;
  if p_category not in ('lost','damaged','delay','not_as_described','no_show','other') then
    raise exception 'Catégorie invalide.';
  end if;
  select exists(
    select 1 from public.shipments s
    where s.id = p_shipment_id and (s.sender_id = auth.uid() or s.transporter_id = auth.uid())
  ) into v_is_party;
  if not v_is_party then raise exception 'Envoi introuvable ou non autorisé.'; end if;
  insert into public.disputes (shipment_id, reporter_id, category, description)
  values (p_shipment_id, auth.uid(), p_category::dispute_category, coalesce(nullif(trim(p_description), ''), ''))
  returning * into v_d;
  return v_d;
end; $$;
revoke all on function public.create_dispute(uuid, text, text) from public, anon;
grant execute on function public.create_dispute(uuid, text, text) to authenticated;

create or replace function public.list_my_disputes()
returns setof public.disputes
language sql security definer set search_path = public stable as $$
  select * from public.disputes where reporter_id = auth.uid() order by created_at desc;
$$;
revoke all on function public.list_my_disputes() from public, anon;
grant execute on function public.list_my_disputes() to authenticated;

create or replace function public.list_disputes_admin()
returns table (
  id uuid, shipment_id uuid, reporter_name text, reporter_role text,
  category text, description text, status text, admin_note text,
  created_at timestamptz, resolved_at timestamptz
)
language sql security definer set search_path = public stable as $$
  select d.id, d.shipment_id,
         trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as reporter_name,
         p.role::text as reporter_role,
         d.category::text, d.description, d.status::text, d.admin_note,
         d.created_at, d.resolved_at
  from public.disputes d
  join public.profiles p on p.id = d.reporter_id
  where public.is_admin()
  order by (d.status in ('open','in_review')) desc, d.created_at desc;
$$;
revoke all on function public.list_disputes_admin() from public, anon;
grant execute on function public.list_disputes_admin() to authenticated;

create or replace function public.set_dispute_status(p_id uuid, p_status text, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs.'; end if;
  if p_status not in ('open','in_review','resolved','rejected') then
    raise exception 'Statut invalide.';
  end if;
  update public.disputes
  set status = p_status::dispute_status,
      admin_note = coalesce(nullif(trim(p_note), ''), admin_note),
      resolved_at = case when p_status in ('resolved','rejected') then now() else null end
  where id = p_id;
end; $$;
revoke all on function public.set_dispute_status(uuid, text, text) from public, anon;
grant execute on function public.set_dispute_status(uuid, text, text) to authenticated;
