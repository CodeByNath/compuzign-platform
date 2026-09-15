# Tier Inclusions — Readable Pricing and Leg Breakdown

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Corrected candidate: `tier-inclusions-readable-pricing-legs` @ `d26248b516dd0f2f492074e1c78482f165d73782` (one correction commit on the reviewed `a19c91f4`)
- Previously reviewed candidate: `a19c91f477fb5a9a3ee99ea6bab620b0fabde335`
- Base `main`: `cd86c943163db65a42b9c6d4719f023f98527aa2`

## Required outcome
One wrapper per inclusion.

Single effective Leg remains compact and unlabelled:

```text
SUSE Linux                         $20.00 Per VM
QTY - 2                                  $40.00
```

Multiple effective Legs show the inclusion header once, then repeat only each Leg row:

```text
SUSE Linux                         $20.00 Per VM
----------------------------------------------
Leg 1
QTY - 2                                  $40.00
----------------------------------------------
Leg 2
QTY - 2                                  $40.00
```

Each row must use that Leg assignment's own resolved Price Option/unit price, quantity and derived line total. Never copy Default values, merge/sum Legs, or multiply by duration.

## Reviewer result — 2026-09-15
**Verdict: Proceed with safeguards.**

Independent review confirms the candidate architecture is sound:
- Default uses the existing resolved selection.
- Additional assignments resolve through existing `resolveRateSheetSelection()` using their own `price_option_id` and quantity.
- Shared `item-collection` extension is additive/optional, preserving existing chip consumers.
- Existing `PoolInclusionsEditor`, save/discard/status/lifecycle, Rate Sheet ownership, endpoints, persistence and Editions behaviour remain unchanged.
- Unresolved pricing remains truthful rather than fabricating `$0`.

### Blocking correction
The candidate currently uses read-view labels `Leg Default`, `Leg 1`, `Leg 2...`. That does not match the approved read presentation.

Change **read-view display labels only** so effective displayed lines are sequential:
- Default effective line -> `Leg 1`
- first Additional Leg -> `Leg 2`
- second Additional Leg -> `Leg 3`
- continue sequentially

Single-effective-Leg inclusions must still show no Leg label.

### Must preserve
- Commercial Legs editor vocabulary: `Leg Default`, `Leg 1...`
- Leg identity, ordering, `leg_platform_id`, draft/stable IDs
- each assignment's own Price Option and quantity
- `resolveRateSheetSelection()` pricing rule
- existing read-card layout and optional shared renderer contract
- `PoolInclusionsEditor`, Save/Cancel/discard/status/notifications
- backend schema/storage/endpoints and Editions behaviour

### Must not substitute
Do not rename Commercial Legs globally, change stored identity, introduce new pricing calculations, recompute duration totals, alter persistence, or broaden this correction beyond the Tier Inclusions read presentation and its contract expectation.

## Builder next action
Keep the existing candidate architecture unchanged. Make only the bounded read-label correction above, update the relevant contract/snapshot expectation if required, rerun the same validation set, push to the **same topic branch**, record the new exact candidate SHA and validation result here, set status to **AWAITING REVIEWER REVIEW**, and stop. Do not merge to `main` before reviewer approval.

## Builder correction — 2026-09-15
Bounded read-label correction only, on the same topic branch (`a19c91f4..d26248b5`).

- `tierDetailModel.ts` `buildTierInclusionLegLines()`: the read-view `legLabel` is now sequential over the effective lines actually displayed. Default is `Leg 1`, and each next matched Additional assignment is `Leg ${lines.length + 1}`. Numbering follows displayed lines, not `legs[]` position: an inclusion assigned only to `legs[1]` reads `Leg 1`, `Leg 2`. A single effective Leg still has no label (binding unchanged).
- Unchanged: Leg identity matching (`platform_id` / stable `id`), `legs[]` ordering, `leg_platform_id`, each assignment's own `price_option_id`/quantity through `resolveRateSheetSelection()`, the renderer contract/layout, `PoolInclusionsEditor`, save/discard/status, backend, Editions. Editor vocabulary (`Leg Default`, `Leg 1…`) is untouched and is now pinned by the contract.
- Changed files: `tierDetailModel.ts`, `tier-inclusions-readable-pricing-contract.ts` (sequential expectations, new legs[0]-unassigned case, editor-vocabulary check), `mode-renderer-snapshot.mjs` + snapshot (label text in the 2 multi-Leg fixture cases only), rebuilt `dist/js/admin-station.js`.

**Validation (same set, rerun):** `tsc` ✓; `build` ✓; `docs:check` ✓; mode-renderer 25 cases byte-identical ✓ (the 22 original cases are unchanged); `contract:tier-inclusions-readable-pricing` ✓; ✓ `drawer-module-entry`, `rate-sheet-price-option-selection`, `tier-occupant-inclusions-bundle`, `tier-rate-sheet-catalogue-bundle`, `tier-drawer-editor-chrome`, `tier-edition-admin`, `commercial-leg-inclusion-groups`/`-extension-groups`, `tier-inclusions-customer-policy-merge`, `tier-catalogue-overview-presentation`, `composable-occupant-address`, `package-tier-workspace`. Still pre-existing and identical on `main`: `admin-station-css` (the same 6 `cz-rate-sheet-tool__*` classes, none from this work) and the `module-state-snapshot.mjs` `requiresParent` crash. No browser/runtime verification performed.
