-- ──────────────────────────────────────────────────────────────────────────
-- Messagerie — « new row violates row-level security policy for table
-- "conversations" » à l'ouverture d'une discussion.
--
-- L'INSERT lui-même passait : la policy conversations_insert avait
-- WITH CHECK true. C'est le RETURNING qui échouait. Le client écrit
--
--     .from('conversations').insert({ shipment_id }).select('*').single()
--
-- et PostgreSQL vérifie la ligne renvoyée contre la policy SELECT,
-- `is_conversation_participant(id)`. À cet instant précis, aucune ligne
-- n'existe encore dans conversation_participants : elles sont insérées
-- juste après, avec l'identifiant que ce RETURNING était censé rapporter.
-- La policy se mordait la queue — on ne peut pas être participant d'une
-- conversation qui n'existe pas encore.
--
-- Conséquence : la messagerie n'a jamais fonctionné en production. Zéro
-- conversation créée depuis l'ouverture, alors que le bouton est présent
-- sur chaque envoi.
--
-- On mémorise donc l'auteur de la ligne, et on l'autorise à la relire.
-- Voir sa propre conversation à peine créée ne révèle rien : il en est
-- l'auteur, et les deux participants y sont ajoutés dans la foulée.
-- ──────────────────────────────────────────────────────────────────────────

alter table public.conversations
  add column if not exists created_by uuid default auth.uid();

drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
  for select to authenticated
  using (is_conversation_participant(id) or created_by = auth.uid());

-- Tant qu'on y est : empêcher d'attribuer la paternité d'une conversation
-- à quelqu'un d'autre. Le client n'envoie pas la colonne, le DEFAULT la
-- remplit, la contrainte passe.
drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations
  for insert to authenticated
  with check (created_by = auth.uid());
