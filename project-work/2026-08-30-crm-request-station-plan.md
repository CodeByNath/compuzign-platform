# CRM Request Station plan

## Status
- **AWAITING CHATGPT REVIEW** — CRM-1A implemented on review branch `review/crm-1a-durable-request-identity` (`e8cb7e90`). Not merged to `main`.
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

---

## Claude Report — CRM-1A implemented on review branch — 2026-08-30

Review branch `review/crm-1a-durable-request-identity`, built from the exact confirmed base `main@48c791b4f6d3d87ae8d6ef8e895a905ec2cc00a8`, pushed to origin at commit `e8cb7e906adeb65652de0834ce18a2b93f67fbfb`. **Not merged to `main`** — source push still not approved.

### Files changed

- `src/PlatformIdentifier/PlatformIdentifierPolicy.php` — `REQUEST => 'CZR'`.
- `src/Modules/Requests/Support/RequestLifecycle.php` — rewritten to `PENDING/APPROVED/CANCELLED`, `canTransition()` transition table, `normalizeLegacy()` (`new -> pending`, read-boundary only).
- `src/Modules/Requests/Support/RequestMetaSchema.php` — default `STATUS_PENDING`; registers `cz_platform_id` post meta.
- `src/Modules/Requests/Repositories/RequestRepository.php` — `createOwned()`/`deleteOwned()` (explicit `created_by_this_call` ownership, replacing the old bare `create()`); `platformId()`/`claimPlatformId()`/`platformIdExists()`; the four lock primitives — `claimCreationLock()`, `releaseCreationLock()` (conditional `DELETE ... WHERE option_value = %s`), `observeLockValue()`, `takeoverStaleLock()` (single conditional `UPDATE ... WHERE option_value = %s`, CAS on the exact observed value) — plus `isLockStale()` and `awaitCreatedPost()`; every raw `$wpdb` mutation calls `wp_cache_delete($key, 'options')` immediately after, per the required cache safeguard. `updateStatus()` now enforces `canTransition()` against the current (legacy-normalized) stored status, not just target-value membership. `hydrate()` normalizes legacy status and adds `platform_id`.
- `src/Modules/Requests/Http/RequestsController.php` — constructor DI (`PlatformIdentifierStation`, `RequestRepository`); `submitRequest()` reordered around `acquireOrJoinDurableRequest()` (lock claim → poll → one CAS takeover attempt → one more poll → 503) and `createDurableRequest()` (reserve → `createOwned()` → `assignIdentifier()` → rollback via `deleteOwned()` + `retireReservation()` on any throw); `payloadsMatch()` (exact comparison, `submitted` excluded) gates reuse vs `409`; the view-secret hash is merged into a separate `$transientPayload`, never the durable snapshot.
- `src/Modules/Requests/RequestsModule.php` / `src/Core/Plugin.php` — DI wiring of the shared `PlatformIdentifierStation` into Requests.
- `src/Modules/Admin/Http/AdminRequestsController.php` — removed `acceptRequest()` and the `/accept` route (confirmed zero live callers before deletion); `listRequests()`/`getRequest()` untouched.
- `resources/ts/api/endpoints/admin.ts` / `types/admin.ts` — removed `acceptIntakeRequest()`/`AcceptIntakeResponse` (confirmed zero callers).
- `tests/platform-identifier-station.php` — added `request => CZR` to the closed prefix-vocabulary snapshot assertion (a pre-existing test explicitly locking the full set; every prior entity addition required the same one-line update).
- `tests/request-durable-submission.php` — new, 47 assertions against the real `RequestsController`/`RequestRepository`/`PlatformIdentifierStation` over an in-memory WP boundary (modeled on `tests/category-inline-identity-race.php`), covering every item in the required-tests list below.
- `docs/code-map/quote-builder.md`, `docs/code-map/platform-identifier-station.md` — updated for the new durable-submission-time flow, lifecycle vocabulary, and creation-lock mechanism; both trimmed to stay at the existing 600-prose-word Code Map limit (both files were already near that ceiling before this change).

### Tests run (all passing)

`php tests/request-durable-submission.php` (new — first submission; same-ref/same-payload retry; same-ref/different-payload `409` with transient/durable/email untouched; legacy `new -> pending` read-only normalization + forward-write; identity-assignment failure rollback with zero email/transient and no lockout on retry; concurrent identical submissions → one post/one CZR; concurrent conflicting submissions → loser converges then `409`s; stale-lock reclaim with no live contender; the required A/B stale-takeover CAS race — B's takeover wins, A's fails closed and never touches B's row; full submission via a losing takeover still converges), `php tests/platform-identifier-station.php`, `php tests/platform-identifier-existing-assignment.php`, `php tests/category-inline-identity-race.php`, `php tests/category-pending-lifecycle.php`, `php tests/category-create-group-id-payload-contract.php`, `php tests/request-schema-is-addon.php`, `php tests/request-schema-minimum-term.php`, `php tests/request-schema-family-quote-snapshot.php`, `php tests/request-schema-legacy-snapshot-description.php`, `npx tsc --noEmit`, `npm run build`, `npm run docs:check`.

### Pre-existing, unrelated failure noted (not caused by this work)

`npm run contract:platform-identity-schema` fails on a plain `main` checkout (verified via `git stash` before making any change) because `scripts/rate-sheet-bundle-regression.mjs` contains coined test-fixture identifiers (`CZPRCBORPHAN2`, `CZPRCBNEVERLINKED`, `CZPRCBNEVERLINKED2`) the contract's vocabulary-lock scanner rejects. This predates CRM-1A entirely and is out of this phase's scope — flagging rather than silently fixing an unrelated file.

### Unresolved risks / judgment calls for review

1. **A single failure status, not two.** Both "lock contention exhausted" and "identity reservation/assignment genuinely failed" return `503 {"success":false,"message":"Please try again in a moment."}` from `submitRequest()`, rather than distinguishing a `500` for the latter as earlier drafts sketched. Both cases share the identical external contract (nothing was created; the client's own retry is the correct next step), so this was collapsed for simplicity — flagging since it wasn't explicitly re-confirmed after the lock design settled.
2. **Lock poll/takeover bounds are fixed constants** (40 attempts × 50ms ≈ 2s first poll, one takeover attempt at 10s staleness, 20 more attempts ≈ 1s second poll) rather than configurable. Chosen to mirror `PlatformIdentifierStation::MAX_RESERVATION_ATTEMPTS`'s own bounded-loop philosophy; not load-tested against real concurrent traffic.
3. **`updateStatus()` now enforces `canTransition()`**, which is stricter than before (previously any valid target was accepted regardless of current state). Nothing calls `updateStatus()` in production yet (CRM-1C wires it), so this is inert today, but it is a real behavior change to a public method or worth ChatGPT confirming aligns with the "one authoritative lifecycle model" decision.

Set to **AWAITING CHATGPT REVIEW**. Source not pushed to `main` — awaiting explicit `SOURCE PUSH APPROVED`.