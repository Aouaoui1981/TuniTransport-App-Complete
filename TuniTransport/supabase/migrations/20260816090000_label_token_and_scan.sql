-- ──────────────────────────────────────────────────────────────────────────
-- THL — étiquette : jeton de scan et lecture autorisée
--
-- Une étiquette est collée sur un colis qui voyage dans un sac, passe de
-- main en main et traverse un port. Tout ce qui y est écrit est lisible par
-- n'importe qui, et un QR code en clair ne cache rien : la moindre
-- application appareil photo affiche son contenu.
--
-- L'étiquette ne porte donc plus que ce qu'il faut pour l'acheminer — nom
-- de l'expéditeur, ville de destination, nom du destinataire, référence —
-- et le QR ne contient qu'un lien opaque. Les détails (adresses complètes,
-- contenu, poids) ne sortent que par `resolve_label`, qui vérifie d'abord
-- qui demande.
--
-- Règle d'attribution : une expédition acceptée appartient à SON
-- transporteur. Un autre transporteur qui scanne l'étiquette est refusé
-- explicitement — il ne doit pas pouvoir la prendre en charge à la place
-- du transporteur attitré.
-- ──────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

alter table public.shipments
  add column if not exists label_token text;

-- Jeton aléatoire, propre à chaque expédition. 16 octets : deviner une
-- valeur valide est hors de portée, et le QR reste petit à imprimer.
update public.shipments
   set label_token = encode(gen_random_bytes(16), 'hex')
 where label_token is null;

alter table public.shipments
  alter column label_token set default encode(gen_random_bytes(16), 'hex');

alter table public.shipments
  alter column label_token set not null;

create unique index if not exists shipments_label_token_key
  on public.shipments (label_token);

-- ── Lecture d'une étiquette scannée ──────────────────────────────────────
-- Renvoie les détails complets, mais seulement à l'expéditeur, au
-- transporteur attitré ou à un administrateur. Les autres cas lèvent une
-- erreur distincte, pour que l'application affiche un message juste plutôt
-- qu'un échec générique.
create or replace function public.resolve_label(p_shipment_id uuid, p_token text)
returns jsonb
language plpgsql
security definer set search_path = public
stable
as $$
declare
  s public.shipments%rowtype;
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  select * into s from public.shipments where id = p_shipment_id;
  if not found then
    raise exception 'LABEL_UNKNOWN' using errcode = 'P0002';
  end if;

  -- Jeton comparé en temps constant : sans cela, mesurer les temps de
  -- réponse permettrait de reconstituer un jeton caractère par caractère.
  -- `extensions.` est indispensable : pgcrypto vit dans le schéma
  -- `extensions` sur Supabase, et cette fonction fixe search_path = public.
  -- Sans la qualification, hmac() est introuvable et TOUT scan échoue.
  if p_token is null
     or extensions.hmac(s.label_token, '', 'sha256')
        <> extensions.hmac(p_token, '', 'sha256') then
    raise exception 'LABEL_TOKEN_INVALID' using errcode = '28000';
  end if;

  if s.sender_id = auth.uid() then
    v_role := 'sender';
  elsif s.transporter_id = auth.uid() then
    v_role := 'transporter';
  elsif public.is_admin() then
    v_role := 'admin';
  elsif s.transporter_id is not null then
    -- Attribuée, mais pas à celui qui scanne.
    raise exception 'LABEL_ASSIGNED_TO_OTHER' using errcode = '42501';
  else
    raise exception 'LABEL_FORBIDDEN' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id',               s.id,
    'reference',        upper(right(s.id::text, 8)),
    'status',           s.status,
    'viewerRole',       v_role,
    'senderId',         s.sender_id,
    'senderName',       s.sender_name,
    'transporterId',    s.transporter_id,
    'transporterName',  s.transporter_name,
    'type',             s.type,
    'weight',           s.weight,
    'price',            s.price,
    'items',            s.items,
    'description',      s.description,
    'pickupAddress',    s.pickup_address,
    'deliveryAddress',  s.delivery_address,
    'collectedAt',      s.collected_at,
    'deliveredAt',      s.delivered_at,
    'createdAt',        s.created_at
  );
end;
$$;

revoke all on function public.resolve_label(uuid, text) from public;
grant execute on function public.resolve_label(uuid, text) to authenticated;
