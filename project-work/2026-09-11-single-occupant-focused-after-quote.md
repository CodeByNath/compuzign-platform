# Single Occupant Focused State After Quote

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `22b1ff3619363fef80beadd8cb944d2560f4571f`.
- Review branch: `review/single-occupant-quoted-focus` @ `83a9d1117ddf1d5bdefc13feabe632e38a846b82`, exactly 1 ahead / 0 behind.
- Source push is not approved.

## Nath's authoritative rule
Special behavior applies only when the Family has exactly one normal Tier occupant, no add-on anywhere in the Family, and no eligible Upgrade catalogue.

Then: unquoted = focused shell, Cart hidden, no X. Quoted = same focused shell, Cart visible alongside, no X. Removing the quote hides Cart again while the shell remains.

Other Family shapes keep existing comparison, Recommendations and focused behavior.

## Audit result
The Family-wide qualification and Cart coexistence logic are correct. `familyOffersNothingElse` uses Family-wide normal occupants, Family-wide add-ons and whole-Family composable eligibility. `PackageBuilderApp` receives a quote-suppression fact, so the globally-lone quoted shell can coexist with Cart while ordinary explicit focus and composable browsing still hide it.

One defect remains: a cross-audience Family can have one visible Tier in the current audience but another normal occupant or add-on elsewhere. Once that visible Tier is quoted, the implicit focused fallback correctly shows X because the Family is not globally lone. But the old dismissal state was removed. Since an implicit fallback already has `focusedTierId === null`, clicking X only clears values that are already null and the fallback can immediately remain open. The current regression proves X appears but does not click it.

## Claude — correction
Preserve the globally-lone rule exactly. Restore or replace the minimum presentation state needed so X on a quoted, implicit, single-visible-Tier that is not globally lone actually dismisses to its normal quoted card without bouncing back.

Extend mounted regression for both cross-audience cases: quote the visible Tier; verify X and hidden Cart; click X; verify focused shell closes, normal quoted card/View Plan appears and Cart becomes visible; click View Plan; verify explicit focused shell reopens with X and Cart hidden.

Keep the globally-lone case unchanged: no X, focused shell stays, Cart appears after quote.

Clean stale comments around the fallback/close path. Then rebuild one clean single-commit candidate from current production main, confirm 1 ahead / 0 behind, rerun focused regressions/contracts plus TypeScript/build/docs, record exact SHA/tree, set **AWAITING CHATGPT REVIEW**, and stop.

## Must preserve
Whole-Family lone qualification; focused shell before/after quote for truly lone Family; Cart coexistence only there; no X there; audience behavior; add-ons/Upgrade/Recommendations; ordinary explicit/composable Cart suppression.

## Must remove
A visible but ineffective X and fallback bounce-back.

## Must not substitute
Do not hide X on non-lone quoted implicit views. Do not reintroduce a small-card route for globally-lone Families. No CSS workaround, parent Family-rule duplication or weakening of other Cart-suppression rules.
