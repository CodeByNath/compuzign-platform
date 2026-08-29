# Phase 8I — Final Quote Inclusion Quantity Parity

## Status
- Phase 8H production baseline: `main@0c586debcccc5ee9eb850b8119200b31fe61b4ed`.
- Phase 8I: `READY FOR CLAUDE`.
- Source push: `SOURCE PUSH NOT APPROVED`.
- Auditor verdict: `Proceed with safeguards`.

## Live Finding
Review & Finalise Quote shows Family inclusion labels but omits their resolved quantities. The printable proposal/PDF reuses the same quantity-less Family inclusion presentation, so the omission carries into PDF.

Live example: KAIROS Business Pro lists `4 vCPU`, `16 GB RAM`, storage, monitoring, etc. without the quantities already shown on the selected Tier card.

## Source Audit
This is display loss, not missing data:
- `ServiceInclusion.quantity?: number` is the authoritative resolved Rate Sheet selection quantity.
- `FamilyTierQuoteItem.inclusionItems` preserves the exact selection-time structured snapshot.
- `FamilyTierAdapter.itemFor()` snapshots `effective.inclusionItems`; do not re-resolve live catalog data.
- `OrderSummary.tsx` and `QuoteProposalPreview.tsx` each render only `inclusion.label` / `child.label`, dropping the existing `quantity`.
- The established Tier-card grammar renders ordinary and Bundle-child quantities with `quantity ?? ''`; Bundle parents remain quantity-less section headers.

## Locked Display Rules
1. In both `OrderSummary` and `QuoteProposalPreview`, structured `inclusionItems` must show the snapshot quantity for:
   - every ordinary top-level inclusion;
   - every Bundle child inclusion.
2. Bundle parents remain section headers with no quantity, matching `PricingTiers.tsx`.
3. Use nullish semantics (`quantity ?? ''`) so numeric zero remains visible as `0`; never use a truthy check.
4. Keep the pre-Phase-8G `features: string[]` fallback label-only; it has no quantity field, so none may be invented.
5. Apply identically to Family primaries and Family add-ons. Both helpers already serve both populations.
6. Use explicit label/quantity spans and right-align the quantity in the existing row; do not concatenate ambiguous display strings.
7. Printable/PDF proposal must inherit the same quantity-bearing markup. Do not add a divergent print-only data path.
8. No arithmetic, pricing, Bundle composition, identity, persistence, routing, resolver, quote snapshot, or wording changes.

## Claude — Implementation
1. Change only the authoritative presentation/source needed in:
   - `resources/ts/components/request-flow/OrderSummary.tsx`
   - `resources/ts/components/request-flow/QuoteProposalPreview.tsx`
   - `resources/css/modules/cost-builder.css`
   - focused regression contract + `package.json`
   - rebuilt `dist/css/cost-builder.css` and `dist/js/cost-builder.js`
2. Reuse the existing `inclusionItems` snapshot; do not touch `FamilyTierAdapter.itemFor()` or types unless audit proves a real missing field.
3. Add a focused contract covering ordinary quantity, Bundle-parent omission, Bundle-child quantity, numeric zero, old-cart fallback, primary/add-on parity, and both screen/PDF renderers.
4. Run typecheck, build, focused contract, relevant request-flow/Bundle contracts, then one concise full contract sweep.
5. Record exact changed files, validation, commit SHA, and risks here; set `AWAITING CHATGPT REVIEW`. Do not push to `main`.

## Final Gate
After independent source review and approved deployment, live validation must confirm quantities in:
- collapsed/expanded Review & Finalise Quote inclusion lists;
- full printable proposal;
- saved PDF;
- both a normal inclusion and a Bundle child;
- a Family add-on where present.

Phase 8I remains open until screen and PDF agree with the snapshot.
