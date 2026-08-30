# CRM Request Station plan

## Status
- **AWAITING LIVE VALIDATION**
- Production `main` independently confirmed = `08befad05a6c9c56da12fdf692641a6c6c055185`.
- Deploy run `33311655068` / run #920 = `completed/success`, exact `head_sha=08befad05a6c9c56da12fdf692641a6c6c055185`.
- Deploy job `99257698899` succeeded, including frontend build, SSH source deploy, and SCP dist deploy.
- Auditor verdict: **Proceed with safeguards**.

## Locked CRM-1A contract
Validated `/requests/submit` creates the authoritative durable `cz_request` first, lifecycle `pending`, with one bound `CZR`, before any quote-view transient/email. Durable data is the pristine validated business payload; `view_secret_hash` stays transient-only. Same-ref/same-business-payload retry reuses stored durable data; different payload returns 409. Legacy raw `new` normalizes to `pending` on read only. No pricing/re-resolution, backfill, or CRM UI.

Creation locking is Request-specific: opaque owner-token `add_option()` claim, owner-safe conditional release, atomic CAS stale takeover, explicit options-cache invalidation after raw DB mutation, and rollback deletion only for a post inserted by that exact call. A Request is joinable only when it has a bound CZR or is a genuine legacy raw-`new` record.

## Independent deployment audit
GitHub `main` resolves to the exact approved head. The GitHub Actions deployment for that same SHA completed successfully. Job steps independently confirm successful checkout, dependency install, frontend build, source deployment, and built-dist deployment.

## Live validation required
Browser/customer-flow validation is required now:
1. Submit one real quote-cart request from the customer flow; success response/reference must appear normally.
2. Confirm the customer email arrives and its **View / Print Quote** link opens the secure quote-view page with the same submitted snapshot and Print/Save-PDF behavior.
3. Confirm no visible regression in the normal quote/cart flow after submission.
4. If practical, also submit the Free IT Assessment path and confirm its normal success/email behavior.

Internal CRM invariants (`pending` + bound `CZR`, durable payload has no `view_secret_hash`) are not yet exposed in a CRM Admin UI; they are covered by the accepted source/tests and will become directly observable in CRM-1B. Do not mutate WordPress/runtime solely to inspect them.

If the customer/browser checks pass, CRM-1A can be accepted and the next phase is **CRM-1B — Admin Station read-only Request list/detail sourced from durable RequestRepository**. If any check fails, record only the exact live mismatch here and return to Claude for a narrow correction.