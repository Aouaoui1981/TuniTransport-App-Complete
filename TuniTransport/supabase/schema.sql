-- ═══════════════════════════════════════════════════════════════════════
-- TuniTransport — Supabase schema (STEP 12)
-- Run this whole file in the Supabase SQL Editor on a fresh project.
-- Column names match src/services/api.ts exactly.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Enums ────────────────────────────────────────────────────────────────
create type user_role as enum ('sender', 'transporter');
create type shipment_type as enum ('small', 'large');
create type shipment_status as enum
  ('pending', 'accepted', 'collected', 'in_transit', 'arrived', 'delivered', 'cancelled');
create type bid_status as enum ('pending', 'accepted', 'rejected');

-- ── Tables ───────────────────────────────────────────────────────────────

-- 1-1 with auth.users
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  first_name    text not null default '',
  last_name     text not null default '',
  phone         text not null default '',
  role          user_role not null default 'sender',
  avatar_url    text,
  rating        numeric(3,2) not null default 0,
  total_ratings integer not null default 0,
  truck_details jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.routes (
  id                     uuid primary key default gen_random_uuid(),
  transporter_id         uuid not null references public.profiles(id) on delete cascade,
  departure_city         text not null,
  departure_country      text not null default 'France',
  arrival_city           text not null,
  arrival_country        text not null default 'Tunisie',
  departure_date         timestamptz not null,
  estimated_arrival_date timestamptz not null,
  available_capacity     integer not null check (available_capacity > 0),
  ferry_company          text not null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.shipments (
  id               uuid primary key default gen_random_uuid(),
  sender_id        uuid not null references public.profiles(id) on delete cascade,
  sender_name      text not null default '',
  transporter_id   uuid references public.profiles(id) on delete set null,
  transporter_name text,
  type             shipment_type not null,
  status           shipment_status not null default 'pending',
  weight           numeric(8,2),
  price            numeric(10,2),
  items            jsonb,
  description      text,
  photos           text[],
  dimensions       text,
  pickup_address   jsonb not null,
  delivery_address jsonb not null,
  selected_bid_id  uuid,
  collected_at     timestamptz,
  delivered_at     timestamptz,
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.tracking_events (
  id          uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status      shipment_status not null,
  description text not null,
  location    text,
  created_at  timestamptz not null default now()
);

create table public.bids (
  id                 uuid primary key default gen_random_uuid(),
  shipment_id        uuid not null references public.shipments(id) on delete cascade,
  transporter_id     uuid not null references public.profiles(id) on delete cascade,
  transporter_name   text not null default '',
  transporter_rating numeric(3,2) not null default 0,
  price              numeric(10,2) not null check (price > 0),
  estimated_delivery timestamptz not null,
  message            text,
  status             bid_status not null default 'pending',
  created_at         timestamptz not null default now()
);

create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  shipment_id uuid references public.shipments(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  display_name    text not null default '',
  primary key (conversation_id, user_id)
);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  text            text not null,
  read            boolean not null default false,
  created_at      timestamptz not null default now()
);

create table public.ratings (
  id            uuid primary key default gen_random_uuid(),
  shipment_id   uuid not null references public.shipments(id) on delete cascade,
  rater_id      uuid not null references public.profiles(id) on delete cascade,
  rated_user_id uuid not null references public.profiles(id) on delete cascade,
  stars         integer not null check (stars between 1 and 5),
  tags          text[],
  comment       text,
  created_at    timestamptz not null default now(),
  unique (shipment_id, rater_id)
);

create table public.push_tokens (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  token      text not null,
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

-- ── Indexes ──────────────────────────────────────────────────────────────
create index idx_shipments_sender      on public.shipments(sender_id);
create index idx_shipments_transporter on public.shipments(transporter_id);
create index idx_shipments_status      on public.shipments(status);
create index idx_tracking_shipment     on public.tracking_events(shipment_id);
create index idx_bids_shipment         on public.bids(shipment_id);
create index idx_bids_transporter      on public.bids(transporter_id);
create index idx_routes_transporter    on public.routes(transporter_id);
create index idx_messages_conversation on public.messages(conversation_id);

-- ── Trigger: auto-create profile on sign-up ──────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'sender')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Trigger: recompute rating average on new rating ──────────────────────
create or replace function public.recompute_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles p
  set rating = sub.avg_stars,
      total_ratings = sub.cnt
  from (
    select round(avg(stars)::numeric, 2) as avg_stars, count(*) as cnt
    from public.ratings
    where rated_user_id = new.rated_user_id
  ) as sub
  where p.id = new.rated_user_id;
  return new;
end;
$$;

create trigger on_rating_inserted
  after insert on public.ratings
  for each row execute function public.recompute_rating();

-- ── RPC: accept a bid atomically (called from src/services/api.ts) ────────
-- Marks the chosen bid accepted, rejects the others, assigns the transporter
-- and logs a tracking event — all in one transaction, sender-only.
create or replace function public.accept_bid_transaction(
  p_shipment_id uuid,
  p_bid_id      uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_shipment public.shipments%rowtype;
  v_bid      public.bids%rowtype;
begin
  select * into v_shipment
  from public.shipments
  where id = p_shipment_id
  for update;
  if not found then
    raise exception 'Envoi introuvable.';
  end if;
  if v_shipment.sender_id <> auth.uid() then
    raise exception 'Seul l''expéditeur peut accepter une offre.';
  end if;
  if v_shipment.status <> 'pending' then
    raise exception 'Cet envoi n''est plus en attente d''offres.';
  end if;

  select * into v_bid
  from public.bids
  where id = p_bid_id and shipment_id = p_shipment_id
  for update;
  if not found then
    raise exception 'Offre introuvable pour cet envoi.';
  end if;
  if v_bid.status <> 'pending' then
    raise exception 'Cette offre n''est plus disponible.';
  end if;

  update public.bids set status = 'accepted' where id = p_bid_id;
  update public.bids
  set status = 'rejected'
  where shipment_id = p_shipment_id and id <> p_bid_id and status = 'pending';

  update public.shipments
  set status           = 'accepted',
      transporter_id   = v_bid.transporter_id,
      transporter_name = v_bid.transporter_name,
      price            = v_bid.price,
      selected_bid_id  = p_bid_id
  where id = p_shipment_id;

  insert into public.tracking_events (shipment_id, status, description, location)
  values (
    p_shipment_id,
    'accepted',
    'Offre acceptée — pris en charge par ' || v_bid.transporter_name,
    null
  );
end;
$$;

revoke execute on function public.accept_bid_transaction(uuid, uuid) from public;
grant execute on function public.accept_bid_transaction(uuid, uuid) to authenticated;

-- ── Trigger: protect moderated profile columns ─────────────────────────────
-- RLS lets users update their own profile row, but reputation and KYC status
-- must never be self-served. Internal (definer/service) writes still pass.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if new.rating is distinct from old.rating
     or new.total_ratings is distinct from old.total_ratings then
    raise exception 'La réputation est en lecture seule.';
  end if;
  if new.identity_status is distinct from old.identity_status
     and new.identity_status <> 'pending' then
    raise exception 'Le statut d''identité est géré par l''équipe de vérification.';
  end if;
  if new.identity_reviewed_at is distinct from old.identity_reviewed_at then
    raise exception 'Champ réservé à l''équipe de vérification.';
  end if;
  return new;
end;
$$;

-- (created after the KYC columns exist — see end of file)

-- ── Trigger: constrain what a transporter may change on a shipment ────────
-- ── Trigger: constrain shipment updates (Security Hardening) ─────────────
-- Protects financial and assignment integrity. Sensitive columns are locked
-- for everyone but the system (service_role/RPC). Senders are locked once
-- a bid is accepted. Transporters can only update delivery status.
create or replace function public.enforce_shipment_update()
returns trigger
language plpgsql
as $$
begin
  -- 1. Trusted roles (migrations, Edge Functions, internal RPCs) bypass checks.
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;

  -- 2. Read-only columns for all authenticated users.
  -- These MUST be changed via Edge Functions or Security Definer RPCs.
  if new.paid_at is distinct from old.paid_at
     or new.transporter_id is distinct from old.transporter_id
     or new.selected_bid_id is distinct from old.selected_bid_id
     or new.sender_id is distinct from old.sender_id then
    raise exception 'Les données financières et d''assignation sont en lecture seule.';
  end if;

  -- 2bis. Le prix est verrouillé, sauf pour l'expéditeur qui modifie son
  -- annonce encore « pending » : le tarif au poids (weight × 4€/kg) est
  -- recalculé côté client quand le poids change. Après acceptation d'une
  -- offre, le prix redevient intouchable (RPC accept_bid_transaction /
  -- fonctions Edge uniquement).
  if new.price is distinct from old.price
     and not (auth.uid() = old.sender_id
              and old.status = 'pending'
              and new.status = 'pending') then
    raise exception 'Les données financières et d''assignation sont en lecture seule.';
  end if;

  -- 3. Sender Role checks.
  if auth.uid() = old.sender_id then
    -- Senders can only edit details while pending (no bids accepted yet).
    if old.status <> 'pending' then
      -- Once accepted, allow only status change to 'cancelled' if nothing else changes.
      if new.status is distinct from old.status and new.status = 'cancelled' then
        if new.type is distinct from old.type or new.weight is distinct from old.weight
           or new.items is distinct from old.items or new.description is distinct from old.description
           or new.dimensions is distinct from old.dimensions
           or new.pickup_address is distinct from old.pickup_address
           or new.delivery_address is distinct from old.delivery_address then
          raise exception 'Seul le statut peut être modifié après acceptation.';
        end if;
        return new;
      end if;
      raise exception 'L''envoi ne peut plus être modifié après acceptation.';
    end if;
    return new;
  end if;

  -- 4. Transporter Role checks.
  if auth.uid() = old.transporter_id then
    -- Transporters can ONLY update the shipment status (tracking).
    if new.sender_name is distinct from old.sender_name
       or new.type is distinct from old.type
       or new.weight is distinct from old.weight
       or new.items is distinct from old.items
       or new.description is distinct from old.description
       or new.dimensions is distinct from old.dimensions
       or new.pickup_address is distinct from old.pickup_address
       or new.delivery_address is distinct from old.delivery_address then
      raise exception 'Modification non autorisée : les transporteurs ne peuvent mettre à jour que le statut.';
    end if;
    return new;
  end if;

  raise exception 'Accès non autorisé.';
end;
$$;

create trigger trg_shipments_guard
  before update on public.shipments
  for each row execute function public.enforce_shipment_update();

-- ── Trigger: updated_at maintenance ──────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger trg_routes_updated        before update on public.routes        for each row execute function public.set_updated_at();
create trigger trg_shipments_updated     before update on public.shipments     for each row execute function public.set_updated_at();
create trigger trg_conversations_updated before update on public.conversations for each row execute function public.set_updated_at();

-- ── Helper: participant check without recursive RLS ──────────────────────
create or replace function public.is_conversation_participant(conv_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = conv_id and user_id = auth.uid()
  );
$$;

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.profiles                  enable row level security;
alter table public.routes                    enable row level security;
alter table public.shipments                 enable row level security;
alter table public.tracking_events           enable row level security;
alter table public.bids                      enable row level security;
alter table public.conversations             enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                  enable row level security;
alter table public.ratings                   enable row level security;
alter table public.push_tokens               enable row level security;

-- profiles: readable by any authenticated user; updatable only by owner
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- routes: readable by all; writable by the owning transporter
create policy "routes_select" on public.routes
  for select to authenticated using (true);
create policy "routes_insert_own" on public.routes
  for insert to authenticated with check (transporter_id = auth.uid());
create policy "routes_update_own" on public.routes
  for update to authenticated using (transporter_id = auth.uid());
create policy "routes_delete_own" on public.routes
  for delete to authenticated using (transporter_id = auth.uid());

-- shipments: senders manage their own; transporters read pending + assigned,
-- and may update a pending shipment only to assign themselves.
create policy "shipments_sender_all" on public.shipments
  for all to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());
create policy "shipments_transporter_select" on public.shipments
  for select to authenticated
  using (status = 'pending' or transporter_id = auth.uid());
create policy "shipments_transporter_update" on public.shipments
  for update to authenticated
  using (status = 'pending' or transporter_id = auth.uid())
  with check (transporter_id = auth.uid());

-- tracking_events: visible with the shipment; insertable by its actors
create policy "tracking_select" on public.tracking_events
  for select to authenticated
  using (exists (
    select 1 from public.shipments s
    where s.id = shipment_id
      and (s.sender_id = auth.uid() or s.transporter_id = auth.uid() or s.status = 'pending')
  ));
create policy "tracking_insert" on public.tracking_events
  for insert to authenticated
  with check (exists (
    select 1 from public.shipments s
    where s.id = shipment_id
      and (s.sender_id = auth.uid() or s.transporter_id = auth.uid() or s.status = 'pending')
  ));

-- bids: transporters manage their own; the shipment's sender can read and
-- update them (accept / reject).
create policy "bids_transporter_all" on public.bids
  for all to authenticated
  using (transporter_id = auth.uid())
  with check (transporter_id = auth.uid());
create policy "bids_sender_select" on public.bids
  for select to authenticated
  using (exists (
    select 1 from public.shipments s
    where s.id = shipment_id and s.sender_id = auth.uid()
  ));
create policy "bids_sender_update" on public.bids
  for update to authenticated
  using (exists (
    select 1 from public.shipments s
    where s.id = shipment_id and s.sender_id = auth.uid()
  ));

-- conversations / participants / messages: participants only
create policy "conversations_select" on public.conversations
  for select to authenticated using (public.is_conversation_participant(id));
create policy "conversations_insert" on public.conversations
  for insert to authenticated with check (true);
create policy "conversations_update" on public.conversations
  for update to authenticated using (public.is_conversation_participant(id));

create policy "participants_select" on public.conversation_participants
  for select to authenticated
  using (user_id = auth.uid() or public.is_conversation_participant(conversation_id));
create policy "participants_insert" on public.conversation_participants
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_conversation_participant(conversation_id));

