# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — v2 candidate implements the required one-click routing**
- Auditor verdict (superseded pending this review): **Stop — architectural risk / target behavior not met**.
- Production `main`: `fa4b53b5ee0193b0580f31af876225c812056108`.
- Rejected candidate (superseded, do not use): `review/tier-catalogue-admin-ux-phase3-edition-edit-routing-correction` @ `1aab2caa40746d827f9e43d8c635958a6caac6cf`.
- **Candidate v2**: `review/tier-catalogue-admin-ux-phase3-edition-edit-routing-correction-v2`, SHA `56a15ad9a4e35e46b04e96b585b6c6e42cb7ba31`, branched fresh from `main`@`fa4b53b5` (not stacked on the rejected candidate). Not pushed to `main`.

## v2 — what changed vs. the rejected candidate
Rejected candidate removed the auto-open entirely (two clicks: Edit -> read cards -> Edit again). This candidate keeps one-click auto-open and fixes the actual defect instead.

**Root cause, confirmed via `useTierModuleEditing`'s own analogous pattern:** `TierDrawerContent` itself (and the `useTierDrawerController`/`useTierModuleEditing` hooks it calls) never unmounts during a refetch — only the CHILD subtree it renders briefly swaps to `<AsyncLoading/>` while `!pkg.detailLoaded`. `TierEditionDeclarationSwitcher` is part of that child subtree, so it unmounts/remounts on every Edition mutation refetch (including its own inline editor's Save). The rejected-candidate diagnosis was right about the mechanism (auto-open guard reset on remount while the seeding value stayed truthy) but the fix over-corrected by deleting the auto-open instead of moving its one-shot guard to a level that survives the remount — exactly the level `useTierModuleEditing`'s own `openedInitialSection` ref already lives at for the analogous Default-declaration deep link.

**Fix:** `initialEditionEditTab` is now real `useState` owned by `useTierDrawerController` (seeded once from `initialEditionId`, never recomputed per render as it was before), with a `consumeInitialEditionEditTab` setter. `TierEditionDeclarationSwitcher`'s auto-open effect calls `onInitialEditTabConsumed()` in the same tick it calls `openEdit()`, clearing the source of truth itself. A post-Save remount of the switcher now finds `initialEditTab` already `undefined` and does not re-fire — no component-local ref needed at all, since the guard lives where the state does (survives the remount) rather than in the component that gets torn down.

**Changed files** (fresh diff from `main`, not from the rejected candidate):
- `resources/ts/package-station/drawer/tier/useTierDrawerController.ts` — `initialEditionEditTab` lifted from a per-render derived constant to real state + `consumeInitialEditionEditTab`.
- `resources/ts/package-station/drawer/tier/TierDrawerContent.tsx` — passes `onInitialEditTabConsumed={c.consumeInitialEditionEditTab}` alongside the existing `initialEditTab` prop.
- `resources/ts/package-station/drawer/tier/TierEditionDeclarationSwitcher.tsx` — auto-open effect now calls the consumer and drops the local `initialEditApplied` ref (no longer needed or sufficient).
- `scripts/tier-catalogue-declaration-scope-contract.ts` — assertions rewritten to prove the new one-shot-consumed pattern (both the switcher's and the controller's source), plus a new assertion that `TierDrawerContent` wires both value and consumer through.
- `dist/js/admin-station.js` — rebuilt.

**Resulting behavior:** Customer Selection Rules -> Edition X -> Edit opens the canonical Tier drawer, activates Options, selects Edition X, and opens its existing `TierEditionEditor` immediately (one click, matching Default Edit's own directness). Save/Cancel return to the normal drawer with Options active, Edition X still selected, and full lifecycle/footer available — and, unlike the original broken behavior, it stays that way: the post-Save refetch that remounts the switcher no longer finds a truthy seed to re-fire against.

**Proof canonical Edition save/lifecycle ownership is unchanged:** `openEdit`/`saveEdit`/`cancelEdit`, `useTierEditions`, `TIER_EDITION_ENTITY`, `buildTierEditionDetail`, the pinned footer's `buildTierLifecycleMenu`/`buildTierPublishMenu`, and every endpoint call are byte-identical to `main` — untouched by this diff.

**Validation (from `wp-content/plugins/compuzign-platform/`):**
- `npx tsc --noEmit` — clean.
- `npx tsx scripts/tier-catalogue-declaration-scope-contract.ts` — PASS (rewritten assertions).
- `npx tsx scripts/tier-edition-switch-contract.ts` — PASS.
- `npx tsx scripts/composable-tier-admin-ux-contract.ts` — PASS.
- `npx tsx scripts/tier-customer-policy-draft-contract.ts` — PASS.
- `npx tsx scripts/tier-inclusions-customer-policy-merge-contract.ts` — PASS.
- `npx tsx scripts/tier-edition-admin-contract.ts` — PASS.
- `npm run build` — succeeded, `dist/js/admin-station.js` rebuilt.
- No live/browser validation performed — no WP environment available locally; needs the same live-validation pass as before this can be trusted.

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