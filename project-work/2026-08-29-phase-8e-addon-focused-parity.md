# Phase 8E / 8F — Add-on Parity → Quote Review/PDF Parity

## Status
- Phase 8E: `CLOSED`
- Live validation: `PASSED — Nath confirmed customer behavior is good`
- Production baseline for next work: `main@b299563d264615d39b40a9a21e56e14edd0e1565`
- GitHub Actions deploy: `33247214316`, `SUCCESS`
- Phase 8F status: `READY FOR CLAUDE`
- Verdict: `Proceed with safeguards — AUDIT FIRST`
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

## Claude Next Action
Audit only. Do not edit source yet. Update this same file with:
1. current data path and authoritative files;
2. exact presentation/data defects;
3. reusable pricing/presentation primitives;
4. hidden compatibility risks;
5. smallest safe implementation plan and proposed regression contracts.

Then set `AWAITING CHATGPT REVIEW` and stop.
