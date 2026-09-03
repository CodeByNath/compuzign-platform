# Composable Tier Occupant — Live Correction Round

**Live correction round — review branch, not yet re-validated.**
Implements `project-work/2026-09-03-composable-tier-admin-to-customer-validation.md`'s
live-correction phase, following read-only live validation against production
Request `CZ-B9W42O`. Six findings, all fixed here; see [Composable Tier
Occupant — Quote/Cart Connection](tier-composable-occupant-quote-cart.md) for
the accepted architecture this round corrects presentation on top of.

## 1. Customer "Upgrades" label

New `composableCoexistsWithPrimary(item, items)` (`utils/quote.ts`) — true
when a composable line has a sibling primary for the same
`familyTierSystemKey()`, computed at render time (coexistence can change as
the cart is edited, so never stored). `QuoteSummary.tsx`/`OrderSummary.tsx`
show "Upgrades" instead of `tierTitle` when true. `QuoteProposalPreview.tsx`
(shared with Admin PDF), `requestItemDisplay.ts`, and the Admin drawer are
untouched — Admin-facing "Build Your Own" naming stays unconditional.

## 2. Composable Quote details

`QuoteDetailsOverlay.tsx`'s `resolvePlanDetails()` still returns `null` for
composable (no fixed-slot Tier/Edition to resolve) — the caller no longer
falls through to "Details unavailable" for that. New
`ComposablePlanDetails`/`ComposableInclusionsTable` render straight from the
item's own stored `inclusionItems`/`legPaymentSummaries`/`price`, never
re-resolved. A Bundle parent stays quantity-less with children nested
beneath, matching `FamilyInclusionsList`'s treatment (a separate,
non-shared implementation — this file's own `cz-package-builder__*` classes).

## 3. Print / Save as PDF reachability

`.cz-os__actions` (`cost-builder.css`) gained `position: sticky; bottom: 0`
plus an opaque background, so it stays visible within `.cz-rf-right`'s
scroll container without scrolling past the full services/totals list at
short viewport heights. Existing rail styling only, no redesign.

## 4. Admin Request readback

New `requestComposableDetail()` (`requestItemDisplay.ts`) — composable-only,
`null` for every other line — flattens `inclusionItems` and maps
`legPaymentSummaries` through `chargeTypeLabel()`/`formatPrice()`.
`RequestDrawerHost.tsx` renders it beneath the aggregate line (now its own
`.cz-requests-drawer__item-row`, so detail stacks full-width beneath rather
than competing with the price column). No raw Platform IDs.

## 5. Missing customer email + notification idempotency

Could not reproduce a crash: a full `RequestsController::submitRequest()`
run with a primary + Add-on + composable line sends both emails
successfully. Fixed on two fronts regardless:

**Dispatch observability.** `buildAdminHtmlEmail()`/`buildCustomerHtmlEmail()`
plus their `wp_mail()` calls are each independently try/caught; a thrown
exception is logged, and a `wp_mail() === false` return (genuine transport
failure, no exception) is now also `error_log()`-ed — dispatch-attempted is
never conflated with delivered. The already-durable Request is never turned
into a customer-visible failure by either case.

**Correction round (audit-found release blocker):** the first pass still let
`submitRequest()` fall through to mint a NEW `QuoteViewSecret`, overwrite
the `cz_quote_<ref>` transient, and call both `wp_mail()`s again on every
call that JOINED an already-durable Request — a retry or concurrent-join
race, not just the creator. That duplicates email and can invalidate the
link already emailed by rotating the secret underneath it. Fixed:
`submitRequest()` now returns immediately after the payload-match check for
a joining call (`created_by_this_call !== true`) — secret minting, the
transient write, and both notifications are creator-only, reached exactly
once per durable Request no matter how many times the ref is resubmitted; a
mismatched join still 409s exactly as before.

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
`tests/request-durable-submission.php`: scenario 15 proves the real
submission pipeline sends both emails for a composable-bearing cart;
15b proves an identical retry mints no new transient and sends zero
additional mail; 15c proves a changed payload for the same ref still 409s
with no side effects; scenario 16 proves a `wp_mail() === false` return is
observably logged (distinct from a thrown exception) without failing an
already-durable submission. Every pre-existing scenario in this file
(including the original same-payload-retry check, now asserting zero
additional mail rather than the old regenerate-on-retry behavior) re-run
and passing.

## Related Code Maps

[Composable Tier Occupant — Quote/Cart Connection](tier-composable-occupant-quote-cart.md),
[Composable Tier Occupant — Customer UX](tier-composable-occupant-customer-ux.md).