create policy "messages_select" on public.messages
  for select to authenticated
  using (public.is_conversation_participant(conversation_id));
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_participant(conversation_id));
create policy "messages_update" on public.messages
  for update to authenticated
  using (public.is_conversation_participant(conversation_id));

-- ratings: readable by all; writable by the rater
create policy "ratings_select" on public.ratings
  for select to authenticated using (true);
create policy "ratings_insert" on public.ratings
  for insert to authenticated with check (rater_id = auth.uid());

-- push_tokens: owner only
create policy "push_tokens_all" on public.push_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Storage buckets ──────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('id-documents', 'id-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('shipment-photos', 'shipment-photos', true)
on conflict (id) do nothing;

-- id-documents: each user reads/writes only their own folder
create policy "id_docs_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "id_docs_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- shipment-photos: public read, authenticated write
create policy "shipment_photos_select" on storage.objects
  for select using (bucket_id = 'shipment-photos');
create policy "shipment_photos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'shipment-photos');
  
-- ═══════════════════════════════════════════
-- TuniTransport -- Identity Verification (KYC)
-- ═══════════════════════════════════════════

create type identity_status as enum ('unsubmitted', 'pending', 'verified', 'rejected');

alter table public.profiles
  add column identity_status identity_status not null default 'unsubmitted',
  add column identity_document_type text,
  add column identity_document_front_url text,
  add column identity_document_back_url text,
  add column identity_submitted_at timestamptz,
  add column identity_reviewed_at timestamptz,
  add column identity_rejection_reason text;

insert into storage.buckets (id, name, public)
values ('identity-documents', 'identity-documents', false)
on conflict (id) do nothing;

create policy "Users upload own identity documents"
on storage.objects for insert
with check (
  bucket_id = 'identity-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users view own identity documents"
on storage.objects for select
using (
  bucket_id = 'identity-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.is_identity_verified()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select identity_status = 'verified' from public.profiles where id = auth.uid()),
    false
  );
$$;

create policy "Must be verified to post a shipment"
on public.shipments as restrictive for insert
with check (public.is_identity_verified());

create policy "Must be verified to place a bid"
on public.bids as restrictive for insert
with check (public.is_identity_verified());

create policy "Must be verified to post a route"
on public.routes as restrictive for insert
with check (public.is_identity_verified());

-- Guard trigger on profiles (declared earlier, created here because the
-- identity_* columns it inspects are added just above).
create trigger trg_profiles_guard
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ═══════════════════════════════════════════
-- TuniTransport -- Suivi en direct (live tracking)
-- ═══════════════════════════════════════════
-- Positions GPS publiées par le transporteur pendant le transport, diffusées
-- via Supabase Realtime et lues en une seule requête groupée (RPC ci-dessous)
-- pour éviter tout N+1 côté client.

create table public.shipment_locations (
  id             uuid primary key default gen_random_uuid(),
  shipment_id    uuid not null references public.shipments(id) on delete cascade,
  transporter_id uuid not null references public.profiles(id) on delete cascade,
  latitude       double precision not null check (latitude between -90 and 90),
  longitude      double precision not null check (longitude between -180 and 180),
  heading        double precision,
  speed          double precision,
  accuracy       double precision,
  recorded_at    timestamptz not null default now()
);

-- Index composite : sert à la fois la « dernière position » (distinct on +
-- order by recorded_at desc) et l'historique d'un envoi, sans scan de table.
create index idx_shipment_locations_latest
  on public.shipment_locations (shipment_id, recorded_at desc);

alter table public.shipment_locations enable row level security;

-- Insertion : uniquement le transporteur assigné à l'envoi, en son propre nom.
create policy "locations_insert_assigned_transporter" on public.shipment_locations
  for insert to authenticated
  with check (
    transporter_id = auth.uid()
    and exists (
      select 1 from public.shipments s
      where s.id = shipment_id and s.transporter_id = auth.uid()
    )
  );

-- Lecture : expéditeur ou transporteur de l'envoi.
create policy "locations_select_actors" on public.shipment_locations
  for select to authenticated
  using (exists (
    select 1 from public.shipments s
    where s.id = shipment_id
      and (s.sender_id = auth.uid() or s.transporter_id = auth.uid())
  ));

-- RPC groupée : la dernière position de N envois en UNE requête (anti N+1).
-- security invoker (défaut) : la RLS ci-dessus s'applique aux lignes rendues.
create or replace function public.get_latest_shipment_locations(p_shipment_ids uuid[])
returns setof public.shipment_locations
language sql
stable
security invoker
as $$
  select distinct on (shipment_id) *
  from public.shipment_locations
  where shipment_id = any(p_shipment_ids)
  order by shipment_id, recorded_at desc;
$$;

grant execute on function public.get_latest_shipment_locations(uuid[]) to authenticated;

-- Rétention : on ne conserve que les 200 derniers points par envoi.
create or replace function public.prune_shipment_locations()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.shipment_locations
  where shipment_id = new.shipment_id
    and recorded_at < (
      select min(recorded_at) from (
        select recorded_at from public.shipment_locations
        where shipment_id = new.shipment_id
        order by recorded_at desc
        limit 200
      ) newest
    );
  return new;
end;
$$;

create trigger trg_shipment_locations_prune
  after insert on public.shipment_locations
  for each row execute function public.prune_shipment_locations();

-- Diffusion temps réel (la RLS s'applique aussi aux événements Realtime).
alter publication supabase_realtime add table public.shipment_locations;

-- ═══════════════════════════════════════════
-- TuniTransport -- Passerelle de paiement (Stripe)
-- ═══════════════════════════════════════════
-- Grand livre des paiements. Toutes les écritures passent par les fonctions
-- Edge (service role) : create-checkout-session / create-payment-intent
-- créent les tentatives, stripe-webhook enregistre l'issue et confirme la
-- réservation. Les clients ne peuvent que LIRE leurs propres paiements.

create type payment_status as enum
  ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'canceled');

-- Compte Stripe Connect du transporteur (renseigné lors de l'onboarding,
-- géré côté serveur uniquement — voir le garde-fou plus bas).
alter table public.profiles
  add column stripe_account_id text;

create table public.payments (
  id                       uuid primary key default gen_random_uuid(),
  shipment_id              uuid not null references public.shipments(id) on delete cascade,
  sender_id                uuid not null references public.profiles(id) on delete cascade,
  transporter_id           uuid references public.profiles(id) on delete set null,
  provider                 text not null default 'stripe',
  checkout_session_id      text unique,
  payment_intent_id        text unique,
  -- Montants en centimes (entiers) : commission + part transporteur = total.
  amount_cents             integer not null check (amount_cents > 0),
  currency                 text not null default 'eur',
  platform_fee_cents       integer not null check (platform_fee_cents >= 0),
  transporter_amount_cents integer not null check (transporter_amount_cents >= 0),
  destination_account_id   text,
  status                   payment_status not null default 'pending',
  error_code               text,
  error_message            text,
  paid_at                  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (platform_fee_cents + transporter_amount_cents = amount_cents)
);

create index idx_payments_shipment on public.payments(shipment_id);
create index idx_payments_sender   on public.payments(sender_id);

-- Au plus UN paiement réussi par envoi, garanti par la base elle-même.
create unique index idx_payments_one_success
  on public.payments(shipment_id) where status = 'succeeded';

create trigger trg_payments_updated
  before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

-- Lecture seule pour les deux parties ; aucune policy d'écriture : seules
-- les fonctions Edge (service role) créent et font évoluer les paiements.
create policy "payments_select_actors" on public.payments
  for select to authenticated
  using (sender_id = auth.uid() or transporter_id = auth.uid());

-- Déduplication des webhooks Stripe (livraisons répétées) : l'id de
-- l'événement est réclamé avant traitement, l'unicité de la clé primaire
-- rend le traitement idempotent. Table service-role uniquement (pas de policy).
create table public.webhook_events (
  id          text primary key,
  type        text not null,
  received_at timestamptz not null default now()
);

alter table public.webhook_events enable row level security;

-- Garde-fou : stripe_account_id est géré par l'équipe / l'onboarding serveur,
-- jamais modifiable par l'utilisateur lui-même (nouvelle version du trigger
-- déclaré plus haut, avec la vérification supplémentaire).
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if new.rating is distinct from old.rating
     or new.total_ratings is distinct from old.total_ratings then
    raise exception 'La réputation est en lecture seule.';
  end if;
  if new.identity_status is distinct from old.identity_status
     and new.identity_status <> 'pending' then
    raise exception 'Le statut d''identité est géré par l''équipe de vérification.';
  end if;
  if new.identity_reviewed_at is distinct from old.identity_reviewed_at then
    raise exception 'Champ réservé à l''équipe de vérification.';
  end if;
  if new.stripe_account_id is distinct from old.stripe_account_id then
    raise exception 'Le compte de paiement est géré par la plateforme.';
  end if;
  return new;
end;
$$;


-- ═══════════════════════════════════════════
-- TuniTransport -- Consentement légal (traçabilité juridique)
-- ═══════════════════════════════════════════
-- Horodatages des consentements bloquants (Conditions générales, Objets
-- interdits, Décharge de responsabilité) et de la déclaration « non
-- commercial » du tarif au poids -- cf. docs/PRICING_AND_LEGAL.md.
-- Projet existant : exécutez uniquement cette section ; projet neuf : le
-- script complet suffit.

alter table public.shipments
  add column if not exists terms_accepted_at             timestamptz,
  add column if not exists non_commercial_declared_at    timestamptz,
  add column if not exists transporter_terms_accepted_at timestamptz;

alter table public.bids
  add column if not exists terms_accepted_at timestamptz;

-- ═══════════════════════════════════════════
-- TuniTransport -- Identity review (admin)
-- ═══════════════════════════════════════════
-- Existing project: run this whole section once in the SQL Editor.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Reviewers can open the private identity photos (owners already can).
drop policy if exists "Admins view identity documents" on storage.objects;
create policy "Admins view identity documents"
on storage.objects for select
using (bucket_id = 'identity-documents' and public.is_admin());

-- Pending KYC queue. SECURITY DEFINER so the reviewer can list profiles
-- regardless of RLS; the admin check is inside the function itself.
create or replace function public.list_pending_identities()
returns table (
  id uuid,
  email text,
  first_name text,
  last_name text,
  document_type text,
  front_path text,
  back_path text,
  submitted_at timestamptz
)
language sql
security definer
stable
as $$
  select p.id, p.email, p.first_name, p.last_name,
         p.identity_document_type, p.identity_document_front_url,
         p.identity_document_back_url, p.identity_submitted_at
  from public.profiles p
  where public.is_admin()
    and p.identity_status = 'pending'
  order by p.identity_submitted_at asc nulls last;
$$;

-- Approve/reject a pending submission. Runs as the function owner, which
-- also satisfies the profiles guard trigger (status is staff-managed).
create or replace function public.review_identity(
  target uuid,
  approve boolean,
  reason text default null
)
returns void
language plpgsql
security definer
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs.';
  end if;
  update public.profiles
  set identity_status      = case when approve then 'verified' else 'rejected' end::identity_status,
      identity_reviewed_at = now(),
      identity_rejection_reason =
        case when approve then null
             else coalesce(nullif(trim(reason), ''), 'Document non conforme.') end
  where id = target
    and identity_status = 'pending';
end;
$$;

revoke all on function public.list_pending_identities() from public, anon;
revoke all on function public.review_identity(uuid, boolean, text) from public, anon;
grant execute on function public.list_pending_identities() to authenticated;
grant execute on function public.review_identity(uuid, boolean, text) to authenticated;

-- Garde-fou renforcé : le rôle administrateur n'est modifiable que par
-- l'équipe (nouvelle version du trigger déclaré plus haut, avec la
-- vérification supplémentaire sur is_admin).
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if new.rating is distinct from old.rating
     or new.total_ratings is distinct from old.total_ratings then
    raise exception 'La réputation est en lecture seule.';
  end if;
  if new.identity_status is distinct from old.identity_status
     and new.identity_status <> 'pending' then
    raise exception 'Le statut d''identité est géré par l''équipe de vérification.';
  end if;
  if new.identity_reviewed_at is distinct from old.identity_reviewed_at then
    raise exception 'Champ réservé à l''équipe de vérification.';
  end if;
  if new.stripe_account_id is distinct from old.stripe_account_id then
    raise exception 'Le compte de paiement est géré par la plateforme.';
  end if;
  if new.is_admin is distinct from old.is_admin then
    raise exception 'Le rôle administrateur est géré par la plateforme.';
  end if;
  return new;
