create or replace function public.list_payout_requests_admin()
returns table (
  id uuid,
  transporter_id uuid,
  transporter_name text,
  transporter_email text,
  amount numeric,
  status text,
  iban text,
  holder text,
  created_at timestamptz,
  processed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.is_admin = true
  ) then
    raise exception 'Access denied: admin only';
  end if;

  return query
  select
    pr.id,
    pr.transporter_id,
    trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as transporter_name,
    p.email as transporter_email,
    pr.amount,
    pr.status,
    pr.iban,
    pr.holder,
    pr.created_at,
    pr.processed_at
  from public.payout_requests pr
  left join public.profiles p on p.id = pr.transporter_id
  order by pr.created_at desc;
end;
$$;

create or replace function public.set_payout_status(p_request_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.is_admin = true
  ) then
    raise exception 'Access denied: admin only';
  end if;

  if p_status not in ('pending', 'paid', 'rejected') then
    raise exception 'Invalid status: %', p_status;
  end if;

  update public.payout_requests
  set status = p_status,
      processed_at = case when p_status = 'pending' then null else now() end
  where id = p_request_id;

  if not found then
    raise exception 'Payout request not found';
  end if;
end;
$$;

revoke execute on function public.list_payout_requests_admin() from anon, public;
revoke execute on function public.set_payout_status(uuid, text) from anon, public;
grant execute on function public.list_payout_requests_admin() to authenticated;
grant execute on function public.set_payout_status(uuid, text) to authenticated;
