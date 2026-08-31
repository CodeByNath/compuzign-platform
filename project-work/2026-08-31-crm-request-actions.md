# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **SOURCE PUSH APPROVED — exact reviewed head only.**
- Production base audited: `main@96d5593799af4336c071f462aef445baf5872836`.
- Approved review head: `review/crm-1c-request-actions@7454ee67`, exactly **4 commits ahead / 0 behind** production.
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
- No quote-view secret, transient lookup, catalog/API re-resolution, duplicate pricing/quote renderer, or global Admin frontend-style injection.
- Isolated print window loads only code-owned `00-tokens.css`, `01-reset.css`, `02-base.css`, and `cost-builder.css`.
- Payment-summary helpers were narrowly extracted to neutral `utils/paymentSummary.ts`; accepted parity contracts show no formula/label change.

## Final correction audit
`7454ee67` changes only the two requested safeguards plus focused contracts:
1. `waitForStylesheets()` is bounded/race-safe: already-loaded `link.sheet` resolves immediately; remaining links settle on load/error or a 2s fallback. It never rejects, so stylesheet failure cannot hang/crash the drawer.
2. Pending Print now has `disabled: busy`, matching the accepted lifecycle-mutation action lock. Approved/cancelled Print remains enabled normally.

Independent compare confirms `7454ee67` is one scoped commit over `f7122035`; full CRM-1C head is 4 commits ahead / 0 behind production. Claude-reported focused PHP/TS/build/contracts/docs checks pass; known unrelated CSS-contract failures remain outside this work.

## Claude next action
Push **exact `7454ee67` unchanged** to `main`. Do not add cleanup/refactor changes. Record:
- resulting exact `main` SHA;
- GitHub Actions deploy run/job and final conclusion/head SHA.
Then set **AWAITING CHATGPT REVIEW** and stop. Live browser validation remains required before closure: Approve, Cancel, summary refresh, terminal action visibility, and real Print / Save PDF behavior/visual output.
