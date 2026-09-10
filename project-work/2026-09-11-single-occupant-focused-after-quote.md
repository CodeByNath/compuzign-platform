# Single Occupant Focused State After Quote

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `22b1ff3619363fef80beadd8cb944d2560f4571f`.
- Current review branch: `review/single-occupant-quoted-focus` @ `28ab832f0bc603c2e4a44a4d7dfa08407abbc941`, exactly 1 ahead / 0 behind.
- **SOURCE PUSH NOT APPROVED.**

## Nath's exact rule — authoritative
Special behavior applies only when the Tier occupant is genuinely alone across the **whole Family**:
- exactly one normal Tier occupant in the Family;
- no add-on occupant anywhere in the Family;
- no eligible Upgrade Your Build catalogue.

Then:
- before Add to Quote: focused shell visible, Cart hidden, no X;
- after Add to Quote: same focused shell stays visible, Cart appears alongside, no X;
- remove quote: shell remains, Cart hides again.

If the Family has another normal Tier occupant, any add-on, or eligible Upgrade catalogue, preserve existing comparison/staged Recommendations behavior. Ordinary explicit focused shells and composable browsing still suppress Cart.

## Current candidate — what is correct
Claude fixed the parent visibility boundary correctly. `FamilyTierAdapter` now reports quote **suppression** rather than raw shell activity; `PackageBuilderApp` owns one `hasVisibleQuote = items.length > 0 && !quoteSuppressedByShell` decision. The lone quoted implicit shell can therefore coexist with Cart while explicit focus/composable browsing still hide it. The candidate also keeps the lone shell locked with no X.

## Remaining defect before push approval
The candidate does **not yet enforce Nath's “whole Family” condition exactly**.

`singleVisibleTier` and `addonTiers` are derived from `visibleTiers`, which is already filtered by the active customer/audience group. Therefore a Family could contain:
- one Personal & Business normal occupant and one Enterprise normal occupant, or
- an add-on that exists only in the other audience group,

and the currently visible group could still look like “one Tier + no add-ons”. `familyOffersNothingElse` would incorrectly classify it as a genuinely lone Family.

The special shell+Cart/no-X behavior must be keyed from **Family-wide membership**, not current tab visibility.

## Claude — correction
Use the already-derived Family-wide authorities (`familyOccupants`, `normalOccupants`, and Family-wide add-on membership) to determine whether this Family truly contains only one normal Tier and no add-ons. Keep `resolveComposableEligibleRows(family).length === 0` for Upgrade eligibility unless source proves a stricter Family-wide authority is required.

Do not change the visible-group rendering rules themselves. The selected customer group may still determine what is shown; it must not determine whether the Family qualifies as globally lone.

Add regression proof for cross-audience cases:
1. PB normal Tier + Enterprise normal Tier => **not** globally lone; special persistent focused+Cart behavior must not activate merely because current tab shows one Tier.
2. One normal Tier in current group + add-on in another group => **not** globally lone.
3. Truly one normal Tier across Family + zero add-ons + zero eligible Upgrade => special behavior still works exactly.
4. Parent Cart visibility boundary remains: hidden before quote, visible after quote while focused shell remains, hidden again after removal.

Also clean the nearby stale comments that still describe quoted single-Tier implicit focus as having an ordinary sticky X; that is no longer true for the globally-lone case.

Rebuild one clean candidate from current production `main`, single commit, 1 ahead / 0 behind, rerun the focused mounted regression/contracts + TypeScript/build/docs, record exact SHA/tree, set **AWAITING CHATGPT REVIEW**, stop. Do not push `main`.

## Must preserve
Focused shell before/after quote for genuinely lone Family; Cart hidden before quote and visible after quote; no X; exact cart mutation; audience-tab behavior; add-ons/Upgrade/Recommendations; multi-Tier comparison; explicit focused-shell Cart hiding; composable browsing Cart hiding.

## Must not substitute
No visible-tab-only definition of “alone”; no small-card/View Plan workaround; no leaving focused shell after quote; no CSS-only Cart reveal; no parent duplication of Family eligibility logic; no weakening other shell suppression rules.
