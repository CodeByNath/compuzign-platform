# Quote PDF + Cart Presentation Correction

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed**.
- Production base: `main@badb36641577a2c8e4fdd2581dc4391750ae62df`.
- Prior Tier Catalogue identity phase is CLOSED and must not be reopened.
- Review branch: `review/quote-pdf-cart-presentation-correction@ca803bb3`, one clean commit ahead of production, pushed to origin.

## Implementation report (Claude, 2026-09-06)

1. **PDF marker semantics.** `resources/css/modules/cost-builder.css`: added the missing `.cz-proposal__feature--note::before { content: ''; }` and `.cz-proposal__feature--total::before { content: ''; }` overrides — `--group`/`--bundle` already had this override, `--note`/`--total` did not, which was the exact root cause (period headings/bundle parents were already correct; payment-cycle facts and component totals were the two modifier classes still inheriting the base `::before { content: '✓'; }`). No TS change was needed for this defect — `QuoteProposalPreview.tsx`'s own row→class mapping was already correct; this was purely a CSS gap. The base `.cz-proposal__feature::before` ✓ is untouched, so real inclusion rows are unaffected.
2. **Cart indentation.** `resources/ts/components/cost-builder/InclusionDisclosure.tsx`: added an explicit `isChild: boolean` field to `DisclosureInclusionRow`, threaded through `breakdownInclusionRows()` (true only for a Bundle's own nested `includes` row) and both legacy fallback branches (`inclusionItems`, bare `features`). `InclusionDisclosurePanel`'s row rendering now applies `cz-inclusion-disclosure__label--section` (row has a `sectionKey`, i.e. belongs to an additional Commercial Leg group) and/or `cz-inclusion-disclosure__label--child` (row is a Bundle child) to the label `<td>` only — never the Qty/Unit price/Line total cells, so those three columns stay aligned across every row regardless of indentation.
3. **Stacking, not collapsing.** `cost-builder.css` gives `--section` and `--child` each their own `padding-left`, plus a compound `td.cz-inclusion-disclosure__label--section.cz-inclusion-disclosure__label--child` rule at higher specificity (wins regardless of source order) using a strictly greater indent — so a Bundle child inside an additional Leg group gets both levels stacked, matching instruction item 4's "do not collapse child vs section hierarchy" exactly.
4. **Untouched, confirmed by diff scope:** `cartBreakdown`/`commercialBreakdown` derivation, Commercial Leg identity, quantities/unit prices/line totals/section subtotals, TCV, Initial Payment, quote ordering, customer Upgrade Your Build flow, Request/PDF data shape, persistence, and `QuoteSummary.tsx`/`QuoteProposalPreview.tsx` (neither file's own source changed — `QuoteProposalPreview`'s bundled chunk hash changed only because it imports the edited `InclusionDisclosure.tsx` module).

### Files changed (8)
`resources/css/modules/cost-builder.css`, `resources/ts/components/cost-builder/InclusionDisclosure.tsx`, `package.json` (new contract script entry), `scripts/quote-pdf-cart-presentation-correction-contract.ts` (new), `dist/css/cost-builder.css`, `dist/js/cost-builder.js`, `dist/js/admin-station.js` (one shared-chunk import-path line, from the required rebuild), `dist/js/QuoteProposalPreview-B7JqqAnI.js` (new hashed build output for the same, source-unchanged file).

### Tests
- New `scripts/quote-pdf-cart-presentation-correction-contract.ts` (`npm run contract:quote-pdf-cart-presentation-correction`): PASS — CSS source-scan proves the base `::before` ✓ is untouched and all four semantic modifiers (`--bundle`/`--group`/`--note`/`--total`) clear it; real execution of `disclosureRowsForFamilyTierItem()`/`breakdownInclusionRows()` against a fixture with a base row, an additional-Leg extension group, and a Bundle child inside that group proves `sectionKey`/`isChild` are independent and both set correctly (including through the legacy `inclusionItems` fallback); source-scan of `InclusionDisclosurePanel`'s row JSX proves the indent classes land on the label cell only, never Qty/Unit price/Line total; CSS source-scan proves the compound section+child rule exists and uses a strictly greater indent than either level alone.
- `npm run contract:composable-quote-cart`, `contract:quote-inclusion-quantity-parity`, `contract:quote-proposal-total-typography`, `contract:plan-details-value-states`: PASS (unaffected by the `isChild` field addition).
- `npm run regression:composable-quote-cart-loop`: PASS (real DOM/preact interaction regression, unaffected).
- `npx tsc --noEmit`: clean.
- `npm run docs:check`: PASS (118 Markdown files, 47 Code Maps).
- `npm run build`: clean; only `cost-builder.css`/`cost-builder.js`/`admin-station.js` (one import path)/one new hashed `QuoteProposalPreview-*.js` chunk changed, as expected for a presentation-only edit to a shared module.

SHA: `ca803bb3` on `review/quote-pdf-cart-presentation-correction`, pushed to origin. Awaiting review before any push to `main`.

## User-reported live defects
1. **PDF / printable quote:** payment-cycle facts and totals are rendering with the same ✓ marker as inclusions. The screenshot shows rows such as `Recurring payment`, `Monthly payment`, `Annual payment`, `Active payments`, `Monthly total`, and `Annual total` with ✓. This is wrong. ✓ is strictly for actual inclusion rows only.
2. **Cart inclusion disclosure:** the second/additional Commercial Leg inclusion group is visually misaligned. The group heading is correct, but its inclusion rows need proper structural indentation while keeping Qty / Unit price / Line total aligned with the main inclusion columns.

## Authoritative source already traced
- `resources/ts/components/request-flow/QuoteProposalPreview.tsx`
  - `FamilyInclusionsList()` maps shared `periodBreakdownRowsForFamilyTierItem()` rows into `cz-proposal__feature` list items.
  - period headings, payment facts, component notes/table labels, and component totals already have distinct modifier classes; actual inclusions fall through to the normal inclusion row.
- `resources/ts/components/cost-builder/InclusionDisclosure.tsx`
  - `disclosureRowsForFamilyTierItem()` derives the compact cart shape from captured `cartBreakdown`.
  - additional-leg groups already carry `sectionKey`, `sectionLabel`, and authoritative section subtotal; do not change commercial data derivation.
- `resources/ts/components/cost-builder/QuoteSummary.tsx`
  - only hosts the disclosure panel; do not alter quote ordering, totals, resolver, or pricing logic.

## Exact implementation instruction
From a clean review branch based on current production:
1. **PDF marker semantics:** change presentation so only actual inclusion rows receive the ✓ marker. Period headings, payment/cycle facts, component notes, table labels, and component totals must start without a checkmark. Preserve their existing text, values, ordering, hierarchy, and commercial calculations.
2. Prefer fixing this through the existing semantic modifier classes / presentation CSS rather than duplicating row derivation or changing `periodBreakdownRowsForFamilyTierItem()` semantics.
3. **Cart indentation:** in `InclusionDisclosurePanel`, keep additional Commercial Leg group headings as section parents and indent the inclusion label content beneath them consistently. Preserve table-column alignment: Qty, Unit price, and Line total must stay aligned with the base inclusion rows. Do not offset the numeric columns with the label indentation.
4. Bundle-child indentation must continue to work; do not collapse child vs section hierarchy.
5. No change to `cartBreakdown`, `commercialBreakdown`, Commercial Leg identity, quantities, unit prices, line totals, section subtotals, TCV, Initial Payment, quote ordering, customer Upgrade Your Build flow, Request/PDF data shape, or persistence.
6. Keep this presentation-only. Generated CSS/JS may change only as required by the normal build.

## Validation required
Add/update a focused contract proving:
- PDF semantic non-inclusion rows cannot receive the inclusion ✓ marker;
- real inclusion rows still do;
- additional-leg cart rows retain the same numeric columns and receive nested label indentation beneath the section heading.

Run the focused relevant contracts plus `npx tsc --noEmit` and build if generated assets are source-tracked for these files. Report exact changed files, tests, review branch, and SHA; set **AWAITING CHATGPT REVIEW**. Do not push `main` before audit.