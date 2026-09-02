# Composable Tier — Admin → customer browser handoff

## Status
- **AWAITING LIVE VALIDATION / ADMIN CAPABILITY CHECK.**
- Production source: `main@28613c0584440420953da81737acd95d35f47f16`.
- Phase 2B1 source/static validation is CLOSED. This file is the browser-chat handoff for the first real configured offer.

## URLs
- Admin Studio: `https://compuzign.weerax.com/studio/`
- Customer pricing: `https://compuzign.weerax.com/pricing/`

## Critical boundary
Do not create fake production records merely to expose the UI. Do not use DevTools/raw REST/manual option editing to bypass missing Admin capability. Browser work is read-only unless Nath explicitly authorizes the exact production record/configuration change in that chat.

Important current gap: Phase 2B1 shipped the customer-policy resolver/UI, but **no normal Admin authoring UI for `customer_policy` exists yet**. Therefore the browser agent must distinguish between configuring the composable occupant itself (supported) and authoring its customer-selection policy (currently not a normal Admin workflow). If policy controls are absent, record that as the next source-work requirement; do not hack around it.

## Step-by-step validation path
1. Open **Studio** and locate Package Station / the real Package Family being considered. Confirm it already has its normal assigned Tier System/CZTG. Never create a second Family→Tier System relation.
2. Open that Tier System and confirm the separate subordinate **Build Your Own** card exists below the five normal Tier slots.
3. Open Build Your Own. Verify it uses the normal Tier occupant editor/lifecycle, not a separate configurator: Overview, one Rate Sheet, inclusions/quantities, Commercial Legs, commitment/headline settings, Editions where applicable.
4. If Nath authorizes configuring a real offer, use existing real catalogue/Rate Sheet data only. Configure/publish the composable occupant exactly like a normal full Tier occupant. Do not mark it Add-on and do not alter normal occupants.
5. Look specifically for customer-policy authoring controls: inclusion mode (`required/optional/excluded`), optional default selection, configurable quantity bounds (`default/min/max/step`), and Featured bool. **Price Option must not be customer-selectable.**
6. If those policy controls are missing, STOP the setup there and update this file: Admin authoring is the blocker before a customer-visible composable offer can be completed. Do not inject policy through REST/DevTools.
7. Once a genuine policy can be authored through an approved Admin flow, publish and move to **Pricing**.
8. Before a normal plan is selected, verify the same composable offer appears as **Build Your Own**. After selecting a normal Tier/Edition, verify the same offer appears as **Upgrade your build**.
9. Validate: only policy-authorized inclusions appear; required rows cannot be removed; optional Add/Remove works; fixed quantity has no selector; configurable quantity respects bounds; Category/Service filters, Featured-first order and six-per-page paging work; no Price Option control/raw Platform IDs appear.
10. Change a quantity and confirm the card contribution and Commercial-Leg stream preview update from the server result. Do not expect invented cross-period/TCV totals.
11. Confirm the existing normal Tier/Edition and Add-on customer flows remain unchanged.

## Current downstream limit
Phase 2B1 does **not** yet persist the composable result into final cart/quote, Request, PDF, email or promotions. Do not treat absence of those downstream effects as a browser defect; they are later work.

## Browser-agent report
Update this same file with what was actually visible, any authorized runtime changes made, screenshots/observations, and the exact stopping point. If Admin policy authoring is missing, say so plainly and stop before customer-flow claims.