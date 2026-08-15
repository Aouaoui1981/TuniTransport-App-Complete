# CLAUDE.md — TuniTransport / THL

## Infrastructure
- Supabase — le compte contient DEUX projets. Celui de l'application est
  `leuntmiyxqvetksfrjfm` (« TronsporTN »), cf. `EXPO_PUBLIC_SUPABASE_URL`
  dans `TuniTransport/.env.production`. L'autre, `wocxvszzdfpbqlanpbgj`
  (« Aouaoui1981's Project »), est vide : une requête qui y atterrit échoue
  sur `relation "public.profiles" does not exist`. Toujours vérifier le ref
  avant d'exécuter du SQL.

## Journal de bord
- Au DÉBUT de chaque session: lire JOURNAL.md pour reprendre le contexte.
- À la FIN de chaque session (ou avant toute pause): mettre à jour
  JOURNAL.md (fait / reste à faire / fichiers touchés), commit + push.
- Toujours commiter AVANT un typecheck ou une opération longue.
