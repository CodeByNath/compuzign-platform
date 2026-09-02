# Composable Tier — customer UX / Phase 2B1

## Status
- **READY FOR CLAUDE — final correction round; SOURCE PUSH NOT APPROVED.**
- Auditor verdict: **Proceed with safeguards**.
- Production remains `main@84af91931380c41217139ac546951e39879f0782`.
- Reviewed branch: `review/composable-tier-customer-ux@8ed9d55ed305e69216a24ec52b5d272e5f6c5083` (two commits ahead of production).

## Locked model
No architecture change. Same subordinate composable Tier occupant, same Rate Sheet/Commercial Legs/customer policy/server resolver. Customer controls only Add/Remove + quantity where Admin permits. No Price Option, Leg, commitment or Edition editing. Category/Service/Featured are browse metadata only. No cart/request/PDF/email/promotions persistence in 2B1.

## Round-2 audit
The two prior blockers are correctly repaired in the actual branch diff:
- every optional row now crosses the preview boundary with explicit `selected:true|false`, so `default_selected:true` can really be removed;
- the invented cross-Period Extras sum is gone; preview now reuses existing Commercial-Leg payment-summary presentation and deliberately avoids occurrence/TCV arithmetic;
- 400ms preview debounce is present;
- server-side Price Option stripping and existing authority chain remain intact;
- `main` remains untouched.

One remaining contract mismatch before main approval:

### Card price is not the resolved individual contribution
`ComposableOfferBrowser` still renders `row.unitPrice` from the published inclusion projection. Changing quantity does not change that card price, even though the work contract requires each inclusion to show its **resolved individual contribution**. For a quantity of 4, showing the unchanged one-unit price beside that selected inclusion is misleading.

Do **not** add client pricing math. Use the successful server preview result as authority: derive the selected inclusion's current resolved `line_total`/contribution from the returned Period/component item rows (by `item_id`) and feed that display value to the card. Because the same item may legally exist on multiple Commercial Legs/Periods, do not blindly sum duplicate occurrences across timeline Periods. Display a per-inclusion contribution only where it is unambiguous for the current resolved declaration; otherwise use a truthful cycle/stream presentation or omit the aggregate card figure rather than inventing one. Fixed/unselected rows may keep the published base/unit merchandising price if clearly presented as such.

Add a focused contract/test proving a configurable inclusion's displayed resolved contribution changes when server-resolved quantity changes, without any browser-side multiplication.

## Accepted safeguards
- `featured` remains bool-only this phase; no ranked priority semantics.
- Service/Category remain projection-only.
- Max six means six visible per page, not six total eligible.
- No TCV/floor work here.
- No cart/request/PDF/email/promotions changes.

## Claude next action
Patch the same review branch only for the card-price contract above. Re-run focused PHP/TS contract, tsc/build/docs checks; record exact new SHA/evidence here, set **AWAITING CHATGPT REVIEW**, then stop. Do not push `main`.