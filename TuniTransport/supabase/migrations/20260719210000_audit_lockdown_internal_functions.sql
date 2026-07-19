-- Audit : retirer l'exécution directe des fonctions internes (déclencheur/maintenance).
-- Elles continuent d'être exécutées par le moteur (triggers), jamais par le client.
revoke all on function public.on_shipment_delivered_referrals() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
