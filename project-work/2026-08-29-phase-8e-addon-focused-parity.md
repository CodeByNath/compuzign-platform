# Phase 8E / 8F — Add-on Parity → Quote Review/PDF Parity

## Status
- Phase 8E: `CLOSED` — live validation passed.
- Production: `main@b299563d264615d39b40a9a21e56e14edd0e1565`
- Phase 8F: `AWAITING CHATGPT REVIEW`
- Verdict: `Proceed with safeguards` — double-count edge case corrected
- Reviewed branch (superseded): `phase-8f-quote-review-pdf-parity@eba47dfd`
- Corrected candidate: `phase-8f-quote-review-pdf-parity@5b972870`, still based on `main@b299563d264615d39b40a9a21e56e14edd0e1565`.
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

## Claude Correction Report 2 — 2026-08-29 (`5b972870`, not pushed to main)

Same branch `phase-8f-quote-review-pdf-parity`, new commit `5b972870` on top of `eba47dfd`.

**Root cause confirmed:** the combined Family Contract Value block sums every primary Family item regardless of its own stream count (by design — a cart's Family TCV must include a single-stream primary too). Excluding only multi-stream items from general totals therefore still double-counted a single-stream primary once a *different* item triggered `hasMultiStreamItem`.

**Fix applied (both `OrderSummary.tsx` and `QuoteProposalPreview.tsx`):** switched from a stream-count filter to a population split, exactly as requested:
```
const itemsForGeneralTotals = hasMultiStreamItem
  ? items.filter((item) => !isFamilyTierQuoteItem(item))
  : items;
```
Once the Family contract block is active, general/legacy totals cover non-Family items only — every Family item (primary or add-on, any stream count) is already either inside the combined Family sum or shown on its own per-item row, never in both places. With no multi-stream item anywhere, general totals cover every item exactly as before Phase 8F (unchanged simple/old-cart behavior, satisfying point 4). Point 3 (an old Family primary with no `legPaymentSummaries` must not silently count as zero) was already correct in the prior round — `familyPrimaryTotalContractValues` maps missing streams to `null` and `allFamilyPrimariesFinite` requires every value non-null, so one un-costed primary already forces "Contract Value: Ongoing" rather than a fabricated finite figure; confirmed unchanged, no further edit needed there.

**New regression test** in `scripts/request-flow-family-tier-parity-contract.ts`: constructs a cart with one multi-stream Family primary (Upfront 200 + Monthly×12=1200), one single-stream Family primary (Monthly×12=960), and one legacy item ($50/mo). Replicates the exact `hasMultiStreamItem`/`itemsForGeneralTotals` logic (regex-verified to match the real source) against that cart and asserts: general totals population is exactly `[legacyItem]`, the resulting total is exactly `$50` (never `$50 + $80` headline), and the combined Family TCV is exactly `2360` (`200 + 1200 + 960`) — proving the single-stream primary's value is represented exactly once.

**Tests:** `tsc --noEmit` clean, `npm run build` clean. Full contract sweep: only the three confirmed pre-existing failures remain (`admin-station-css`, `package-builder-flow`, `platform-identity-schema`) — no new regressions.

Awaiting review of the actual `5b972870` diff before any `main` push.
