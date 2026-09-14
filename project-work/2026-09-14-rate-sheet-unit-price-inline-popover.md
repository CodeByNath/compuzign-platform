# Rate Sheet — Unit Price Inline Popover

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Previous Reviewer verdict: **Proceed with safeguards** (blocking correction below)
- Production base: `269e1dab0d405e969fc14653e0ae3b4413a8d1bb`
- Corrected topic head: `b402b09d1d83b938315f1c0466bdf6ab541e5f48` (`rate-sheet-unit-price-popover`)
- Previously reviewed head: `a47b6f911c23ff8772db78337ab39c9fc782bced`

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

## Builder report — correction round (2026-09-14)

Applied all six points of the blocking correction, on the same topic branch, one new commit (`a47b6f91` → `b402b09d`).

**`rateSheetParts.tsx`:** the popover now always renders the standard compact case's three price rows. Row 1 = Default Price, placeholder "One-Time Fee" (unchanged storage). Rows 2/3 read `priceOptions[0]`/`[1]` when present; when absent they still render editable, placeholder "Annual Renewal"/"Monthly Subscription", with no Remove control (nothing to remove yet). Opening the popover mints nothing. New `materializeStandardSlot(index, patch)`: on the admin's own first keystroke into a still-missing row, calls the SAME `addPriceOption`/`setPriceOptionLabel`/`setPriceOptionUnitPrice` commands every option already used — no new command, no new model. If row 3 is typed into while row 2 is still missing, row 2 is minted blank first (`price_options[]` is a plain ordered array with no separate slot identity — same rule the existing `Option ${index+1}` read-fallback already relies on), so array order — and which row each entry later displays as — stays correct. Any further, already-existing options beyond the standard two render after them (unchanged behavior, generic "Option label" placeholder); `+ Add price` still appends further, uncapped. Remove control stays inside the price `<td>` (point 5) — confirmed no layout change needed, it was already there.

**Regressions**, both updated to open/read/write the new standard-slot rows (`rate-sheet-row-lock-regression.mjs`, `rate-sheet-bundle-regression.mjs`), with explicit new coverage per the Next Action's ask:
- fresh row (0 options): both standard rows render phantom, no Remove, opening+closing+Saving persists an EMPTY `price_options[]` (proves nothing is minted merely by opening);
- typing row 2 only → exactly one option, row 3 stays phantom;
- typing row 3 while row 2 still phantom (on Row B) → both materialize, row 2 blank — proves the ordering-preservation rule — then Cancel discards BOTH;
- typing row 3 with row 2 already real → exactly two options;
- `+ Add price` for a third (>2 case) → all three persist in order, never truncated; locked summary shows Default + 3 lines, the blank-labelled row falling back to "Option 2" exactly as the existing (unchanged) summary rule already does;
- explicit Remove on a materialized STANDARD row (not just an "extra" one) confirmed working.

**`package-station/CLAUDE.md`** updated to describe the standard-slot/materialize-on-edit behavior in place of the round-1 description.

**Tests, all green:** `tsc --noEmit`, `build`, `docs:check`, `regression:rate-sheet-row-lock`, `regression:rate-sheet-bundle`, `regression:rate-sheet-service-import` (unaffected), `contract:tier-connections` (unaffected), `contract:admin-station-css` (same 6 pre-existing, unrelated failures as round 1 — no CSS touched this round).

**Flagging for this review round:** the "One-Time Fee"/"Annual Renewal"/"Monthly Subscription" strings are still only `placeholder` ghost text on rows 1–3, per point 1's "editable, not semantic billing types" — a blank row 1 still reads "Default Price" everywhere else (locked summary, trigger's accessible name, Tier price selector) via the unchanged `DEFAULT_PRICE_LABEL`/`defaultPriceLabel()`, and a blank row 2/3 still reads "Option 1"/"Option 2" in the locked summary — both intentionally unchanged read-side fallbacks, out of this bounded correction's scope. Flagging in case the wider rename is wanted as a separate, explicitly-scoped follow-up.
