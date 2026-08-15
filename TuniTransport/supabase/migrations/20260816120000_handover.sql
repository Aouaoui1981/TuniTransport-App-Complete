-- ──────────────────────────────────────────────────────────────────────────
-- THL — remise du colis : mode, point de collecte, preuve de prise en charge
--
-- Jusqu'ici, le statut `collected` existait dans le type mais RIEN ne le
-- posait : une expédition passait de `accepted` à `delivered` sans que
-- personne n'ait jamais constaté la prise en charge. C'est précisément le
-- moment où l'expéditeur se sépare de son colis, et il n'en avait aucune
-- trace.
--
-- Deux façons de se remettre un colis, et elles n'ont pas les mêmes
-- témoins :
--   • `home`  — le transporteur vient chez l'expéditeur. Les deux sont là.
--   • `point` — l'expéditeur dépose au point de collecte. Il peut être
--               pressé, déposer et repartir : personne ne se rencontre.
--
-- D'où le statut intermédiaire `dropped_off` (ajouté séparément à l'enum) :
-- l'expéditeur déclare son dépôt avec une photo, le transporteur confirme
-- plus tard avec la sienne. L'expéditeur voit alors deux moments distincts
-- dans son suivi, sans avoir eu à attendre sur place.
--
-- Pas d'attente de confirmation de l'expéditeur : le scan + la photo FONT
-- la preuve. Suspendre le statut à la réponse d'un expéditeur endormi
-- bloquerait un transporteur déjà au port. Son recours est le
-- signalement — d'où la catégorie `handover_disputed`.
-- ──────────────────────────────────────────────────────────────────────────

-- ── Colonnes ─────────────────────────────────────────────────────────────

alter table public.shipments
  add column if not exists handover_mode text not null default 'point',
  add column if not exists handover_fee numeric(10,2) not null default 0,
  add column if not exists handover_point jsonb,
  add column if not exists dropped_off_at timestamptz,
  add column if not exists dropped_off_photo text,
  add column if not exists collected_photo text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'shipments_handover_mode_check') then
    alter table public.shipments
      add constraint shipments_handover_mode_check
      check (handover_mode in ('home', 'point'));
  end if;
end $$;

-- Point de collecte habituel d'un transporteur. Facultatif : beaucoup n'en
-- ont pas et conviennent d'un lieu au cas par cas dans la messagerie.
alter table public.profiles
  add column if not exists collection_point jsonb;

-- ── Déclaration de dépôt (expéditeur) ────────────────────────────────────
create or replace function public.declare_dropoff(p_shipment_id uuid, p_photo text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare s public.shipments%rowtype;
begin
  select * into s from public.shipments where id = p_shipment_id for update;
  if not found then
    raise exception 'SHIPMENT_UNKNOWN' using errcode = 'P0002';
  end if;
  if s.sender_id <> auth.uid() then
    raise exception 'NOT_SENDER' using errcode = '42501';
  end if;
  if s.status <> 'accepted' then
    raise exception 'BAD_STATUS' using errcode = '22023';
  end if;

  update public.shipments
     set status = 'dropped_off',
         dropped_off_at = now(),
         dropped_off_photo = p_photo,
         updated_at = now()
   where id = p_shipment_id;

  insert into public.tracking_events (shipment_id, status, description, location)
  values (p_shipment_id, 'dropped_off',
          'Colis déposé par l''expéditeur, en attente de prise en charge',
          coalesce(s.handover_point ->> 'label', 'Point de collecte'));
end;
$$;

revoke all on function public.declare_dropoff(uuid, text) from public;
grant execute on function public.declare_dropoff(uuid, text) to authenticated;

-- ── Confirmation de prise en charge (transporteur attitré) ───────────────
-- Le jeton de l'étiquette est exigé : sans le colis sous les yeux, pas de
-- confirmation possible depuis un canapé. La photo est obligatoire — c'est
-- elle que verra l'expéditeur, et c'est elle qui tranchera un litige.
create or replace function public.confirm_collection(
  p_shipment_id uuid,
  p_token text,
  p_photo text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare s public.shipments%rowtype;
begin
  select * into s from public.shipments where id = p_shipment_id for update;
  if not found then
    raise exception 'LABEL_UNKNOWN' using errcode = 'P0002';
  end if;

  if p_token is null
     or extensions.hmac(s.label_token, '', 'sha256')
        <> extensions.hmac(p_token, '', 'sha256') then
    raise exception 'LABEL_TOKEN_INVALID' using errcode = '28000';
  end if;

  if s.transporter_id is null or s.transporter_id <> auth.uid() then
    raise exception 'LABEL_ASSIGNED_TO_OTHER' using errcode = '42501';
  end if;

  if s.status not in ('accepted', 'dropped_off') then
    raise exception 'BAD_STATUS' using errcode = '22023';
  end if;

  if p_photo is null or length(trim(p_photo)) = 0 then
    raise exception 'PHOTO_REQUIRED' using errcode = '22023';
  end if;

  update public.shipments
     set status = 'collected',
         collected_at = now(),
         collected_photo = p_photo,
         updated_at = now()
   where id = p_shipment_id;

  insert into public.tracking_events (shipment_id, status, description, location)
  values (p_shipment_id, 'collected',
          'Colis pris en charge par ' || coalesce(s.transporter_name, 'le transporteur'),
          coalesce(s.handover_point ->> 'label',
                   case when s.handover_mode = 'home'
                        then s.pickup_address ->> 'city'
                        else 'Point de collecte' end));
end;
$$;

revoke all on function public.confirm_collection(uuid, text, text) from public;
grant execute on function public.confirm_collection(uuid, text, text) to authenticated;
