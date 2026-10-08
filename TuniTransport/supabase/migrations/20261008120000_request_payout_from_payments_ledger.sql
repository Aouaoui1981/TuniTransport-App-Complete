-- ──────────────────────────────────────────────────────────────────────────
-- `request_payout` calculait le solde du transporteur ainsi :
--
--     sum(price) where status = 'delivered' and paid_at is not null
--
-- Deux erreurs dans une seule ligne.
--
-- 1. Les envois réglés EN ESPÈCES y entraient. Le transporteur a déjà
--    l'argent en main : il pouvait demander la même somme une seconde
--    fois, par virement.
-- 2. La commission n'était jamais retranchée. Même sur carte, la
--    plateforme reversait 100 % alors qu'elle n'avait encaissé que 90 % :
--    elle rendait la commission qu'elle venait de prélever.
--
-- Constaté en base le 2026-09-15 : la totalité du solde virable du seul
-- transporteur concerné (80,00 €) était de l'argent qu'il avait déjà en
-- poche, et un RIB était enregistré. Rien n'empêchait la demande sinon
-- que personne n'avait essayé.
--
-- Le solde se lit donc désormais dans le grand livre `payments`, seule
-- trace de l'argent réellement encaissé par la plateforme :
-- `transporter_amount_cents` est le montant net, calculé au moment du
-- débit avec le taux alors en vigueur. Les espèces n'y créent aucune
-- ligne — elles sont exclues sans qu'on ait à les nommer.
--
-- Contrepartie assumée : un paiement par carte dont le webhook n'aurait
-- jamais écrit sa ligne n'apparaîtrait pas au solde. Sous-estimer se
-- corrige à la main ; payer deux fois ne se corrige pas.
-- ──────────────────────────────────────────────────────────────────────────

create or replace function public.request_payout()
 returns payout_requests
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_uid       uuid := auth.uid();
  v_gagne     numeric;
  v_requested numeric;
  v_available numeric;
  v_acct      public.payout_accounts%rowtype;
  v_req       public.payout_requests;
begin
  if v_uid is null then
    raise exception 'Non authentifié.';
  end if;

  select coalesce(sum(p.transporter_amount_cents), 0) / 100.0 into v_gagne
  from public.payments p
  join public.shipments s on s.id = p.shipment_id
  where s.transporter_id = v_uid
    and s.status = 'delivered'
    and p.status = 'succeeded';

  select coalesce(sum(amount), 0) into v_requested
  from public.payout_requests
  where transporter_id = v_uid and status in ('pending', 'paid');

  v_available := v_gagne - v_requested;

  if v_available < 10 then
    raise exception 'Montant disponible insuffisant (minimum 10 €). Les courses réglées en espèces ne sont pas virées : vous avez déjà perçu la somme de la main de l''expéditeur.';
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
$function$;
