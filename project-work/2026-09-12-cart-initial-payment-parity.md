# Cart Initial Payment Parity

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `8271bb0259c199724979ecc4c1d0647454df3c91`.

## Live defect
Nath supplied live screenshots for KAIROS with three quoted Family lines:
- Business Pro: Monthly `$675`
- Upgrades: Monthly `$55`
- Backup & DR Shield: Monthly `$580`

The Cart footer shows **Est. monthly total $1,255 + 1 item at custom pricing**.
The Total Commitment overlay shows **Initial Payment $1,310**.

`$675 + $55 + $580 = $1,310`, so the overlay is correct and the Cart is dropping the Upgrade's `$55` from its starting-payment total.

## Source finding
`QuoteDetailsOverlay.tsx` correctly derives Initial Payment with `startingPaymentsByCycle()` across every quoted Family Tier item's `legPaymentSummaries` (primary + composable Upgrade + add-ons).

`QuoteSummary.tsx` also computes the same `startingPayments`, but only exposes that authoritative Initial Payment branch when `hasMultiStreamItem` is true. If every quoted item has exactly one stream, it falls back to legacy `calcQuoteTotals()` using each item's flat `price/billingCycle`. The composable Upgrade can therefore be classified as custom/unpriced even though its quoted `legPaymentSummaries` correctly carry `$55 Monthly`.

The defect is the **branch trigger**, not the payment-summary helper.

## Required correction
For Package Builder Family Tier quote items, the presence of authoritative `legPaymentSummaries` must be enough to drive the Cart's stream-aware totals/Initial Payment presentation, even when each item has only one stream.

For the live example, Cart and Total Commitment must both resolve Initial Payment to **$1,310**.

Do not globally rewrite `calcQuoteTotals()`; Cost Builder and legacy flat quote items still need that compatibility path.

## Must preserve
- `startingPaymentsByCycle()` as the shared payment-start authority;
- complete Family population: primary + composable Upgrade + add-ons, each once;
- existing Total Commitment behavior;
- finite/ongoing TCV behavior and `Until Cancelled` fallback;
- legacy/Cost Builder flat quote handling when no `legPaymentSummaries` exist;
- per-item stream rows and exact quoted snapshot identity;
- no Family/Tier hardcoding.

## Must remove
The assumption that stream-aware Cart totals are needed only when **one item has multiple streams**.

## Must not substitute
Do not omit Upgrade/Add-on lines, force composable flat prices into `calcQuoteTotals()`, duplicate starting-payment math, or change pricing/resolver data to solve this presentation defect.

## Claude
Audit `QuoteSummary.tsx`, `QuoteDetailsOverlay.tsx`, `utils/paymentSummary.ts`, `utils/quote.ts`, relevant cart/quote regressions and Code Maps. Make the smallest correction so Cart totals use the authoritative quoted payment summaries whenever Family Tier items carry them, while true legacy/no-summary items retain the existing flat fallback.

Add regression coverage for three single-stream Family items (primary `$675`, Upgrade `$55`, add-on `$580`) proving Cart Initial Payment equals `$1,310` and matches Total Commitment; also cover a mixed legacy/no-summary case so compatibility is explicit.

Create one clean review branch from current `main`, run focused cart/quote regressions + TypeScript/build/docs, record exact SHA/tree/files/evidence here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.
