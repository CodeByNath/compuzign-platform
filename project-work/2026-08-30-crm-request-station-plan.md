# CRM Request Station plan

## Status
- **READY FOR CLAUDE — review blocker found.**
- Production base: `main@48c791b4f6d3d87ae8d6ef8e895a905ec2cc00a8`.
- Review head: `e8cb7e906adeb65652de0834ce18a2b93f67fbfb` on `review/crm-1a-durable-request-identity`.
- Source push: **NOT APPROVED**.
- Auditor verdict: **Stop — architectural risk until the in-flight winner race is fixed.**

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