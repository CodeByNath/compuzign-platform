# Upgrade journey — active correction track

## Status
- **AWAITING CHATGPT REVIEW**
- Production remains `main@93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`, deploy `33945492532` live.
- Review head `a42eeba8` on `review/upgrade-journey-finalisation` is **NOT approved for push**.

## Claude's report

### Remaining blocker fixed: legPaymentSummaries[].source no longer reaches the customer
Per the required bounded correction:

1. **Durable Request unchanged.** `RequestSchema::sanitizeLegPaymentSummaries()` was not touched — `source` still persists there, so admin print and email (both reading the stored Request directly) keep full Leg identity for audit/history.
2. **New projection at the read boundary.** `QuoteViewAccess::resolve()` now runs the resolved `items` through a new private `projectItemsForCustomer()` before returning — an allow-list (`billingCycle`, `price`, `startMonth`, `endMonth`, `isOngoing`, `occurrenceMonths`, `subtotal`) applied to each item's own `legPaymentSummaries` entries, dropping `source`. It operates on a copy (`array_map`, no by-reference mutation) — the stored payload the caller passed in is never touched.
3. **No mutation of stored data / admin access.** Confirmed by an explicit test assertion (`$legSummaryPayload === $legSummaryPayloadBeforeCall` after the call).
4. **Rendering tolerates the projected shape.** `QuoteProposalPreview.tsx`/`OrderSummary.tsx` (the only components `QuoteViewApp.tsx` — the customer View/Print Quote page — renders through) had six `key={stream.source}` React keys; all now use array position. `QuoteSummary.tsx`/`QuoteDetailsOverlay.tsx`/`PlanDetailsModal.tsx`/`FamilyTierAdapter.tsx` were left untouched — all four render only live, not-yet-submitted cart state, never the stored/returned customer quote JSON this finding is about.
5. All seven other payment facts remain, unmodified.
6. No business-visible identity was touched — only the Leg/Rate Sheet plumbing `source` field.
7. **Test added**, `quote-view-access-boundary.php`: a canonical item with real-looking `CZTL-0000123`/`CZTEL-0000456` sources — asserts stored input never mutated, `json_encode()` of the customer result contains neither identifier anywhere, and every other payment fact survives unchanged. `commercialBreakdown` already needs no projection (identifier-free since last round).
8. Full validation re-run (below).

## Validation
- `tests/*.php` full suite: same 5 pre-existing unrelated failures, plus the still-expected reappearance of the admin/customer email-label regression in `notification-templates-composable-quote-parity.php` (`d3eb4dc0` remains deliberately excluded from this review head).
- 85-script `contract:*`/`regression:*` sweep: same 7 pre-existing unrelated failures (unchanged from prior rounds).
- `tsc --noEmit` clean, `vite build` clean.
- Generated-output hygiene maintained: last round's `QuoteProposalPreview-DNBsfHLO.js` (now superseded by this round's rebuild) removed; only `QuoteProposalPreview-B14mh0ba.js` remains.

## Not independently verifiable without a live browser/real mail client
Same disclosure as prior rounds — visual rendering, email-client display, and PDF pagination remain unverified beyond fixture/DOM-string/JSON-string assertions.

Review the exact SHA `a42eeba8` on `review/upgrade-journey-finalisation` (parents `2e49b8bf` → `8eb2467b` → `fcd5e0f6` → `main@93ac03ec`) against the required correction and acceptance criteria above.
