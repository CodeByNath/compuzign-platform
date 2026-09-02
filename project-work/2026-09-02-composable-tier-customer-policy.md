# Composable Tier — Phase 2A customer configuration policy

## Status
- **AWAITING CHATGPT REVIEW — 5 blockers corrected on the same review branch; SOURCE PUSH NOT APPROVED.**
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

## Claude Report — 5 blockers corrected

**Branch:** `review/composable-tier-customer-policy`, now at `92b97998` (was `13fa08a0`), pushed. Still nothing on `main`.

**Files touched this round:** `PackageManagerSchema.php` (new `validateCustomerPolicyAgainstContainer()`, corrected `computeResolvedTimelineTotalContractValue()` + new `countCommercialOccurrenceMonths()` helper + `CADENCE_INTERVAL_MONTHS`/`UPFRONT_BILLING_CYCLES` consts, resolver's pre-validation/null-bypass fixes), `PackageStationController.php` (both save paths now build a `readModel` inline and call the new validator before persisting), `tests/composable-customer-policy-resolver.php` (+18 assertions), `docs/code-map/tier-composable-occupant-customer-policy.md`. `PackageSchema.php`/`PackageFamilyPricingBuilder.php` untouched this round — none of the 5 blockers required changing them.

**1. TCV.** Replaced the flawed per-Period line-total sum with a faithful PHP port of `buildLegPaymentSummaries()`/`computeTotalContractValue()` (`PricingTiers.tsx`/`paymentSummary.ts`) — dedupes by commercial identity across Periods, applies the real cadence interval (monthly=1/quarterly=3/annual=12, upfront/one-time=always-1-occurrence), null-propagates on genuine open-endedness. **Deliberately NOT physically extracted from/shared with `NotificationTemplates::computeTotalContractValue()`** (flagged, not silently decided) — that function aggregates already-frozen summaries (e.g. a stored Request's `legPaymentSummaries`), never builds them from raw resolved Periods, and no PHP port of the *building* step existed anywhere before this work; sharing would introduce a new Requests → SurfacePackages dependency this work wasn't asked to add. The algorithm is the canonical one either way, just not the same physical function. New test: 12-month monthly stream now resolves to `$100 × 11 occurrences = $1100` (was `$100` under the old code) — `countCommercialOccurrenceMonths(1, 12, 'monthly')` is a byte-for-byte port of `buildOccurrenceMonths()`'s own `for (m=start; m<effectiveEnd; m+=interval)` bound, so it counts 11 not 12 for a nominal 12-month window; this is the existing TS algorithm's own semantics, faithfully reproduced, not something corrected or introduced here — flagging in case that's actually a pre-existing off-by-one worth its own separate look outside this task's scope.

**2. Choice-mode null bypass.** Fixed: `!in_array($requestedOption, $allowed, true)` now runs unconditionally (was gated behind `$requestedOption !== null`), so an explicit `null` under `'choice'` mode is rejected exactly like any other unauthorized id — `allowed_price_option_ids` structurally never contains `null`. The no-explicit-choice fallback path now also re-validates the policy's own `default_price_option_id` against `allowed_price_option_ids` before applying it, rejecting rather than silently applying a drifted default.

**3. Stale/unknown/duplicate submitted choices.** New pre-validation pass before the per-row resolution loop: every submitted `item_id` is checked against the container's current rows + effective policy mode; a stale/unknown/excluded item rejects as `not_selectable`, a duplicate submitted `item_id` rejects as `duplicate_item_choice` (chose explicit rejection over an implicit last-write-wins/first-write-wins rule, since none was specified in the accepted contract and inventing one risked exactly the kind of unstated behavior this blocker was flagging in the first place).

**4 & 5. Save-time validation, including the floor.** New `PackageManagerSchema::validateCustomerPolicyAgainstContainer(policy, container, readModel)`, kept separate from the structural sanitizer per the auditor's own suggestion. Checks: every policy `item_id` exists in the container's current `rate_sheet_items`; every `choice`-mode Price Option id (allowed list + default) resolves against that row's own live `price_options[]`; the floor is rejected as `floor_unverifiable` if the container's own fixed Leg structure (checked unfiltered — open-endedness is a pure timeline-structure fact, independent of which items a customer might pick) can't yield a finite TCV via the same corrected algorithm from blocker 1. Wired into `saveComposableOccupantModule()` (against the occupant's `current_occupant`) and `saveComposableOccupantEditionModule()` (against the Edition's own current fields, never the in-flight draft body) — both build `$readModel` inline the same way `getPackageStationManager()` already does, rather than threading a new parameter through the shared `settleTierSlot()`/`settleTierEditionOverview()` engine (kept composable-agnostic, no signature change to code every occupant type shares). Returns a structured `{code, item_id?}` 422 and leaves stored/draft state completely untouched on violation.

**Tests:** 18 new assertions — stale/unknown/duplicate/null-bypass/drifted-default rejections, 12-month + 3-month + one-time TCV scenarios with hand-traced expected values, and 5 new `validateCustomerPolicyAgainstContainer()` cases (dangling item id, disallowed allowed-list id, invalid default, save-time floor rejection, and a fully-valid pass). Full existing regression suite re-run and green (`tier-*`/`commercial-leg-*`/`tier-edition-*`/`package-manager-schema`, `npx tsc --noEmit`, `npm run docs:check`); code map trimmed to stay under the 600-word cap.

**Not touched, as instructed:** no UI/cart/request/PDF/email/promotions work, no `main` push.