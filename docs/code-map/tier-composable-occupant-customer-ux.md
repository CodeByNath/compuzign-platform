# Composable Tier Occupant — Customer UX

**Phase 2B1 — review branch, not yet Admin-authored/live-validated.**
Implements `project-work/2026-09-02-composable-tier-customer-ux.md`. See
[Composable Tier Occupant — Customer Configuration Policy](tier-composable-occupant-customer-policy.md)
(Phase 2A, live on `main`) for the policy/resolver this reads.

## Purpose and ownership

A deliberately minimal customer composition surface over the existing
composable Tier occupant: quantity-only Add/Remove within Admin-authorized
bounds, no customer Price Option control, no Leg/commitment/Edition
editing. Two contexts over the SAME composable offer — "Build Your Own"
(no normal Tier/Edition selected) and "Upgrade your build" (after one is)
— both rendered by one component, `ComposableOfferBrowser.tsx`, as a
sibling of `FamilyTierAdapter`'s existing staged/focused views.

## Browse/merchandising metadata — projection only, no new identity

Category/Service filters and Featured sort needed metadata that did not
exist on a Rate Sheet item. Rather than a new persisted field,
`PackageRepository::compileOccupantSlotForCostBuilder()` threads the
already-live-resolved supplying-Service provenance
(`source_categories`/`source_service_title`) onto each `inclusions_override`
entry as `categories`/`service`, keyed by `source_id` — additive on the one
shared `presentOccupant()` function, harmless-unread on a normal Tier.
`unit_price`/`line_total` (already resolved in
`projectTierRateSheetWith()`'s selection rows) ride along the same way.

`featured` is new state — a merchandising-only bool on each
`PackageSchema::sanitizeCustomerPolicy()` item entry, never read by
`resolveCustomerComposableSelection()`/save-time validation. Living on the
policy-authorized entry makes "an Admin featured reference may only point
at an authorized item_id" structural.

## Customer-safe preview endpoint

`PackageRepository::locateActiveFamilyInstance(family_id)` — extracted from
`findAllActiveFamiliesForCostBuilder()`'s own per-Family gate — lets a new
single-family entry point reuse that same authorization boundary.
`resolveComposableOfferSelection(family_id, choice)` uses it, requires a
minted CZT/CZTA (same gate `enrichCompiledOccupantIdentity()` applies
publicly), builds its container via `PackageSchema::extractTierForCostBuilder()`,
and calls the existing resolver unchanged.

`POST /compuzign/v1/package-builder/composable-preview` (public, no auth)
wraps it. **Only `item_id`, `selected`, and `quantity` are ever read off a
submitted choice row** — a `price_option_id` sent by a caller is silently
dropped, making "no customer Price Option selector" a wire-contract fact,
not a UI convention. A fixed-quantity item similarly ignores any submitted
quantity.

## Frontend

`ComposableOfferBrowser.tsx` joins `composable_offer.inclusions` (browse
metadata) with `composable_offer.customer_policy.items` (authorization) by
`item_id`. Candidate selection/quantity is component-local state only,
reseeded from policy defaults on Family/offer change; every change
re-calls `resolveComposablePreview()` (debounced 400ms). Category
(searchable via `<datalist>`)/Service (narrowed by Category)/Sort
(Featured default)/max 6 per page with prev/next paging are client-side
over the already-fetched offer.

`buildComposableChoice(rows, selection)` (exported, contract-tested via
`scripts/composable-offer-choice-contract.ts`) is the submission boundary:
every optional row is ALWAYS sent with an explicit `selected: true|false`,
never omitted when off. **Correction round 1** found the original version
omitted an unselected optional row entirely; the resolver treats an absent
optional row as "use the policy's own `default_selected`" — silently
re-selecting a `default_selected:true` item on every Remove click. A
required row is always sent with no `selected` key.

The live preview never sums resolved Period component prices into a
cross-period total — Periods are timeline boundaries a recurring stream can
span, and that arithmetic depends on the same finite-occurrence counting
this repo has an open, unresolved discrepancy on (the Phase 2A TCV floor
removal). It instead reuses `buildLegPaymentSummaries()`'s existing
payment-summary presentation (one row per resolved stream: price, cycle,
start/end month), deliberately never reading
`summary.subtotal`/`summary.occurrenceMonths`.

`resolveItemContributions(periods)` (exported, contract-tested via
`scripts/composable-offer-contribution-contract.ts`) is each card's
"resolved individual contribution" — **correction round 2** replaced a
static published-`unitPrice` display (unchanged by quantity) with an
item_id's `line_total` read verbatim off the resolved server rows, never
`unitPrice * quantity` recomputed client-side. A second, DIFFERENT
`component.source` claiming the same item_id (Default + an Additional Leg
may legally do so independently) makes it `ambiguous` — never summed or
picked arbitrarily; the card falls back to the published base/unit price,
labeled "per unit". A source repeating across Periods is not
double-counted (first-seen-wins, same invariant `commercialLegInclusionGroups()`
already relies on).

## Not yet built / explicitly out of scope this slice

Persisting a composable item into `FamilyTierQuoteItem`, `quoteItemKey()`
changes, Request/PDF/email, final cart persistence, promotions, and an
Admin authoring surface for `featured`/Category/Service beyond Service
Catalog import. No live browser validation this session (no local
WordPress environment) — reviewed via `npx tsc --noEmit`, `npm run build`,
and the PHP/contract suite (`tests/composable-customer-ux-preview.php`,
`scripts/composable-offer-*-contract.ts`).

## Related Code Maps

[Composable Tier Occupant](tier-composable-occupant.md), [Composable Tier
Occupant — Customer Configuration Policy](tier-composable-occupant-customer-policy.md),
[Composable Tier Occupant Admin UI](tier-composable-occupant-admin-ui.md),
[Composable Tier Occupant — Admin Customer Selection Rules](tier-composable-occupant-admin-customer-policy.md),
[Composable Tier Occupant — Tier Workspace UI](tier-composable-occupant-workspace-ui.md),
and [Commercial Legs](commercial-legs.md).
