# Composable Tier — customer UX direction

## Status
- **DISCUSSION / DESIGN LOCK — no source implementation yet.**
- Auditor role: independent reviewer/devil's advocate for Nath and Claude.
- Phase 2A backend policy is CLOSED at production `main@84af91931380c41217139ac546951e39879f0782`.

## Working direction
No new product architecture is being introduced. Customer composability remains the existing subordinate composable Tier occupant flowing through its own Rate Sheet, Editions, Commercial Legs and `customer_policy`.

The frontend should extend the existing Tier/Add-on customer experience into a composition mode:
- **Build Your Own** when entered directly without a normal plan.
- **Upgrade your build** when a normal Tier/Edition is already quoted.
- Same backend/composable occupant in both contexts; presentation context only.

A fixed Tier/Edition remains an Admin-composed package. The same underlying inclusions may also be sold individually through the composable occupant when its policy authorizes them. Editions are not customer customization; they remain predefined pricing/composition models.

## Browse/filter UX
Service Category and Service are **filters only** over the composable occupant's already-authorized inclusions. They never become pricing/selection authority and never bypass the occupant.

Target experience:
- Default section: **Recommended Upgrades**.
- Show max 6 eligible inclusions at a time.
- Browse controls: searchable **Category**, searchable **Service**, **Sort** (Featured default).
- Default Category/Service = All.
- Service options should narrow with Category.
- Small previous/next chevrons page through the filtered result set.
- Admin may nominate/priority-rank featured eligible inclusions; any merchandising reference must point only to occupant-authorized `item_id`s.
- Each inclusion exposes only controls permitted by `customer_policy`: optional add/remove, bounded quantity, and predefined authorized Price Options. Fixed values render without unnecessary controls.

## Quote/cart journey
Delay the conventional final-cart step while the customer is still composing. Keep a live quote/cart summary alongside the upgrade workspace. Customer additions appear under **Extras** and are resolved through the composable occupant server contract, never directly from Service Catalog or Rate Sheet.

Likely journey: choose normal Tier/Edition → Upgrade your build → add/configure Extras → final quote/cart. Direct composable entry uses the same workspace as Build Your Own.

## Locked safeguards
- No second Tier System, Add-on misuse, separate singles entity, or Service-Catalog-to-cart path.
- Flow remains: Family → existing Tier System → composable occupant → policy-authorized Rate Sheet rows → server resolver → quote snapshot.
- Category/Service/Featured metadata is browse/merchandising data only.
- Customer never creates Legs or arbitrary pricing terms.
- Published occupant/Edition is never mutated by customer choices.
- Existing TCV occurrence-count discrepancy remains separate work; do not reintroduce a minimum TCV floor here.

## Next
Before Claude implements frontend work, audit current shell/cart/projection capabilities and settle the smallest UX/data-contract additions needed for filtering, featured ranking, candidate state and eventual quote coexistence. Do not implement until this design is explicitly accepted.