end;
$$;

-- ── RPC : acceptation directe d'un petit colis par un transporteur ────────
-- Le trigger trg_shipments_guard verrouille transporter_id côté client ;
-- l'acceptation directe (colis "small", sans enchère) passe donc par cette
-- transaction SECURITY DEFINER, symétrique d'accept_bid_transaction.
create or replace function public.accept_small_shipment_transaction(
  p_shipment_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_shipment public.shipments%rowtype;
  v_name     text;
begin
  if not public.is_identity_verified() then
    raise exception 'Identité non vérifiée : vérification requise avant de prendre en charge un envoi.';
  end if;

  select * into v_shipment
  from public.shipments
  where id = p_shipment_id
  for update;
  if not found then
    raise exception 'Envoi introuvable.';
  end if;
  if v_shipment.sender_id = auth.uid() then
    raise exception 'Impossible de prendre en charge son propre envoi.';
  end if;
  if v_shipment.status <> 'pending' then
    raise exception 'Cet envoi n''est plus disponible.';
  end if;
  if v_shipment.type <> 'small' then
    raise exception 'Les objets volumineux passent par les offres.';
  end if;

  select trim(first_name || ' ' || last_name) into v_name
  from public.profiles
  where id = auth.uid() and role = 'transporter';
  if v_name is null then
    raise exception 'Seul un transporteur peut prendre en charge un envoi.';
  end if;

  update public.shipments
  set status                        = 'accepted',
      transporter_id                = auth.uid(),
      transporter_name              = v_name,
      transporter_terms_accepted_at = now()
  where id = p_shipment_id;

  insert into public.tracking_events (shipment_id, status, description, location)
  values (
    p_shipment_id,
    'accepted',
    'Envoi accepté par ' || v_name,
    null
  );
end;
$$;

revoke execute on function public.accept_small_shipment_transaction(uuid) from public, anon;
grant execute on function public.accept_small_shipment_transaction(uuid) to authenticated;

-- ═══════════════════════════════════════════
-- THL -- Paiement en espèces (à la remise)
-- ═══════════════════════════════════════════
-- Existing project: run this whole section once in the SQL Editor.

alter table public.shipments
  add column if not exists payment_method text
  check (payment_method in ('card', 'cash'));

-- L'expéditeur choisit le règlement en espèces : la réservation est
-- confirmée immédiatement (paid_at) et l'accord est tracé. paid_at est
-- verrouillé côté client par le trigger shipments_guard, d'où ce RPC
-- SECURITY DEFINER (même modèle qu'accept_bid_transaction).
create or replace function public.choose_cash_payment(
  p_shipment_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_shipment public.shipments%rowtype;
begin
  select * into v_shipment
  from public.shipments
  where id = p_shipment_id
  for update;
  if not found then
    raise exception 'Envoi introuvable.';
  end if;
  if v_shipment.sender_id <> auth.uid() then
    raise exception 'Seul l''expéditeur peut choisir le mode de paiement.';
  end if;
  if v_shipment.status <> 'accepted' then
    raise exception 'Cet envoi n''est pas prêt pour le paiement.';
  end if;
  if v_shipment.paid_at is not null then
    raise exception 'Cet envoi a déjà été payé.';
  end if;

  update public.shipments
  set paid_at        = now(),
      payment_method = 'cash'
  where id = p_shipment_id;

  insert into public.tracking_events (shipment_id, status, description)
  values (
    p_shipment_id,
    v_shipment.status,
    'Paiement en espèces convenu — à régler au transporteur à la remise du colis. Réservation validée.'
  );
end;
$$;

revoke execute on function public.choose_cash_payment(uuid) from public, anon;
grant execute on function public.choose_cash_payment(uuid) to authenticated;

-- ═══════════════════════════════════════════
-- THL -- Confirmation de réception (par l'expéditeur)
-- ═══════════════════════════════════════════
-- Existing project: run this whole section once in the SQL Editor.
--
-- L'expéditeur confirme avoir bien reçu le colis : l'envoi passe à
-- 'delivered'. Le montant est alors comptabilisé dans les gains du
-- transporteur (total dérivé côté application : somme des envois livrés).
-- status/delivered_at sont verrouillés pour l'expéditeur par le trigger
-- shipments_guard (seul le transporteur peut changer le statut), d'où ce
-- RPC SECURITY DEFINER (même modèle que choose_cash_payment).
create or replace function public.confirm_delivery(
  p_shipment_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_shipment public.shipments%rowtype;
begin
  select * into v_shipment
  from public.shipments
  where id = p_shipment_id
  for update;
  if not found then
    raise exception 'Envoi introuvable.';
  end if;
  if v_shipment.sender_id <> auth.uid() then
    raise exception 'Seul l''expéditeur peut confirmer la réception.';
  end if;
  if v_shipment.transporter_id is null then
    raise exception 'Cet envoi n''a pas encore de transporteur.';
  end if;
  if v_shipment.paid_at is null then
    raise exception 'Cet envoi doit être réglé avant la confirmation.';
  end if;
  if v_shipment.status = 'cancelled' then
    raise exception 'Cet envoi est annulé.';
  end if;
  if v_shipment.status = 'delivered' then
    raise exception 'La réception de cet envoi est déjà confirmée.';
  end if;

  update public.shipments
  set status       = 'delivered',
      delivered_at = now()
  where id = p_shipment_id;

  insert into public.tracking_events (shipment_id, status, description)
  values (
    p_shipment_id,
    'delivered',
    'Réception confirmée par l''expéditeur — livraison validée. Montant crédité au transporteur.'
  );
end;
$$;

revoke execute on function public.confirm_delivery(uuid) from public, anon;
grant execute on function public.confirm_delivery(uuid) to authenticated;

-- ═══════════════════════════════════════════
-- THL -- Avis avec photos, visibles publiquement
-- ═══════════════════════════════════════════
-- Existing project: run this whole section once in the SQL Editor.

-- 1. Les avis peuvent porter des photos (URLs publiques).
alter table public.ratings
  add column if not exists photos text[];

-- 2. Bucket public pour les photos d'avis.
insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

-- Lecture publique, écriture par tout utilisateur authentifié dans son dossier.
drop policy if exists "review_photos_read" on storage.objects;
create policy "review_photos_read" on storage.objects
  for select using (bucket_id = 'review-photos');

drop policy if exists "review_photos_insert" on storage.objects;
create policy "review_photos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'review-photos');

-- 3. Liste publique des avis d'un utilisateur (avec le prénom de l'auteur).
-- Les avis sont déjà lisibles par tous (ratings_select), mais ce RPC joint le
-- prénom de l'auteur sans exposer toute la table profiles.
create or replace function public.list_user_reviews(p_user_id uuid)
returns table (
  id uuid,
  stars integer,
  tags text[],
  comment text,
  photos text[],
  created_at timestamptz,
  rater_name text
)
language sql
security definer set search_path = public
as $$
  select r.id, r.stars, r.tags, r.comment, r.photos, r.created_at,
         coalesce(p.first_name, 'Utilisateur') as rater_name
  from public.ratings r
  left join public.profiles p on p.id = r.rater_id
  where r.rated_user_id = p_user_id
  order by r.created_at desc;
$$;

revoke execute on function public.list_user_reviews(uuid) from public, anon;
grant execute on function public.list_user_reviews(uuid) to authenticated;

-- ═══════════════════════════════════════════
-- THL -- Paiement des transporteurs : coordonnées bancaires + retraits
-- ═══════════════════════════════════════════
-- Existing project: run this whole section once in the SQL Editor.
--
-- IMPORTANT (sécurité) : le RIB/IBAN est une donnée sensible. La table
-- `profiles` est lisible par TOUT utilisateur authentifié (profiles_select) ;
-- on ne stocke donc JAMAIS l'IBAN dans profiles. Il vit dans une table à part
-- `payout_accounts` accessible uniquement à son propriétaire.

-- 1. Coordonnées bancaires du transporteur (privées, propriétaire uniquement).
create table if not exists public.payout_accounts (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  holder     text not null default '',
  iban       text not null default '',
  bank_name  text,
  updated_at timestamptz not null default now()
);

alter table public.payout_accounts enable row level security;

drop policy if exists "payout_accounts_select_own" on public.payout_accounts;
create policy "payout_accounts_select_own" on public.payout_accounts
  for select using (user_id = auth.uid());

drop policy if exists "payout_accounts_insert_own" on public.payout_accounts;
create policy "payout_accounts_insert_own" on public.payout_accounts
  for insert with check (user_id = auth.uid());

drop policy if exists "payout_accounts_update_own" on public.payout_accounts;
create policy "payout_accounts_update_own" on public.payout_accounts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2. Demandes de retrait des gains.
create table if not exists public.payout_requests (
  id             uuid primary key default gen_random_uuid(),
  transporter_id uuid not null references public.profiles(id) on delete cascade,
  amount         numeric(10,2) not null check (amount > 0),
  status         text not null default 'pending'
                   check (status in ('pending', 'paid', 'rejected')),
  iban           text not null default '',
  holder         text not null default '',
  note           text,
  created_at     timestamptz not null default now(),
  processed_at   timestamptz
);

create index if not exists idx_payout_requests_transporter
  on public.payout_requests (transporter_id, created_at desc);

alter table public.payout_requests enable row level security;

-- Le transporteur voit ses propres demandes ; l'administrateur les voit toutes.
drop policy if exists "payout_requests_select_own" on public.payout_requests;
create policy "payout_requests_select_own" on public.payout_requests
  for select using (transporter_id = auth.uid() or public.is_admin());

-- L'insertion se fait exclusivement via le RPC request_payout (security definer),
-- qui recalcule le solde disponible côté serveur — pas d'insertion directe.

-- 3. Mise à jour du trigger de création de compte : si un transporteur fournit
--    un IBAN à l'inscription (métadonnées signUp), on l'enregistre aussitôt.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'sender')
  );

  if coalesce(new.raw_user_meta_data ->> 'role', '') = 'transporter'
     and coalesce(new.raw_user_meta_data ->> 'payout_iban', '') <> '' then
    insert into public.payout_accounts (user_id, holder, iban)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'payout_holder', ''),
      new.raw_user_meta_data ->> 'payout_iban'
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

-- 4. Demander un retrait : recalcule le solde disponible côté serveur
--    (envois livrés et payés) diminué des retraits déjà demandés/payés, et
--    crée une demande pour la totalité du disponible. Minimum : 10 €.
create or replace function public.request_payout()
returns public.payout_requests
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_delivered numeric;
  v_requested numeric;
  v_available numeric;
  v_acct      public.payout_accounts%rowtype;
  v_req       public.payout_requests;
begin
  if v_uid is null then
    raise exception 'Non authentifié.';
  end if;

  select coalesce(sum(price), 0) into v_delivered
  from public.shipments
  where transporter_id = v_uid
    and status = 'delivered'
    and paid_at is not null;

  select coalesce(sum(amount), 0) into v_requested
  from public.payout_requests
  where transporter_id = v_uid
    and status in ('pending', 'paid');

  v_available := v_delivered - v_requested;

  if v_available < 10 then
    raise exception 'Montant disponible insuffisant (minimum 10 €).';
  end if;

  select * into v_acct from public.payout_accounts where user_id = v_uid;
  if not found or coalesce(v_acct.iban, '') = '' then
    raise exception 'Ajoutez d''abord vos coordonnées bancaires (IBAN).';
  end if;

  insert into public.payout_requests (transporter_id, amount, iban, holder)
  values (v_uid, v_available, v_acct.iban, v_acct.holder)
  returning * into v_req;

  return v_req;
end;
$$;

revoke execute on function public.request_payout() from public, anon;
grant execute on function public.request_payout() to authenticated;

-- ═══════════════════════════════════════════
-- THL -- Panneau d'administration
-- ═══════════════════════════════════════════
-- Existing project: run this whole section once in the SQL Editor.
-- Toutes ces fonctions sont réservées aux administrateurs (is_admin()).

-- 1. Statistiques globales pour le tableau de bord admin.
create or replace function public.admin_stats()
returns json
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs.';
  end if;
  return json_build_object(
    'users',                  (select count(*) from public.profiles),
    'transporters',           (select count(*) from public.profiles where role = 'transporter'),
    'senders',                (select count(*) from public.profiles where role = 'sender'),
    'shipments',              (select count(*) from public.shipments),
    'delivered',              (select count(*) from public.shipments where status = 'delivered'),
    'pending_kyc',            (select count(*) from public.profiles where identity_status = 'pending'),
    'pending_payouts_count',  (select count(*) from public.payout_requests where status = 'pending'),
    'pending_payouts_amount', (select coalesce(sum(amount), 0) from public.payout_requests where status = 'pending')
  );
end;
$$;

revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- 2. Toutes les demandes de retrait, avec le nom du transporteur (admin only).
create or replace function public.list_payout_requests_admin()
returns table (
  id                uuid,
  transporter_id    uuid,
  transporter_name  text,
  transporter_email text,
  amount            numeric,
  status            text,
  iban              text,
  holder            text,
  created_at        timestamptz,
  processed_at      timestamptz
)
language sql
security definer set search_path = public
as $$
  select
    r.id,
    r.transporter_id,
    coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), 'Transporteur') as transporter_name,
    p.email as transporter_email,
    r.amount, r.status, r.iban, r.holder, r.created_at, r.processed_at
  from public.payout_requests r
  left join public.profiles p on p.id = r.transporter_id
  where public.is_admin()
  order by (r.status = 'pending') desc, r.created_at desc;
