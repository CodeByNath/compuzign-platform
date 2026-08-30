# CRM Request Station plan

## Status
- **READY FOR CLAUDE — implement CRM-1A only**.
- Production base independently confirmed: `main@48c791b4f6d3d87ae8d6ef8e895a905ec2cc00a8`.
- Source push: **NOT APPROVED**.
- Auditor verdict: **Proceed with safeguards**.

## Locked CRM-1A contract
Validated `/requests/submit` creates the authoritative durable `cz_request` immediately with lifecycle `pending` and a new `CZR` Platform ID. Durable CRM data is the pristine validated business payload. The 7-day `cz_quote_<ref>` transient remains secure quote-view storage only; `view_secret_hash` must never enter durable CRM data.

Retry rules: same ref + same normalized business payload may reuse the existing Request and regenerate transient/email only from its stored durable payload. Same ref + different payload returns 409 with no mutation/transient/email. Legacy stored `new` normalizes to `pending` on read only. Lifecycle is one field: `pending -> approved|cancelled`; same-state repeat idempotent; opposite terminal transition rejected.

## Concurrency/identity safeguards
Use the accepted Request-specific creation lock:
- lock value = opaque owner token + claim timestamp;
- fresh claim via atomic `add_option()`;
- owner release via conditional SQL delete matching exact observed/written lock value;
- stale takeover via one conditional SQL update matching the exact previously observed stale value; never delete-then-add;
- loser polls for winner's post and converges to normal retry/collision logic; otherwise 503;
- creation result must explicitly identify `created_by_this_call`; rollback may delete only a post inserted by that exact call.

**WordPress cache safeguard:** any direct `$wpdb` UPDATE/DELETE of the lock option must invalidate the corresponding options cache entry after a successful mutation before later `get_option()` reads. Do not allow a stale object-cache value to masquerade as current lock state. Keep this Request-specific; no generic locking framework.

Register `request -> CZR` only through `PlatformIdentifierPolicy`; use the shared `PlatformIdentifierStation`, reserve/create/assign, and fail closed on identity failure. No backfill.

## Claude implementation scope
Implement CRM-1A only on a review branch from the exact production base. Expected areas: `PlatformIdentifierPolicy`, Request lifecycle/meta/repository/controller/module wiring, `Core/Plugin.php`, retirement of dead admin `/accept` + unused TS caller if final source search still confirms zero callers, focused durable-submission/concurrency tests, and Code Map updates for Quote Builder + Platform Identifier Station.

Required tests include: first durable submission; same-ref same-payload retry; same-ref collision 409; no durable `view_secret_hash`; legacy `new -> pending`; identity failure rollback/no email/transient; concurrent identical/conflicting first submissions; losing rollback never deletes winner; stale-lock CAS race preserves fresh owner; stale recovery; relevant existing Request/identity contracts and docs check.

Report exact changed files, tests, review SHA, unresolved risks, and Code Map changes here. Set **AWAITING CHATGPT REVIEW** and stop. Do not push source to `main`.