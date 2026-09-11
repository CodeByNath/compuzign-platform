# Single Occupant Focused State After Quote

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `fd2878385b23becf1478018b94db47b5a50d7cf9`.
- Previous deployment `34537225257`: success.
- This work is reopened before live closure because Nath refined the navigation rule.

## Nath's authoritative navigation rule
A successful **Add to Quote** from either a normal Tier card or a normal Tier focused shell completes the Tier-selection step. The Cart becomes visible **only if there is no intermediate customer step between that Tier and the Cart**.

Do not implement this as a blanket `showCart=true` flag. Cart visibility must remain derived from actual quote contents plus the resolved next navigation state.

Expected outcomes:
- globally lone Tier, no add-ons, no eligible Upgrade -> focused shell remains, no X, Cart visible after quote;
- Tier with add-ons -> existing staged Recommendations flow wins;
- Tier with eligible Upgrade -> existing Recommendations/Upgrade CTA step wins;
- Tier with both -> Recommendations remains the intermediate step;
- active Upgrade catalogue browsing -> Cart hidden;
- explicitly opened Add-on/normal Tier focused inspection keeps its existing suppression behavior;
- remove last quote line -> Cart disappears because the quote is empty, not because of stale navigation state.

## Full-navigation safeguards from audit
Fix this as one bounded navigation-state stabilization, not another one-off condition.
1. Treat `pending` Upgrade CTA/Recommendations as an intermediate step, distinct from `browsing`; only browsing is the focused Upgrade workspace.
2. Preserve exact quoted Edition identity when a Tier remains focused after Add to Quote; do not reset the visible focused variant to Default while the Cart holds an Edition.
3. Initial mount/restored browser cart must resolve to the same presentation as the equivalent in-session state; no reload-only small-card/staged divergence for a globally lone quoted Tier.
4. Add-on small-card presentation must reflect the exact quoted Add-on Edition, not merely Tier-level `Added` state.

## Claude — implementation phase
From current production `main`, create one review branch. First extend mounted navigation coverage before changing runtime behavior. Cover at minimum:
- Tier-card Add to Quote and focused-shell Add to Quote;
- globally lone Default + Edition, including reload/restored cart;
- add-on-only Recommendations;
- Upgrade-only Recommendations;
- add-ons + Upgrade together;
- Upgrade pending vs browsing;
- Add-on Default + Edition return card;
- explicit View Plan / Add-on focus suppression;
- remove/re-add and Family/customer-group transitions.

Then make the minimum source changes so the resolved **next step** decides whether Cart is eligible. Do not add an independent persistent `showCart` navigation state.

## Must preserve
Plan Details and all focused detail internals; Commercial Legs; Rate Sheet/pricing authority; quote snapshot/identity; Upgrade snapshot survival; Add-on independent mutation; existing family/audience membership rules; working non-lone X/View Plan behavior.

## Must remove
Reload-only navigation divergence; focused quoted Edition falling back visually to Default; Add-on quoted-Edition card drift; any conflation of Upgrade `pending` Recommendations with active `browsing` focus.

## Must not substitute
No Tier/detail redesign, no route rewrite, no new pricing/cart model, no blanket "any Add to Quote always shows Cart", no CSS-only visibility workaround.

Run focused regressions/contracts, TypeScript, build, docs and relevant baseline comparison. Push review branch only; record exact SHA/tree/diff/tests here; set **AWAITING CHATGPT REVIEW**; stop. Do not push `main`.
