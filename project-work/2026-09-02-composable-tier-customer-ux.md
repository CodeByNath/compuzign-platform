# Composable Tier — customer UX / Phase 2B1

## Status
- **AWAITING CHATGPT REVIEW — card-price contract fixed.**
- Auditor verdict (prior round): **Proceed with safeguards**.
- Production remains `main@84af91931380c41217139ac546951e39879f0782`.
- Review branch: `review/composable-tier-customer-ux@28613c05` (three commits ahead of production; `8ed9d55e` was the round reviewed, `28613c05` is this round's fix).

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

## Claude Report — card-price correction (`28613c05`)

### Fix
Added `resolveItemContributions(periods)` (exported, `ComposableOfferBrowser.tsx`). For each `component.source` in the resolved candidate's Periods, it takes that source's own claimed items ONCE (first-seen-wins — the same "a Leg's own claimed items[] are built once from the container's static declaration; every Period only decides WHETHER it's active" invariant `commercialLegInclusionGroups()` already relies on, so a repeated appearance of the SAME source across Periods is never double-counted). If an `item_id` is claimed by exactly one distinct source, its `line_total` (read verbatim off that server row — never `unit_price * quantity` computed here) becomes the card's displayed contribution. If a SECOND, different source also claims that same `item_id` (Default + an Additional Leg independently claiming the same item — legal per the Commercial Legs model), the contribution is flagged `ambiguous`, carries no `lineTotal`, and the card falls back to the published base/unit price — now visibly labeled "per unit" rather than presented as a resolved total. A row that isn't currently selected, or whose preview hasn't resolved yet/failed, uses that same labeled fallback.

### Evidence
New `scripts/composable-offer-contribution-contract.ts` (`npm run contract:composable-offer-contribution`) — 5 assertions against `resolveItemContributions()` directly: (1) the displayed value is the server's `line_total` verbatim, using a deliberately inconsistent fixture (`unit_price:10, quantity:2, line_total:999`, where `10*2=20≠999`) so any accidental client-side recomputation would fail the assertion loudly; (2) a different resolved quantity/`line_total` from the server produces a genuinely different displayed value (999 → 2500), proving the display tracks server state; (3) the same source repeated across two Periods resolves once (100), never summed to 200; (4) two distinct sources claiming the same `item_id` is flagged ambiguous with no `lineTotal`, never summed (80) or picked arbitrarily; (5) an unavailable component's items are excluded entirely, never blended with the available stream's own numbers.

### Validation re-run
`npx tsc --noEmit` clean, `npm run build` succeeds, `npm run docs:check` passes (doc updated and re-trimmed under 600 words), both `composable-offer-choice`/`composable-offer-contribution` contracts pass, existing `tests/composable-customer-ux-preview.php` and `composable-customer-policy-resolver.php` unaffected (no PHP touched this round — the fix is entirely a frontend read-projection over data the server already returns). `main` untouched.

### Remaining gaps (unchanged)
No live browser validation (no local WordPress environment) — this round's fix is a pure-function-level contract proof only, same posture as every prior round. No `FamilyTierQuoteItem`/cart/Request/PDF/email/promotions wiring. No Admin authoring UI for `featured` beyond the raw REST field.