$$;

revoke execute on function public.list_payout_requests_admin() from public, anon;
grant execute on function public.list_payout_requests_admin() to authenticated;

-- 3. Changer le statut d'une demande de retrait (admin only).
create or replace function public.set_payout_status(p_request_id uuid, p_status text)
returns public.payout_requests
language plpgsql
security definer set search_path = public
as $$
declare
  v_req public.payout_requests;
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs.';
  end if;
  if p_status not in ('pending', 'paid', 'rejected') then
    raise exception 'Statut invalide.';
  end if;
  update public.payout_requests
  set status       = p_status,
      processed_at = case when p_status = 'pending' then null else now() end
  where id = p_request_id
  returning * into v_req;
  if not found then
    raise exception 'Demande introuvable.';
  end if;
  return v_req;
end;
$$;

revoke execute on function public.set_payout_status(uuid, text) from public, anon;
grant execute on function public.set_payout_status(uuid, text) to authenticated;

-- ═══════════════════════════════════════════
-- THL -- Panneau d'administration : pouvoirs étendus
-- ═══════════════════════════════════════════
-- Existing project: run this whole section once in the SQL Editor.
-- Gestion des utilisateurs, des envois, des avis et des annonces.
-- Toutes les fonctions sont réservées aux administrateurs (is_admin()).

