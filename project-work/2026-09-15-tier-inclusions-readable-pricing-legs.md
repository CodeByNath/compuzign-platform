# Tier Inclusions — Readable Pricing and Leg Breakdown

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Candidate: `tier-inclusions-readable-pricing-legs` @ `a19c91f477fb5a9a3ee99ea6bab620b0fabde335` (one commit on `main` `cd86c943`)
- Nath explicitly authorised starting this work on 2026-09-15 while the prior Package Home dropdown item remains pending live validation.

## Verdict
**Proceed with safeguards.** This is a read-projection/presentation change only. Current source already carries resolved inclusion `label`, `unit_price`, `per`, `quantity`, and `line_total`; do not change pricing ownership, storage, endpoints, identity, or the existing inline editor.

## Required read view
One wrapper per inclusion.

Single effective commercial leg: keep the compact form with no leg label:

```text
SUSE Linux                         $20.00 Per VM
QTY - 2                                  $40.00
```

More than one effective leg: show the inclusion header once, then repeat only the leg rows:

```text
SUSE Linux                         $20.00 Per VM
----------------------------------------------
Leg 1
QTY - 2                                  $40.00
----------------------------------------------
Leg 2
QTY - 2                                  $40.00
```

Use the actual leg-resolved price option/unit price, quantity, and line total for each leg. Never copy Default-Leg values into additional legs, merge/sum legs, or multiply by duration. Follow existing leg ordering/identity. No Commercial Leg editor or lifecycle UI belongs in this read card.

## Architecture boundary
- Start from current `main` and re-read root `AGENTS.md`, `docs/ai-index.md`, `docs/code-map/{package-station,tiers,rate-sheet,drawer-system}.md`, relevant architecture contracts, then authoritative source.
- Primary read path: `drawer/tier/tierDetailModel.ts` -> `drawer/schema/bindings/tier.tsx` -> Drawer Kit item-collection renderer.
- Preserve `PoolInclusionsEditor`, its Edit action, `saveTierFeatures`, drafts, status, notifications, discard, Editions behavior, and backend pricing unchanged.
- Existing generic `item-collection` is shared. Do not globally turn all collections into pricing cards. Any contract extension must be additive/optional so existing `{id,label}` consumers render unchanged.
- Reuse already-resolved authoritative selection/leg data. Do not add endpoints, backend schema/storage, a second pricing calculator, or a parallel shell/renderer system.
- Keep unresolved pricing truthful (`Pricing unavailable`/existing equivalent), never `$0` by invention.

## Builder housekeeping
Before source work, the repository branch slot must be available. Confirm the existing `package-home-family-dropdown-visibility` branch is fully contained in `main`; remove it only if the repository hygiene guard permits. Then create/reuse the single topic branch for this work.

## Validation / handoff
Prove: existing non-Tier item collections unchanged; single-leg read has no leg label; multi-leg rows use each leg's actual assignment; unresolved selections remain truthful; Edit/Save/Cancel/discard/status/notifications unchanged; Editions are not conflated with Default; relevant snapshots/contracts, TypeScript, build and docs checks pass.

Push only the topic candidate, record exact remote SHA, changed files, tests/contracts, unresolved risks, set **AWAITING REVIEWER REVIEW**, and stop. Do not merge to `main` before reviewer approval.

## Builder report — 2026-09-15
**Housekeeping:** `package-home-family-dropdown-visibility` was equal to `main` (`cd86c943`); deleted local + remote. The single topic slot is now this branch.

**Implementation**
- `tierDetailModel.ts` → `buildTierInclusionLegLines()`: Default line is the already-resolved selection unchanged; each `leg_assignments[]` entry matching the occupant's `legs[]` by identity (`platform_id`, else stable `id`) resolves its own `price_option_id`/`quantity` through the existing `resolveRateSheetSelection()`. No copy from Default, merge, sum, or duration. Order is Default, then `legs[]` order.
- `bindings/tier.tsx`: formats lines into `item-collection`'s new optional `pricing`. Single Leg: `$20.00 Per VM` / `QTY - 2` / `$40.00`, no label. Multiple Legs: labelled rows. An unresolved row, source or price option reads `Pricing unavailable`; a resolved row without a rate reads `Not configured` (reuses `tierInclusion.tsx` `money`/`NOT_CONFIGURED`, now exported).
- `library.ts`/`modeRenderers.tsx`: additive optional `pricing`; renders priced wrappers only when bound, else the unchanged chip markup. CSS `cz-station-priced-item*` (no `atomic-engine/css` collision).

**Changed files:** `library.ts`, `modeRenderers.tsx`, `drawer-kit.css` (+`dist/css`), `bindings/tier.tsx`, `bindings/tierInclusion.tsx`, `tierDetailModel.ts`, `dist/js/admin-station.js`, `package.json`, `mode-renderer-snapshot.mjs` + snapshot (3 added cases), new `tier-inclusions-readable-pricing-contract.ts`, `docs/code-map/commercial-legs.md` (one table row).

**Validation (local):** `tsc` ✓; `build` ✓; `docs:check` ✓. Mode-renderer snapshot: the 22 existing cases were byte-identical before the new fixtures were added, and 25 are byte-identical after. New `contract:tier-inclusions-readable-pricing` ✓ (covers single Leg without a label, per-Leg quantity/price option, `legs[]` ordering, a draft-id Leg reference, orphan exclusion, no summing, unresolved row/option, Discard/Edit footer + `PoolInclusionsEditor` unchanged, Service/Category/Edition bind no pricing). ✓ `drawer-module-entry`, `rate-sheet-price-option-selection`, `tier-occupant-inclusions-bundle`, `tier-rate-sheet-catalogue-bundle`, `tier-drawer-editor-chrome`, `tier-edition-admin`, `commercial-leg-inclusion-groups`/`-extension-groups`, `tier-inclusions-customer-policy-merge`, `tier-catalogue-overview-presentation`, `composable-occupant-address`, `package-tier-workspace`.

**Pre-existing failures, identical on clean `main`, untouched:** `admin-station-css` (6 unemitted `cz-rate-sheet-tool__*` classes); `module-state-snapshot.mjs` crashes (`requiresParent` of undefined).

**Decisions for reviewer / unresolved risks**
1. Leg labels use the existing editor vocabulary (`Leg Default`, `Leg 1…N` = `legs[]`) rather than the example's `Leg 1/Leg 2`. Otherwise "Leg 1" would name different Legs in the read card and the editor.
2. The header shows the unit price once only when every Leg resolves the same one; otherwise each Leg row carries its own. This avoids attributing Default's price to other Legs.
3. Legs come from `detail.legs` (settled), the same source the Edit session passes; a pending Pricing Rules Leg draft is not reflected, same as the existing Legs count.
4. Editions' own inclusion card is unchanged (chips).
5. No browser/runtime verification was performed.
