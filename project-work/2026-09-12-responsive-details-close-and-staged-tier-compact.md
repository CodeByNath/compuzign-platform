# Responsive Details Close + Staged Tier Compact

## Status
- **SOURCE PUSH NOT APPROVED** — queued behind `2026-09-12-cart-upgrade-secondary-cta.md` closure hygiene.
- Auditor verdict: **Proceed with safeguards**.
- Baseline `main`: `80676874e6da8728dfefee8115628d0cb296196d`.
- Do not start source work until the predecessor is **CLOSED** and the old review branch is gone.

## Nath's request
Two responsive customer-flow corrections, one phase at a time.

### Phase 1 — View Details X must never disappear
Both details surfaces use the same modal chrome:
1. focused Tier/Edition -> **View plan details** -> `PlanDetailsModal`;
2. Cart -> **View details** -> `QuoteDetailsOverlay`.

Current `.cz-package-builder__details-close` is an absolutely-positioned sibling translated outside the dialog corner. On some browsers/viewports it can be clipped/off-screen.

Use the same durable principle as the focused Tier X: the close control must remain inside the usable viewport and stay sticky while the modal content scrolls. It must not depend on a negative/outside-corner transform. Apply the correction to **both** modal entry points, preserving ESC, focus trap, backdrop close, accessibility label and scroll lock.

**Phase 1 only first.** Add a focused contract/regression proving both overlays use the corrected sticky close ownership and no outside-corner absolute/translate placement remains. Then stop at **AWAITING CHATGPT REVIEW**.

### Phase 2 — responsive staged Tier becomes compact when downstream exists
After a primary Tier is already quoted and the resolved step is **Recommendations** (add-ons and/or Upgrade CTA), phones/tablets should not make the customer scroll through the entire already-selected Tier card before reaching the downstream choice.

At the existing responsive breakpoint only, collapse the quoted primary Tier presentation into a compact selected summary while downstream Recommendations are present. Desktop stays exactly as today. If there is no downstream step, keep today's responsive behavior; the existing Mobile Quote Bar remains the route to Cart.

Prefer a compact modifier/presentation of the **existing staged Tier card** rather than rendering a second independent semantic card. If a dedicated compact shell is genuinely needed, it must read the same exact quoted Tier/Edition snapshot and reuse the same handlers; never create a second resolver/state path.

The compact form must preserve the capabilities the full staged card currently provides, especially exact quoted Edition identity, **View Plan** reopening, and Selected/Remove behavior. Do not compact add-on cards or the Recommendations/Upgrade CTA itself.

## Must preserve
Resolved-step/Cart suppression architecture; exact Tier/Edition identity; add-on and Upgrade flows; quote mutation; pricing/Commercial Legs; desktop UI; Mobile Quote Bar; accessibility.

## Must remove
Phase 1: modal close placement that can be clipped off-screen.
Phase 2: unnecessary full-height already-selected primary card on responsive Recommendations screens.

## Must not substitute
Do not fix this with forced page scrolling, persistent navigation state, duplicated pricing logic, a second quote item, or by removing View Plan/Remove capability. Nath chose structural responsive collapse rather than scroll-to-Cart behavior.

## Claude — next action
First finish/close the predecessor work and return repository branch count to the two permanent branches. Then implement **Phase 1 only** from current `main`, record exact branch/SHA/tree/files/tests here, set **AWAITING CHATGPT REVIEW**, and stop. Do not begin Phase 2 until Phase 1 is accepted.
