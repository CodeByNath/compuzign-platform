# Rate Sheet — Unit Price Inline Popover

## Status
- **SOURCE PUSH NOT APPROVED**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Reviewer verdict: **Proceed with safeguards**
- Production base: `269e1dab0d405e969fc14653e0ae3b4413a8d1bb`
- Reviewed topic head: `a47b6f911c23ff8772db78337ab39c9fc782bced` (`rate-sheet-unit-price-popover`)

## Goal
Refine only the Rate Sheet editor's **Unit Price** cell interaction.

Required result:
- **Edit** opens an anchored popover in the Unit Price cell;
- close control;
- compact 2-column table;
- first row merged as **Unit Price**;
- standard compact case has three visible editable price rows: **One-Time Fee**, **Annual Renewal**, **Monthly Subscription**;
- label left, numeric value right;
- small **Save** inside/alongside the popover;
- preserve Per, Quantity, Group, Remove, row lock, Bundle behavior, focused-Tier callers, and existing Rate Sheet pricing authority.

## Reviewer audit
The topic is one commit directly ahead of production with no divergence. The implementation correctly keeps the existing `unit_price` / `default_price_label` / `price_options[]` model, reuses existing controller commands, preserves Bundle/focused-Tier boundaries, and replaces the old tab strip with a real anchored popover. No new billing-cycle fields, endpoint, session, identity, or pricing authority was introduced.

However the actual UI does **not yet match the requested compact 2×4 layout**. The current code renders Default Price plus however many persisted `priceOptions[]` happen to exist. A fresh row therefore shows only one price row, and the requested labels are not present at all. The Builder report explicitly chose not to render One-Time Fee / Annual Renewal / Monthly Subscription. That conflicts with the stated UI requirement.

## Blocking correction
Keep the existing storage model and preserve arbitrary extra persisted options, but make the standard popover visibly match the requested compact table:

1. The first three visible editable price rows must be presented as **One-Time Fee**, **Annual Renewal**, and **Monthly Subscription** labels (editable, not semantic billing types).
2. Row 1 maps to the existing Default Price (`unit_price` / `default_price_label`). Rows 2 and 3 map to the first two `price_options[]` entries when present.
3. If either option row does not yet exist, still render that visual row without silently persisting a record merely by opening the popover. Materialize the corresponding existing-model price option only when the user actually edits that missing row (or otherwise through the smallest explicit user action). Do not invent a second model.
4. If more than two `price_options[]` already exist, preserve and render the additional options after the standard three rows. Never truncate/delete them.
5. Keep the 2-column structure: label left, value right. Any option remove control must not effectively become a third table column.
6. Keep the anchored popover, close behavior, row-lock draft semantics, outer row Save/Cancel persistence boundary, and focused-Tier/Bundle behavior unchanged.

The popover's small **Save** may remain a close/apply-to-row-draft action as long as the real persistence boundary remains the established outer row Save and the UI does not imply a second backend save path.

## Next action
Builder: apply only this bounded presentation/data-materialization correction on the same `rate-sheet-unit-price-popover` branch, update the focused regressions to cover fresh row (<2 options), exactly two options, and >2 options, rerun focused TypeScript/build/contracts/docs checks, push the updated topic branch, record the new exact SHA and evidence here, set **AWAITING REVIEWER REVIEW**, and stop. Do not push `main` yet.
