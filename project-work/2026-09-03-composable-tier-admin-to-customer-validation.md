# Upgrade journey — active correction track

## Status
- **SOURCE PUSH APPROVED — reviewed `a42eeba82e86397cf6a722c4780578055443f371`**
- Auditor verdict: **Proceed with safeguards**
- Production before this push remains `main@93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`, deploy `33945492532` live.

## Independent review
The review head is exactly 4 commits ahead of production, merge-base `93ac03ec`, with the unrelated `d3eb4dc0` email-label correction excluded.

Accepted architecture:
- `commercialBreakdown` is captured once from the exact resolved `CommercialLegPeriod[]` at quote creation for primary/Edition/add-on and Upgrade.
- It preserves period/component occurrence, cadence, component price, inclusion label, quantity, unit price, line total and Bundle children without Rate Sheet/Leg identifiers.
- Same-period/same-cadence components remain distinct through positional presentation keys and neutral charge disambiguation.
- Existing `legPaymentSummaries` remains the compact payment/TCV snapshot and keeps `source` in stored/admin data for audit identity.
- `QuoteViewAccess::resolve()` now projects customer quote items and removes only `legPaymentSummaries[].source`, preserving billingCycle, price, start/end, ongoing state, occurrence months and subtotal. Projection operates on a copy; canonical stored data is unchanged.
- Customer render keys in stored quote View/Print no longer require `source`.
- Generated-output hygiene is clean: current referenced `QuoteProposalPreview-B14mh0ba.js` only.

Validation evidence reported: focused PHP snapshot/quote-view/email fixtures, TS commercial-breakdown contracts, `tsc --noEmit`, Vite build; repository-wide failures remain the same pre-existing unrelated set. The known admin/customer email-label regression remains deliberately outside this approved head and must not be silently mixed into this push.

## Approved source action
Claude may push **only** `a42eeba82e86397cf6a722c4780578055443f371` (the reviewed 4-commit chain from `93ac03ec`) to `main`, deploy it, then record:
- exact resulting `main` SHA;
- GitHub Actions/deploy run and result;
- status **AWAITING LIVE VALIDATION**.

No additional source changes in that push.

## Required live gate after deploy
Validate read-only with a fresh quote containing the Starter Cloud multi-leg shape and, where practical, Main + Upgrade + Add-on:
1. Cart disclosure shows Month 11 Yearly -> Static IP Block, Qty 2, Unit price $40, Line total $80, subtotal $80/year.
2. Monthly and Yearly sections remain distinct; same-period/same-cadence components do not collapse.
3. Review/PDF, customer View/Print Quote and Total Commitment show the same attribution.
4. Received customer email shows the same breakdown and remains deliverable.
5. Customer quote JSON contains no `CZTL`/`CZTEL` or Rate Sheet row/item identifiers from `commercialBreakdown` or `legPaymentSummaries`.
6. Main -> Upgrade -> Add-on order, TCV, initial payments, identity, recipient/idempotency and legacy quote fallback remain unchanged.

Do not close until deployment and live customer behavior agree with the reviewed source.