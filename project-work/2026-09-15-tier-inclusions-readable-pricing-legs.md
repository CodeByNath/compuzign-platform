# Tier Inclusions — Readable Pricing and Leg Breakdown

## Status
- **AWAITING REVIEWER REVIEW** (Phase 2)
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Phase 2 candidate: `tier-inclusions-readable-pricing-legs` @ `c2f9421f525339aad802d321cb977dd268e94bbc` (one commit on `main` `d26248b5`)
- Production `main`: `d26248b516dd0f2f492074e1c78482f165d73782`
- Deployment: GitHub Actions run #1036 — **Success**

## Phase 1 — Default Tier read view
**LIVE PASSED by Nath — 2026-09-15.**

Accepted behaviour:
- one effective Leg: inclusion name + unit price/per, `QTY` + total, no Leg label;
- multiple effective Legs: one inclusion header, then sequential `Leg 1`, `Leg 2`, etc.;
- each row uses that Leg assignment's own Price Option, quantity and derived line total;
- no merging/summing or duration multiplication;
- existing inclusion editor/save/discard/lifecycle preserved.

Do not reopen Phase 1 without hard evidence.

## Phase 2 — Tier Edition Inclusions
**Verdict: Proceed with safeguards.**

Nath requires the same readable pricing/Leg treatment for **Tier Editions**.

### Current architecture
`tierEditionDetailModel.ts` already resolves each Edition's own `rate_sheet_items` through the authoritative `resolveRateSheetSelection()` rule and already has the Edition's own `rate_sheet_id` and `legs[]`. However, it currently reduces those resolved selections to `{ id, label, missing }`, and `tierEditionInclusionsShell` renders plain `item-collection` chips.

The Default Tier implementation already added the optional priced `item-collection` renderer contract and `buildTierInclusionLegLines()` projection. Reuse that established path where semantically valid; do not build a second pricing/read system.

### Required Edition read view
For each Edition inclusion:

Single effective Leg — no Leg label:
```text
SUSE Linux                         $20.00 Per VM
QTY - 2                                  $40.00
```

Multiple effective Legs:
```text
SUSE Linux                         $20.00 Per VM
----------------------------------------------
Leg 1
QTY - 2                                  $40.00
----------------------------------------------
Leg 2
QTY - 2                                  $40.00
```

Rules are identical to accepted Phase 1: sequential read labels only; actual per-Leg Price Option/quantity; truthful unavailable pricing; no summing; no duration multiplication.

### Must preserve
- Edition's own Rate Sheet binding, `rate_sheet_items`, `legs[]`, CZTE/CZTEL identity and lifecycle;
- Edition remains one consolidated backend module;
- `TierEditionEditor` and its existing shared Edit session/tabs;
- parent Default Tier data must never leak into Edition pricing;
- shared `item-collection` plain-chip consumers remain unchanged;
- no endpoint, persistence, backend pricing, identity, or lifecycle changes.

### Builder action
Start from current `main` after confirming branch hygiene. Audit `tierEditionDetailModel.ts`, `bindings/tierEdition.tsx`, the accepted Default implementation, and relevant Tier Edition/Commercial Leg Code Maps before editing.

Implement the smallest reuse of the accepted priced-item projection for Edition Inclusions. Add/update a focused contract proving: Edition uses its own Rate Sheet/selections/legs; single-Leg unlabelled; multi-Leg sequential; per-Leg Price Option/quantity correct; parent values cannot leak; existing Edition Edit session/lifecycle unchanged; ordinary chip consumers unchanged.

Run relevant TypeScript/build/docs/contracts. Push only the topic candidate, record exact SHA/diff/tests here, set **AWAITING REVIEWER REVIEW**, and stop. Do not merge to `main` before reviewer approval.

## Phase 2 Builder report — 2026-09-15
**Branch hygiene:** repository held only `main` + `Project-work-instructions`; topic branch re-created from `main` `d26248b5` (same name, one topic slot).

**Implementation (reuse, no second read/pricing system)**
- `tierEditionDetailModel.ts`: `buildTierEditionDetail()` now also builds `legLines = buildTierInclusionLegLines(svc, edition.rate_sheet_id, resolvedSelections, edition.legs ?? [])`, i.e. the Edition's own bound sheet, its own already-resolved `rate_sheet_items` and its own CZTEL `legs[]`. `edition` is the existing draft-preferred `editionView()` row; no parent occupant input is passed.
- `bindings/tier.tsx`: the Phase 1 formatter is now the exported `pricedInclusionItems(items, legLines)`. The Default card output is unchanged.
- `bindings/tierEdition.tsx`: `TierEditionInclusionsShellData` gains optional `legLines`; the bind uses `pricedInclusionItems`. Footer stays `edit` only, with no editor key (shared `TierEditionEditor` session, inclusions tab).
- Unchanged: the renderer contract/CSS, the Default card, the single consolidated Edition module, CZTE/CZTEL identity, lifecycle, endpoints, persistence, backend pricing, and plain-chip consumers (Service, Category).

**Changed files:** `tierEditionDetailModel.ts`, `bindings/tierEdition.tsx`, `bindings/tier.tsx`, `tier-inclusions-readable-pricing-contract.ts`, rebuilt `dist/js/admin-station.js`, `docs/code-map/commercial-legs.md` (Inclusions-read table row now covers Edition).

**Contract (`contract:tier-inclusions-readable-pricing`) — Phase 2 section** runs the real `buildTierEditionDetail()` + `tierEditionInclusionsShell` against an Edition whose sheet, prices, quantities and Leg IDs all differ from the parent fixtures:
- Edition uses its own sheet row, price and quantity.
- A single Leg is unlabelled; multiple Legs are sequential `Leg 1|Leg 2`, and Leg 2 uses its own price option and quantity.
- The parent's `CZTL` assignment is ignored; a parent-only sheet row does not resolve on the Edition, and the parent's `$20.00` never appears.
- The Edit-only footer, the absence of an editor, and Edit → `onEdit('inclusions')` are unchanged.
- The model source passes the Edition's own inputs.

The Phase 1 checks still pass. Service/Category remain asserted pricing-free; Edition was removed from that list because it now intentionally binds pricing. Mutation check: feeding `[]` instead of `edition.legs` fails the contract.

**Validation (local):** `tsc` ✓, `build` ✓, `docs:check` ✓, mode-renderer 25 byte-identical ✓. Contracts ✓: `drawer-module-entry`, `rate-sheet-price-option-selection`, `tier-occupant-inclusions-bundle`, `tier-rate-sheet-catalogue-bundle`, `tier-drawer-editor-chrome`, `tier-edition-admin`, `tier-edition-switch`, `tier-edition-move-to-bin`, `tier-catalogue-declaration-scope`, `commercial-leg-inclusion-groups`/`-extension-groups`, `tier-inclusions-customer-policy-merge`, `tier-catalogue-overview-presentation`, `composable-occupant-address`, `composable-edition-resolution`, `package-tier-workspace`. Pre-existing on `main`, unchanged: `admin-station-css` (the same 6 `cz-rate-sheet-tool__*`, none added) and the `module-state-snapshot.mjs` `requiresParent` crash.

**Risks:** Edition inclusion items still use the existing filter (inclusion-sourced or Bundle rows only), so an unresolved row stays hidden on the Edition card, as it was before Phase 2. No browser/runtime verification performed.
