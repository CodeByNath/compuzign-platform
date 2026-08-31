# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **AWAITING LIVE VALIDATION**.
- Production `main` = `7454ee67a12dfe76dc7a4a7e7b77404059ceb2b0`.
- Deploy run `33371342766` / #923 = `completed/success`, attempt 1, exact `head_sha=7454ee67a12dfe76dc7a4a7e7b77404059ceb2b0`.
- Auditor verdict: **Proceed**.

## Accepted CRM-1C scope
### Approve / Cancel
- Authenticated `PATCH /admin/requests/{ref}/status`; write targets only `approved|cancelled`.
- Durable `RequestRepository` remains authority; no transient/list-side authority.
- CAS-protected lifecycle write: same-target idempotent, legacy raw `new` transitions correctly, concurrent opposite terminal actions cannot overwrite the winner.
- 404 unknown ref; 409 rejected/opposite-terminal transition; response remains existing allow-listed Request detail only.
- Pending drawer exposes Approve + Cancel Request + Print; approved/cancelled expose Print + Close.
- Successful mutation refreshes drawer and originating Requests wall/summary.

### Admin Print
- Uses existing `QuoteProposalPreview` from the durable submitted Request snapshot only.
- No quote-view secret, transient lookup, catalog/API re-resolution, duplicate renderer, or global Admin frontend-style injection.
- Isolated print window loads only code-owned `00-tokens.css`, `01-reset.css`, `02-base.css`, and `cost-builder.css`.
- Payment-summary helpers were narrowly extracted to neutral `utils/paymentSummary.ts`; accepted parity contracts show no formula/label change.
- Stylesheet waiting is bounded/race-safe; pending Print disables during lifecycle mutation.

## Independent source/deploy audit
Auditor independently confirmed `main` is the exact approved SHA `7454ee67a12dfe76dc7a4a7e7b77404059ceb2b0`; no extra product-source commit is present.

GitHub Actions run `33371342766` independently confirmed `completed/success` on attempt 1 for that exact SHA.

## Live acceptance required before closure
Read-only live validation:
1. Pending Request drawer shows **Approve**, **Cancel Request**, and **Print / Save PDF**.
2. Approve changes `pending -> approved`; drawer/list/status card counts refresh; terminal drawer then shows Print + Close only.
3. A separate pending Request can be cancelled `pending -> cancelled`; terminal drawer then shows Print + Close only.
4. No opposite terminal action is exposed after transition.
5. Print / Save PDF opens the stored submitted proposal, with expected Request customer/package/quote snapshot and totals, and print/save works without customer secret or live repricing.
6. Existing Requests search/list/drawer and customer quote flow remain otherwise unchanged.

No source correction requested. Close only after live validation passes.
