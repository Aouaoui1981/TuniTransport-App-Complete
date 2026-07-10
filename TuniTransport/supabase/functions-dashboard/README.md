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
