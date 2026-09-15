# Tier Inclusion Unit-Price Copy Order

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Candidate: `tier-inclusion-unit-price-copy-order` @ `8d1f0185811e69214c0fd85c29819eef0c5d9226` (one commit on `main` `d7fa41c8`)
- Production `main`: `d7fa41c83bed398c26d4be9e1304cd22ea650265`

## Scope
Presentation-only refinement to the already-live Tier and Tier Edition Inclusions read cards.

Current unit-price copy:

```text
$25.00 Per VM
```

Approved target copy:

```text
Per VM · $25.00
```

This applies wherever the shared Tier/Edition Inclusions read formatter presents a resolved unit price, including:
- the shared header price when all effective Legs use the same unit price;
- the per-Leg unit price when effective Legs use different prices.

No other card structure changes.

## Audit finding
**Verdict: Proceed.**

The current authoritative path is the shared `lineUnitPrice()` formatter in `resources/ts/package-station/drawer/schema/bindings/tier.tsx`, already consumed by both Default Tier and Tier Edition priced inclusion cards through `pricedInclusionItems()`.

This should remain one shared presentation rule. Do not introduce Edition-specific formatting or duplicate renderer logic.

## Must preserve
- stored `unit_price` and `per` values;
- Rate Sheet ownership and unit vocabulary;
- all Price Option resolution;
- Leg identity, ordering, quantity and totals;
- single-Leg/multi-Leg layout and labels;
- `Pricing unavailable` and `Not configured` states;
- Default Tier and Edition editors/lifecycle;
- customer-facing pricing behaviour outside this admin read presentation.

## Required implementation
For a resolved line with a non-empty `per`, format exactly:

`{per} · {money(unit_price)}`

Examples:
- `Per VM · $25.00`
- `Per user · $12.00`
- `Per GB · $8.00`

If `per` is absent, keep the existing money-only output.

Do not alter total display (`$25.00`), quantity display, unavailable/not-configured copy, CSS layout, persistence, backend, endpoints, or pricing calculations.

Update only the relevant contract/snapshot expectations for this shared presentation copy. Verify both Default Tier and Edition cases use the new order and existing unrelated item-collection consumers remain unchanged.

## Builder handoff
Confirm branch hygiene, create/reuse the single topic branch from current `main`, implement this bounded change, run focused contract/snapshot plus TypeScript/build/docs checks as appropriate, push only the topic candidate, record exact SHA/diff/validation here, set **AWAITING REVIEWER REVIEW**, and stop. Do not merge to `main` before reviewer approval.

## Builder report — 2026-09-15
**Branch hygiene:** the repository held only `main` + `Project-work-instructions`; the topic branch was created from `main` `d7fa41c8`.

**Change:** the one shared `lineUnitPrice()` in `bindings/tier.tsx` now returns `` `${per} · ${money(unit_price)}` `` when `per` is non-empty, else `money(unit_price)`. Default Tier and Edition both reach it via `pricedInclusionItems()`, for header and per-Leg unit prices alike. No Edition-specific formatting was added. Totals, quantities, `Pricing unavailable`/`Not configured`, Leg labels/layout, CSS, renderer, pricing, persistence and backend are unchanged.

**Diff (3 files):** `bindings/tier.tsx` (1 line), `tier-inclusions-readable-pricing-contract.ts`, rebuilt `dist/js/admin-station.js`.

**Contract:** 8 unit-price expectations moved to the new order, covering Default single/shared-header/per-Leg (`Per VM · $20.00`, `Per VM · $25.00`) and Edition header/per-Leg/Bundle (`Per VM · $30.00`, `Per VM · $27.00`, `Per user · $12.00`), plus the parent-leak check. A new case checks that a row without `per` stays `$5.00` with total `$10.00`. Mutation check: the old formatter fails the contract.

**Snapshot:** `mode-renderer-snapshot` is unchanged and 25 cases are byte-identical. Its priced fixtures pass pre-bound strings and the renderer formats nothing, so plain-chip consumers and renderer markup are unaffected.

**Validation:** `tsc` ✓, `build` ✓, `docs:check` ✓. Contracts ✓: `tier-inclusions-readable-pricing`, `drawer-module-entry`, `tier-edition-admin`, `tier-drawer-editor-chrome`, `rate-sheet-price-option-selection`, `tier-occupant-inclusions-bundle`. Pre-existing on `main`, unchanged: `admin-station-css` (same 6 `cz-rate-sheet-tool__*`), `module-state-snapshot.mjs` crash. No browser verification performed.
