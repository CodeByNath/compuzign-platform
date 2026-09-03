# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — live correction round implemented on review branch.**
- Auditor verdict: **Proceed with safeguards.**
- Validated production before this round: `main@f9035e82cda9ce7a0f1a65e36d761f8524aa058c`; Hostinger deploy #938/run `33762478987` succeeded — unchanged, this round never pushed to `main`.
- Review branch: `review/composable-live-correction-round` @ `ed10a250`, branched from `main@f9035e82`.

## Locked architecture / non-change boundary
Retain one subordinate composable occupant and one aggregate composable quote line with explicit `primary | addon | composable` identity. Do not add entities/products, reuse `is_addon`, persist `composableSelection`, or change pricing/resolvers, Rate Sheets, occurrence-month math, identity keys, Admin configuration, or legacy Request data. Stored Request rendering must use stored `inclusionItems` and `legPaymentSummaries`, never live re-resolution.

## Live evidence
Production Request **CZ-B9W42O / CZRWNTCQ** contains Starter Cloud, Backup & DR Shield, and composable Block Storage ×100.
- Admin Request shows three separate summary lines and Build Your Own at $10/month, but omits composable inclusion/Leg detail.
- Quote details for composable shows “Details unavailable for this plan.”
- Review & Finalise Print / Save as PDF falls below the usable 1067×701 viewport unless rail is scrolled.
- Customer quote/cart says **Build Your Own** even when composable is used as an upgrade beside a normal Tier.
- No customer email was found for CZ-B9W42O; legacy CZ-9GPG3T is not valid evidence for this deployment.

## Claude implementation scope
1. Customer quote/cart + review: when composable coexists with a normal Tier, present the aggregate line as **Upgrades**. Keep internal composable identity and standalone Admin Build Your Own naming unchanged.
2. Composable Quote details: render current successful server-preview snapshot — every selected inclusion + quantity and stored payment stream/amount; current expected evidence is Block Storage ×100, Monthly $10, Ongoing. Never show unavailable when snapshot data exists.
3. Review & Finalise: keep Print / Save as PDF visibly reachable at 1067×701 and smaller supported heights using existing rail/action styling; sticky/reachable action area is acceptable, no redesign.
4. Admin Request readback: beneath the aggregate composable line, render stored inclusion names/quantities plus stored per-Leg payment summaries. Preserve primary/Add-on separation and customer-safe labels.
5. Diagnose/fix missing customer email for successful Request submission. Email/public quote/print/PDF must render composable exactly once from stored snapshot values, with no raw Platform IDs.
6. Preserve legacy Requests where `isComposable` is absent; do not rewrite CZ-9GPG3T.

## Required verification
Add focused regression coverage for:
- composable details from preview snapshot;
- upgrade-vs-standalone customer label;
- primary + composable + Add-on Request readback;
- stored inclusion quantities and per-Leg streams in Admin/proposal/email;
- successful submission sends customer email once;
- responsive action visibility/reachability;
- legacy absent-`isComposable` fallback.

Implement locally, run focused contracts/typecheck/build/docs, push to a non-production review branch only, then report exact files, tests, branch/SHA and unresolved risks here. Set **AWAITING CHATGPT REVIEW**. Do not push `main`.

## Implementation report — live correction round (review branch, no `main` push)

Branch: `review/composable-live-correction-round` @ `ed10a25059fe23f485aa54779e2556ac47b9e8ce`, branched from the approved `main@f9035e82`. `main`/`origin/main` untouched — verified via `git status`/`git log` after the push.

### 1. Customer "Upgrades" label
New `composableCoexistsWithPrimary(item, items)` in `utils/quote.ts` — true only when a composable line has a sibling primary `FamilyTierQuoteItem` for the same `familyTierSystemKey()` (same Family+Tier-Instance), computed at render time since coexistence can change as the cart is edited, never stored. Wired into `QuoteSummary.tsx` (mini cart) and `OrderSummary.tsx` (Review & Finalise): shows "Upgrades" instead of `tierTitle` when true. `QuoteProposalPreview.tsx` (shared with Admin PDF print), `requestItemDisplay.ts`, and the Admin Request drawer are untouched — verified by a source-level assertion that they contain neither the new helper nor the "Upgrades" string.

### 2. Composable Quote details
`QuoteDetailsOverlay.tsx`'s `resolvePlanDetails()` still returns `null` for composable (no fixed-slot Tier/Edition to resolve — unchanged). The caller no longer falls through to "Details unavailable" for that case: new `ComposablePlanDetails`/`ComposableInclusionsTable` render directly from the item's own stored `inclusionItems`/`legPaymentSummaries`/`price`/`billingCycle` — the exact live-evidence expectation (Block Storage ×100, Monthly $10, Ongoing) now renders. Never re-resolved against live Rate Sheet/occupant/policy state.

### 3. Print / Save as PDF reachability
`.cz-os__actions` (`cost-builder.css`) gained `position: sticky; bottom: 0` plus an opaque background — stays visible within `.cz-rf-right`'s existing scroll container without scrolling past the full services/totals list. Existing rail styling only, no redesign, no new breakpoint.

### 4. Admin Request readback
New `requestComposableDetail()` in `requestItemDisplay.ts` — composable-only (`null` for every other line) — flattens `inclusionItems` (Bundle parent stays quantity-less, children keep their own quantity, same convention as every other inclusion renderer) and maps `legPaymentSummaries` through the existing `chargeTypeLabel()`/`formatPrice()`. `RequestDrawerHost.tsx` renders it beneath the aggregate line; the row markup was split into its own `.cz-requests-drawer__item-row` so the detail block stacks full-width beneath rather than competing with the price column. No raw Platform IDs (unchanged — this drawer never showed them for line items).

