# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **READY FOR CLAUDE — execute the isolated Admin Print follow-up now on the existing review branch.**
- Production base: `main@96d5593799af4336c071f462aef445baf5872836`.
- Audited review head: `review/crm-1c-request-actions@215d85a2`, exactly **2 commits ahead / 0 behind** production.
- Source push to `main`: **NOT APPROVED**.
- Auditor verdict: **Proceed with safeguards**.

## Accepted work
Approve/Cancel remains accepted from `7c9a0fee`:
- authenticated `PATCH /admin/requests/{ref}/status`, targets only `approved|cancelled`;
- 404 unknown ref, 409 invalid/opposite terminal transition;
- response is existing allow-listed Request detail only;
- `RequestRepository::updateStatus()` uses conditional `update_post_meta(..., $observed)` CAS semantics, preserving same-target idempotency, legacy raw `new`, and first-terminal-writer wins;
- Request footer uses shared `SupportedActionFooter`; successful mutation refreshes drawer + originating Requests wall/summary.

`215d85a2` payment-summary extraction is also accepted. `LegPaymentSummary`, `computeTotalContractValue`, `startingPaymentsByCycle`, and `chargeTypeLabel` are now in neutral `utils/paymentSummary.ts`; downstream callers were redirected without formula/label changes and parity/downstream contracts passed. Do not reopen this extraction absent evidence.

## Print boundary decision
Do **not** globally enqueue the public atomic-engine design-system chain into wp-admin and do not copy proposal CSS/token values into Admin Station.

The remaining path to test is isolated printing: the Request drawer may render the existing `QuoteProposalPreview` from the durable Request snapshot, but the print operation must use an isolated print window/document (or equivalent isolated document boundary) that loads only stable code-owned stylesheet assets needed by the existing proposal presentation. Those frontend styles must not become global wp-admin styles.

## Claude next action — execute now
1. Inspect existing asset URL/loading helpers and identify the smallest stable stylesheet set needed by `QuoteProposalPreview` inside an isolated print document.
2. If feasible, implement **Print / Save PDF** for all Request statuses using only durable `RequestEntry` snapshot fields and existing `QuoteProposalPreview` presentation. No secret, transient lookup, catalog/API re-resolution, duplicated JSX/totals/CSS, or global Admin frontend-style enqueue.
3. Pending footer: Approve + Cancel + Print. Approved/cancelled: Print + Close only.
4. Add contracts proving immutable-snapshot-only print, isolated stylesheet loading, no customer secret/catalog access, and no global Admin stylesheet contamination.
5. If this still requires a new broad asset/public-route architecture, stop and report exact evidence; do not improvise a second renderer.
6. Push the review branch only, record exact SHA/files/tests, set **AWAITING CHATGPT REVIEW**, then stop.

Cycle check: no newer review commit than `215d85a2` was present when this instruction was refreshed. Claude should act on this status immediately.
