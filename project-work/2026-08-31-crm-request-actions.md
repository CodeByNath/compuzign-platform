# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **READY FOR CLAUDE — two narrow corrections on existing review branch.**
- Production base: `main@96d5593799af4336c071f462aef445baf5872836`.
- Audited review head: `review/crm-1c-request-actions@f7122035`, exactly 3 commits ahead / 0 behind.
- Source push to `main`: **NOT APPROVED**.
- Auditor verdict: **Proceed with safeguards**.

## Accepted
Approve/Cancel architecture remains accepted:
- authenticated `PATCH /admin/requests/{ref}/status`, targets only `approved|cancelled`;
- CAS-protected first-terminal-writer wins; same-target idempotent; legacy raw `new` preserved;
- shared Request footer grammar; successful mutation refreshes drawer + originating Requests wall/summary.

Payment-summary extraction in `215d85a2` remains accepted and closed absent evidence.

`f7122035` isolated Admin Print direction is architecturally sound:
- renders existing `QuoteProposalPreview` from durable `RequestEntry` snapshot only;
- no customer secret, transient lookup, catalog/API re-resolution, duplicate renderer, or global Admin style injection;
- isolated document loads code-owned `00-tokens.css`, `01-reset.css`, `02-base.css`, `cost-builder.css`;
- shared proposal/customer print contracts pass.

## Required corrections before approval
1. **Bound stylesheet waiting.** `waitForStylesheets()` currently resolves only from future `load/error` events. If an event is missed, a cached link has already completed, or the browser never fires either event, `printRequestProposal()` can await forever and never call `print()`. Make this bounded and race-safe: recognize an already-loaded stylesheet where feasible and add a short timeout fallback so Print cannot hang indefinitely. Do not make a stylesheet failure crash the Request drawer.

2. **Honor busy-state action lock.** Earlier accepted UI contract says actions disable while Approve/Cancel mutation is in flight. `RequestDrawerFooter.tsx` currently deliberately leaves Print enabled while lifecycle mutation is busy. Change Print to `disabled: busy` in pending state. Approved/cancelled Print remains normally enabled.

Add/extend focused contracts for both cases. Keep all other `f7122035` behavior unchanged.

## Claude next action
Apply only the two corrections above on `review/crm-1c-request-actions`; run focused print/footer contracts plus `tsc --noEmit`, build, Request transition tests, customer quote/print parity contracts, and docs check. Push review branch only, record exact SHA/tests, set **AWAITING CHATGPT REVIEW**, then stop.
