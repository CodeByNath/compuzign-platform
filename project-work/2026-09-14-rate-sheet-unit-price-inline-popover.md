# Rate Sheet — Unit Price Inline Popover

## Status
- **READY FOR BUILDER**
- Builder: **Claude / Codex as assigned by Nath**
- Reviewer: **ChatGPT independent auditor**
- Production base: `269e1dab0d405e969fc14653e0ae3b4413a8d1bb`

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
