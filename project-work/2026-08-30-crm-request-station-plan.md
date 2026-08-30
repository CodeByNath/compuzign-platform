# CRM Request Station plan

## Status
- **AWAITING CHATGPT REVIEW — pushed and deployed.**
- Production `main` = `08befad05a6c9c56da12fdf692641a6c6c055185`.
- Deploy run `33311655068` = `completed/success`, exact `head_sha=08befad05a6c9c56da12fdf692641a6c6c055185`.
- Auditor verdict (prior round): **Proceed with safeguards**

## Locked CRM-1A contract
Validated `/requests/submit` creates the authoritative durable `cz_request` first, lifecycle `pending`, with one bound `CZR`, before any quote-view transient/email. Durable data is the pristine validated business payload; `view_secret_hash` stays transient-only. Same-ref/same-business-payload retry reuses stored durable data; different payload returns 409. Legacy raw `new` normalizes to `pending` on read only. No pricing/re-resolution, backfill, or CRM UI.

Creation locking is Request-specific: opaque owner-token `add_option()` claim, owner-safe conditional release, atomic CAS stale takeover, explicit options-cache invalidation after raw DB mutation, and rollback deletion only for a post inserted by that exact call.

## Independent audit
Compared production base to `08befad0`: **3 commits ahead / 0 behind**, 14 CRM-1A files only. The final two commits touch only `RequestsController.php`, `RequestRepository.php`, and `tests/request-durable-submission.php`.

The prior critical race is resolved. A Request is now joinable only when either:
- it has a bound `cz_platform_id`; or
- it is a genuine legacy pre-CRM record with raw stored status `new` and no CZR.

Losers poll `findReadyPostIdByRef()` / `awaitReadyPost()`, not bare post existence, so an in-flight post inserted before CZR assignment cannot escape into transient/email side effects. If the lock holder finds an unready non-legacy orphan, it resumes identity assignment onto that same post instead of inserting a duplicate; because the resuming call did not create the post, it never deletes it on failure. Legacy unidentified records remain joinable without backfill.

Claude reports the focused Request test now has 67 assertions and covers: pre-assignment invisibility, concurrent loser no-side-effects, winner assignment failure + rollback, successful orphan resume, legacy no-CZR handling, plus the earlier retry/collision/CAS/identity rollback cases. Related identity, request-schema, TypeScript, build, and docs checks pass. The known `contract:platform-identity-schema` failure is independently reported as pre-existing on clean `main` and remains out of scope.

## Claude — production push
Push **exactly** `08befad05a6c9c56da12fdf692641a6c6c055185` to `main` using the normal workflow. Do not amend or add source commits. Then record:
1. resulting exact `main` SHA;
2. GitHub Actions deploy run ID/status/head SHA;
3. set **AWAITING CHATGPT REVIEW** and stop.

After deployment audit, live validation must confirm a real customer submission still succeeds, quote-view email/link still works, and the resulting durable Request exists with `pending` + CZR without `view_secret_hash` in durable data.

## Claude Report — production push complete — 2026-08-30

`git merge --ff-only origin/review/crm-1a-durable-request-identity` from `main@48c791b4` landed `main` at exactly the approved head — no amendment, no additional source commits. Pushed.

- Production `main` = `08befad05a6c9c56da12fdf692641a6c6c055185`.
- GitHub Actions `deploy` run [`33311655068`](https://github.com/CodeByNath/compuzign-platform/actions/runs/33311655068/job/99257698899) = `completed` / `success`, exact `head_sha=08befad05a6c9c56da12fdf692641a6c6c055185`, started `2026-08-30T12:30:18Z`, completed `2026-08-30T12:30:42Z`.

Live validation must now confirm: a real customer `/requests/submit` still succeeds end to end (quote-cart and free-IT-assessment paths); the customer email's "View / Print Quote" link still resolves via the secure quote-view page; and the resulting durable `cz_request` exists with lifecycle `pending`, a bound `CZR` Platform ID, and no `view_secret_hash` in its durable snapshot (only in the 7-day transient). A resubmission of the same reference (e.g. a double form-submit) should not create a second Request or send a duplicate pair of emails.

Set to **AWAITING CHATGPT REVIEW** pending that live validation.