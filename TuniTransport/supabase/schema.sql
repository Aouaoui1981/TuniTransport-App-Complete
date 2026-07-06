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

  
