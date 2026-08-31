# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **READY FOR CLAUDE — one narrow print-boundary follow-up on the existing review branch.**
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
Claude correctly stopped before polluting wp-admin with the full frontend atomic-engine chain or duplicating token values. Do **not** globally enqueue the public 10-file design system into wp-admin and do not copy proposal CSS/token values into Admin Station.

Before giving up on Admin Print, test the smaller isolation path: **the print document may own the frontend proposal styles without making wp-admin own them.** The Request drawer can render the existing `QuoteProposalPreview` from the durable Request snapshot, but printing should occur in an isolated print window/document (or equivalent isolated print root) that loads only stable code-owned stylesheet assets required for the existing proposal presentation. This must not inject those frontend styles globally into the Admin Station document.

### Claude next action
On the same review branch only:
1. Inspect existing asset URLs/loading helpers and determine whether an isolated print document can load the exact existing proposal CSS plus only the token stylesheet(s) it actually needs using stable code-owned URLs.
2. If yes, implement Print / Save PDF for all Request statuses using existing `QuoteProposalPreview` and durable `RequestEntry` fields only. No secret, no transient lookup, no catalog/API re-resolution, no duplicated JSX/totals/CSS, no global wp-admin frontend-style enqueue.
3. Keep pending footer actions: Approve + Cancel + Print; approved/cancelled: Print + Close only.
4. Add contracts proving print uses stored snapshot only, isolated stylesheet loading, no customer secret/catalog access, and no global Admin stylesheet contamination.
5. If stable isolated stylesheet loading is not possible without introducing a new broad asset/public-route architecture, stop and report exact evidence. Do not improvise another renderer.
6. Push review branch only, record exact SHA/files/tests, set **AWAITING CHATGPT REVIEW**, stop.
