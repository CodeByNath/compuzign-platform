# Phase 8E / 8F — Add-on Parity → Quote Review/PDF Parity

## Status
- Phase 8E: `CLOSED` — live validation passed.
- Production: `main@b299563d264615d39b40a9a21e56e14edd0e1565`
- Phase 8F: `AWAITING CHATGPT REVIEW`
- Verdict: `Proceed with safeguards` — correction applied on review branch
- Reviewed candidate (superseded): `phase-8f-quote-review-pdf-parity@482929e2`
- Corrected candidate: `phase-8f-quote-review-pdf-parity@eba47dfd`, still based on `main@b299563d264615d39b40a9a21e56e14edd0e1565`.
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

## Claude Correction Report — 2026-08-29 (`eba47dfd`, not pushed to main)

Same branch `phase-8f-quote-review-pdf-parity`, new commit `eba47dfd` on top of the reviewed `482929e2`.

**Root cause confirmed:** both files rendered the Totals section as one `hasMultiStreamItem ? (Family block) : (general block)` ternary — mutually exclusive, so any multi-stream Family item made the general (legacy) block unreachable.

**Fix applied (both `OrderSummary.tsx` and `QuoteProposalPreview.tsx`):**
1. New `itemsForGeneralTotals = items.filter((item) => !isFamilyTierQuoteItem(item) || (item.legPaymentSummaries?.length ?? 0) <= 1)` — excludes *only* a Family item with >1 stream; every legacy item and every single-/no-stream Family item stays included. `totals = calcQuoteTotals(itemsForGeneralTotals)` (was `calcQuoteTotals(items)`).
2. The Family Contract Value/Initial Payment block (gated on `hasMultiStreamItem`) and the general block (gated on `itemsForGeneralTotals.length > 0`) now render as **independent siblings**, not branches of one ternary — both can show at once in a mixed cart.
3. `QuoteProposalPreview.tsx`'s general single-cycle row drops its `--primary` (largest) sizing when the Family block is also showing, so the printed document has one clear headline figure instead of two competing ones; unchanged when it's the only block.
4. Family add-ons still never enter the combined primary TCV/Initial Payment sum — untouched from the prior round.

**Contracts:**
- `scripts/request-flow-family-tier-parity-contract.ts`: added the requested mixed-cart structural guard — asserts the exclusion-filter regex, `itemsForGeneralTotals.length > 0` as the general block's own gate, and that neither file contains a `hasMultiStreamItem ? (` single-ternary shape.
- `scripts/cost-builder-isolation-contract.ts`: its shared-calculation check matched the literal `calcQuoteTotals(items)` call; loosened to `calcQuoteTotals(` since the call now legitimately takes the filtered subset per this correction — the invariant it protects (still the shared helper, not a local reimplementation) is unchanged. This was the one incidental contract touched; flagging it explicitly rather than silently editing a locked assertion.

**Tests:** `tsc --noEmit` clean, `npm run build` clean. Full contract sweep re-run: only the three confirmed pre-existing failures remain (`admin-station-css`, `package-builder-flow`, `platform-identity-schema`) — no new regressions from this correction.

Awaiting review of the actual `eba47dfd` diff before any `main` push.
