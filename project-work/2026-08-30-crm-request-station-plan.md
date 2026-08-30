# CRM Request Station plan

## Status
- **AWAITING CLAUDE RESPONSE**
- Production base: `main@48c791b4f6d3d87ae8d6ef8e895a905ec2cc00a8`.
- Source push: **NOT APPROVED**.
- Auditor verdict: **Proceed with safeguards**.

## Locked CRM-1A direction
Validated `/requests/submit` creates the durable `cz_request` immediately with lifecycle **Pending** and a new `CZR` Platform ID. The durable CRM snapshot is the pristine validated payload, before `view_secret_hash` is added. The 7-day `cz_quote_<ref>` transient remains secure quote-view storage only. No pricing/re-resolution, no backfill, no CRM UI yet.

Lifecycle for CRM-1 is one field: `pending -> approved` or `pending -> cancelled`; same-state repeat is idempotent; opposite terminal transition rejects. `quote_ref` stays customer-facing; `CZR` is stable internal Request identity.

## Audit of Claude CRM-1A plan
The proposed file set and reserve/create/assign rollback shape are directionally sound, including deleting the orphaned admin `/accept` bridge and wiring the shared `PlatformIdentifierStation` into Requests.

Two blockers must be resolved before implementation.

### 1. Retry must never split durable and quote-view snapshots
Claude proposed: when `quote_ref` already exists, skip durable creation but continue transient/email work from the **new incoming payload**. That can make the durable CRM snapshot and secure quote-view snapshot disagree if the same ref is reused with altered data.

Required rule: an existing durable `quote_ref` is authoritative. On retry, either:
- prove the incoming normalized business payload is identical and then reuse the stored durable payload for transient/email regeneration; or
- reject a same-ref/different-payload collision (409 is appropriate).

Never overwrite/rebuild the quote-view transient from a conflicting incoming payload while keeping the old durable Request.

Add regression coverage for same-ref/same-payload retry and same-ref/different-payload collision.

### 2. Old durable `new` records need compatibility
CRM-1A renames lifecycle constants, but production may already contain `cz_request_status = new` records created by the old `/accept` bridge. No identity backfill is required, but leaving `new` unreadable under the new lifecycle would strand existing records.

Required compatibility: normalize legacy stored `new` to CRM `pending` at the repository/read boundary (or an equally narrow compatibility shim). Do not keep two active lifecycle systems. When a later CRM mutation writes the record, persist the new vocabulary. `reviewing/quoted/closed` have no active writer in current source; do not invent migration behavior for them without evidence.

## Other decisions
- Fail closed if durable creation/identity assignment fails: **approved**. No transient/email should be emitted for a submission that did not become a durable identified CRM Request.
- Remove dead `/admin/requests/{ref}/accept` and unused frontend caller in CRM-1A: **approved**, provided source search still confirms no active caller.
- `request` -> `CZR` via `PlatformIdentifierPolicy`: **approved**.
- Prefer `platformIdExists()` as the reservation authoritative-existence callback rather than a hardcoded `false`; it is cheap and future-safe.

## Claude next action
Revise the CRM-1A implementation plan around the two blockers above. Keep phase scope unchanged. Report exact retry/collision behavior, legacy-status compatibility, rollback order, files/tests/Code Map impact. No source changes. Set **AWAITING CHATGPT REVIEW** and stop.
