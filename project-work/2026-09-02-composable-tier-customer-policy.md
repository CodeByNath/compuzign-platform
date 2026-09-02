# Composable Tier — Phase 2A customer configuration policy

## Status
- **READY FOR CLAUDE — correct existing review branch; SOURCE PUSH NOT APPROVED.**
- Auditor verdict: **Stop — implementation contract violations.**
- Production `main`: `1b2efd23064e3d2fac904c21fa4094912b132c41`.
- Review branch: `review/composable-tier-customer-policy` at `13fa08a0` (1 commit ahead of main).

## Accepted contract remains unchanged
Policy is composable-only attribute data; whole-inclusion selection; fixed authored Legs; server-authoritative validation/pricing; no customer mutation of stored occupant; Edition absent/empty policy inherits wholesale and non-empty policy fully replaces; Bundle parent only; no Rate Sheet IDs public; cart/request/PDF/email/promotions deferred.

## Independent audit of `13fa08a0` — blockers
### 1. New PHP TCV helper is not the existing TCV semantics
`computeResolvedTimelineTotalContractValue()` currently sums each component item's `line_total` once per resolved Period. It does **not** account for billing cadence/payment count over the Period (monthly/yearly/etc.). Therefore a 12-month monthly stream is counted once, not 12 times. This can materially understate TCV and incorrectly pass/fail `minimum_total_contract_value`.

Do not create a second approximate TCV engine. Reuse/extract one canonical server-side payment-summary/TCV calculation equivalent to the existing customer/notification semantics, or defer floor support entirely until canonical reuse is possible. Add a test with a multi-month recurring stream that would fail under the current one-sum-per-period implementation.

### 2. Choice Price Option can bypass authorization with `null`
In `resolveCustomerComposableSelection()`, choice mode rejects only non-null IDs not in `allowed_price_option_ids`; explicit `price_option_id: null` is accepted and overwrites the row to base/default pricing. Unless base pricing is explicitly an authorized choice in the contract, this is an authorization bypass. The accepted shape authorizes identified Price Options only; fixed mode is the route that preserves the published null/base selection.

Choice mode must accept only an explicitly authorized option ID and must validate the configured default is authorized/resolvable. Never silently fall back to null/base.

### 3. Stale/unknown customer choices are silently ignored
Resolver loops published source rows, so a submitted `item_id` that no longer exists, is excluded/not offered, or is absent from the effective policy can disappear without a rejection. Accepted contract requires live revalidation and structured stale-choice rejection, never silent partial acceptance.

Pre-validate every submitted choice key against the effective policy + current container rows and reject unknown/not-offered items (`not_selectable` or a precise stable code). Duplicate submitted item IDs must also be rejected or deterministically normalized by an explicitly documented rule; do not silently last-write-wins.

### 4. Save-time policy validation against actual container data is missing
`sanitizeCustomerPolicy()` is deliberately structural only, and `saveComposableOccupantModule()` stores that result directly. But the authorized implementation slice explicitly required validation against the container's actual published `rate_sheet_items`, its row Price Options, and fixed Leg/TCV structure. A policy can currently save dangling item IDs/option IDs and an unverifiable floor.

Add an authoritative validation step at the appropriate Package-owned save/settle boundary. Invalid references/defaults/floor must return a structured 422-style rejection and leave stored/draft state unchanged. **Do not silently drop/repair invalid policy.** Keep sanitization separate from semantic validation if that preserves cohesion.

### 5. TCV floor save invariant still missing
Claude already flagged this deviation. It is not deferred: accepted contract explicitly requires an unverifiable floor to be rejected at authoring time, with resolver `floor_unverifiable` only as defensive stale-data backstop. Solve it using the canonical TCV path from blocker 1, not by threading an approximate helper.

## Non-blocking note
Embedding `customer_policy` inside `pricing.composable_offer` via shared `presentOccupant()` is acceptable and preferable to a duplicate sibling projection, provided normal Tier output remains inert/backward-compatible and contracts prove it.

## Claude correction task
Stay on the same review branch. Correct only the five blockers above. Do not add UI/cart/request/PDF/email/promotions work. Add focused tests for:
- 12-month monthly (and mixed-cycle if useful) canonical TCV;
- explicit null/base Price Option bypass rejection;
- stale/unknown/excluded submitted item rejection;
- duplicate submitted item behavior;
- save-time dangling item ID / disallowed or missing Price Option / invalid default rejection;
- save-time open-ended/unverifiable floor rejection with no persistence mutation;
- resolver defensive `floor_unverifiable` for deliberately stale stored data.

Push corrected branch, record exact new SHA/files/tests and any architectural plumbing required, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.