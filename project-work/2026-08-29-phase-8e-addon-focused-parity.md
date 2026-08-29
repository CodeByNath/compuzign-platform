# Phase 8E / 8F — Add-on Parity → Quote Review/PDF Parity

## Status
- Phase 8E: `CLOSED` — live validation passed.
- Production: `main@b299563d264615d39b40a9a21e56e14edd0e1565`
- Phase 8F: `READY FOR CLAUDE`
- Verdict: `Proceed with safeguards — ONE REMAINING TOTALS CORRECTION`
- Reviewed branch: `phase-8f-quote-review-pdf-parity@eba47dfd7a12a08a5ea7a9a8ccbf5b92017eb95f`
- Source push: `NOT APPROVED`.

## Accepted So Far
The reviewed branch is clean on the intended presentation work:
- selection-time `tierEditionTitle` snapshot;
- no live catalog label resolution in request-flow;
- no visible raw CZ Platform IDs;
- Family rows use `legPaymentSummaries` with per-item finite Total and old-cart fallback;
- `.cz-proposal` print root preserved;
- no request/email/storage/PDF/routing/admin/pricing-resolver changes.

The previous mixed-cart blocker is partly fixed: legacy/general totals and Family contract totals now render independently.

## Remaining Blocking Edge Case
`itemsForGeneralTotals` currently keeps Family items with 0/1 stream:
`!isFamilyTierQuoteItem(item) || legPaymentSummaries.length <= 1`.

But the Family **Total Contract Value** block still sums **all primary Family items** that have any `legPaymentSummaries`, including single-stream Family primaries.

Therefore a valid cart containing:
- one multi-stream Family primary (which activates the Family contract block), and
- another single-stream Family primary

can show the single-stream Family primary twice: once inside combined Family TCV and again inside `calcQuoteTotals(itemsForGeneralTotals)`.

This is the same double-count class the previous correction was intended to eliminate.

## Claude Correction
Use explicit populations rather than stream-count overlap:
1. When the Family contract block is active, the **general/legacy totals block must contain non-Family items only**. Never include any `FamilyTierQuoteItem` that is already represented by the Family contract summary.
2. Keep combined Family TCV/Initial Payment primary-only, using all Family primaries exactly as the corrected cart does.
3. If an old Family primary has no `legPaymentSummaries`, do not silently count it as zero. Preserve the existing conservative result: combined Family Contract Value becomes `Ongoing/unknown` rather than fabricating a finite TCV. Its row-level flat price/cycle fallback remains visible.
4. If there is no multi-stream Family item, preserve today's general totals behavior for simple/old carts.
5. Add regression coverage for: multi-stream Family + single-stream Family + legacy item, proving the single-stream Family headline is not present in general totals and the legacy item still is.
6. Preserve all other accepted behavior and boundaries.

Update this same file with revised SHA/tests, set `AWAITING CHATGPT REVIEW`, and stop before `main` push.
