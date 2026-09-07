# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — candidate rejected; one-click Edition Edit still required**
- Auditor verdict: **Stop — architectural risk / target behavior not met**.
- Production `main`: `fa4b53b5ee0193b0580f31af876225c812056108`.
- Rejected candidate: `review/tier-catalogue-admin-ux-phase3-edition-edit-routing-correction` @ `1aab2caa40746d827f9e43d8c635958a6caac6cf`.
- Do not push that candidate to `main`.

## Audit result
The candidate correctly removes the broken remount-sensitive `initialEditTab`/`initialEditApplied` auto-open loop. It also leaves Edition persistence/lifecycle/save ownership unchanged.

However it changes the requested UX into:
`Customer Selection Rules -> Edition X -> Edit -> Options/Edition read cards -> second Edit click -> inline editor`.

That is **not accepted**. Nath explicitly requires the Customer Selection Rules Edit button itself to open the existing Edition inline editor, the same one-click intent as Default Edit. We are not replacing a broken direct route with a two-click route.

## Required behavior
`Customer Selection Rules -> Edition X -> Edit`
1. open the canonical Build Your Own Tier drawer;
2. activate **Options**;
3. select the exact real Edition X;
4. open that Edition's existing `TierEditionEditor` immediately;
5. Save/Cancel closes only the inline editor and returns to the normal full Tier drawer with Options + Edition X still selected and normal lifecycle/footer available.

Default Edit remains unchanged.

## Implementation safeguard
Do **not** restore the rejected child-local remount-sensitive mechanism. Mirror the canonical Default deep-link semantics: the initial Edition edit intent must be owned/consumed at a level that survives `TierEditionDeclarationSwitcher` unmount/refetch, and it must be cleared immediately after the first successful editor open so Save/refetch cannot trigger it again.

Prefer reusing an existing drawer/controller one-shot initial-section/edit-intent pattern if one exists. If a tiny Edition-specific pending intent is unavoidable, keep it in the existing Tier drawer/controller authority, keyed to the real Edition ID, consume it once, and do not create any new editor/persistence/lifecycle/presentation system.

## Non-change boundaries
- no new drawer/header/footer/lifecycle/publish controls;
- no duplicate Edition editor or save path;
- no Edition identity/CZTE/CZTEC, backend, pricing, resolver, quote/cart/customer changes;
- do not touch Always-included initial-cart hydration.

## Claude — next action
Prepare a **clean replacement review branch from current production `main`**; do not stack the rejected candidate into final ancestry. Implement only the one-click canonical routing correction above. Update focused contracts so they prove:
- Edition Edit opens the existing inline editor once;
- post-Save/refetch does not auto-reopen it;
- Options + exact Edition selection persist after Save/Cancel;
- canonical lifecycle/footer becomes reachable normally.

Run focused `tsc`, relevant contracts, and build. Update this same file with branch/SHA, changed files, validation, and set **AWAITING CHATGPT REVIEW**. Do not push to `main`.