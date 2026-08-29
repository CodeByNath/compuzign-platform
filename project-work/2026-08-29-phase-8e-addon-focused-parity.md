# Phase 8E / 8F / 8G — Quote Presentation Parity

## Status
- Phase 8E: `CLOSED`
- Phase 8F: `CLOSED` at production `main@5b97287032a4bb00e2d8849fde4ed30f42917eab`
- Phase 8G: `READY FOR CLAUDE`
- Source push: `SOURCE PUSH NOT APPROVED`
- Verdict: `Proceed with safeguards`

## Phase 8G Finding — Bundle Children Disappear
Live production evidence on OMNIA Basic shows the focused right-side card correctly expands **Foundation Bundle** into its child inclusions, but Plan Details → Billing Breakdown renders only the priced bundle parent. The omission then survives the cart-level View details overlay and the Family quote snapshot used by Review & Finalise Quote / printable proposal.

Independent source audit:
- backend `CommercialLegPricedItem.includes` already carries bundle children; no resolver/schema change is needed;
- `PlanDetailsModal.tsx::ItemBreakdownTable()` renders only `component.items` top-level rows and ignores each item’s `includes`;
- `FamilyTierAdapter.itemFor()` snapshots only `effective.inclusionLabels` into `features: string[]`, discarding the already-resolved structured `effective.inclusionItems`;
- `OrderSummary.tsx` and `QuoteProposalPreview.tsx` therefore cannot render bundle hierarchy;
- focused-card `TierCard` is the established correct bundle presentation path.

## Claude — Implement Phase 8G Only
Production baseline: `main@5b97287032a4bb00e2d8849fde4ed30f42917eab`.

1. In Plan Details, render each `CommercialLegPricedItem.includes` child beneath its bundle-parent row in Billing Breakdown. Preserve the bundle as one commercial/priced row. Children are display-only: never add their prices/totals, never flatten them into the component total, and never change Contract Value, Initial Payment, occurrence, or Leg math.
2. Extend `FamilyTierQuoteItem` with an optional structured selection-time inclusion snapshot (use the existing `ServiceInclusion[]` shape). Populate it in `FamilyTierAdapter.itemFor()` from the exact resolved `effective.inclusionItems`; do not re-resolve from live catalog data later. Keep `features` unchanged for compatibility.
3. Use that snapshot for Family primary and add-on inclusion presentation in:
   - cart-level View details via the shared `PlanDetailsContent` fix;
   - Review & Finalise Quote;
   - View full quote / printable proposal.
   Render bundle parents with indented child inclusions, matching the focused card’s semantics. Old cart items without the new field must fall back to `features`.
4. Do not alter Package/Rate Sheet resolution, identity, pricing, quote totals, mutation/routing, request submission, persistence, admin, or legacy Service/bundle/tier-add-on paths. The known request-persistence gap remains deferred.
5. Add focused contracts proving:
   - Plan Details consumes `CommercialLegPricedItem.includes`;
   - bundle children never enter arithmetic;
   - `itemFor()` snapshots structured inclusions;
   - review and proposal render nested children with old-cart fallback;
   - Family add-ons follow the same rule;
   - no raw platform IDs appear.
6. Run type-check, build, the new contract, request-flow Family parity, Package Builder regression/isolation contracts, and report exact changed files/results. Commit locally and update this file with the SHA/diff summary. Do not push source.

## Acceptance
OMNIA Basic must show Foundation Bundle’s children in Plan Details, cart View details, review, expanded proposal, and Print/Save-as-PDF, while Foundation Bundle remains priced exactly once at $4,000/month and all existing totals remain unchanged.
