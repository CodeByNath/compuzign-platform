# Cart Initial Payment Parity

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `8271bb0259c199724979ecc4c1d0647454df3c91`.
- Approved candidate: `36ba345d920fff59adcd38bafc85d91e2bc3dbc6`.
- Candidate tree: `0e69543dd3afba44ca1436bd196efa9f00e99e95`.
- Review branch: `feat/cart-initial-payment-parity`.

## Accepted fix
The candidate makes the exact correction requested and nothing architectural:

- old trigger: stream-aware totals only when a Family item has more than one payment stream;
- corrected trigger: stream-aware totals whenever a Family item has one or more authoritative `legPaymentSummaries`.

The same semantic trigger now applies in:
- Cart (`QuoteSummary.tsx`)
- Review & Finalise (`OrderSummary.tsx`)
- proposal/PDF/Quote View (`QuoteProposalPreview.tsx`)
- admin/customer email (`NotificationTemplates.php`)

`QuoteDetailsOverlay.tsx` remains untouched because Total Commitment was already correct.

## Audit evidence
Actual diff is one clean commit directly on production `main`. The four presentation gates are changed consistently from `> 1` to `> 0`; existing payment helpers, populations, `calcQuoteTotals()`, quote snapshots, pricing/resolvers and ongoing/Until Cancelled behavior are not rewritten.

The live KAIROS fixture is covered as:
`$675 primary + $55 Upgrade + $580 add-on = $1,310 Initial Payment`.

Claude's mounted regression reads the real Cart, Total Commitment, Review & Finalise and proposal surfaces independently and reports `$1,310` on all. PHP coverage proves the same for admin/customer email and preserves the no-summary legacy flat path. The previously weak cross-surface scraper was also corrected so each surface is read from its own fresh container.

Pre-existing failures reported by Claude were independently separated from this candidate and are not caused by this diff; they do not alter this approval.

## Must preserve after push
No composable flat-price patch; no new calculator; no Family/Tier special cases; Initial Payment stays primary + composable + add-ons; each surface's existing Contract Value population stays unchanged; true no-summary quotes keep the legacy flat path.

## Next action
Push **exact candidate `36ba345d920fff59adcd38bafc85d91e2bc3dbc6` unchanged** to `main`. Record resulting `main` SHA and deployment evidence here, set **AWAITING LIVE VALIDATION**, remove the review branch once merged per branch hygiene, and stop. Do not amend or rebuild the approved source candidate before push.
