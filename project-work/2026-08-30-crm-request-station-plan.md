# CRM Request Station plan

## Status
- **CLOSED — CRM-1A accepted.**
- Production `main` = `08befad05a6c9c56da12fdf692641a6c6c055185`.
- Deploy run `33311655068` / run #920 = `completed/success`, exact approved head.
- Auditor verdict: **Proceed**.

## Accepted CRM-1A contract
Validated `/requests/submit` creates the authoritative durable `cz_request` first, lifecycle `pending`, with one bound `CZR`, before quote-view transient/email side effects. Durable data is the pristine validated business payload; `view_secret_hash` remains transient-only. Same-ref/same-business-payload retry reuses stored durable data; different payload returns 409. Legacy raw `new` normalizes to `pending` on read only. No pricing/re-resolution or backfill.

Creation locking is Request-specific: opaque owner-token `add_option()` claim, owner-safe conditional release, atomic CAS stale takeover, options-cache invalidation after raw DB mutation, readiness requires bound CZR (or narrow legacy `new` compatibility), and rollback deletion is limited to a post inserted by that exact call.

## Deployment and live acceptance
GitHub `main` and the Hostinger deploy were independently confirmed at the exact approved SHA. The deployment job completed checkout, dependency install, frontend build, source deploy and dist deploy successfully.

Nath completed the customer/browser validation and confirmed the requested quote flow is good, including the customer quote experience and Print/Save-PDF behavior. No visible regression remains. Internal `pending + CZR + transient-only view_secret_hash` invariants are covered by the accepted source/contracts and become directly inspectable through the CRM Admin surface in the next phase.

CRM-1A is closed and must not be reopened without new hard evidence.

## Next phase
Continue in `project-work/2026-08-30-crm-1b-admin-read-surface.md`.
