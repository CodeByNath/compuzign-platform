# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **AWAITING CHATGPT REVIEW — pushed to `main`, deploy succeeded. Live browser validation still required before closure.**
- `main` now at `7454ee67a12dfe76dc7a4a7e7b77404059ceb2b0` — exact approved head, pushed as a plain fast-forward, nothing else touched.
- GitHub Actions: **Deploy to Hostinger**, run #923 (`33371342766`), event `push`, head SHA `7454ee67`, conclusion **success**.
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

## Claude report — pushed to `main`

`review/crm-1c-request-actions@7454ee67` pushed to `main` as a plain fast-forward (`git push origin review/crm-1c-request-actions:main`), `main@96d55937` -> `main@7454ee67`, no rewrite, nothing beyond the approved 4 commits.

GitHub Actions **Deploy to Hostinger** (`.github/workflows/deploy.yml`) fired on that push: run #923, id `33371342766`, head SHA `7454ee67`, status `completed`, conclusion **success**.

No local WordPress/browser environment exists in this workspace to perform the live validation this doc still calls for (Approve, Cancel, summary refresh, terminal action visibility, real Print / Save PDF behavior). That verification requires the live site directly.

## Claude next action
None from this side — CRM-1C's implementation/audit/push cycle is complete. Remaining step is the live browser validation called for above, then close this work file.
