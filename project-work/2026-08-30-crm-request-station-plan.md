# CRM Request Station plan

## Status
- **AWAITING CLAUDE RESPONSE** — one final lock-ownership race remains. No source changes.
- Production base: `main@48c791b4f6d3d87ae8d6ef8e895a905ec2cc00a8`.
- Source push: **NOT APPROVED**.
- Auditor verdict: **Proceed with safeguards**.

## Locked CRM-1A direction
Validated `/requests/submit` creates the authoritative durable `cz_request` immediately with lifecycle `pending` and a new `CZR` Platform ID. Durable CRM data is the pristine validated payload. The 7-day `cz_quote_<ref>` transient remains secure quote-view storage only. `quote_ref` stays customer-facing; `CZR` is internal stable identity. No pricing/re-resolution, backfill, or CRM UI in 1A.

Accepted safeguards:
- same-ref/same-business-payload retry reuses the stored durable payload;
- same-ref/different-payload returns 409 with no mutation/transient/email;
- legacy stored `new` normalizes to `pending` on read only;
- fail closed if durable creation/identity binding fails;
- only a post proven created by the current call may be deleted on rollback;
- remove dead admin `/accept` bridge if final source search still shows zero callers;
- Code Maps: Quote Builder + Platform Identifier Station.

## Current audit — lock plan
Claude's Request-specific `add_option()` lock is directionally appropriate: the DB uniqueness of `option_name` can serialize first creation for one `quote_ref`, and the loser can converge onto the winner's durable Request rather than writing a duplicate.

However, the proposed **stale-lock reclamation is not safe yet**. The plan says a loser may observe an old lock, call `releaseCreationLock()` (`delete_option`), then `claimCreationLock()` again. Between those operations another request can replace/reclaim the lock. The original caller can then delete the new owner's fresh lock because the lock value carries no ownership token and deletion is unconditional. That reopens the exact multi-writer race the lock is meant to prevent.

### Required correction
Lock ownership must be explicit and stale takeover must be atomic/owner-safe.

Use a per-claim opaque owner token in the lock value. Normal release must remove the lock **only if the stored token still equals this call's token**. Stale takeover must atomically replace the exact observed stale lock value/token with the new owner's token; do not `delete_option()` then separately `add_option()`.

A narrow Request-specific conditional SQL update/delete through `$wpdb` is acceptable if needed; do not create a generic locking subsystem. If atomic stale takeover cannot be made safely within this phase, remove takeover and return 503 rather than risking duplicate writers.

The creation ownership contract remains: `{post_id, created_by_this_call}` or equivalent, and rollback may `wp_delete_post()` only when `created_by_this_call === true` for that exact call.

## Required regression
Add one focused interleaving test where caller A observes a stale lock, caller B acquires/replaces it before A attempts takeover, and A must **not** delete or overwrite B's fresh lock. Existing concurrent-identical, concurrent-conflicting, assignment-failure rollback, and stale-lock recovery coverage remain required.

## Claude next action
Revise the CRM-1A plan for lock ownership/stale takeover only. No source edits. Report exact token/compare-and-swap semantics and test. Set **AWAITING CHATGPT REVIEW** and stop.
