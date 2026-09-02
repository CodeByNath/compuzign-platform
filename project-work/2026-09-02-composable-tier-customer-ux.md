# Composable Tier — customer UX / Phase 2B1

## Status
- **READY FOR CLAUDE — correction round; SOURCE PUSH NOT APPROVED.**
- Auditor verdict: **Proceed with safeguards**.
- Production remains `main@84af91931380c41217139ac546951e39879f0782`.
- Reviewed branch: `review/composable-tier-customer-ux@0b4a62034dcb09c9da64634bd9eda493874019bf` (one commit ahead of production).

## Locked model
No architecture change. Same subordinate composable Tier occupant, same Rate Sheet/Commercial Legs/customer policy, same server resolver. Customer controls only Add/Remove + quantity where Admin permits. No Price Option, Leg, commitment or Edition editing. Category/Service/Featured are browse metadata only. No cart/request/PDF/email/promotions persistence in 2B1.

## Audit findings
The overall direction is correct: the branch keeps `pricing.composable_offer` occupant-owned, adds a public preview route that re-derives active Family/Tier authority, strips any submitted Price Option before calling the existing resolver, keeps candidate state local, and does not alter normal/add-on quote persistence.

Two correctness blockers must be fixed before main approval:

1. **Remove is broken for optional items whose policy default is selected.** `ComposableOfferBrowser` omits every unselected optional row from `choice`. The authoritative Phase 2A resolver interprets an absent optional row as `default_selected`. Therefore a customer clicking Remove on `default_selected:true` simply causes the server to select it again. Send an explicit `{item_id, selected:false}` for every optional row that is currently off. Add a regression test with an optional `default_selected:true` item proving Add/Remove round-trips through `PackageRepository::resolveComposableOfferSelection()`.

2. **Do not display the current `Extras` number.** The component calculates it by flattening every resolved Period and summing each component price once. That is not a defined commercial total: Periods are timeline boundaries, recurring streams can span periods, and this repo already has a separately-recorded finite-occurrence/TCV discrepancy. This can materially misstate price. For 2B1 render the resolved commercial streams using the existing payment-summary presentation semantics (cycle/charge rows), or otherwise present the resolved periods without inventing a cross-period total. Do not add/revive TCV math in this phase.

## Safeguards / cleanup
- Keep the server-side Price Option stripping; that is a good hard boundary.
- Keep Service/Category provenance projection-only; do not persist another taxonomy.
- `featured` on the authorized policy row is acceptable for this slice, but treat it as a bool only; do not claim ranked Admin priority yet. Max six **visible per page** remains the current guarantee. Any richer ordered featured list requires a later explicit contract.
- Debounce/coalesce quantity preview requests enough that typing does not POST on every transient keystroke; server validation remains authoritative.
- Keep `main` untouched.

## Claude next action
Patch the existing review branch only. Add focused tests for default-selected removal and the corrected preview presentation contract; rerun the same PHP/contracts/tsc/build/docs checks. Record new exact branch SHA, changed files, evidence and remaining gaps here, set **AWAITING CHATGPT REVIEW**, then stop.