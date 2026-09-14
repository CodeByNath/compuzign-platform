# Rate Sheet — Unit Price Inline Popover

## Status
- **CLOSED — accepted 2026-09-14**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Final verdict: **Proceed**
- Production `main`: `cf7d7f2b133f3354e617318773b6da2d60d2e610`
- Deployment: GitHub Actions "Deploy to Hostinger" run #1031 — **Success**

## Accepted result
The Rate Sheet Unit Price editor now uses a compact anchored popover opened by a normal **Edit** button in the active Unit Price cell.

Accepted behavior:
- active Unit Price cell shows **Edit only**, with no misleading single-price preview;
- anchored 2-column popover with merged **Unit Price** heading;
- standard editable rows for **One-Time Fee**, **Annual Renewal**, and **Monthly Subscription**;
- editable label left / numeric value right;
- Close and small Save inside the popover;
- additional persisted price options remain preserved and render after the standard rows;
- missing standard option rows materialize only on actual user edit, not merely on popover open;
- locked/read row retains the multi-price summary;
- Per, Quantity, Group, Remove/Delete, row Save/Cancel, Bundle behavior, focused-Tier consumers, identities, and Package Station pricing authority remain unchanged.

## Production / live evidence
- `main` is the exact reviewed SHA `cf7d7f2b133f3354e617318773b6da2d60d2e610`.
- Deploy to Hostinger run #1031 completed successfully for that SHA.
- Nath completed live validation and explicitly reported **passed** on 2026-09-14.

The topic branch is identical to `main` and is safe to delete during housekeeping before the next topic branch is created.

Work area closed. Do not reopen without hard evidence of a regression.
