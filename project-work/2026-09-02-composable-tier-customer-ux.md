# Composable Tier — customer UX / Phase 2B1

## Status
- **AWAITING CHATGPT REVIEW — correction round applied.**
- Auditor verdict (prior round): **Proceed with safeguards**.
- Production remains `main@84af91931380c41217139ac546951e39879f0782`.
- Review branch: `review/composable-tier-customer-ux@8ed9d55e` (two commits ahead of production; `0b4a6203` was the round reviewed, `8ed9d55e` is this round's fix).

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

## Claude Report — correction round (`8ed9d55e`)

### Blocker 1 — Remove on a `default_selected:true` item
Root cause confirmed exactly as diagnosed: `ComposableOfferBrowser`'s choice-building loop did `if (!entry?.selected) continue;` — an unselected optional row was never added to the submitted `choice` array at all, so the resolver's own `$customerChoice['selected'] ?? ($policyEntry['default_selected'] ?? false)` fallback fired and silently re-selected it.

Fix: extracted the choice-building logic into an exported pure function, `buildComposableChoice(rows, selection)` (`ComposableOfferBrowser.tsx`). Every optional row is now ALWAYS present in the submitted array with an explicit `selected: true|false`; a required row is always present with no `selected` key at all (matching the resolver's own "required is always selected regardless" rule).

Evidence:
- New `scripts/composable-offer-choice-contract.ts` (registered as `npm run contract:composable-offer-choice`) — 6 assertions on the extracted function directly: required row always sent with no `selected` key; a `default_selected:true` item currently off submits explicit `selected:false` (never omitted); the same item currently on submits explicit `selected:true`; Add and Remove submit genuinely different explicit values (not a hardcoded fix); a fresh/unseeded selection state still submits explicit `false`, never an omission; quantity only travels when the row is selected.
- New section 11 in `tests/composable-customer-ux-preview.php` — backend-side proof through `PackageRepository::resolveComposableOfferSelection()` directly: 11a documents the resolver's own (unchanged, correct) omission-falls-back-to-default behavior as the baseline; 11b proves an explicit `selected:false` correctly excludes a `default_selected:true` item; 11c proves explicit `selected:true` re-includes it, completing the Remove-then-Add round-trip.

### Blocker 2 — invented cross-period `Extras` total
Removed the flattening/summing entirely. The live preview now calls the existing `buildLegPaymentSummaries(periods, commitmentMonths)` (`PricingTiers.tsx`, already used by `FamilyTierAdapter` itself for the exact same "resolved commercial streams" presentation) and renders one row per resolved stream — price, cycle suffix, and start/end month (or "Ongoing"). Deliberately never reads `summary.subtotal`/`summary.occurrenceMonths` — those still depend on `buildOccurrenceMonths()`, the same disputed algorithm behind the Phase 2A TCV floor removal. `commitmentMonths` is derived from `composable_offer.minimum_term_value`/`minimum_term_unit` using the exact same month-unit gate `FamilyTierAdapter`'s own `itemFor()` already applies to a normal Tier/Edition.

### Safeguards addressed
- Price Option stripping: unchanged (already server-side, already tested).
- Category/Service: unchanged (still projection-only, no new taxonomy).
- `featured`: unchanged shape (plain bool); no ranking/priority semantics added.
- **Debounce added**: preview requests now wait 400ms (`PREVIEW_DEBOUNCE_MS`) after the last change before calling the endpoint, cancelling any in-flight call whose inputs are now stale.
- `main`: still untouched.

### Validation re-run
Full existing PHP suite (SurfacePackages + CostBuilder `CLAUDE.md` lists) + new `tests/composable-customer-ux-preview.php` section 11 — all pass. New `npm run contract:composable-offer-choice` passes, plus the previously-run `contract:*` scripts. `npx tsc --noEmit` clean. `npm run build` succeeds (`dist/` rebuilt and committed). `npm run docs:check` passes (code-map doc updated with the correction and trimmed back under the 600-word limit). `tests/tier-capability-invariants.php` remains the same pre-existing, unrelated failure confirmed on clean `main` — untouched.

### Remaining gaps (unchanged from round 1)
No live browser validation (no local WordPress environment). No `FamilyTierQuoteItem`/cart/Request/PDF/email/promotions wiring — still explicitly out of scope. No Admin authoring UI for `featured` beyond the raw REST field.