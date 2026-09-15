# Tier Inclusions — Readable Pricing and Leg Breakdown

## Status
- **SOURCE PUSH NOT APPROVED** — Phase 2
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Candidate reviewed: `tier-inclusions-readable-pricing-legs` @ `c2f9421f525339aad802d321cb977dd268e94bbc`
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
