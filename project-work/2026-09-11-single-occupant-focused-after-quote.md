# Single Occupant Focused State After Quote

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `22b1ff3619363fef80beadd8cb944d2560f4571f`.
- Review branch: `review/single-occupant-quoted-focus` @ `61923064f679cfe6b413fc52fcc8889ac792b4d8`, tree `ef9be48924a19cff838870852747cc919c60a393`, exactly 1 ahead / 0 behind.
- **SOURCE PUSH NOT APPROVED.**

## Nath's authoritative rule
Only a genuinely lone Family gets the special presentation: exactly one normal Tier occupant across the whole Family, no add-on anywhere, no eligible Upgrade catalogue.

Then: unquoted = focused shell, Cart hidden, no X. Quoted = same focused shell, Cart visible alongside, no X. Remove quote = shell remains, Cart hides again.

Other Family shapes keep existing comparison, Recommendations and focused behavior.

## Audit result
The implementation now satisfies the actual runtime rule and the previously-missed close path:
- Family-wide lone qualification is correct.
- `FamilyTierAdapter` reports quote suppression, so `PackageBuilderApp` can show Cart beside only the globally-lone quoted implicit shell.
- cross-audience quoted implicit shells keep X + Cart suppression;
- restored `singleTierDismissedTierId` makes that X genuinely dismiss to the quoted card and prevents bounce-back;
- stale dismissal is cleared so removing/re-quoting the same Tier gets a fresh shell;
- globally-lone Family cannot enter the dismissal path because it has no X.

The renamed `onQuoteSuppressedChange` contract is accepted. The value is no longer equivalent to shell activity, so retaining the old `onFocusedShellActiveChange` name would be misleading. All known mounted callers have been updated.

## Required cleanup before source approval
`regression:quoted-single-tier-dismissible` is now obsolete and intentionally red because its fixture is exactly the globally-lone Family whose approved behavior changed. Its central contract says quoted lone Tier must be dismissible, which now contradicts Nath's rule. Do not ship a deliberately failing regression.

Retire that obsolete regression completely:
1. delete `scripts/quoted-single-tier-dismissible-regression.mjs`;
2. remove its `package.json` script entry;
3. rely on `single-occupant-quoted-focus-regression.mjs`, which now covers both replacement responsibilities: globally-lone persistent/no-X behavior and non-lone cross-audience X dismissal/View Plan return.

Then rebuild one clean single-commit candidate from current production `main`, exactly 1 ahead / 0 behind. Run the new focused regression, membership-boundary regression, relevant package/cart/focus contracts, TypeScript, build and docs; report exact SHA/tree and baseline comparison; set **AWAITING CHATGPT REVIEW** and stop. Do not push `main`.

## Must preserve
Whole-Family lone qualification; focused+Cart coexistence only for lone quoted Family; no X there; working X/View Plan on non-lone quoted implicit views; add-ons/Upgrade/Recommendations; ordinary explicit/composable Cart suppression.

## Must remove
Only the superseded regression that encodes the old product rule.

## Must not substitute
Do not weaken the new regression, hide X on non-lone views, restore a small-card route for globally-lone Families, or alter runtime behavior while retiring the obsolete test.
