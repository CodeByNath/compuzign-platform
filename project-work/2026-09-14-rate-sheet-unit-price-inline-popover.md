# Rate Sheet — Unit Price Inline Popover

## Status
- **READY FOR BUILDER**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Reviewer verdict: **Proceed with safeguards**
- Current production `main`: `9478f106fd7a5ee3ecce0c6a9e6925578614df05`
- Active topic `rate-sheet-unit-price-popover`: currently identical to `main`

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
