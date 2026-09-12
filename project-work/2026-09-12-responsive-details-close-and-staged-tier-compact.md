# Responsive Details Close + Focused Occupant Entry

## Status
- **SOURCE PUSH NOT APPROVED** — queued behind `2026-09-12-cart-upgrade-secondary-cta.md` closure hygiene.
- Auditor verdict: **Proceed with safeguards**.
- Baseline `main`: `80676874e6da8728dfefee8115628d0cb296196d`.
- Do not start source work until the predecessor is **CLOSED** and the old review branch is gone.

## Nath's corrected scope
Only two responsive customer-flow fixes remain.

### 1. View Details X must remain visible
This applies to both shared details-modal entry points:
- focused Tier/Edition -> **View plan details** -> `PlanDetailsModal`;
- Cart -> **View details** -> `QuoteDetailsOverlay`.

The current close control is positioned outside the modal corner and can disappear on some browsers/viewports. Use the same sticky-in-view principle as the focused occupant X so the close control remains visible while modal content scrolls. Preserve ESC close, focus trapping, backdrop close, labels and body scroll lock.

### 2. Any focused occupant must enter from its top on responsive devices
Treat this as one general focused-state rule for Package Builder occupants, not a Tier-only exception.

Whenever a customer opens or reopens any occupant in the shared focused shell on phone/tablet, bring the focused shell's top into view so the customer starts at the beginning of that focused experience and reads it top-to-bottom.

This includes:
- normal Tier occupant;
- Add-on occupant;
- **Upgrade your build** / composable occupant when Browse Catalogue or Manage Build opens its focused browsing shell.

Use the shared focused-shell transition/state as the authority where possible. Do not bolt separate scroll behavior onto each occupant type unless the current architecture genuinely requires separate hooks. Desktop behavior stays unchanged.

This is navigation/presentation behavior only. Preserve Tier/Edition/composable identity, quote mutation, Cart eligibility, Recommendations, Upgrade flow, pricing and Commercial Legs.

## Removed from scope
- No compact/collapsed staged Tier or Cart card.
- No alternate responsive Cart shell.
- No automatic movement to Recommendations or Cart after Add to Quote.
- No Mobile Quote Bar redesign.

## Must preserve
Existing resolved-step architecture, exact quoted Edition state, Add-on/Upgrade behavior, composable browsing/Manage Build, desktop presentation, responsive card behavior and modal accessibility.

## Must remove
Only the disappearing modal X behavior and responsive focused-occupant entry that can leave a newly opened focused shell starting outside the visible top position.

## Claude — next action
First close the predecessor and return to the two permanent branches. Then implement one narrow candidate from current `main`:
1. correct the shared details-modal X for both entry points;
2. ensure opening/reopening **any focused occupant** on responsive devices starts at the shared focused shell top — normal Tier, Add-on, and Upgrade/composable browsing;
3. prefer one shared focused-state rule over occupant-specific duplicate scroll logic;
4. add focused coverage for both behaviors, including Upgrade/composable focused entry;
5. run TypeScript/build/docs and relevant focused-shell/modal/navigation checks;
6. record branch/SHA/tree/files/evidence here, set **AWAITING CHATGPT REVIEW**, and stop.

Do not implement card-collapse work.
