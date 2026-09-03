# Composable Tier Occupant — Live Correction Round

**Live correction round — review branch, not yet re-validated.**
Implements `project-work/2026-09-03-composable-tier-admin-to-customer-validation.md`'s
live-correction phase, following read-only live validation against production
Request `CZ-B9W42O`. Six findings, all fixed here; see [Composable Tier
Occupant — Quote/Cart Connection](tier-composable-occupant-quote-cart.md) for
the accepted architecture this round corrects presentation on top of.

## 1. Customer "Upgrades" label

New `composableCoexistsWithPrimary(item, items)` (`utils/quote.ts`) — true
when a composable line has a sibling primary `FamilyTierQuoteItem` for the
same `familyTierSystemKey()`, computed at render time (never a stored fact,
since coexistence can change as the cart is edited). `QuoteSummary.tsx`
(mini cart) and `OrderSummary.tsx` (Review & Finalise) show "Upgrades"
instead of the item's own `tierTitle` when true. `QuoteProposalPreview.tsx`
(shared with Admin PDF print), `requestItemDisplay.ts`, and the Admin Request
drawer are deliberately untouched — internal identity and Admin-facing
"Build Your Own" naming stay unconditional, per the approved scope.

## 2. Composable Quote details

`QuoteDetailsOverlay.tsx`'s `resolvePlanDetails()` still returns `null` for a
composable item (no fixed-slot Tier/Edition to resolve) — but the caller no
longer falls through to "Details unavailable" for that case. New
`ComposablePlanDetails`/`ComposableInclusionsTable` render straight from the
item's own stored snapshot (`inclusionItems`, `legPaymentSummaries`,
`price`/`billingCycle`) — never re-resolved, mirroring the exact fields
`QuoteProposalPreview.tsx`/`OrderSummary.tsx` already show for the same line.
A Bundle parent stays quantity-less with real children nested beneath it,
matching `FamilyInclusionsList`'s treatment (a deliberately separate,
non-shared implementation — this file's own `cz-package-builder__*` classes).

## 3. Print / Save as PDF reachability

`.cz-os__actions` (`cost-builder.css`) gained `position: sticky; bottom: 0`
plus an opaque background, so it stays visible within `.cz-rf-right`'s own
scroll container (`overflow-y: auto`) without scrolling past the full
services/totals list at short viewport heights. Existing rail styling only —
no layout redesign, no new breakpoint.

## 4. Admin Request readback

New `requestComposableDetail()` (`requestItemDisplay.ts`) — composable-only,
returns `null` for every other line — flattens `inclusionItems` (Bundle
parent/children, same shape as the sanitiser) and maps `legPaymentSummaries`
through `chargeTypeLabel()`/`formatPrice()`. `RequestDrawerHost.tsx` renders
it beneath the aggregate line's existing title/subtitle/price row (now its
own `.cz-requests-drawer__item-row`, so the detail block can stack full-width
beneath rather than compete with the price column). No raw Platform IDs.

## 5. Missing customer email

Could not reproduce a crash: a full `RequestsController::submitRequest()`
run (`tests/request-durable-submission.php`, scenario 15) with a primary +
Add-on + composable Request line — the closest reconstruction of the live
evidence — sends both emails successfully. As a defensive fix regardless
(and the most direct explanation available without server log access):
`buildAdminHtmlEmail()`/`buildCustomerHtmlEmail()` in `submitRequest()` are
now each independently try/caught and `error_log()`-ed. Previously, an
exception in the durable-record-generation-adjacent email step would have
500'd the whole response even though the Request was already durably
persisted — masking a "successful" submission as a customer-visible failure
while the Admin-visible Request looked fine, and one email's failure could
have blocked the other's `wp_mail()` call entirely.

## 6. Legacy compatibility

No new required field anywhere in this round. `composableCoexistsWithPrimary()`
is a no-op for a non-composable item; `requestComposableDetail()` returns
`null` without `isComposable`; `ComposablePlanDetails` is reached only via
`activeItem?.isComposable`. `resolveQuoteItemRole()` (existing) still reads
an absent `isComposable` as `primary`, unchanged.

## Validation

`scripts/composable-live-correction-contract.ts`
(`contract:composable-live-correction`) — pure-function proof of
`composableCoexistsWithPrimary()` (same/different Family, Add-on-only
sibling), source-level checks that the relabel is customer-only and the
Admin/PDF/email surfaces are untouched, `ComposablePlanDetails` wiring,
sticky-CSS assertions, and `requestComposableDetail()` (Bundle
parent/children, non-composable, legacy-absent, empty-snapshot cases).
`tests/request-durable-submission.php` scenario 15 proves the real
submission pipeline sends both emails for a composable-bearing cart.

## Related Code Maps

[Composable Tier Occupant — Quote/Cart Connection](tier-composable-occupant-quote-cart.md),
[Composable Tier Occupant — Customer UX](tier-composable-occupant-customer-ux.md).
