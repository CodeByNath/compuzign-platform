# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — Edition Edit routing correction implemented, one target-behavior deviation flagged below**
- Auditor verdict (superseded pending this review): **Stop — architectural risk in the current isolated Edition-editor presentation.**
- Production `main`: `fa4b53b5ee0193b0580f31af876225c812056108`.
- Deploy #966 succeeded for that SHA.
- Candidate branch: `review/tier-catalogue-admin-ux-phase3-edition-edit-routing-correction`, candidate SHA `1aab2caa40746d827f9e43d8c635958a6caac6cf`, branched from `main`@`fa4b53b5`. Not pushed to `main`.
- Keep `review/tier-catalogue-admin-ux-phase3-correction-v3` until this correction is replaced/reviewed.

## Root cause found
Traced the live defect to a specific mechanism, not just its symptom. `TierEditionDeclarationSwitcher`'s `initialEditTab` prop auto-opened the selected Edition's inline editor once on mount via a `useRef` guard (`initialEditApplied`) local to that component instance. Every Edition module mutation (including the inline editor's own Save) refetches through `usePackageStation`, and `TierDrawerContent` briefly unmounts its entire child tree (`<AsyncLoading/>`) while `!pkg.detailLoaded` — which unmounts `TierEditionDeclarationSwitcher` and resets `initialEditApplied` back to `false`. Meanwhile `initialEditionEditTab` (`useTierDrawerController`) is recomputed from `initialDeclarationId`, a prop that stays constant for the life of the mounted drawer — so it is still truthy on remount. Net effect: the editor auto-reopened again immediately after every Save, which is exactly the "no normal footer/Publish path reachable" symptom Nath saw live — the footer was never actually a dead end, it just kept getting yanked back into `focusedTaskActive` a moment after each Save closed it.

## Correction implemented
Removed the auto-open effect entirely, plus its prop-chain seeding (`initialEditTab` prop and its doc comment on `TierEditionDeclarationSwitcher.tsx`; `initialEditionEditTab` on `useTierDrawerController.ts`; the prop pass on `TierDrawerContent.tsx`). Nothing else about Options/Edition routing changed — `initialDeclarationId` → `initialEditionId` still seeds `tierTab='options'` and `selectedDeclarationId` exactly as before (untouched code, still contract-verified).

**Changed files:**
- `resources/ts/package-station/drawer/tier/TierEditionDeclarationSwitcher.tsx` — removed `initialEditTab` prop, its doc comment, the `initialEditApplied` ref + auto-open `useEffect`, and the now-unused `useRef` import.
- `resources/ts/package-station/drawer/tier/useTierDrawerController.ts` — removed `initialEditionEditTab` from the controller's returned object and its comment. `initialEditionId` itself is unchanged and still used for `tierTab`/`selectedDeclarationId` seeding.
- `resources/ts/package-station/drawer/tier/TierDrawerContent.tsx` — removed the `initialEditTab={c.initialEditionEditTab}` prop pass and its comment.
- `scripts/tier-catalogue-declaration-scope-contract.ts` — updated assertions #9 to assert the auto-open plumbing is now ABSENT from both files (previously asserted it as required behavior — this file's other assertions, #7/#8 and the Options/`selectedDeclarationId` seeding checks, are unchanged and still pass since that behavior is unchanged).
- `dist/js/admin-station.js` — rebuilt.

**Resulting behavior:** Customer Selection Rules → Edition X → Edit still routes into the canonical Tier drawer, activates Options, and selects the real Edition X (unchanged). It now lands on that Edition's normal read cards (Overview / Pricing Rules / Inclusions), the same landing every other Options entry gets, rather than force-opening the editor. The admin's own Edit click on a card opens the exact same shared `TierEditionEditor`/draft/save path (`openEdit`) every other Options entry already uses — same code path, not a new one. Save/Cancel return to those same read cards with Options active, the Edition still selected, and full Details/Options/Connections/Support groups + normal lifecycle/footer available (`focusedTaskActive` only true while a card is actually being edited, and no longer re-triggered by a post-save remount).

**⚠️ Flagging one deviation from the target-behavior spec as written:** point 2's last bullet says the route should "open that Edition's existing inline editor" automatically. I did not preserve auto-opening in any form — I removed it outright, because the only mechanism available to drive it (`initialEditTab`, reset by every post-mutation remount) is the literal cause of the live defect, and the doc's own boundary list names exactly this plumbing for removal ("removing only the extra presentation/routing machinery... including any now-unnecessary `initialEditTab`/auto-open plumbing if that plumbing exists only for this detour" — confirmed via repo-wide grep: it existed only for this detour). A remount-safe re-implementation of auto-open (e.g., keyed off something outside the remounting subtree, firing only once per Edition id rather than once per mount) was possible but would be new routing machinery of the kind the boundary list rules out, so I did not build it without sign-off. Net effect for the admin: one extra click (Edit on the desired card) versus the originally specified zero-click landing, in exchange for a routing path with no remount/re-open defect. Please confirm this trade is acceptable, or tell me which auto-open mechanism you want instead.

**Proof canonical Edition save/lifecycle ownership is unchanged:** `saveEdit`/`cancelEdit`, `useTierEditions`, `TIER_EDITION_ENTITY`, `buildTierEditionDetail`, the pinned footer's `buildTierLifecycleMenu`/`buildTierPublishMenu`, and every endpoint call are byte-identical — none of those functions or their call sites were touched, only the auto-open trigger and its seeding.

**Validation results (from `wp-content/plugins/compuzign-platform/`):**
- `npx tsc --noEmit` — clean.
- `npx tsx scripts/tier-catalogue-declaration-scope-contract.ts` — PASS (updated assertion).
- `npx tsx scripts/tier-edition-switch-contract.ts` — PASS.
- `npx tsx scripts/composable-tier-admin-ux-contract.ts` — PASS.
- `npx tsx scripts/tier-customer-policy-draft-contract.ts` — PASS.
- `npx tsx scripts/tier-inclusions-customer-policy-merge-contract.ts` — PASS.
- `npx tsx scripts/tier-edition-admin-contract.ts` — PASS.
- `npm run build` — succeeded, `dist/js/admin-station.js` rebuilt (no CSS change).
- No live/browser validation performed — no WP environment available locally; this needs the same live-validation pass Nath ran on the previous candidate before it can be trusted.

## Live evidence
Nath validated the deployed Admin UI. Customer Selection Rules scope switching is present, but **Edition -> Edit** deep-links into the Edition editor as an isolated/focused drawer task. After Save the Edition becomes **Pending**, while the normal Tier drawer lifecycle context/footer is not available, leaving no normal Publish path in that presentation.

This must **not** be repaired by adding header/footer/lifecycle actions to the isolated view.

## Required correction
Remove the special Customer Selection Rules Edition presentation/deep-link behavior that scopes the Edition editor out as a standalone focused task.

Target behavior:
1. Customer Selection Rules -> **Default -> Edit** keeps using the canonical Default Inclusions edit path.
2. Customer Selection Rules -> **Edition X -> Edit** must route into the **canonical existing Tier drawer** exactly through its normal Edition ownership:
   - open the Build Your Own Tier drawer;
   - activate **Options**;
   - select the exact real Edition X;
   - open that Edition's existing inline editor, using the existing `TierEditionEditor` and existing draft/save path.
3. On **Save or Cancel**, return to the normal full Tier drawer with:
   - **Options** still active;
   - the same Edition still selected;
   - normal Details / Options / Connections / Support drawer groups and normal lifecycle/footer behavior available.

## Non-change boundaries
- Do **not** create another Edition editor, drawer, header, footer, lifecycle system, controller, persistence path, or publish action.
- Do **not** add Publish/Enable/Disable/etc. into the isolated editor presentation.
- Do **not** change Edition identity, CZTE/CZTEC ownership, `tier_editions[]`, save/settle/publish semantics, pricing, resolver, quote/cart/customer behavior, or backend routes.
- Reuse the real Edition ID and the existing Options/Edition inline editor.
- Remove only the extra presentation/routing machinery that causes the standalone focused-editor detour (including any now-unnecessary `initialEditTab`/auto-open plumbing if that plumbing exists only for this detour).
- Do not touch the separate Always-included initial-cart hydration defect.

## Claude — next action
Implement only this correction on a clean review branch from current production `main`. Update the relevant Code Map if current-state routing documentation changes. Run focused TypeScript/contracts/build checks required by the touched area.

Then update this same work file with:
- exact branch + candidate SHA;
- changed files;
- what routing/presentation code was removed or simplified;
- proof that canonical Edition save/lifecycle ownership is unchanged;
- validation results;
- `AWAITING CHATGPT REVIEW`.

Do **not** push to `main` until independent review approves the candidate.