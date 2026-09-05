# Upgrade journey — active correction track

## Status
- **CLOSED — production and live customer validation accepted.**
- Auditor verdict: **Proceed**.
- Production: `main@28f716b1bde85717787418e29efbbf8dce978d3c`.
- Deploy run `33981064376` / #955 succeeded for that exact SHA.
- `review/upgrade-journey-finalisation` was deleted after merge.

## Accepted production contract
- Starting finite customer range uses `Through Month N`.
- Starting/open and later open-end customer wording uses exact **Until Cancelled**; no customer-facing `Ongoing`/`Canceled` remains in this flow.
- Later finite ranges retain normal `Month X–Y` grammar.
- Fully finite Total Contract Value remains numeric.
- Any non-finite contributing stream uses **Until Cancelled** as the Contract Value fallback; Initial Payment remains numeric.
- Cart and visible finalise-quote sidebar use compact base-inclusions-once + Extension-group disclosure.
- Detailed `QuoteProposalPreview` remains the Period-by-Period model for Review/PDF/customer View-Print; PHP email mirrors the same detailed customer wording.
- Quote-time commercial snapshots, TCV/payment authority, customer-safe identifier projection, Main → Upgrade → Add-on ordering, Bundle totals, identity, persistence, resolver behavior, mail transport/idempotency and legacy fallback remain unchanged.

## Final live gate
Nath completed the production browser validation after deploy and reported **passed**. This satisfies the remaining live gate for the customer wording, compact finalise sidebar, detailed print/PDF/View-Print behavior and quoted-value preservation.

This work item is closed and immutable. Later Platform Identification work or UI refinement must use a separate work item.