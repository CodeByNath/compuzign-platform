# Quote PDF + Cart Presentation Correction

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed**.
- Production base: `main@badb36641577a2c8e4fdd2581dc4391750ae62df`.
- Prior Tier Catalogue identity phase is CLOSED and must not be reopened.

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