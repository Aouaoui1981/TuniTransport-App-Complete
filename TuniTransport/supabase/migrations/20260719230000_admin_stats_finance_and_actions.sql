-- Étend admin_stats() : compteur de signalements ouverts + résumé financier
-- (GMV, commission, gains transporteurs, séquestre, versé, crédits de parrainage).
-- Tous les montants financiers sont retournés en euros.
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
    'pending_payouts_amount', (select coalesce(sum(amount), 0) from public.payout_requests where status = 'pending'),
    'open_disputes',          (select count(*) from public.disputes where status in ('open', 'in_review')),
    -- Finances (montants en euros)
    'gmv',                    (select coalesce(sum(amount_cents), 0) / 100.0 from public.payments where status = 'succeeded'),
    'commission',             (select coalesce(sum(platform_fee_cents), 0) / 100.0 from public.payments where status = 'succeeded'),
    'transporter_earnings',   (select coalesce(sum(transporter_amount_cents), 0) / 100.0 from public.payments where status = 'succeeded'),
    'escrow',                 (select coalesce(sum(p.transporter_amount_cents), 0) / 100.0
                                 from public.payments p
                                 join public.shipments s on s.id = p.shipment_id
                                 where p.status = 'succeeded' and s.status not in ('delivered', 'cancelled')),
    'paid_out',               (select coalesce(sum(amount), 0) from public.payout_requests where status = 'paid'),
    'referral_credits',       (select coalesce(sum(amount), 0) from public.referral_credits)
  );
end;
$$;

revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
