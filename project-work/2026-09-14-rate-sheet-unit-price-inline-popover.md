# Rate Sheet — Unit Price Inline Popover

## Status
- **AWAITING LIVE VALIDATION**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Reviewer verdict: **Proceed** (for `b402b09d`; see note below on the one commit pushed after that review)
- Production base: `269e1dab0d405e969fc14653e0ae3b4413a8d1bb`
- Reviewer-approved topic head: `b402b09d1d83b938315f1c0466bdf6ab541e5f48` (`rate-sheet-unit-price-popover`)
- Production `main` (deployed): `9478f106fd7a5ee3ecce0c6a9e6925578614df05` — Deploy to Hostinger run [34845308667](https://github.com/CodeByNath/compuzign-platform/actions/runs/34845308667) — **success**
- Intermediate `main` (deployed en route): `b402b09d` — Deploy run [34844278097](https://github.com/CodeByNath/compuzign-platform/actions/runs/34844278097) — **success**

**Note for Reviewer:** one further commit (`9478f106`, CSS-only: `.cz-rate-sheet-tool__price-popover` `min-width` 240px→320px, `max-width: fit-content`) was pushed to `main` on top of the reviewed `b402b09d`, at Nath's direct real-time request, outside the normal review queue. No structural/behavioral/TS change — `tsc`, `build`, `contract:admin-station-css`, and `regression:rate-sheet-row-lock` were all rerun and pass identically to `b402b09d`. Flagging per "any new source change invalidates approval" so this specific delta gets its own sign-off rather than being silently folded into the prior `Proceed`.

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
Deployed. **Nath: please validate live** — Package Station → a Rate Sheet's Details → Edit a row → its Unit Price cell:
- Edit trigger opens an anchored popover at the cell (not a detached drawer/modal), now wider (`min-width: 320px`);
- close (×) control;
- compact 2-column table, merged "Unit Price" title row;
- three standard rows — One-Time Fee / Annual Renewal / Monthly Subscription placeholders — Default Price always populated, rows 2/3 editable even on a fresh row with no price options yet;
- typing into a still-blank row 2/3 keeps it editable and it persists on Save; a row with more than two price options keeps the extras below, never truncated;
- small Save inside the popover, and the row's own outer Save/Cancel/Remove/Per/Quantity/Group still behave exactly as before.

Reviewer: `9478f106` (the CSS-only width tweak on top of your approved `b402b09d`) is unreviewed by you — flagged above for sign-off once Nath's live validation is in.
