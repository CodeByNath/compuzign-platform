# Phase 8E / 8F — Add-on Parity → Quote Review/PDF Parity

## Status
- Phase 8E: `CLOSED` — live customer validation passed.
- Production baseline: `main@b299563d264615d39b40a9a21e56e14edd0e1565`
- Phase 8F: `AWAITING CHATGPT REVIEW`
- Verdict: `Proceed with safeguards` — implemented on review branch, not on main
- Source push: `NOT APPROVED`
- Review branch: `phase-8f-quote-review-pdf-parity` @ `482929e2` (based on `main@b299563d264615d39b40a9a21e56e14edd0e1565`, not pushed to `main`)

## Phase 8F Objective
Bring the corrected Package Builder cart/commercial presentation into the existing **Review & Finalise Quote** right panel and existing **View full quote** / printable `.cz-proposal` document. This is wiring/presentation, not a new quote, PDF, request, routing, email, or admin system.

## Audit Accepted
Verified path:
`FamilyTierAdapter.itemFor() → CartItem[] → RequestFlowContext.items → OrderSummary + QuoteProposalPreview → RequestFlowModal beforeprint clone → window.print()/PDF`.

`QuoteCartFlow.handleSubmit()` posts `context.items`, but `RequestSchema::sanitizeItems()` currently drops `legPaymentSummaries`; this persistence gap is real but **not part of this customer review/PDF phase**. Record it for later admin/user-manager work. Do not change request schema now.

Confirmed customer defects:
- review and proposal/PDF expose raw CZ Platform IDs;
- Package Family rows use Headline-only `price`/`billingCycle` instead of `legPaymentSummaries`;
- `calcQuoteTotals()` is insufficient for multi-stream Family plans;
- review/PDF omit stream rows, per-item finite Total, primary cart TCV/Contract Value and Initial Payment.

## Critical Safeguard — Edition Display
Do **not** make request-flow components resolve Edition labels from live Package Family data. `RequestFlowContext` carries items/services, not families/tiers, and quote documents should represent the selection-time snapshot rather than later live catalog state.

`FamilyTierQuoteItem.tierTitle` currently snapshots the Tier occupant label only. Add one optional human-readable selection-time field (e.g. `tierEditionTitle?: string | null`) in the cart item and populate it in `FamilyTierAdapter.itemFor()` from `effective.selectedEdition?.label ?? null`. Use that display snapshot in review/PDF; keep Platform IDs underneath for identity but never render them to customers. This is data wiring only, not selection/routing behavior.

## Claude Implementation Scope
1. `FamilyTierQuoteItem`: add optional Edition-title display snapshot; populate it at Add-to-Quote time. Preserve old carts when absent.
2. `OrderSummary.tsx`: Family primary/add-on rows mirror corrected cart semantics: human Family/Tier/Edition labels; each `legPaymentSummaries` stream; finite per-item **Total**; fallback to flat price/cycle when streams absent. Remove raw CZ IDs from visible text.
3. `QuoteProposalPreview.tsx`: same commercial presentation and labels. Preserve `.cz-proposal` root exactly so existing print/PDF cloning remains unchanged.
4. Cart-level Family contract summary in both surfaces must reuse `computeTotalContractValue()`, `startingPaymentsByCycle()`, `chargeTypeLabel()` and the same primary-only TCV semantics as `QuoteSummary`: add-ons may show their own stream/finite Total but do not enter combined primary TCV/Initial Payment.
5. Legacy/simple `QuoteItem`, bundle, promotion and non-family behavior stays unchanged. `calcQuoteTotals()` may remain for those paths; do not represent multi-stream Family totals with it.
6. Do not touch request routing/modal/steps, contact/submit/email, RequestSchema/storage, print portal, PDF mechanism, admin routing, pricing resolver, quote mutation, or persistence.

Add focused contracts for: no customer-visible Platform IDs; optional Edition-title snapshot/fallback; stream + finite Total rendering in review and proposal; primary-only TCV/Initial Payment; legacy path retained; `.cz-proposal` root retained.

Implement on a review branch, report exact diff/tests in this file, set `AWAITING CHATGPT REVIEW`, and stop before `main` push.

## Claude Report — 2026-08-29 (implemented, not pushed to main)

Branch `phase-8f-quote-review-pdf-parity` @ `482929e2`, based on `main@b299563d264615d39b40a9a21e56e14edd0e1565`.

**Files changed:**
- `cost-builder/types.ts`: `FamilyTierQuoteItem` gains optional `tierEditionTitle?: string | null` — selection-time human Edition label.
- `package-builder/FamilyTierAdapter.tsx`: `itemFor()` populates `tierEditionTitle: effective.selectedEdition?.label ?? null`. No other behavior touched.
- `request-flow/OrderSummary.tsx` + `request-flow/QuoteProposalPreview.tsx`: Family primary/add-on rows now show `familyTitle`/`tierTitle`/`tierEditionTitle` only (zero raw Platform ID fields — verified via grep, zero matches). Each row with `legPaymentSummaries` renders its stream rows + a finite per-item Total (`computeTotalContractValue`), falling back to flat `price`/`billingCycle` when absent — same shape `QuoteSummary.tsx` already uses. Totals section branches on `hasMultiStreamItem`: when true, shows a primary-only combined Total Contract Value (or "Contract Value: Ongoing") + Initial Payment block, reusing `computeTotalContractValue()`/`startingPaymentsByCycle()`/`chargeTypeLabel()` exactly as `QuoteSummary.tsx`'s footer does — add-ons never enter that combined sum. Legacy `mainItems`/`bundleItems`/`tierAddonItems` rendering and `calcQuoteTotals()` are byte-for-byte untouched. `.cz-proposal` root class retained for `RequestFlowModal`'s print clone.
- `resources/css/modules/cost-builder.css`: new `.cz-os__stream-row`/`.cz-os__service-streams`/`.cz-os__addon-streams`/`.cz-os__contract-note` and `.cz-proposal__stream-row`/`.cz-proposal__service-streams`/`.cz-proposal__addon-streams`/`.cz-proposal__contract-note` rules, styled to match each surface's existing palette. No existing rule edited.
- `scripts/package-family-request-flow-contract.ts`: this pre-existing contract had asserted the raw-Platform-ID behavior as *correct* (`order.includes('familyPlatformId') ...`). Since that behavior is the defect this phase fixes, updated the assertion to the opposite (no raw ID field anywhere in either file) plus `tierEditionTitle`/`legPaymentSummaries` usage checks. This is a requirements-direction change (approved above), not a weakened assertion around unfixed code.
- `scripts/request-flow-family-tier-parity-contract.ts` (new, `contract:request-flow-family-tier-parity`): Edition-title fallback + no live-catalog resolution in request-flow; reused primitives present; combined TCV/Initial Payment excludes add-ons; per-item stream+Total rendering count; legacy rendering/`calcQuoteTotals()` retained; `.cz-proposal` root retained.
- `dist/css/cost-builder.css`, `dist/js/cost-builder.js`, `package.json`: rebuilt/updated to match.

**Tests:** `tsc --noEmit` clean. `npm run build` clean. Full contract sweep (every registered `contract:*`) run on this branch: only `admin-station-css`, `package-builder-flow`, `platform-identity-schema` fail — confirmed via `git stash` + baseline run against `main@b299563d` that all three already fail there too (unrelated: `package-builder-flow` references a missing `FullBuildDetail.tsx`; `platform-identity-schema` fails on pre-existing rate-sheet-bundle entries; `admin-station-css` is the previously-documented unrelated baseline failure). No new regressions.

Awaiting review of the actual pushed branch diff before any `main` push.
