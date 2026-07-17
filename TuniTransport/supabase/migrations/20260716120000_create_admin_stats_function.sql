create or replace function public.admin_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ) then
    raise exception 'Access denied: admin only';
  end if;

  select json_build_object(
    'users', (select count(*) from public.profiles),
    'transporters', (select count(*) from public.profiles where role = 'transporter'),
    'senders', (select count(*) from public.profiles where role = 'sender'),
    'shipments', (select count(*) from public.shipments),
    'delivered', (select count(*) from public.shipments where status = 'delivered'),
    'pending_kyc', (select count(*) from public.profiles where identity_status = 'pending'),
    'pending_payouts_count', (select count(*) from public.payout_requests where status = 'pending'),
    'pending_payouts_amount', (select coalesce(sum(amount), 0) from public.payout_requests where status = 'pending')
  ) into result;

  return result;
end;
$$;

revoke execute on function public.admin_stats() from anon, public;
grant execute on function public.admin_stats() to authenticated;