-- Suspension d'un compte (bloque la connexion à l'application).
alter table public.profiles
  add column if not exists suspended boolean not null default false;

-- ── Gestion des utilisateurs ──────────────────────────────────────────────
create or replace function public.list_users_admin(p_search text default '')
returns table (
  id uuid, email text, first_name text, last_name text, phone text,
  role text, is_admin boolean, identity_status text, suspended boolean,
  created_at timestamptz
)
language sql
security definer set search_path = public
as $$
  select p.id, p.email, p.first_name, p.last_name, p.phone,
         p.role::text, p.is_admin, p.identity_status::text, p.suspended, p.created_at
  from public.profiles p
  where public.is_admin()
    and (
      coalesce(p_search, '') = ''
      or p.email ilike '%' || p_search || '%'
      or (p.first_name || ' ' || p.last_name) ilike '%' || p_search || '%'
      or p.phone ilike '%' || p_search || '%'
    )
  order by p.created_at desc
  limit 500;
$$;

revoke execute on function public.list_users_admin(text) from public, anon;
grant execute on function public.list_users_admin(text) to authenticated;

create or replace function public.set_user_suspended(p_user_id uuid, p_suspended boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs.'; end if;
  update public.profiles set suspended = p_suspended where id = p_user_id;
end; $$;

revoke execute on function public.set_user_suspended(uuid, boolean) from public, anon;
grant execute on function public.set_user_suspended(uuid, boolean) to authenticated;

create or replace function public.set_user_admin(p_user_id uuid, p_is_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs.'; end if;
  update public.profiles set is_admin = p_is_admin where id = p_user_id;
end; $$;

revoke execute on function public.set_user_admin(uuid, boolean) from public, anon;
grant execute on function public.set_user_admin(uuid, boolean) to authenticated;

create or replace function public.admin_set_identity(p_user_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs.'; end if;
  if p_status not in ('unsubmitted', 'pending', 'verified', 'rejected') then
    raise exception 'Statut invalide.';
  end if;
  update public.profiles
  set identity_status = p_status,
      identity_reviewed_at = now()
  where id = p_user_id;
end; $$;

revoke execute on function public.admin_set_identity(uuid, text) from public, anon;
grant execute on function public.admin_set_identity(uuid, text) to authenticated;

-- ── Gestion des envois ────────────────────────────────────────────────────
create or replace function public.list_shipments_admin(p_search text default '')
returns table (
  id uuid, sender_name text, transporter_name text, type text, status text,
  price numeric, pickup_city text, delivery_city text, created_at timestamptz
)
language sql
security definer set search_path = public
as $$
  select s.id,
         coalesce(s.sender_name, '') as sender_name,
         coalesce(s.transporter_name, '') as transporter_name,
         s.type::text, s.status::text, s.price,
         (s.pickup_address ->> 'city'), (s.delivery_address ->> 'city'),
         s.created_at
  from public.shipments s
  where public.is_admin()
    and (
      coalesce(p_search, '') = ''
      or s.sender_name ilike '%' || p_search || '%'
      or s.transporter_name ilike '%' || p_search || '%'
    )
  order by s.created_at desc
  limit 300;
$$;

revoke execute on function public.list_shipments_admin(text) from public, anon;
grant execute on function public.list_shipments_admin(text) to authenticated;

create or replace function public.admin_cancel_shipment(p_shipment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs.'; end if;
  update public.shipments set status = 'cancelled' where id = p_shipment_id;
  insert into public.tracking_events (shipment_id, status, description)
  values (p_shipment_id, 'cancelled', 'Envoi annulé par l''administration.');
end; $$;

revoke execute on function public.admin_cancel_shipment(uuid) from public, anon;
grant execute on function public.admin_cancel_shipment(uuid) to authenticated;

-- ── Modération des avis ───────────────────────────────────────────────────
create or replace function public.list_reviews_admin()
returns table (
  id uuid, stars integer, comment text, tags text[], photos text[],
  created_at timestamptz, rater_name text, rated_name text
)
language sql
security definer set search_path = public
as $$
  select r.id, r.stars, r.comment, r.tags, r.photos, r.created_at,
         coalesce(pr.first_name, 'Utilisateur') as rater_name,
         coalesce(pd.first_name, 'Utilisateur') as rated_name
  from public.ratings r
  left join public.profiles pr on pr.id = r.rater_id
  left join public.profiles pd on pd.id = r.rated_user_id
  where public.is_admin()
  order by r.created_at desc
  limit 300;
$$;

revoke execute on function public.list_reviews_admin() from public, anon;
grant execute on function public.list_reviews_admin() to authenticated;

create or replace function public.admin_delete_review(p_review_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs.'; end if;
  delete from public.ratings where id = p_review_id;
end; $$;

revoke execute on function public.admin_delete_review(uuid) from public, anon;
grant execute on function public.admin_delete_review(uuid) to authenticated;

-- ── Annonces (notifications diffusées à tous) ─────────────────────────────
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists "announcements_select" on public.announcements;
create policy "announcements_select" on public.announcements
  for select to authenticated using (true);

create or replace function public.create_announcement(p_title text, p_body text)
returns public.announcements language plpgsql security definer set search_path = public as $$
declare v_a public.announcements;
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs.'; end if;
  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_body), '') = '' then
    raise exception 'Titre et message requis.';
  end if;
  insert into public.announcements (title, body, created_by)
  values (p_title, p_body, auth.uid())
  returning * into v_a;
  return v_a;
end; $$;

revoke execute on function public.create_announcement(text, text) from public, anon;
grant execute on function public.create_announcement(text, text) to authenticated;

-- ═══════════════════════════════════════════
-- THL -- Connexion sociale (Google / Apple / Facebook) + onboarding
-- ═══════════════════════════════════════════
-- Existing project: run this whole section once in the SQL Editor.
-- Les inscriptions par OAuth n'ont ni rôle, ni téléphone : on marque le
-- compte « non onboardé » pour forcer un écran « Compléter mon profil ».

-- 1. Indicateur d'onboarding. Les comptes existants sont considérés complets.
alter table public.profiles
  add column if not exists onboarded boolean not null default true;

-- 2. Trigger de création de compte, compatible e-mail/mot de passe ET OAuth.
--    - e-mail/mot de passe : le rôle est fourni → onboarded = true.
--    - OAuth (Google/Apple/Facebook) : pas de rôle → onboarded = false, et on
--      récupère le nom / l'avatar fournis par le provider.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role      text  := coalesce(v_meta ->> 'role', 'sender');
  v_first     text  := coalesce(v_meta ->> 'first_name', '');
  v_last      text  := coalesce(v_meta ->> 'last_name', '');
  v_full      text  := coalesce(v_meta ->> 'full_name', v_meta ->> 'name', '');
  v_avatar    text  := coalesce(v_meta ->> 'avatar_url', v_meta ->> 'picture');
  v_onboarded boolean := (v_meta ? 'role');
begin
  -- Provider social : dériver prénom / nom depuis le nom complet.
  if v_first = '' and v_full <> '' then
    v_first := split_part(v_full, ' ', 1);
    v_last  := coalesce(nullif(trim(substr(v_full, length(split_part(v_full, ' ', 1)) + 1)), ''), '');
  end if;

  insert into public.profiles (id, email, first_name, last_name, phone, role, avatar_url, onboarded)
  values (
    new.id,
    new.email,
    v_first,
    v_last,
    coalesce(v_meta ->> 'phone', ''),
    v_role::user_role,
    v_avatar,
    v_onboarded
  );

  if v_role = 'transporter' and coalesce(v_meta ->> 'payout_iban', '') <> '' then
    insert into public.payout_accounts (user_id, holder, iban)
    values (new.id, coalesce(v_meta ->> 'payout_holder', ''), v_meta ->> 'payout_iban')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- Suppression de compte (libre-service, sans accès à la base)
--
-- Permet à un utilisateur (expéditeur ou transporteur) de supprimer
-- définitivement son propre compte depuis l'application. La suppression de la
-- ligne auth.users efface en cascade le profil et TOUTES les données liées
-- (envois, trajets, avis, messages, coordonnées bancaires…) grâce aux
-- « on delete cascade » posés sur profiles(id).
--
-- Garde-fous : on refuse la suppression tant qu'un envoi est en cours (argent
-- potentiellement sous séquestre) ou qu'une demande de retrait est en attente,
-- afin de ne pas effacer un dossier financier non soldé.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  active_shipments int;
  pending_payouts int;
begin
  if uid is null then
    raise exception 'Non authentifié.';
  end if;

  -- Envois encore en cours, que l'utilisateur soit expéditeur ou transporteur.
  select count(*) into active_shipments
  from public.shipments s
  where (s.sender_id = uid or s.transporter_id = uid)
    and s.status not in ('delivered', 'cancelled');

  if active_shipments > 0 then
    raise exception
      'Vous avez % envoi(s) en cours. Terminez-les ou annulez-les avant de supprimer votre compte.',
      active_shipments;
  end if;

  -- Demande de retrait non encore traitée.
  select count(*) into pending_payouts
  from public.payout_requests pr
  where pr.transporter_id = uid and pr.status = 'pending';

  if pending_payouts > 0 then
    raise exception
      'Vous avez une demande de retrait en attente. Patientez jusqu''à son traitement avant de supprimer votre compte.';
  end if;

  -- Suppression du compte d'authentification → cascade sur tout le reste.
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- Sécurisation pré-bêta (advisor Supabase)
-- ──────────────────────────────────────────────────────────────────────────
alter function public.get_latest_shipment_locations(uuid[]) set search_path = public;
alter function public.review_identity(uuid, boolean, text) set search_path = public;
alter function public.list_pending_identities() set search_path = public;
alter function public.enforce_shipment_update() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.is_identity_verified() set search_path = public;
alter function public.is_admin() set search_path = public;
alter function public.protect_profile_columns() set search_path = public;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.recompute_rating() from public, anon, authenticated;
revoke all on function public.protect_profile_columns() from public, anon, authenticated;
revoke all on function public.enforce_shipment_update() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.prune_shipment_locations() from public, anon, authenticated;

drop policy if exists "shipment_photos_select" on storage.objects;
drop policy if exists "review_photos_read" on storage.objects;
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
-- Audit : retirer l'exécution directe des fonctions internes (déclencheur/maintenance).
-- Elles continuent d'être exécutées par le moteur (triggers), jamais par le client.
revoke all on function public.on_shipment_delivered_referrals() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
-- Détail complet d'un envoi pour l'administrateur.
create or replace function public.admin_shipment_detail(p_id uuid)
returns json
language sql security definer set search_path = public stable as $$
  select json_build_object(
    'id', s.id,
    'type', s.type::text,
    'status', s.status::text,
    'weight', s.weight,
    'price', s.price,
    'dimensions', s.dimensions,
    'description', s.description,
    'items', s.items,
    'photos', s.photos,
    'paymentMethod', s.payment_method,
    'createdAt', s.created_at,
    'collectedAt', s.collected_at,
    'deliveredAt', s.delivered_at,
    'paidAt', s.paid_at,
    'pickup', s.pickup_address,
    'delivery', s.delivery_address,
    'sender', json_build_object('name', s.sender_name, 'email', sp.email, 'phone', sp.phone),
    'transporter', case when s.transporter_id is null then null
      else json_build_object('name', s.transporter_name, 'email', tp.email, 'phone', tp.phone) end,
    'acceptedBid', (
      select json_build_object('price', b.price, 'estimatedDelivery', b.estimated_delivery, 'message', b.message)
      from public.bids b where b.id = s.selected_bid_id
    ),
    'bidsCount', (select count(*) from public.bids b where b.shipment_id = s.id)
  )
  from public.shipments s
  left join public.profiles sp on sp.id = s.sender_id
  left join public.profiles tp on tp.id = s.transporter_id
  where s.id = p_id and public.is_admin();
$$;
revoke all on function public.admin_shipment_detail(uuid) from public, anon;
grant execute on function public.admin_shipment_detail(uuid) to authenticated;
