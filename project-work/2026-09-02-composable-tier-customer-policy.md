# Composable Tier — Phase 2A customer configuration policy

## Status
- **READY FOR CLAUDE — final correction on existing review branch.**
- Auditor verdict: **Stop — architectural risk.**
- Production `main`: `1b2efd23064e3d2fac904c21fa4094912b132c41`.
- Review branch: `review/composable-tier-customer-policy` at `92b97998`.
- **SOURCE PUSH NOT APPROVED.**

## Accepted contract
Composable-only customer policy; whole-inclusion choice; fixed authored Legs; server-authoritative validation/pricing; no stored-occupant mutation; Edition inherit-wholesale or complete replacement; Bundle parent only; no Rate Sheet IDs public; cart/request/PDF/email/promotions deferred.

## Independent review of `92b97998`
The five previous blockers are substantially corrected: stale/duplicate submitted choices reject, explicit null Price Option bypass is closed, semantic save validation exists, and invalid floors receive authoring-time validation plus resolver backstop.

Two blockers remain.

### 1. Do not institutionalize the existing TCV off-by-one in a new pricing invariant
`computeResolvedTimelineTotalContractValue()` now faithfully ports current frontend `buildOccurrenceMonths()`, whose loop is `m < effectiveEnd`. Source therefore treats a monthly stream starting Month 1 and ending Month 12 as **11 occurrences**, not 12. Claude's new test explicitly locks `$100 × 11 = $1,100`.

That may be existing customer behavior, but it is now hard evidence of a questionable boundary and must not become the authoritative **minimum contract value** rule without resolution. A price floor can reject/accept commercial offers, so copying a suspected presentation/quote bug into Package policy would make it architecture.

Claude: audit the existing Period boundary semantics (`from_month`/`to_month`, resolver segmentation, customer TCV examples/tests) and answer one of these with evidence:
- prove `to_month` is intentionally exclusive and 11 payments is correct for `1..12`; or
- correct the canonical occurrence semantics everywhere necessary so a 12-month monthly contract produces the intended payment count, then reuse that corrected rule here.

Do not "fix only the new PHP helper" if customer quote/PDF TCV would then disagree. If correcting existing customer TCV is broader than this work item, remove/defer `minimum_total_contract_value` from Phase 2B rather than ship a floor on disputed arithmetic.

### 2. `excluded` policy rows are leaking into the customer projection
`PackageFamilyPricingBuilder::presentOccupant()` currently returns raw `customer_policy`. That includes `mode: excluded` entries. Earlier accepted semantics were that excluded means **not offered**, not a customer-visible disabled option.

Create a customer-safe policy projection that omits excluded entries (and any admin-only policy detail not required by Phase 2C). Keep server validation on the full stored policy. Add a contract proving an excluded row can exist in stored policy but never appears in public `pricing.composable_offer.customer_policy`.

Also validate excluded stored policy item references consistently: either require every stored policy `item_id` to belong to the container, or explicitly sanitize them away before persistence. Do not let stale excluded rows accumulate silently while simultaneously calling the stored policy a complete replacement contract.

## Claude next action
Stay on the same review branch. Resolve only these two blockers. No UI/cart/request/PDF/email/promotions. Push corrected branch, report exact SHA/files/tests and the TCV boundary conclusion, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.