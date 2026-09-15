# Tier Inclusions — Readable Pricing and Leg Breakdown

## Status
- **AWAITING REVIEWER REVIEW** — Phase 2 correction
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Corrected candidate: `tier-inclusions-readable-pricing-legs` @ `d7fa41c83bed398c26d4be9e1304cd22ea650265` (one correction commit on reviewed `c2f9421f`; two commits on `main` `d26248b5`)
- Previously reviewed: `c2f9421f525339aad802d321cb977dd268e94bbc`
- Production `main`: `d26248b516dd0f2f492074e1c78482f165d73782`

## Phase 1 — Default Tier
**LIVE PASSED by Nath — 2026-09-15.** Do not reopen without hard evidence.

## Phase 2 — Tier Edition Inclusions
**Verdict: Proceed with safeguards, but SOURCE PUSH NOT APPROVED.**

### Accepted from candidate
Independent diff/source review confirms the candidate correctly reuses the accepted Phase 1 path:
- `buildTierEditionDetail()` feeds `buildTierInclusionLegLines()` with the Edition's own `rate_sheet_id`, resolved selections, and `edition.legs`;
- `pricedInclusionItems()` is shared rather than creating a second renderer/pricing system;
- single effective Leg remains unlabelled; multiple lines are sequential `Leg 1`, `Leg 2...`;
- each Edition Additional Leg resolves its own Price Option and quantity;
- parent CZTL/Rate Sheet values do not drive Edition pricing;
- Edition remains one consolidated module; `TierEditionEditor`, Edit routing, CZTE/CZTEL identity, lifecycle, endpoints, persistence and ordinary chip consumers remain unchanged.

### Blocking correction — unresolved Edition selections disappear
The active Phase 2 requirement says unresolved pricing must remain truthful (`Pricing unavailable`), not disappear.

Current `tierEditionDetailModel.ts` still builds display `items` with:
`resolvedSelections.filter(item => item.source_type === 'inclusion' || !!item.bundle_id)`.

`resolveRateSheetSelection()` sets `source_type: null` when the selected Rate Sheet row/source no longer resolves. Therefore a stale/unresolved non-Bundle Edition selection is removed from `items` entirely. The candidate contract currently demonstrates this hidden state for a parent-only/missing Edition row rather than proving truthful unresolved presentation.

This is the only blocker found.

## Required bounded correction
Preserve an Edition selection in the read card when it exists in `edition.rate_sheet_items` but no longer resolves, so the already-established priced read path can show its fallback label and `Pricing unavailable` rather than silently dropping it.

Do **not** broaden this into backend/schema/persistence/editor changes and do not relax filtering so FAQ/non-inclusion rows become Edition Inclusions. Use the smallest source-aware rule that preserves legitimate inclusion/Bundle selections plus stale unresolved selections without admitting unrelated row types.

Update the focused Phase 2 contract to prove:
- a previously selected Edition inclusion that becomes unresolved remains visible;
- price/total read `Pricing unavailable`;
- parent values still cannot leak;
- normal inclusion, Bundle, single/multi-Leg, editor/lifecycle and plain-chip protections still pass.

Push the correction to the **same topic branch**, rerun the same validation set, record exact new SHA/diff/tests here, set **AWAITING REVIEWER REVIEW**, and stop. Do not merge to `main`.

## Phase 2 Builder correction — 2026-09-15
Bounded fix for the unresolved-row blocker only (`c2f9421f..d7fa41c8`).

- `tierEditionDetailModel.ts` item filter is now `source_type === 'inclusion' || !!bundle_id || (!resolved && source_type == null)`. A selection whose Rate Sheet row or Manager source no longer resolves is kept, and the existing priced path shows its fallback label `(unresolved Rate Sheet item)` with `Pricing unavailable`. A row still identified as `faq` (resolved or missing source) stays excluded. No backend, schema, persistence, editor, renderer, or Default (Phase 1) change.
- Changed files: `tierEditionDetailModel.ts`, `tier-inclusions-readable-pricing-contract.ts`, rebuilt `dist/js/admin-station.js`.

**Contract additions:**
- An Edition selection that only resolves on the parent's sheet stays visible, with its fallback label, `Pricing unavailable` price/total and no Leg label. The parent's `$20.00` and `CZTL` Legs still never apply.
- Row-type boundaries on one Edition: a Bundle is kept at its own `$12.00 Per user`; a row with a deleted Manager source and a row removed from the sheet are both kept as `Pricing unavailable`; a resolved FAQ and a missing-source FAQ are both excluded.
- Mutation-checked: the old filter fails the "remains visible" check; a looser `|| !resolved` fails the FAQ-exclusion check.

**Validation (same set):** `tsc` ✓, `build` ✓, `docs:check` ✓, mode-renderer 25 byte-identical ✓, `contract:tier-inclusions-readable-pricing` ✓. Also ✓: `drawer-module-entry`, `rate-sheet-price-option-selection`, `tier-occupant-inclusions-bundle`, `tier-rate-sheet-catalogue-bundle`, `tier-drawer-editor-chrome`, `tier-edition-admin`, `tier-edition-switch`, `tier-edition-move-to-bin`, `tier-catalogue-declaration-scope`, `commercial-leg-inclusion-groups`/`-extension-groups`, `tier-inclusions-customer-policy-merge`, `tier-catalogue-overview-presentation`, `composable-occupant-address`, `composable-edition-resolution`, `package-tier-workspace`. The last contract edit (adding the missing-FAQ case) changed only the contract file; `tsc` and that contract were rerun after it, and build was rerun before commit. Pre-existing on `main`, unchanged: `admin-station-css` (the same 6 `cz-rate-sheet-tool__*` classes) and the `module-state-snapshot.mjs` crash. No browser/runtime verification performed.
