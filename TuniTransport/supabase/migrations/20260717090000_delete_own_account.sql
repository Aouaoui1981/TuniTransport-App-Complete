-- ──────────────────────────────────────────────────────────────────────────
-- Suppression de compte en libre-service (expéditeur / transporteur)
--
-- delete_own_account() supprime définitivement le compte de l'appelant :
-- la ligne auth.users est effacée, ce qui efface en cascade le profil et
-- toutes les données rattachées (on delete cascade sur profiles(id)).
--
-- Garde-fous : refus si un envoi est en cours ou si une demande de retrait
-- est en attente (dossier financier non soldé).
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

  select count(*) into active_shipments
  from public.shipments s
  where (s.sender_id = uid or s.transporter_id = uid)
    and s.status not in ('delivered', 'cancelled');

  if active_shipments > 0 then
    raise exception
      'Vous avez % envoi(s) en cours. Terminez-les ou annulez-les avant de supprimer votre compte.',
      active_shipments;
  end if;

  select count(*) into pending_payouts
  from public.payout_requests pr
  where pr.transporter_id = uid and pr.status = 'pending';

  if pending_payouts > 0 then
    raise exception
      'Vous avez une demande de retrait en attente. Patientez jusqu''à son traitement avant de supprimer votre compte.';
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
