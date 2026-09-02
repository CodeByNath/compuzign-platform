# Composable Tier — customer UX / Phase 2B1

## Status
- **READY FOR CLAUDE — implement Phase 2B1 only; SOURCE PUSH NOT APPROVED.**
- Auditor verdict: **Proceed with safeguards**.
- Production base: `main@84af91931380c41217139ac546951e39879f0782`.

## Locked model
No architecture change. This is the existing subordinate composable Tier occupant with a restricted customer composition surface.

Flow remains: Family → existing Tier System → composable occupant → its Rate Sheet/Commercial Legs/`customer_policy` → server resolver → candidate commercial result.

Customer control is now deliberately minimal:
- optional inclusion: Add/Remove;
- configurable inclusion: **quantity selector only** within Admin-authored min/max/step;
- fixed quantity: no selector;
- **no customer Price Option selector**. Fixed policy keeps published option; choice policy uses its Admin-configured default. Customer request must not invent/override an option.
- no Leg/commitment/Edition editing.

Fixed Tier/Edition remains an Admin-composed package. The same underlying inclusions may be sold individually through this composable occupant.

## Phase 2B1 customer experience
Reuse the current Package Builder/focused-shell visual language; do not create a parallel catalogue/configurator engine.

Two presentation contexts over the same composable offer:
- direct entry: **Build Your Own**;
- after a normal Tier/Edition is selected: **Upgrade your build**.

Default area: **Recommended Upgrades**. Show maximum 6 eligible inclusions per page.

Browse controls:
- searchable Category — default All Categories;
- searchable Service — default All Services, narrowed by Category;
- Sort — Featured default;
- small previous/next chevrons page the filtered eligible set.

Category/Service/Featured are filtering/merchandising metadata only. They must flow through the composable occupant projection and can never authorize an inclusion or create a Service-Catalog→cart path. Admin featured references may point only to occupant-authorized `item_id`s.

Each card/list row shows inclusion, resolved individual contribution, quantity when configurable, and Add/Remove. Add/drop/quantity changes re-resolve the **whole composable occupant candidate**; never sum independent catalogue products in the browser.

## Scope safeguards for this slice
Audit current projection first. Add only the minimum customer-safe metadata/API plumbing needed to:
1. expose `pricing.composable_offer` in TS types;
2. expose customer-safe policy + inclusion browse metadata through that occupant;
3. call the existing server resolver from a customer-safe preview endpoint/path;
4. hold candidate selection/quantity state in the customer workspace;
5. render the quantity-only browse/filter/recommendation UI and live resolved Extras preview.

**Do not yet persist a composable item into `FamilyTierQuoteItem`, change `quoteItemKey()`, alter Request/PDF/email, final cart persistence, or promotions.** Existing normal/add-on quote behavior must remain unchanged.

## Claude deliverable
Audit source before editing, then implement only this slice on a review branch. Tests/contracts must prove filter metadata cannot bypass policy, quantity bounds are server-authoritative, no Price Option is customer-controlled, candidate changes do not mutate stored occupant, and normal Tier/Add-on flows remain unchanged. Push review branch, record SHA/files/tests and unresolved gaps here, set **AWAITING CHATGPT REVIEW**, stop; do not push `main`.