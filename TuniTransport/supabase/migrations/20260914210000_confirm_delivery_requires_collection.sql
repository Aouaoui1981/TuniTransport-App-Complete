-- ──────────────────────────────────────────────────────────────────────────
-- `confirm_delivery` vérifiait le payeur, le transporteur attitré et le
-- règlement — mais jamais que le colis avait quitté les mains de
-- l'expéditeur. Un envoi pouvait donc passer de `accepted` à `delivered`
-- sans dépôt, sans scan, sans prise en charge, et l'argent était donné pour
-- un trajet qui n'avait pas eu lieu.
--
-- Constaté sur un envoi réel pendant le premier parcours de test :
--   accepted 21:57 → payé 22:02 → delivered 22:15
--   dropped_off_at null, collected_at null
--
-- La prise en charge est le seul moment où quelqu'un d'autre que
-- l'expéditeur atteste que le colis existe : elle exige le jeton de
-- l'étiquette et une photo (`confirm_collection`). C'est donc elle, et pas
-- le paiement, qui ouvre la porte de la confirmation.
--
-- Contrepartie assumée : un transporteur qui ne scanne jamais l'étiquette
-- laisse l'envoi ouvert. Le litige (« Signaler un problème ») et les
-- actions d'administration restent la sortie pour ce cas.
-- ──────────────────────────────────────────────────────────────────────────

create or replace function public.confirm_delivery(p_shipment_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_shipment public.shipments%rowtype;
begin
  select * into v_shipment from public.shipments where id = p_shipment_id for update;
  if not found then raise exception 'Envoi introuvable.'; end if;
  if v_shipment.sender_id <> auth.uid() then
    raise exception 'Seul l''expéditeur peut confirmer la réception.'; end if;
  if v_shipment.transporter_id is null then
    raise exception 'Cet envoi n''a pas encore de transporteur.'; end if;
  if v_shipment.paid_at is null then
    raise exception 'Cet envoi doit être réglé avant la confirmation.'; end if;
  if v_shipment.status = 'cancelled' then raise exception 'Cet envoi est annulé.'; end if;
  if v_shipment.status = 'delivered' then
    raise exception 'La réception de cet envoi est déjà confirmée.'; end if;
  if v_shipment.status not in ('collected', 'in_transit', 'arrived') then
    raise exception 'Le transporteur n''a pas encore pris ce colis en charge — il doit scanner l''étiquette avant que la réception puisse être confirmée.'
      using errcode = '22023';
  end if;
  update public.shipments set status = 'delivered', delivered_at = now() where id = p_shipment_id;
  insert into public.tracking_events (shipment_id, status, description)
  values (p_shipment_id, 'delivered',
    'Réception confirmée par l''expéditeur — livraison validée. Montant crédité au transporteur.');
end; $function$;
