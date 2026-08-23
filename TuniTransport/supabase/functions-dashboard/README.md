# Déploiement des fonctions de paiement via le Dashboard Supabase

Les fichiers `.ts` de ce dossier sont des **bundles générés** : chaque fonction
de paiement est fusionnée avec les modules `_shared/` en un seul fichier, pour
pouvoir être déployée par **copier-coller dans l'éditeur du Dashboard Supabase**
(Edge Functions → Deploy a new function → Via Editor) — utile quand on n'a pas
accès à la CLI `supabase` (p. ex. depuis un téléphone).

- La version canonique du code reste `supabase/functions/` — ne modifiez pas
  ces bundles à la main.
- Après un changement dans `supabase/functions/`, régénérez avec :
  `node supabase/functions-dashboard/generate.js`

## Déploiement

| Fichier | Nom exact de la fonction | Verify JWT |
|---|---|---|
| `create-payment-intent.ts` | `create-payment-intent` | activé (défaut) |
| `create-checkout-session.ts` | `create-checkout-session` | activé (défaut) |
| `stripe-webhook.ts` | `stripe-webhook` | **désactivé** (l'auth est la signature Stripe) |

Secrets requis (Edge Functions → Secrets) : `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET` (après création de l'endpoint webhook côté Stripe),
et en option `PLATFORM_FEE_PERCENT`, `CHECKOUT_SUCCESS_URL`, `CHECKOUT_CANCEL_URL`.

## Attention : modifier le depot ne deploie rien

Les fonctions en production ne contiennent pas ce code. Chacune est un
**une-ligne** qui importe le bundle depuis une URL `raw.githubusercontent`
**epinglee sur un commit** :

    import 'https://raw.githubusercontent.com/<owner>/<repo>/<COMMIT>/TuniTransport/supabase/functions-dashboard/<fonction>.ts';

Consequence : un correctif pousse sur `main` n'atteint la production que si
la fonction est **redeployee avec un nouveau pointeur de commit**. Le piege
s'est deja referme une fois — un durcissement de `sanitizeCheckoutUrl` date
du 12 juillet 2026 est reste hors production jusqu'au 23 aout.

Apres toute modification :

1. `node supabase/functions-dashboard/generate.js`
2. commit + merge sur `main`, noter le SHA du commit de merge
3. redeployer chaque fonction touchee avec le nouveau SHA dans l'import

Deuxieme dependance a connaitre : cette URL n'est servie que parce que le
depot est **public**. Le rendre prive casserait les trois fonctions de
paiement au premier demarrage a froid.
