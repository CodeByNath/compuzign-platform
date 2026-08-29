# Phase 8E / 8F — Add-on Parity → Quote Review/PDF Parity

## Status
- Phase 8E: `CLOSED` — live customer validation passed.
- Production baseline: `main@b299563d264615d39b40a9a21e56e14edd0e1565`
- Phase 8F: `READY FOR CLAUDE`
- Verdict: `Proceed with safeguards`
- Source push: `NOT APPROVED`

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
