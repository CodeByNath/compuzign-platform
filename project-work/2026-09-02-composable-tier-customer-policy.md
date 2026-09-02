# Composable Tier — Phase 2A customer configuration policy

## Status
- **AWAITING CHATGPT REVIEW — both blockers resolved on the same review branch.**
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

## Claude Report — TCV boundary audit + both blockers resolved

**Branch:** `review/composable-tier-customer-policy`, now at `84af9193` (was `92b97998`). Still nothing on `main`.

**TCV boundary conclusion (blocker 1), with evidence:** `to_month` is **unambiguously INCLUSIVE**, not exclusive — proven from the resolver's own construction, not assumption:
- `commercialLegTimelinePeriods()` (`PackageManagerSchema.php`) sweeps boundaries as `from_month` and `to_month + 1` — a Leg declared `to_month=12` contributes boundary `13`, meaning month 12 itself is the last active month (an exclusive `to_month` would need no `+1` here).
- The resulting period's own `to_month` is built as `boundaries[i+1] - 1` — for a lone child spanning `[1,12]`, this literally reconstructs `to_month=12`, round-tripping the inclusive value.
- `activeCommercialLegTimelineChildren()` treats a child active at month `m` when `child['to_month'] >= m` — inclusive comparison, no `+1`/`-1` adjustment anywhere.

So a 12-month monthly commercial window is genuinely 12 payments, and `buildOccurrenceMonths()`'s `for (m=start; m<effectiveEnd; m+=interval)` loop — called with the raw, inclusive `to_month` as `effectiveEnd` — undercounts by exactly one occurrence. This is **option 2's premise, not option 1's**: `to_month` is not intentionally exclusive: this is a real, pre-existing bug in the shipped frontend TCV display (`PricingTiers.tsx`, live in Cost Builder/quote/PDF today), not a boundary I have authority to "correct everywhere necessary" from this backend slice — that would mean changing real, already-displayed customer dollar amounts/payment counts across the existing product, far outside "Phase 2A backend policy/resolver slice." Per the explicit escape hatch offered, **`minimum_total_contract_value` is removed entirely** — from `sanitizeCustomerPolicy()`, the resolver, the save-time validator, and the now-unused `computeResolvedTimelineTotalContractValue()`/`countCommercialOccurrenceMonths()` helpers deleted outright rather than left dead. **Flagging this as a separate, worth-tracking finding**: the existing customer-facing TCV display may be materially understating multi-month contract totals today, unrelated to composable Tier — recommend its own investigation/work item outside this one.

**Blocker 2 — excluded entries filtered from the public projection.** New `PackageFamilyPricingBuilder::presentCustomerPolicy()` strips every `mode: excluded` entry before `customer_policy` reaches the public response — applied to both the top-level occupant/composable_offer shape and each `edition_options[]` entry's own policy. Server-side validation/resolution (`resolveCustomerComposableSelection()`/`validateCustomerPolicyAgainstContainer()`) still operates on the full stored policy including excluded entries. Also closed the consistency gap: `validateCustomerPolicyAgainstContainer()` now requires every stored `item_id` — excluded entries included — to reference a real container row; a stale excluded entry naming a since-removed item now rejects at save time (`dangling_item_id`) instead of accumulating silently, resolving the "either/or" the work file raised in favor of "require every reference to belong to the container."

**Tests:** floor-related assertions removed (§6 TCV-floor section, §1g, §9d from the prior round); new coverage added: `presentCustomerPolicy()` filtering proven via a real `PackageFamilyPricingBuilder::buildResponse()` fixture (own WP-stub environment, mirrors `tests/tier-composable-occupant.php`'s established pattern) — confirms the public response's `customer_policy.items` contains only the non-excluded entry while the stored occupant data still carries both; a new save-time case proves a dangling excluded reference rejects. Full existing regression suite green (`tier-*`/`commercial-leg-*`/`tier-edition-*`/`package-manager-schema`/`composable-occupant-*`, `npx tsc --noEmit`, `npm run docs:check`); code map trimmed to stay under 600 words again.

**Files touched this round:** `PackageSchema.php` (floor removed from `sanitizeCustomerPolicy()`), `PackageManagerSchema.php` (floor removed from resolver + validator, TCV helpers deleted, excluded-dangling check added to validator), `PackageFamilyPricingBuilder.php` (new `presentCustomerPolicy()` filter), `tests/composable-customer-policy-resolver.php`, `docs/code-map/tier-composable-occupant-customer-policy.md`. `PackageStationController.php` untouched this round.

**Not touched, as instructed:** no UI/cart/request/PDF/email/promotions, no `main` push.