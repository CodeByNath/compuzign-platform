# Single Occupant Focused State After Quote

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `22b1ff3619363fef80beadd8cb944d2560f4571f`.
- Previous cart Bundle/Upgrade work is **CLOSED** after Nath live pass.

## Live defect
A Family can have exactly one normal Tier occupant and no add-ons, no Upgrade catalogue, and no other Tier card. Before selection, the focused shell is correct because there is nothing to compare. After that only Tier is added to Cart, the same Family still auto-renders the focused shell, now with a sticky `X`; the customer must manually close it even though there is no Recommendations continuation and no alternate plan choice.

Nath's rule:
- **single occupant + not yet quoted → focused shell**;
- **single occupant + already quoted → do NOT auto-focus; show the normal quoted card/cart state**.

`View Plan` must still be able to open the focused shell explicitly after quote.

## Source audit
`FamilyTierAdapter.tsx` currently derives:
- `singleVisibleTier = normalTiers.length === 1 ? normalTiers[0] : null`;
- `singleTierIsQuoted = singleVisibleTier !== null && selectedTierId === singleVisibleTier.id`;
- but `effectiveFocusedTierId` still auto-falls back to that single Tier whenever `singleTierDismissed` is false, regardless of `singleTierIsQuoted`.

That is the missed logic. The existing dismissal/X machinery was built to make a quoted single Tier manually dismissible, but Nath's desired behavior is simpler: quoted single-Tier state should not enter the implicit focused fallback at all.

## Required behavior
- Exactly one real normal occupant, unquoted: implicit focused shell remains the landing; no orphan one-card grid.
- Same occupant once quoted: implicit focused fallback is disabled; render the normal quoted card + Cart directly.
- Explicit `View Plan` still opens the focused shell and keeps its normal X return path.
- Removing the quoted primary restores the unquoted implicit focused landing immediately.
- Families with 2+ normal occupants are unchanged.
- Families with add-ons or Upgrade catalogue keep their existing staged/Recommendations behavior; do not remove those flows.

## Claude — implementation
From current production `main`, create one review branch.
1. Correct only the implicit single-Tier fallback derivation in `FamilyTierAdapter.tsx` so it applies when the single Tier is **not quoted**. Preserve explicit focus (`focusedTierId`) unchanged.
2. Re-check whether `singleTierDismissedTierId` is still required for the explicit quoted `View Plan` X route; do not delete it unless source proof shows it is dead after this correction.
3. Add/extend focused regression/contract coverage proving:
   - single unquoted Tier auto-focuses;
   - adding it exits to normal quoted card/cart without requiring X;
   - `View Plan` explicitly reopens focus;
   - X from explicit focus returns to the quoted card;
   - removing primary restores implicit focus;
   - multi-Tier and Recommendations/add-on/Upgrade flows unchanged.
4. Run relevant package-builder/focused-shell/customer-tabs/cart contracts, TypeScript, build, docs. Push review branch only, record exact SHA/diff/tests here, set **AWAITING CHATGPT REVIEW**, stop. Do not push `main`.

## Must preserve
Single unquoted focused landing; explicit View Plan focused route; X on explicit focus; cart state; quote identity; Recommendations/add-ons/Upgrade flows; multi-Tier comparison behavior.

## Must remove
Implicit auto-focus for a single occupant once that occupant is already quoted.

## Must not substitute
No CSS hiding of X; no automatic synthetic close; no extra customer click; no disabling View Plan; no treating add-ons as normal occupants; no route redesign; no cart mutation.
