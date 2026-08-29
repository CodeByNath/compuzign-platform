# Phase 8E / 8F / 8G — Quote Presentation Parity

## Status
- Phase 8E: `CLOSED`
- Phase 8F: `CLOSED` at production `main@5b97287032a4bb00e2d8849fde4ed30f42917eab`
- Phase 8G: `AWAITING CHATGPT REVIEW`
- Source push: `SOURCE PUSH NOT APPROVED`
- Verdict: `Proceed with safeguards` — implemented locally, not pushed
- Local branch (not pushed): `phase-8g-bundle-inclusion-parity@4659e5a0`, based on `main@5b97287032a4bb00e2d8849fde4ed30f42917eab`

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

## Claude Report — 2026-08-29 (implemented locally, not pushed)

Local branch `phase-8g-bundle-inclusion-parity` @ `4659e5a0`, based on `main@5b97287032a4bb00e2d8849fde4ed30f42917eab`. Not pushed anywhere per this round's instruction.

**Files changed:**
- `package-builder/PlanDetailsModal.tsx`: `ItemBreakdownTable()`'s row list changed from `items.map(...)` to `items.flatMap((item, i) => [...])`, appending each item's `(item.includes ?? []).map(...)` as its own display-only `<tr class="...row--child">` immediately after the parent row (no unit price/total shown for children — dashes). `total` is still `items.reduce(...)` over the top-level array only, byte-identical to before — children never enter it. This is the SAME shared component `QuoteDetailsOverlay.tsx`'s cart-level "View details" already renders through (it resolves live Periods and passes them into this same `PlanDetailsContent`/`ItemBreakdownTable`), so that surface is fixed with no separate edit there.
- `cost-builder/types.ts`: `FamilyTierQuoteItem` gains `inclusionItems?: ServiceInclusion[]` — the exact resolved `effective.inclusionItems` snapshot, additive alongside the existing flat `features: string[]` (never replacing it).
- `package-builder/FamilyTierAdapter.tsx`: `itemFor()` adds `inclusionItems: effective.inclusionItems`. No other behavior touched.
- `request-flow/OrderSummary.tsx` + `request-flow/QuoteProposalPreview.tsx`: new `FamilyInclusionsList` component — renders `item.inclusionItems` (Bundle parent as a bold/no-checkmark header via `inclusion.bundle_id`, its `inclusion.includes` children indented beneath, mirroring the focused card's own `inclusionItems.flatMap` treatment in `PricingTiers.tsx`) when present; falls back to the flat `item.features` list when absent (old cart entries). Used for both Family primary AND Family add-on rows in both files. `QuoteProposalPreview.tsx` previously showed a flat features list for primaries only and nothing for add-ons — both now get the same structured presentation. No live catalog resolution anywhere in either file (snapshot only, per the Phase 8F safeguard). `.cz-os__service`/`.cz-os__addon`/`.cz-proposal__addon` gained `flex-wrap: wrap` so the (optional, often-empty) inclusions list drops onto its own full-width row only when it actually renders.
- `resources/css/modules/cost-builder.css`: new `.cz-package-builder__details-table-row--child`/`-child-label` (muted child rows in the priced table), `.cz-os__features`/`.cz-os__feature`/`--bundle`/`--child`, `.cz-proposal__feature--bundle`/`--child`, plus the `flex-wrap`/`flex: 1 1 100%` layout rules above. No existing rule's declarations changed.
- `scripts/package-builder-bundle-inclusion-parity-contract.ts` (new, `contract:package-builder-bundle-inclusion-parity`): Plan Details renders `.includes` children; `total` reduction unchanged + runtime proof a Bundle parent stays priced once regardless of child `line_total`; `FamilyTierQuoteItem`/`itemFor()` snapshot shape; both review/proposal define `FamilyInclusionsList`, use it for both primary and add-on rows (usage-count check), fall back to `features`; no raw Platform ID fields; runtime proof of the structured-snapshot-takes-precedence-over-features fallback rule.
- `dist/css/cost-builder.css`, `dist/js/cost-builder.js`, `package.json`: rebuilt/updated to match.

**Tests:** `tsc --noEmit` clean. `npm run build` clean. Full contract sweep (every registered `contract:*`): only `admin-station-css`, `package-builder-flow`, `platform-identity-schema` fail — the same three confirmed pre-existing/unrelated failures from every prior round, re-verified unchanged. `contract:package-builder-bundle-inclusion-parity`, `contract:request-flow-family-tier-parity`, `contract:package-family-request-flow`, `contract:package-builder-regression-lock`, `contract:cost-builder-isolation`, `contract:package-builder-customer-tabs`, `contract:quote-cart-addon`, `contract:tier-addon-flow` all pass.

Awaiting review before any push (local branch or main).
