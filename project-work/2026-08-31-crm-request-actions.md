# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **READY FOR CLAUDE — continue Print on the same review branch.**
- Production base: `main@96d5593799af4336c071f462aef445baf5872836`.
- Audited review head: `review/crm-1c-request-actions@7c9a0fee` = exactly **1 commit ahead / 0 behind** production.
- Source push to `main`: **NOT APPROVED**.
- Auditor verdict: **Proceed with safeguards**.

## Accepted from `7c9a0fee`
Approve/Cancel implementation is accepted:
- authenticated `PATCH /admin/requests/{ref}/status`, targets only `approved|cancelled`;
- `404` unknown ref, `409` rejected/opposite-terminal transition;
- response remains the existing allow-listed Request detail, with no post ID/secret exposure;
- `RequestRepository::updateStatus()` now uses conditional `update_post_meta(..., $observed)` CAS semantics;
- same-target repeats are idempotent; concurrent opposite transitions cannot overwrite the winner; legacy raw `new` compares using its raw stored value;
- Request footer reuses `SupportedActionFooter`; pending has Approve + destructive Cancel Request, terminal states have no opposite action;
- successful mutation refreshes drawer + originating Requests wall/summary counts;
- focused PHP/TS/build/Station/docs evidence passed; known six Rate Sheet CSS-contract failures remain unrelated/pre-existing.

Do not redesign this accepted lifecycle work unless new evidence requires it.

## Print decision
Claude correctly stopped because `QuoteProposalPreview` currently imports three pure payment helpers from the 1088-line `PricingTiers.tsx`; importing that component directly into Admin would pull the customer pricing UI bundle boundary across.

The helpers themselves are pure and separable: `computeTotalContractValue`, `startingPaymentsByCycle`, and `chargeTypeLabel`. A narrow extraction is approved **inside this same CRM-1C review branch**, but only to remove this dependency direction; no arithmetic/text/behavior change is allowed.

## Claude next action
1. Extract only the genuinely shared pure payment-summary helpers/types needed by `QuoteProposalPreview` into a neutral shared module. Update existing customer imports to that module with parity tests proving byte-for-byte/fixture-equivalent results. Do not change formulas, labels, or customer behavior.
2. Audit `.cz-proposal` and print-portal CSS ownership before wiring Admin Print. Reuse the exact proposal markup and print rules. Do not duplicate proposal JSX, totals logic, or CSS.
3. If exact Admin reuse can then be achieved without importing live catalog/request-flow state or the whole cost-builder UI runtime, implement **Print / Save PDF** in the Request drawer for all statuses from the durable `RequestEntry` snapshot only. No quote-view secret and no API/catalog re-resolution.
4. If CSS/runtime ownership still requires broad customer-bundle coupling or duplication, stop and report that exact blocker instead of widening scope.
5. Extend contracts for helper parity, immutable-snapshot-only print, no secret/catalog access, and action visibility: pending = Approve + Cancel + Print; approved/cancelled = Print only (+ Close).
6. Push the review branch only, record new SHA/files/tests, set **AWAITING CHATGPT REVIEW**, stop.
