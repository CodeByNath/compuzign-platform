# Single Visible Tier Permanent Focus + Recommendation Polish

## Status
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `7ffd3e4b41e11eb8c5ae95694bd4bf7085152e7f`.
- Candidate branch: `feat/single-visible-tier-focus-polish`.
- Candidate: `3ad0b2c51492e39d7d40035eeece534b5cd497c9`, tree `f615abe4fc0d1e7c4255b4a447f35d745648bf5c`.

## Scope
Live follow-up only:
1. compact centred Recommendations CTA using CompuZign tokens/proper CSS;
2. `Maybe next time` uses existing secondary Tier choose treatment;
3. hide chevrons unless the track genuinely overflows;
4. larger parent-owned gap between selected Tier and compact CTA shell;
5. restore pending Upgrade CTA after page refresh from a restored primary quote.

Must preserve lone-group no-X/tabs, quote identity, Upgrade browsing, Cart suppression while Upgrade CTA/browsing is active, Add-ons hidden while Upgrade CTA is pending, Add-on + Cart behavior after `Maybe next time`, pricing/Legs and responsive behavior.

## Auditor review
The candidate source implementation is sound and narrowly scoped:
- compact shell uses token spacing and content-sized layout;
- `Maybe next time` reuses `.cz-cost-builder__tier-choose` rather than a duplicate button style;
- `PricingTiers.tsx` derives chevrons from measured `scrollWidth > clientWidth` with resize/content remeasurement;
- CTA-only spacing is owned by the Tier strip grid;
- reload parity seeds the Upgrade gate from the restored primary + shared `resolveComposableEligibleRows(family)` eligibility + absence of a committed composable line; `Maybe next time` remains in-session only;
- the Family reset is mount-guarded so it does not immediately wipe the restored gate seed.

Claude's focused tests/build/docs evidence is adequate and the branch is one clean commit from current `main`.

## One blocker before source approval
The candidate updates `docs/code-map/package-builder-tier-navigation.md` but leaves an existing statement that is now false:

> pending Upgrade CTA "no longer suppresses the Cart"

and the step table still presents `recommendations` as Cart-eligible without the accepted pending-CTA exception.

Current source still correctly uses `upgradeCtaVisible` to suppress Cart while the CTA is on screen. Nath's accepted rule is also that pending Upgrade CTA hides **both Cart and Add-ons**; `Maybe next time` restores ordinary Recommendations where Cart/Add-ons may appear.

Because this candidate touches the Code Map, it must not ship with documentation contradicting the live/source contract.

## Claude — correction only
Do not alter source behavior. Update only the affected current-state Code Map wording so it accurately states:
- Add-on-only Recommendations are Cart-eligible;
- pending Upgrade CTA is inside Recommendations but suppresses Cart and hides Add-ons;
- `Maybe next time` clears the pending gate and restores ordinary downstream Recommendations/Cart/Add-ons;
- browsing remains Cart/Add-on suppressed.

Re-run `docs:check` and any documentation contract that covers this map. Keep the same review branch, produce one clean candidate from current `main`, record exact new SHA/tree, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.
