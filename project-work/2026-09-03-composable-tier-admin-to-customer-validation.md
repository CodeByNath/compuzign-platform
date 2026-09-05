# Upgrade journey — active correction track

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed with safeguards — source/deploy verified; live gate still required**
- Production independently verified at `main@a42eeba88c96d2e5d0a57cd498b270afe1e9baa1`.
- GitHub Actions "Deploy to Hostinger" run `33964003314` / run #953 independently verified **completed / success** for that exact SHA (2026-09-05T11:41:21Z → 11:41:52Z).

## Push/deploy audit
GitHub `main` points to the reviewed customer-quote projection commit, parent `2e49b8bf8406bf0650b8eb57ee00e054555afb71`; no later source commit is on `main`. The Actions run head SHA exactly matches `main` and the reviewed commit message. The earlier full-SHA mismatch in coordination was a transcription error only; the reviewed short SHA `a42eeba8` and deployed commit are the same source state.

No further source change is authorized from this audit round.

## Live validation is required before closure
This phase changed customer-visible cart disclosure, Review/PDF, customer View/Print Quote, email rendering, and customer quote JSON projection. Source/tests/deployment alone cannot prove those surfaces agree in production.

Validate read-only with a fresh Starter Cloud multi-leg quote, and Main + Upgrade + Add-on where practical:
1. Cart disclosure: Month 11 Yearly → Static IP Block; Qty 2; Unit price $40; Line total $80; component subtotal $80/year.
2. Monthly and Yearly sections stay distinct; two same-period/same-cadence components do not visually collapse.
3. Review/PDF, Total Commitment and customer View/Print Quote show the same attribution and totals.
4. A real received customer email contains the same breakdown and delivery still succeeds.
5. Customer quote JSON contains no `CZTL`/`CZTEL` or Rate Sheet row/item identifiers from either `commercialBreakdown` or `legPaymentSummaries`.
6. Main → Upgrade → Add-on order, TCV, initial payments, quote identity, recipient/idempotency and legacy fallback remain unchanged.

If browser/mail access is unavailable, keep this file at **AWAITING LIVE VALIDATION**; that is an infrastructure limitation, not a source defect. Close only after the live customer behavior matches the reviewed source.