### 5. Missing customer email
Could not reproduce a crash. A full `RequestsController::submitRequest()` run through the real controller (`tests/request-durable-submission.php`, new scenario 15) with a primary + Add-on + composable line — the closest reconstruction of the live evidence (Starter Cloud / Backup & DR Shield / composable Block Storage ×100) — sends both emails successfully with no exception. Hardened regardless, since this is the one place a rendering exception could 500 the whole response despite the Request already being durably persisted: `buildAdminHtmlEmail()`/`buildCustomerHtmlEmail()` calls in `submitRequest()` are now independently try/caught and `error_log()`-ed, so one email's failure can never block the other or turn an already-successful Request into a customer-visible error. **Unresolved risk**: without server error-log access I cannot confirm this was the actual cause for CZ-B9W42O specifically — flagging this honestly rather than claiming a confirmed root cause. If it recurs, the new `error_log()` calls will name the exact exception.

### 6. Legacy compatibility
No new required field anywhere in this round. Every new code path is `isComposable`-gated (`composableCoexistsWithPrimary()` no-ops for non-composable items, `requestComposableDetail()` returns `null` without `isComposable`, `ComposablePlanDetails` is reached only via `activeItem?.isComposable`). `resolveQuoteItemRole()` (pre-existing) still reads an absent `isComposable` as `primary`, unchanged and re-verified.

### Exact files changed (13 source + 2 docs, excluding rebuilt `dist/`)
- `resources/ts/utils/quote.ts` — `composableCoexistsWithPrimary()`.
- `resources/ts/components/cost-builder/QuoteSummary.tsx`, `resources/ts/components/request-flow/OrderSummary.tsx` — "Upgrades" label wiring.
- `resources/ts/components/package-builder/QuoteDetailsOverlay.tsx` — `ComposablePlanDetails`/`ComposableInclusionsTable`.
- `resources/css/modules/cost-builder.css` — sticky `.cz-os__actions`.
- `resources/ts/admin-station/stations/requests/requestItemDisplay.ts` — `requestComposableDetail()`.
- `resources/ts/admin-station/stations/requests/RequestDrawerHost.tsx`, `resources/ts/admin-station/styles/admin-station.css` — Admin readback rendering + new `.cz-requests-drawer__item-row`/`-detail`/`-inclusions`/`-streams` classes (grepped against `atomic-engine/css/`, no collisions).
- `src/Modules/Requests/Http/RequestsController.php` — email try/catch hardening.
- `tests/request-durable-submission.php` — new scenario 15 (full composable submission smoke test).
- New: `scripts/composable-live-correction-contract.ts`, `docs/code-map/tier-composable-occupant-live-correction.md` (linked from `000-README.md`).

### Verification performed (matching the "Required verification" list)
- **Composable details from preview snapshot**: `contract:composable-live-correction` asserts `ComposablePlanDetails` reads `item.inclusionItems`/`item.legPaymentSummaries` and is reached before the "Details unavailable" fallback, never calling the live resolver.
- **Upgrade-vs-standalone customer label**: pure-function proof of `composableCoexistsWithPrimary()` — same Family+Instance → true, different Family → false, Add-on-only sibling (no primary) → false, non-composable item → always false; plus source-level proof the relabel is customer-only.
- **Primary + composable + Add-on Request readback**: `request-durable-submission.php` scenario 15 submits exactly this three-line shape through the real controller; `requestComposableDetail()` unit-proven with a non-composable sibling line to confirm no cross-contamination.
- **Stored inclusion quantities and per-Leg streams in Admin**: `requestComposableDetail()` proven against a Bundle parent/child + stream fixture (3 flattened inclusion rows, correct quantities, formatted stream amount). Proposal/email coverage from the prior phase is unchanged and re-run.
- **Successful submission sends customer email once**: scenario 15 asserts `count($__mailLog)` increases by exactly 2 (admin + customer) for the composable-bearing submission.
- **Responsive action visibility/reachability**: CSS-source contract asserts `position: sticky`, `bottom: 0`, and an opaque background on `.cz-os__actions` — matching this repo's existing convention for CSS-level contract assertions (no headless-browser viewport harness exists in this repo; would be a new, larger tooling addition outside this round's scope).
- **Legacy absent-`isComposable` fallback**: `requestComposableDetail()` proven `null` for a `RequestLine` fixture with no `isComposable` key at all; `resolveQuoteItemRole()` re-proven `primary` for the same shape; every pre-existing PHP/TS test in this area re-run and still passing.

### Full validation run (all green)
`npx tsc --noEmit`, `npm run build`, `node scripts/docs-check.mjs` (new Code Map under the 600-word limit), all 7 related PHP tests (`request-schema-composable`, `notification-templates-composable-quote-parity`, `request-schema-is-addon`, `request-schema-family-quote-snapshot`, `notification-templates-family-quote-parity`, `request-durable-submission`, `admin-requests-durable-surface`), 17 related TS contracts including the new `contract:composable-live-correction`, and `regression:composable-quote-cart-loop`. One pre-existing, unrelated failure re-confirmed out of scope: `contract:admin-station-css`'s 6 `cz-rate-sheet-tool__*` findings (verified via `git status` — no rate-sheet-tool file touched this round, matching the same pre-existing gap noted in the prior phase's report).

Set **AWAITING CHATGPT REVIEW**. `main` untouched.