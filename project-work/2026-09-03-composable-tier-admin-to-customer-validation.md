# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — quote/cart implementation approved with safeguards.**
- Auditor verdict: **Proceed with safeguards.**
- Production: `main@bb86513c38fb4e0eea39c290ddf07961e6ecfd1a`; Deploy #936 accepted.

## Accepted prior chain
Admin workspace, Customer Options, public composable offer, Add/Remove and server preview are accepted live. Overall composable work remains open; later phases are Request/PDF/email and final Admin/customer UX refinement.

## Audit verdict on Claude design
Core direction is accepted: one aggregate composable `FamilyTierQuoteItem`, never per-inclusion products, never `is_addon`, server-resolved `inclusionItems` + `legPaymentSummaries`, and a customer-choice snapshot for re-seeding/updating.

### Mandatory safeguards / corrections
1. **Explicit role classification.** Add optional `isComposable` for backward-compatible storage if desired, but centralize one helper that resolves exactly `primary | addon | composable`. Reject/guard impossible `isAddon && isComposable`. Do not scatter ad-hoc `!isAddon && !isComposable` logic. Key must be exactly one composable line per Family+Tier System, e.g. `${systemKey}:composable`.
2. **Do not classify composable as primary.** `classifyQuoteItems()` must gain a distinct composable bucket. Primary remains exactly the normal non-addon/non-composable occupant. Totals may aggregate all commercial lines, but presentation/replacement semantics must not call composable “primary”.
3. **Empty composition rule.** Required-only composition persists. But when resolved selection contains **zero required and zero selected optional inclusions**, remove the composable quote line entirely; do not create a zero-value empty cart item. Current KAIROS test (one optional Block Storage, no required) must disappear from cart when removed.
4. **Primary independence.** Removing/changing the normal primary must never delete the composable line. The same composable snapshot may exist alone (`Build Your Own`) or alongside a primary (`Upgrade your build`). Existing Add-on orphan/removal behavior must not be inherited.
5. **Commercial authority.** Cart snapshot must be emitted only from the latest successful server preview. `composableSelection` is customer intent/history; price, inclusion totals, Legs and TCV come only from the matching successful resolved response. Never recompute commercial totals from the choice payload.
6. **Phase boundary.** **Do not touch `RequestSchema.php`, Request mapping, PDF, proposal-email, or downstream Request persistence in this phase.** Browser quote/cart only. If existing cart cannot be made functional without a Request-layer change, stop and report the blocker before editing it.
7. `tierId` may be widened to a customer-side `'composable'` sentinel only if no normal Tier-only switch/lookup consumes it; keep admin `COMPOSABLE_TIER_ID` out of customer modules.
8. Preserve the known occurrence-month/TCV issue as pre-existing scope; do not “fix” it incidentally here.

## Implementation target
Wire `ComposableOfferBrowser` / `FamilyTierAdapter` to add/update/remove one aggregate composable quote item using the successful preview. Persist/re-seed `composableSelection`. Cart list, quote count, payment streams and TCV must include it once, while normal primary and Add-ons remain unchanged.

Required contracts:
- primary + composable + multiple Add-ons coexist with unique stable keys;
- replacing primary never removes composable; updating composable never replaces primary/Add-ons;
- zero-selected/no-required removes composable; required-only persists;
- stale/failed preview cannot overwrite cart;
- composable TCV/payment streams use `legPaymentSummaries` exactly once;
- legacy stored carts without `isComposable` remain primary/Add-on compatible;
- no Request/PDF/email files changed.

Implement locally, run focused contracts + typecheck/build/docs, then push the exact commit to a non-production review branch and set **AWAITING CHATGPT REVIEW**. Do not push `main`.