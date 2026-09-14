# Rate Sheet — Unit Price Inline Popover

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude** (this session)
- Reviewer: **ChatGPT independent auditor**
- Production base: `269e1dab0d405e969fc14653e0ae3b4413a8d1bb`
- Topic branch: `rate-sheet-unit-price-popover`
- Pushed topic SHA: `a47b6f911c23ff8772db78337ab39c9fc782bced`

## Builder report (2026-09-14)

Branch hygiene confirmed (only `main` + `Project-work-instructions` existed; also removed local `admin-ui-refinement`, already merged/remote-deleted). Topic branch cut from `main` at the production base SHA above.

**Files changed** (one commit on the topic branch):
- `rateSheetParts.tsx` — `RateSheetPriceOptionEditor` rewritten: the Unit Price cell now shows a small trigger (current Default Price + **Edit**) opening an anchored popover (`position: absolute` off a `position: relative` wrap — never a detached drawer/modal). Popover: close (×); 2-column table with a merged "Unit Price" title row; Default Price row always first, same `setRowUnitPrice`/`setRowDefaultPriceLabel` commands as before; every `priceOptions[]` entry its own row beneath, all simultaneously visible/editable (no tabs), each with its own Remove (×); `+ Add price` (uncapped); a small **Save** that just closes the popover, since every field already writes into the row's existing lock draft — no new command, no new endpoint. `RateSheetUnitPriceOptionEditor`'s prop/command signature is unchanged, so Bundle rows and the row lock pick this up automatically. Locked-row read summary (`RateSheetRowReadCells`/`RateSheetPriceOptionsSummary`) untouched — no trigger/popover for a locked row.
- `admin-station.css` (+ rebuilt `dist/`) — old tab-strip rules replaced with `.cz-rate-sheet-tool__price-popover*`, existing `--station-*` tokens only, no collision in `atomic-engine/css/`. Locked-row summary CSS untouched.
- `package-station/CLAUDE.md` — the tab-strip paragraph rewritten for the popover; nothing else changed.
- `rate-sheet-row-lock-regression.mjs`, `rate-sheet-bundle-regression.mjs` — both drove the old tab DOM directly; rewrote their price-editing steps to open/read/write/close the popover, and added a direct check of its Remove (×) that neither script exercised before. Same invariants proved, new interaction shape. `buttonIn()` in both now excludes the popover subtree (its own "Save" close-affordance would otherwise collide by text with the row's real Save while open).

**Tests, all green:** `tsc --noEmit`, `build`, `docs:check`, `regression:rate-sheet-row-lock`, `regression:rate-sheet-bundle`, `regression:rate-sheet-service-import` (confirmed unaffected), `contract:tier-connections` (focused-Tier drawers confirmed untouched), `contract:admin-station-css` (6 pre-existing failures, unrelated to this work, reproduced identically on `main` before any change — none of mine among them).

**>3 / <3 price options (Builder decision):** the popover renders exactly what the row already carries — Default Price plus one row per existing `priceOptions[]` entry, whatever the count. Nothing added, truncated, or capped for a fixed row count: a fresh row shows only Default (+ "Add price"); a 5-option row shows all 5. The "compact" 3-row case is what a row looks like once an admin has clicked "+ Add price" twice, not something auto-seeded.

**Naming decision:** did **not** hard-code One-Time Fee/Annual Renewal/Monthly Subscription as placeholder text. The Default row's existing placeholder is the shared `DEFAULT_PRICE_LABEL` constant, also read by the locked-row summary and the Tier's own price selector (`defaultPriceLabel()`) — changing only the popover's ghost text would mismatch what displays elsewhere once saved blank. Read the three names as the brief's illustrative example of the compact shape, per its own "editable labels, not semantic billing types" instruction, rather than literal copy to hard-code. If literal placeholders are wanted instead, that's a one-line bounded correction (three `placeholder` attributes).

## Goal
Refine only the Rate Sheet editor's **Unit Price** cell interaction.

Replace the current stacked/tabbed price-option editor with a compact anchored popover opened by **Edit** inside the Unit Price cell.

Required visual/interaction shape:
- anchored to the Unit Price cell/Edit trigger, not a detached drawer/modal;
- close control;
- compact 2-column table;
- first row merged across both columns as **Unit Price**;
- three price rows in the requested compact case: **One-Time Fee**, **Annual Renewal**, **Monthly Subscription**;
- editable price label left, editable numeric price right;
- small **Save** action inside or directly alongside the popover;
- preserve the existing Unit Price cell position and all surrounding **Per**, **Quantity**, **Group**, **Remove**, row-lock, Save/Cancel, and row behavior.

## Existing architecture / safeguards
`docs/code-map/rate-sheet.md` confirms Rate Sheet pricing remains Package Station authority. `rateSheetParts.tsx` currently renders the standalone active row's Unit Price editor through `RateSheetUnitPriceOptionEditor` / `RateSheetPriceOptionEditor`; the data model is one row-owned `unitPrice` (Default Price) plus **zero or more** row-owned `priceOptions[]`. Labels are presentation configuration; they are not billing-cycle semantics or identity.

**Must preserve:**
- existing `unit_price`, `default_price_label`, and `price_options[]` storage/identity model;
- existing controller commands and full-manager save boundary unless source audit proves a narrow change is required;
- Price Option Platform IDs / backend minting rules;
- focused-Tier connection drawers and any caller that intentionally still uses the plain Unit Price input;
- Bundle rows using the same Rate Sheet row editor;
- arbitrary existing persisted price options: do not truncate, delete, reinterpret, or silently cap stored options merely to force a 2×4 visual.

**Must not substitute:**
- no new billing-cycle fields or commercial-leg semantics;
- no second pricing model;
- no modal/drawer replacing the requested anchored popover;
- no loss of Per/Qty/Group/Remove or row-lock behavior.

## Builder task
1. Start from current `main`, create one topic branch after confirming only the two permanent branches exist.
2. Audit `rateSheetParts.tsx`, `rateSheetToolModel.ts`, controller commands, styles, and Bundle/focused-Tier consumers before editing.
3. Implement the smallest presentation refactor that maps the popover rows onto the existing Default Price + Price Options model.
4. Treat the requested names as editable labels, not semantic billing types. If existing data has a different number of price options, preserve capability and report exactly how the popover handles that case; do not destroy data to obtain exactly four visual rows.
5. Preserve accessibility: trigger semantics, focus/close behavior, keyboard access, labels, and Save state.
6. Run focused TypeScript/build/contracts/docs checks; rebuild generated assets only as required.
7. Push only the topic branch, record exact SHA/files/tests plus the >3/<3 price-option behavior here, set **AWAITING REVIEWER REVIEW**, and stop.

No implementation has been performed by Reviewer.
