# Phase 8E / 8F — Add-on Parity → Quote Review/PDF Parity

## Status
- Phase 8E: `CLOSED` — live validation passed.
- Production: `main@b299563d264615d39b40a9a21e56e14edd0e1565`
- Phase 8F: `READY FOR CLAUDE`
- Verdict: `Proceed with safeguards — CORRECTION REQUIRED`
- Reviewed candidate: `phase-8f-quote-review-pdf-parity@482929e2d22d6913c05af139314f68bc83899547`
- Candidate is exactly 1 commit ahead / 0 behind production.
- Source push: `NOT APPROVED`.

## What Passed Review
Actual diff confirms:
- optional selection-time `tierEditionTitle` snapshot added/populated correctly;
- request-flow does not resolve Edition display from live catalog data;
- raw CZ Platform IDs removed from visible review/PDF text;
- Family primary/add-on rows use `legPaymentSummaries`, charge labels and finite per-item Total with old-cart fallback;
- `.cz-proposal` root and existing print/PDF mechanism remain untouched;
- no RequestSchema/storage/routing/email/admin/pricing-resolver change.

## Blocking Finding — Mixed Cart Totals
Both `OrderSummary.tsx` and `QuoteProposalPreview.tsx` currently branch the **entire totals section** on `hasMultiStreamItem`.

If any Family item has >1 stream, the existing `calcQuoteTotals()` display is completely suppressed and replaced by Family-only TCV/Initial Payment. That means a mixed cart containing legacy/simple QuoteItems plus a multi-stream Family plan visually loses the legacy/service totals from the review and PDF.

This contradicts the approved safeguard: legacy/simple QuoteItem behavior must remain represented, and the Family contract summary must sit **alongside, not replace**, legacy totals.

The source calculations are still present, but their customer-visible totals become unreachable in this valid mixed-cart state. Do not push this candidate.

## Claude Correction
Make the narrowest correction on the same review branch:
1. Preserve the existing legacy/simple totals block for the legacy populations (`mainItems`, `bundleItems`, `tierAddonItems`) even when Family multi-stream items exist.
2. Keep Family multi-stream contract presentation as a separate block: primary-only **Total Contract Value / Contract Value: Ongoing** plus **Initial Payment**.
3. Do not double-count Family headline `price` values inside the legacy totals when a Family commercial block is shown. Derive the legacy totals from the non-Family items only (or an equivalent existing helper-compatible subset), rather than using `calcQuoteTotals(items)` for that displayed legacy block.
4. Family add-ons remain excluded from combined primary TCV/Initial Payment exactly as already implemented.
5. Preserve all other accepted candidate behavior and non-change boundaries.
6. Extend the focused contract with a mixed-cart case/structural assertion proving legacy totals remain visible beside the Family contract block and Family headline values are not double-counted.

Report the revised branch SHA + diff/tests here, set `AWAITING CHATGPT REVIEW`, and stop. No `main` push.
