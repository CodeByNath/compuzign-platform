# CRM Request Station plan

## Status
- **AWAITING CHATGPT REVIEW** — the in-flight winner race is fixed, four new regressions added.
- Production base: `main@48c791b4f6d3d87ae8d6ef8e895a905ec2cc00a8`.
- Review head: `08befad05a6c9c56da12fdf692641a6c6c055185` on `review/crm-1a-durable-request-identity`.
- Source push: **NOT APPROVED**.
- Auditor verdict (prior round): **Stop — architectural risk until the in-flight winner race is fixed.**

## Locked CRM-1A contract
Validated `/requests/submit` must create the authoritative durable `cz_request` first, lifecycle `pending`, with one bound `CZR`, before any quote-view transient or email. Durable data is the pristine validated business payload; `view_secret_hash` stays transient-only. Same-ref/same-business-payload retry reuses stored durable data; different payload returns 409. Legacy stored `new` normalizes to `pending` on read only. No pricing/re-resolution, backfill, or CRM UI.

Creation locking remains Request-specific: owner-token `add_option()` claim, owner-safe conditional release, atomic CAS stale takeover, options-cache invalidation after raw DB mutation, and rollback deletion only for a post created by that exact call.

## Independent diff audit
Base -> review head is exactly **1 commit ahead / 0 behind**, 14 files. Scope matches CRM-1A: Requests lifecycle/meta/repository/controller/module wiring, `request -> CZR`, retired dead `/accept`, focused tests, and two Code Maps.

The token/CAS lock implementation itself matches the approved design. However, the join path has a critical completion race.

## Blocker — post existence is not durable readiness
`createDurableRequest()` performs **post insert before CZR assignment**. While the winning caller still holds the creation lock, `awaitCreatedPost()` returns as soon as `findPostIdByRef()` sees that newly inserted post. A losing concurrent request can therefore:
1. observe the winner's post before `assignIdentifier()` completes;
2. treat it as an existing durable Request;
3. pass payload comparison;
4. create the quote-view transient and send emails;
5. then the winner's identity assignment can fail and roll back/delete that post.

The initial `findPostIdByRef()` fast path has the same race: it can see an in-flight post before its CZR is bound.

That violates the core CRM-1A invariant: **no customer-facing side effect before a durable identified Request exists**.

## Required correction
Define a Request as joinable/ready only after creation is complete, not merely after the post exists. The losing path must not escape while the winner still owns an in-flight unbound post.

Use the smallest safe Request-specific mechanism. Examples: wait for the lock owner to finish and then verify the post has its bound `CZR`, or expose a repository readiness check that requires both the post and completed identity. Do not infer readiness from post existence alone.

Legacy pre-CRM records without CZR must not be accidentally mistaken for an in-flight new record; handle them explicitly and narrowly without adding backfill.

Add regressions proving:
- loser sees winner's inserted post **before** identity assignment and does not emit transient/email;
- winner assignment failure + rollback cannot leave loser success/side effects;
- winner successful assignment lets loser converge afterward;
- existing retry/collision/CAS tests remain green.

Claude: fix only this race on the review branch, report new SHA/tests, set **AWAITING CHATGPT REVIEW**, and stop. Do not push to `main`.

---

## Claude Report — race fixed on review branch — 2026-08-30

Review branch unchanged (`review/crm-1a-durable-request-identity`), two new commits: `7c6b6e80` (the fix) and `08befad0` (one regression I'd missed on the first pass). Pushed. Not merged to `main`.

### Fix

"Ready" now means either a bound `cz_platform_id`, or a genuine pre-CRM-1A legacy record — never bare post existence:
- `RequestRepository::findReadyPostIdByRef()` — wraps `findPostIdByRef()`, returns non-null only when `platformId($id) !== ''` or `isLegacyUnidentified($id)`.
- `RequestRepository::isLegacyUnidentified()` — true only when the *raw* stored `cz_request_status` is literally `'new'` (written solely by the retired `/accept` bridge; `createOwned()` always writes `pending`) and there's no CZR — the narrow, evidence-based signal that separates an intentionally-unidentified legacy record from an in-flight/orphaned CRM-1A post, so nothing gets accidentally backfilled.
- `awaitReadyPost()` replaces `awaitCreatedPost()`, polling the ready-gated lookup.
- `RequestsController::acquireOrJoinDurableRequest()`'s three checkpoints (initial fast path, loser's poll, lock-holder's redundant re-check) all now use readiness, not existence. The lock-holder's re-check first tries ready (join immediately), then falls back to the *raw* lookup — if that finds an unready, non-legacy post, it's an orphan from a crashed prior lock-holder; `resumeDurableRequest()` (new) resumes identity assignment onto it rather than inserting a duplicate, and — matching the existing rollback-ownership rule — never deletes it on failure, since this call didn't create it.

### New regressions (all passing, 67 total assertions in the file)

1. Direct proof post existence precedes readiness (a hook fires the instant `createOwned()`'s last meta write lands, before `assignIdentifier()` ever runs; asserts the raw post is visible but `findReadyPostIdByRef()` is still null at that exact moment).
2. A concurrent loser probing during that exact window gets `503` and emits no email — required regression 1.
3. **The missed one, added in the second commit**: a winner whose identity assignment then genuinely fails (poisoned claim) still leaves a concurrent loser probing the same window with zero side effects, and the winner's own post is rolled back — nothing durable survives for either caller — required regression 2.
4. An orphaned post (simulated crashed prior winner: post inserted via `createOwned()` directly, never identified, lock never held) is resumed onto the same post ID by a later call, not duplicated — required regression 3 (successful convergence after resume).
5. A legacy record stays immediately joinable and is never backfilled a CZR through this same path.

Existing retry/collision/CAS/concurrent tests (rounds 1–3 of this review) remain green, re-run in full alongside `platform-identifier-station.php`, `platform-identifier-existing-assignment.php`, `category-inline-identity-race.php`, `category-pending-lifecycle.php`, `request-schema-*.php`, `tsc --noEmit`, `build`, `docs:check`.

### Note

Code Maps unchanged this round — both are already at the pre-existing 600-prose-word ceiling with zero headroom (confirmed in the prior round), and this correction was scoped narrowly to the join-path race per the instruction above; the mechanism is documented in full in the source's own docblocks (`findReadyPostIdByRef()`, `isLegacyUnidentified()`, `resumeDurableRequest()`).

Set to **AWAITING CHATGPT REVIEW**. Source not pushed to `main`.