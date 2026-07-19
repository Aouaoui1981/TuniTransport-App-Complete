-- ══════════════════════════════════════════════════════════════════════════
-- Moteur de parrainage : code par utilisateur, suivi, récompense automatique
--   Parrain : 10 € · Filleul : 5 € · délai 1 mois · plafond 20/mois
-- ══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null;

create unique index if not exists idx_profiles_referral_code on public.profiles (referral_code);

create or replace function public.gen_referral_code()
returns text language plpgsql set search_path = public as $$
declare c text;
begin
  loop
    c := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.profiles where referral_code = c);
  end loop;
  return c;
end; $$;

create or replace function public.set_referral_code()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.referral_code is null then
    new.referral_code := public.gen_referral_code();
  end if;
  return new;
end; $$;

drop trigger if exists trg_profiles_referral_code on public.profiles;
create trigger trg_profiles_referral_code
  before insert on public.profiles
  for each row execute function public.set_referral_code();

update public.profiles set referral_code = public.gen_referral_code() where referral_code is null;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'referral_status') then
    create type referral_status as enum ('pending', 'rewarded', 'expired');
  end if;
end $$;

create table if not exists public.referrals (
  id              uuid primary key default gen_random_uuid(),
  referrer_id     uuid not null references public.profiles(id) on delete cascade,
  referred_id     uuid not null unique references public.profiles(id) on delete cascade,
  status          referral_status not null default 'pending',
  referrer_reward numeric(10,2) not null default 10,
  referred_reward numeric(10,2) not null default 5,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '1 month',
  rewarded_at     timestamptz
);
create index if not exists idx_referrals_referrer on public.referrals (referrer_id, created_at desc);
alter table public.referrals enable row level security;
drop policy if exists "referrals_select" on public.referrals;
create policy "referrals_select" on public.referrals
  for select using (referrer_id = auth.uid() or referred_id = auth.uid() or public.is_admin());

create table if not exists public.referral_credits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  amount      numeric(10,2) not null,
  kind        text not null,
  referral_id uuid references public.referrals(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_referral_credits_user on public.referral_credits (user_id);
alter table public.referral_credits enable row level security;
drop policy if exists "referral_credits_select" on public.referral_credits;
create policy "referral_credits_select" on public.referral_credits
  for select using (user_id = auth.uid() or public.is_admin());

create or replace function public.apply_referral_code(p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_referrer uuid; v_created timestamptz;
begin
  if v_uid is null then raise exception 'Non authentifié.'; end if;
  if exists (select 1 from public.profiles where id = v_uid and referred_by is not null) then
    raise exception 'Un code de parrainage a déjà été utilisé pour ce compte.';
  end if;
  select id into v_referrer from public.profiles where upper(referral_code) = upper(trim(p_code));
  if v_referrer is null then raise exception 'Code de parrainage invalide.'; end if;
  if v_referrer = v_uid then raise exception 'Vous ne pouvez pas utiliser votre propre code.'; end if;
  select created_at into v_created from public.profiles where id = v_uid;
  if v_created < now() - interval '7 days' then
    raise exception 'Le code de parrainage doit être saisi peu après l''inscription.';
  end if;
  update public.profiles set referred_by = v_referrer where id = v_uid;
  insert into public.referrals (referrer_id, referred_id)
    values (v_referrer, v_uid)
    on conflict (referred_id) do nothing;
end; $$;
revoke all on function public.apply_referral_code(text) from public, anon;
grant execute on function public.apply_referral_code(text) to authenticated;

create or replace function public.reward_referral_for(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_ref public.referrals; v_month_count int;
begin
  select * into v_ref from public.referrals where referred_id = p_user and status = 'pending';
  if not found then return; end if;
  if now() > v_ref.expires_at then
    update public.referrals set status = 'expired' where id = v_ref.id;
    return;
  end if;
  select count(*) into v_month_count from public.referrals
    where referrer_id = v_ref.referrer_id and status = 'rewarded'
      and rewarded_at >= date_trunc('month', now());
  if v_month_count >= 20 then
    update public.referrals set status = 'expired' where id = v_ref.id;
    return;
  end if;
  update public.referrals set status = 'rewarded', rewarded_at = now() where id = v_ref.id;
  insert into public.referral_credits (user_id, amount, kind, referral_id) values
    (v_ref.referrer_id, v_ref.referrer_reward, 'referrer', v_ref.id),
    (v_ref.referred_id, v_ref.referred_reward, 'referred', v_ref.id);
end; $$;
revoke all on function public.reward_referral_for(uuid) from public, anon, authenticated;

create or replace function public.on_shipment_delivered_referrals()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    if new.sender_id is not null then perform public.reward_referral_for(new.sender_id); end if;
    if new.transporter_id is not null then perform public.reward_referral_for(new.transporter_id); end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_shipment_delivered_referrals on public.shipments;
create trigger trg_shipment_delivered_referrals
  after update on public.shipments
  for each row execute function public.on_shipment_delivered_referrals();

create or replace function public.my_referral_summary()
returns json language sql security definer set search_path = public stable as $$
  select json_build_object(
    'code', (select referral_code from public.profiles where id = auth.uid()),
    'balance', coalesce((select sum(amount) from public.referral_credits where user_id = auth.uid()), 0),
    'invited', (select count(*) from public.referrals where referrer_id = auth.uid()),
    'rewarded', (select count(*) from public.referrals where referrer_id = auth.uid() and status = 'rewarded'),
    'referred', (select referred_by is not null from public.profiles where id = auth.uid())
  );
$$;
revoke all on function public.my_referral_summary() from public, anon;
grant execute on function public.my_referral_summary() to authenticated;

create or replace function public.list_my_referrals()
returns table (referred_name text, status text, created_at timestamptz, rewarded_at timestamptz)
language sql security definer set search_path = public stable as $$
  select trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as referred_name,
         r.status::text, r.created_at, r.rewarded_at
  from public.referrals r
  join public.profiles p on p.id = r.referred_id
  where r.referrer_id = auth.uid()
  order by r.created_at desc;
$$;
revoke all on function public.list_my_referrals() from public, anon;
grant execute on function public.list_my_referrals() to authenticated;
