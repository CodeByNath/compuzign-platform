# Upgrade journey — active correction track

## Status
- **AWAITING CLAUDE RESPONSE — remaining customer quote Leg-ID leak**
- Production remains `main@93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`, deploy `33945492532` live.
- Review head `2e49b8bf8406bf0650b8eb57ee00e054555afb71` is **NOT approved for push**.
- Auditor verdict: **Proceed with safeguards after one bounded projection fix**.

## What passed
Independent compare confirms the review branch is exactly 3 commits ahead of production and excludes `d3eb4dc0`. Generated-output hygiene is corrected: only the current `QuoteProposalPreview-DNBsfHLO.js` chunk remains. The new `commercialBreakdown` shape is now customer-safe: it contains no Rate Sheet row IDs or Commercial Leg `source`; section/row occurrence keys are presentation-only positions. Same-period/same-cadence components remain distinct and the snapshot keeps period, cadence, component price, inclusion label, quantity, unit price, line total and Bundle children.

## Remaining blocker
The customer quote JSON still leaks the Commercial Leg Platform ID through the **pre-existing** `legPaymentSummaries[].source` field.

Evidence:
- `LegPaymentSummary.source` remains the real component/Leg source (`CZTL`/`CZTEL` or legacy `default`).
- `RequestSchema::sanitizeLegPaymentSummaries()` persists `source` unchanged — this is correct for the durable Request/audit snapshot and MUST NOT be removed there.
- `RequestsController::getQuote()` -> `QuoteViewAccess::resolve()` returns stored `items` to the customer without a customer-safe item projection.

So removing `commercialBreakdown.source` alone does not satisfy the stated boundary that internal Leg IDs must not reach customer-facing quote JSON.

## Required bounded correction
1. **Preserve `legPaymentSummaries[].source` in the durable Request.** Identity/audit history must still answer which Commercial Legs composed the quote.
2. Add/reuse a customer quote-view projection at the `getQuote()` / `QuoteViewAccess` read boundary that strips only internal identifiers from the returned customer payload, including `legPaymentSummaries[].source`.
3. Do not mutate stored Request data and do not alter Admin Request/print access to the canonical stored identities.
4. Make customer View/Print rendering tolerate the projected summary shape without `source`; if a React key is needed, use local array position only for rendering, never persisted identity.
5. Keep all monetary/timing fields unchanged: billingCycle, price, startMonth, endMonth, isOngoing, occurrenceMonths, subtotal.
6. Do not strip business identities that are intentionally customer-visible/contractual unless existing policy already says so; this correction is specifically internal Commercial Leg/Rate Sheet plumbing.
7. Extend `quote-view-access-boundary.php` (or the exact customer projection contract) with a canonical stored item containing a real-looking `CZTL...` source and assert:
   - stored input remains unchanged;
   - customer result contains no `CZTL`/`CZTEL` source;
   - all payment summary commercial facts remain;
   - new `commercialBreakdown` also remains identifier-free.
8. Re-run focused PHP/TS contracts plus tsc/build. Keep unrelated pre-existing failures classified separately.

## Acceptance after correction
- Durable Request retains Leg identity for audit/history.
- Customer quote endpoint exposes no internal Commercial Leg/Rate Sheet identifiers.
- View/Print Quote still renders the same Monthly/Yearly/Total and period-level inclusion breakdown.
- No pricing, cart, identity allocation, persistence, email transport, recipient or idempotency behavior changes.

Return exact review SHA and set **AWAITING CHATGPT REVIEW**. Do not push source to `main` yet.