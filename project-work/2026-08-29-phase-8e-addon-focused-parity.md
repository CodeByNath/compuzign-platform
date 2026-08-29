# Phase 8E / 8F — Add-on Parity → Quote Review/PDF Parity

## Status
- Phase 8E: `CLOSED`
- Live validation: `PASSED — Nath confirmed customer behavior is good`
- Production baseline for next work: `main@b299563d264615d39b40a9a21e56e14edd0e1565`
- GitHub Actions deploy: `33247214316`, `SUCCESS`
- Phase 8F status: `AWAITING CHATGPT REVIEW`
- Verdict: `Proceed with safeguards` — audit complete, no source touched
- Source push: `NOT APPROVED`

## Phase 8E Closure
Accepted live customer behavior:
- one left-aligned cart **View details** entry;
- opens first quoted plan;
- plan/add-on tabs follow cart order;
- **Total Commitment** is last;
- recommendation CTA order and add-on detail behavior are correct.

## Phase 8F Objective — Quote Review / Full Quote / PDF Parity
Audit the existing **Review & Finalise Quote** step only. The goal is to carry the corrected Package Builder cart/commercial data into the existing right-side quote summary and existing **View full quote** / printable PDF document.

This is data/presentation wiring, not a new quote, request, PDF, routing, or email system.

## Audit Before Any Implementation
Inspect current source and report exact gaps in:
- `request-flow/OrderSummary.tsx`
- `request-flow/QuoteProposalPreview.tsx`
- `request-flow/QuoteCartFlow.tsx`
- `request-flow/RequestFlowModal.tsx`
- `request-flow/types.ts`
- `cost-builder/types.ts`
- shared quote/pricing helpers used by the corrected cart.

Trace the real path:
`FamilyTierQuoteItem snapshot → RequestFlowContext.items → OrderSummary → QuoteProposalPreview → existing beforeprint clone → print/Save as PDF`.

Confirm whether the same `CartItem[]` reaches submit/request storage unchanged and identify any lossy transformation before admin/user-manager persistence.

## What to Look For
- Raw CZ Platform IDs currently exposed to customers in review/PDF.
- Family Tier/Edition/add-on rows still using flat `price` / `billingCycle` instead of `legPaymentSummaries`.
- Review/PDF totals still using `calcQuoteTotals()` where multi-stream Package Family pricing makes headline-cycle totals misleading.
- Missing Upfront/Monthly/Yearly streams, per-plan finite Total, cart TCV, Initial Payment, commitment facts, Edition label, and add-on presentation already available in the corrected cart/details path.
- Cart ordering/identity preservation for primary + add-ons.
- Whether legacy/simple `QuoteItem` behavior must remain unchanged.

## Hard Non-Change Boundary
Do **not** redesign or replace:
- request-flow routing/modal/steps;
- contact form or submit/email behavior;
- request endpoint/storage contract;
- `window.print()` behavior;
- `RequestFlowModal` print portal / `.cz-proposal` cloning;
- PDF mechanism;
- admin/user-manager routing;
- pricing resolver, persistence, quote mutation, or Package Builder selection logic.

Do not duplicate Commercial Leg pricing calculations independently in OrderSummary and PDF. Reuse the same trusted primitives/presentation derivation already used by the corrected cart wherever possible.

## Claude Audit — 2026-08-29 (no source changed)

