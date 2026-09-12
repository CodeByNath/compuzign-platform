# Cart Initial Payment Parity

## Status
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `8271bb0259c199724979ecc4c1d0647454df3c91`.
- Rejected-as-incomplete candidate: `1554cb81ae7162bd2a4684b6d108bbf2b5e72eb2` (tree `3ea3e54612bb368af738f885d0d11c14be5740c1`).
- Review branch: `feat/cart-initial-payment-parity`.

## Audit result
Claude correctly fixed the Cart defect itself. The change from `> 1` stream to `> 0` quoted payment streams is the right trigger, and the new mounted parity regression proves the live KAIROS case:

`$675 primary + $55 Upgrade + $580 add-on = $1,310 Initial Payment`.

`startingPaymentsByCycle()` remains the shared authority; `calcQuoteTotals()` is untouched for legacy/no-summary carts.

## Blocking consistency defect
The exact same obsolete `> 1` gate still exists in three downstream customer surfaces:

- `resources/ts/components/request-flow/OrderSummary.tsx`
- `resources/ts/components/request-flow/QuoteProposalPreview.tsx` (proposal/PDF)
- `src/Modules/Requests/Notifications/NotificationTemplates.php` (customer/admin email totals block)

Independent source inspection confirms all three use `hasMultiStreamItem` to decide both the Family stream-aware totals block and which items enter legacy/general totals. If Cart alone ships, this same quote becomes **$1,310 in Cart/Total Commitment but $1,255 + custom pricing downstream**.

That violates the established quote-surface parity requirement. This is the same defect, not a new feature, so it belongs in this work item.

## Required correction
Apply the same semantic trigger on all four customer quote surfaces:

> Family stream-aware presentation is active when any Family Tier quote item carries one or more authoritative `legPaymentSummaries`, not only when an item carries multiple streams.

Keep each surface's existing populations unchanged:
- Initial Payment: primary + composable Upgrade + add-ons;
- TCV/Contract Value: whatever that surface already treats as its established finite-contract population;
- legacy/general totals: only the existing compatibility population once Family stream-aware mode is active.

## Must preserve
`startingPaymentsByCycle()` and `computeTotalContractValue()`; Total Commitment behavior; finite/ongoing handling; exact quote snapshots; legacy/Cost Builder behavior when summaries are absent; existing email/admin identity handling; no pricing/resolver changes.

## Must not substitute
Do not force composable flat `price`; do not duplicate payment math; do not omit Upgrade/add-ons; do not make each surface invent a different trigger; do not broaden into unrelated quote/PDF/email redesign.

## Claude — correction
Rebuild the review branch as one clean candidate from current `main`. Keep the accepted Cart change and apply the same `> 0 summaries` trigger to OrderSummary, QuoteProposalPreview and NotificationTemplates.

Extend regression/contract evidence so the same three-line KAIROS quote resolves `$1,310` on Cart, Total Commitment, Review & Finalise, proposal/PDF and email totals. Include a true no-summary legacy case proving the old flat path remains.

Run focused cart/request-flow/PDF/email contracts plus TypeScript/build/docs and relevant PHP syntax/tests. Record exact SHA/tree/files/evidence here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.
