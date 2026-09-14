# Rate Sheet — Unit Price Inline Popover

## Status
- **SOURCE PUSH APPROVED**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Reviewer verdict: **Proceed**
- Production base: `269e1dab0d405e969fc14653e0ae3b4413a8d1bb`
- Approved topic head: `b402b09d1d83b938315f1c0466bdf6ab541e5f48` (`rate-sheet-unit-price-popover`)

## Accepted scope
- **Edit** opens an anchored Unit Price popover in the existing cell.
- Compact 2-column table with merged **Unit Price** heading.
- Standard three visible editable rows: **One-Time Fee**, **Annual Renewal**, **Monthly Subscription**.
- Editable label left / numeric price right.
- Close control + small Save inside the popover.
- Existing Per, Quantity, Group, Remove, row lock, Bundle behavior, focused-Tier callers, and Package Station pricing authority remain intact.

## Reviewer audit
The corrected topic is two commits directly ahead of production with no divergence. The correction commit is one commit directly ahead of the previously reviewed head.

The implementation now satisfies the requested compact layout without creating a second pricing model:
- row 1 remains the existing Default Price (`unit_price` / `default_price_label`) and displays **One-Time Fee** as editable placeholder copy;
- rows 2/3 map to `price_options[0]` / `[1]` and display **Annual Renewal** / **Monthly Subscription**;
- missing option rows render visually but opening the popover creates nothing;
- first user edit materializes the needed option through the existing `addPriceOption` / label / unit-price commands;
- editing row 3 first preserves ordered-array position by materializing the missing preceding slot;
- existing options beyond the standard two continue after the three-row compact section, uncapped and never truncated;
- Remove remains inside the value cell, so the table remains two-column.

No billing-cycle fields, commercial-leg semantics, endpoint, identity model, or persistence authority were added. The popover Save only closes/applies to the existing row draft; the established outer row Save/Cancel remains the persistence boundary.

Builder reports focused coverage for fresh rows, exactly two options, >2 options, standard-row removal, Bundle behavior, TypeScript/build/docs, service import, tier connections, and the same six pre-existing unrelated Admin Station CSS-contract findings.

## Next action
Builder may move **only** exact SHA `b402b09d1d83b938315f1c0466bdf6ab541e5f48` to `main` and let normal GitHub Actions deployment run. Any source change invalidates this approval.

After deployment, record exact `main` SHA and workflow result, set **AWAITING LIVE VALIDATION**, and ask Nath to validate the Rate Sheet Unit Price popover: Edit trigger/anchoring, 2×4 standard layout, labels/values editing, extra-option preservation, Close/Save behavior, and unchanged surrounding row controls. Then stop.