### 1. Data path, authoritative files
`FamilyTierAdapter.itemFor()` snapshots `legPaymentSummaries` onto `FamilyTierQuoteItem` at Add-to-Quote time → `PackageBuilderApp.items` (React/Preact state, `cartStorage`) → `RequestFlowModal` → `QuoteCartFlow` → `OrderSummary.tsx` (right-panel review) + `QuoteProposalPreview.tsx` (`.cz-proposal`, cloned by `RequestFlowModal`'s `beforeprint` handler for `window.print()`/PDF) → on submit, `QuoteCartFlow.handleSubmit()` posts the **full** `context.items` via `submitRequest()` (`api/endpoints/requests.ts`) to `POST compuzign/v1/requests/submit` → `RequestsController::submitRequest()` → `RequestSchema::validate()/sanitizeItems()` (`src/Modules/Requests/Support/RequestSchema.php:89-164`) → intake transient `_transient_cz_quote_*` → on accept, `RequestRepository::create()` copies that same sanitized payload verbatim into `cz_request` post meta `cz_request_data`.

### 2. Exact defects found
- **Raw CZ Platform IDs shown to customers.** `OrderSummary.tsx:159-160,211` and `QuoteProposalPreview.tsx:113,115,118-119,209` interpolate `familyPlatformId`, `tierInstancePlatformId`, `tierPlatformId`, `tierEditionPlatformId` directly into visible text — in both the review panel and the printed/PDF proposal.
- **Family Tier/add-on rows use flat `price`/`billingCycle` only.** Both files render `item.price`/`item.billingCycle` for `familyMainItems`/`familyAddonItems` — per `cost-builder/types.ts:72-79` these are explicitly documented as "Headline-only card figure," not the real multi-stream structure. `legPaymentSummaries` is never read by either component.
- **Totals use `calcQuoteTotals()` (`utils/quote.ts:148-162`)**, which groups by `item.billingCycle`/sums `item.price` only — no per-plan finite Total (Total Contract Value), no Initial Payment, and misleading when a plan has an Upfront + recurring split (exactly the case `QuoteSummary.tsx` already handles correctly in the cart sidebar).
- **`legPaymentSummaries` is silently dropped server-side before any storage.** `RequestSchema::sanitizeItems()` (RequestSchema.php:89-164) rebuilds each item field-by-field from an explicit whitelist that never includes `legPaymentSummaries`; the REST arg schema (`restArgs()`, lines 172-247) also omits it. It never reaches the transient or `cz_request_data` post meta — the loss happens at submission, not in any presentation layer, so no admin/user-manager view could recover it later even if fixed there.
- **No admin view renders this data at all yet.** `RequestLine`/`RequestEntry` (`api/types/admin.ts:67-104`) only carry the legacy flat `QuoteItem` shape (no family/Platform-ID fields, no `legPaymentSummaries`); repo-wide grep found zero `.tsx` consumers of `fetchAdminRequest`/`RequestEntry`. This is a pre-existing gap, not something Phase 8F caused — flagged as a hidden risk below, not in scope to build.
- Platform IDs themselves (unlike `legPaymentSummaries`) **do** survive sanitization/storage intact (`sanitizeItems()` lines 138-156) — only the customer-facing display of them, not their persistence, is the defect.

### 3. Reusable primitives (already trusted, already correct)
`cost-builder/PricingTiers.tsx`: `computeTotalContractValue()`, `startingPaymentsByCycle()`, `chargeTypeLabel()`. Reference implementation to copy from: `QuoteSummary.tsx` (cart sidebar) already does the exact per-item stream rows + "Total" row + combined-primary Contract Value + Initial Payment aggregation correctly (lines ~41-81, 120-124, 217-232, 300-313), and `QuoteDetailsOverlay.tsx`'s `resolvePlanDetails()`/`TotalCommitmentTab` already does the fail-closed Edition-label resolution and per-plan/Total Commitment breakdown. Phase 8F should reuse these exact functions/patterns in `OrderSummary.tsx` and `QuoteProposalPreview.tsx`, not re-derive the math.

### 4. Hidden compatibility risks
- `legPaymentSummaries` is `optional`/nullable on older cart items (pre-Phase-5) — any new rendering must fall back to `price`/`billingCycle` exactly as `QuoteSummary.tsx` already does, never assume it's present.
- The `RequestSchema` whitelist is a second, independent shape declaration from `FamilyTierQuoteItem`/`RequestLine` — adding `legPaymentSummaries` to the outbound payload does nothing for admin display until `RequestSchema.php` and `RequestMetaSchema`/`RequestLine` types are also updated; that's backend PHP + type surface, arguably outside "presentation-only" scope and should be raised to Nath/ChatGPT before touching it, since `RequestSchema.php` is not in the audited file list.
- `.cz-proposal` is cloned by direct DOM `cloneNode` in `RequestFlowModal.tsx` for print — any structural change to `QuoteProposalPreview.tsx` must keep the clone target (`.cz-proposal` root) intact.
- `calcQuoteTotals()` is still used by legacy non-family `QuoteItem` rows (`mainItems`/`bundleItems`/`tierAddonItems`) which have no `legPaymentSummaries` concept — that path must stay exactly as-is; only the `familyMainItems`/`familyAddonItems` totals should switch to the TCV/Initial-Payment primitives, mirrored on top of (not replacing) the existing cycle-grouped total for legacy items.

### 5. Smallest safe implementation plan (not yet started)
1. In `OrderSummary.tsx` + `QuoteProposalPreview.tsx`: replace the raw Platform-ID text nodes with the human-readable Edition/plan label already resolvable via `resolveEffectiveTierDisplay`/`periodsForVariant` (same resolver `QuoteDetailsOverlay.resolvePlanDetails()` uses) — no new resolver.
2. For `familyMainItems`/`familyAddonItems` rows: render `legPaymentSummaries` streams (when present) the same way `QuoteSummary.tsx` does, falling back to `price`/`billingCycle` when absent.
3. Add a combined Family-item Contract Value / Initial Payment block (reusing `computeTotalContractValue`/`startingPaymentsByCycle`) alongside (not replacing) the existing `calcQuoteTotals()` legacy-item total.
4. Backend `legPaymentSummaries` persistence gap: report only in this round — propose as a separate, explicitly-approved follow-up work item, not silently bundled into this presentation-only phase.
5. Proposed regression contract: `scripts/request-flow-family-tier-parity-contract.ts` — static source checks that (a) no raw `*PlatformId` field is interpolated into JSX text in `OrderSummary.tsx`/`QuoteProposalPreview.tsx`, (b) both files import and call `computeTotalContractValue`/`startingPaymentsByCycle`, (c) legacy `mainItems`/`bundleItems`/`tierAddonItems` rendering and `calcQuoteTotals()` call sites are unchanged (string-presence checks), (d) `.cz-proposal` root class is still present in `QuoteProposalPreview.tsx`.

Stopping here — awaiting ChatGPT review/verdict before any source edit.
