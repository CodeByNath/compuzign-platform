# Rate Sheet — Unit Price Inline Popover

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Previous Reviewer verdict: **Proceed with safeguards** (this correction not yet reviewed)
- Current production `main`: `9478f106fd7a5ee3ecce0c6a9e6925578614df05`
- Corrected topic head: `cf7d7f2b133f3354e617318773b6da2d60d2e610` (`rate-sheet-unit-price-popover`) — one commit ahead of `main`

## Accepted scope so far
- **Edit** opens an anchored Unit Price popover in the existing cell.
- Compact 2-column table with merged **Unit Price** heading.
- Standard editable rows: **One-Time Fee**, **Annual Renewal**, **Monthly Subscription**.
- Editable label left / numeric price right.
- Close control + small Save inside the popover.
- Existing Per, Quantity, Group, Remove, row lock, Bundle behavior, focused-Tier callers, and Package Station pricing authority remain intact.

## Live validation finding — Nath
The popover itself is acceptable. The remaining defect is the **pre-popover trigger presentation** in the active/editing row.

Current active Unit Price cell shows the row's single Default Price (for example `$45,000`) with a small `Edit` link beneath it. That is misleading/incomplete once a row can carry multiple visible prices, because it presents only one price immediately before opening an editor that manages several.

The locked/read row already has the correct multi-price summary (`Price Options` with One-Time / Annual / Monthly rows), so the active row does not need to repeat a single Default Price as its trigger.

## Bounded correction
In the active/editing row's Unit Price cell:
- replace the current value + small `Edit` stacked trigger with **one normal `Edit` button only**;
- clicking that button opens the same anchored Unit Price popover;
- do not show `$45,000` or any other single/default price beside/above the trigger;
- keep the popover itself unchanged;
- keep the locked/read-row multi-price summary unchanged;
- preserve all outer row controls and row-lock behavior exactly as-is.

Use the existing button system/size appropriate to this grid; do not create a new button primitive. Preserve `aria-haspopup`, `aria-expanded`, focus return, Escape/outside-click close behavior, and the existing row Save/Cancel persistence boundary.

## Source-state note
`9478f106` is the current deployed production/topic head and includes the previously requested CSS-only popover width increase. Treat that exact state as the base for this correction; do not revert the width change.

## Next action
Builder: make only this trigger-presentation correction on the same `rate-sheet-unit-price-popover` branch, update focused regression coverage so the active Unit Price cell exposes only the `Edit` button before opening, rerun focused TypeScript/build/regression/CSS checks, push the topic branch, record the exact new SHA and evidence here, set **AWAITING REVIEWER REVIEW**, and stop. Do not push `main` yet.

## Builder report — trigger correction (2026-09-14)

One commit, `9478f106` → `cf7d7f2b`, on `rate-sheet-unit-price-popover`.

**`rateSheetParts.tsx`:** the trigger button is now `cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm` (the exact class combo the row's own locked Edit/Remove and active Save/Cancel/Delete already use — no new button primitive), text content literally `Edit`, nothing else. Dropped the stacked value span (`{formatUnitPrice(unitPrice)}`) entirely. `aria-haspopup="true"`, `aria-expanded={open}`, the `aria-label` (now `Edit ${defaultPriceLabel(defaultLabel)} for ${ariaLabel}` — an accessible-name-only detail, not visible text), focus-to-first-field on open, Escape/outside-click close, and focus-return to the trigger on close are all byte-for-byte unchanged from the reviewed `b402b09d`/`9478f106` behavior. The popover panel itself, the locked-row `Price Options` summary, and every other row control are untouched.

**CSS:** deleted the now-dead `.cz-rate-sheet-tool__price-popover-trigger`, `-trigger-value`, `-trigger-action` rules (no longer emitted anywhere); `contract:admin-station-css` confirms no orphaned selector was left behind (same 6 pre-existing, unrelated findings as every prior round).

**Regressions:** the trigger is now itself literally text "Edit", which collided with `buttonIn()`'s row-level Edit/Save/Cancel/Delete lookup while a row is active — widened its exclusion from the popover panel to the whole `.cz-rate-sheet-tool__price-popover-wrap` (trigger + panel) in both scripts, and re-pointed `priceEditTrigger()` at the wrap's direct-child `<button>` (stable whether the popover is open or closed) instead of the now-removed `-trigger` class. Added an explicit check in both scripts asserting the trigger's `textContent` is exactly `'Edit'` with no `$` anywhere in it, satisfying "expose only the Edit button before opening."

**Tests, all green:** `tsc --noEmit`, `build`, `docs:check`, `regression:rate-sheet-row-lock`, `regression:rate-sheet-bundle`, `regression:rate-sheet-service-import` (unaffected), `contract:tier-connections` (unaffected), `contract:admin-station-css` (6 pre-existing unrelated failures, unchanged).
