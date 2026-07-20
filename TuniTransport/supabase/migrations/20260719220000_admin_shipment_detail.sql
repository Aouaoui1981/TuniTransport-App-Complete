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
