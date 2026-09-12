# Cart Initial Payment Parity

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `8271bb0259c199724979ecc4c1d0647454df3c91`.
- Previous candidate `1554cb81ae7162bd2a4684b6d108bbf2b5e72eb2` proved the Cart fix but is incomplete across downstream quote surfaces.
- Review branch: `feat/cart-initial-payment-parity`.

## Exact fix
Do not redesign totals. The calculations are already correct.

The defect is only the duplicated trigger:
- wrong: stream-aware totals activate only when a Family item has `legPaymentSummaries.length > 1`;
- correct: activate when a Family item has `legPaymentSummaries.length > 0`.

One resolved stream is authoritative just like multiple streams.

Live case: `$675` primary + `$55` Upgrade + `$580` add-on = **$1,310 Initial Payment**. When a multi-stream OMNIA item is present, Cart and Total Commitment already agree, which confirms the helper math is not the problem.

Apply the same trigger only in:
- `QuoteSummary.tsx`
- `OrderSummary.tsx`
- `QuoteProposalPreview.tsx`
- `NotificationTemplates.php`

`QuoteDetailsOverlay.tsx` is already correct; leave it alone.

## Preserve
Keep `startingPaymentsByCycle()` / `computeTotalContractValue()` unchanged; keep Initial Payment population as primary + composable + add-ons; keep each surface's existing Contract Value population; keep legacy flat fallback only when no summaries exist; keep ongoing/Until Cancelled behavior and quote snapshots unchanged.

## Do not substitute
No composable flat-price patch, new calculator, duplicated math, Family/Tier special cases, or broader quote redesign.

## Claude
Rebuild one clean candidate from current `main`. Make this same `> 0` trigger correction across the four duplicated surfaces and nothing broader. Regression must prove `$1,310` on Cart, Total Commitment, Review & Finalise, proposal/PDF and email, plus a no-summary legacy case retaining the flat path. Record SHA/tree/files/evidence, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.
