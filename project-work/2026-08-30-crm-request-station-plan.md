# CRM Request Station plan

## Status
- **AWAITING CHATGPT REVIEW** — CRM-1A implementation plan below. No source changes.
- Production base: `main@48c791b4f6d3d87ae8d6ef8e895a905ec2cc00a8`.
- Source push: **NOT APPROVED**.
- Auditor verdict: **Proceed with safeguards**.

## Source audit accepted
Claude correctly found:
- Public `/requests/submit` currently writes only the 7-day `cz_quote_<ref>` transient and emails.
- `RequestRepository::create()` is called only by admin `/admin/requests/{ref}/accept`.
- Existing durable lifecycle is inert `new/reviewing/quoted/closed`; no real transition path exists.
- Admin Request UI is removed but backend routes remain.
- `request`/`CZR` is not yet registered with Platform Identifier Station.

## Auditor correction — durable boundary
Do **not** keep Pending as a transient-only virtual state and mint the durable Request only on Approve/Cancel. That leaves an undecided CRM request ephemeral and able to disappear after seven days, which defeats the first durable CRM Request phase and delays its stable `CZR` identity until after triage.

CRM-1A should instead make a **validated customer submission create the authoritative durable Request immediately**:
1. `/requests/submit` validates/sanitizes as today.
2. Create/find the durable `cz_request` by `quote_ref`, with lifecycle **Pending** and new `CZR` Platform ID.
3. Persist the immutable submitted CRM snapshot from the validated payload **before** adding the quote-view secret hash; `view_secret_hash` stays transient/security plumbing, not CRM business data.
4. Then create the existing 7-day secure quote-view transient and send emails exactly as today.
5. Retry with the same `quote_ref` must be idempotent and must not mint a second Request/CZR.

The 7-day transient remains only the secure customer quote-view store. It is no longer the CRM queue authority.

## Lifecycle decision
Use one lifecycle field with exactly these CRM-1 states:
- `pending` -> `approved`
- `pending` -> `cancelled`
- repeated same action = idempotent success
- opposite terminal transition = reject, preferably 409

Do not retain a parallel `is_accepted` lifecycle. Future sales stages may extend this same lifecycle later only by a separate reviewed phase.

## Identity
Register entity `request` with prefix `CZR` through `PlatformIdentifierPolicy` and the existing reserve/bind pattern. Mint for **new durable submissions only**; no backfill.

## Revised sequencing
- **CRM-1A:** submission-time durable Request + `CZR` + Pending/Approved/Cancelled contract. Retire admin `/accept` semantics in favor of later Approve; no UI yet.
- **CRM-1B:** Admin Station read-only list/detail sourced from durable `RequestRepository`, not transient enumeration. Reuse existing Station list/drawer patterns.
- **CRM-1C:** authenticated Approve/Cancel mutations and filters/sort.
- **CRM-1D:** contact/first-email action with minimal send audit metadata.

## Claude next action
Re-audit this corrected durable boundary against the actual Platform Identifier wiring and current Request controller/module construction. Report a **CRM-1A implementation plan only**: exact files, creation/rollback/idempotency order, route behavior, tests/contracts, and Code Map impact. Do not edit source. Set **AWAITING CHATGPT REVIEW** and stop.

---

## Claude Report — CRM-1A implementation plan — 2026-08-30

No source changes made — plan only, re-audited directly against `main`'s current code (the working checkout of `Project-work-instructions` is ~30 commits behind `main` on the Requests files touched by Phase 8J; `RequestsController.php`, `RequestsModule.php`, `QuoteViewSecret.php`, `QuoteViewAccess.php`, `RequestSchema.php`, `NotificationTemplates.php` were read via `git show main:...` — everything below reflects `main`, not the older checkout).

### Ordering inside `submitRequest()` — the core change

Today: rate-limit → validate → mutate `$payload` with `view_secret_hash` → `set_transient` → emails. `RequestRepository::create()` is never called here.

CRM-1A reorders to mint the durable record from the **pristine** validated payload, before any transient/secret plumbing touches it:

1. Rate limit (unchanged).
2. `RequestSchema::validate()` (unchanged) → `$payload`, `$quoteRef`.
3. **Idempotency short-circuit, checked before any reservation:** `$postId = $this->requests->findPostIdByRef($quoteRef)`. If a durable record already exists for this ref (a client retry after a dropped response), skip straight to step 6 — no new `CZR` reserved, no second post. This is deliberately earlier than today's `create()`-internal check, so a retry never even attempts a reservation it would immediately have to retire.
4. If no existing record: reserve → create → assign, exactly the Category shape (`AdminCategoriesController::createCategory()`, `wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminCategoriesController.php:296-329`), adapted:
   - `$reservation = $this->platformIdentifiers->reserve(PlatformIdentifierPolicy::REQUEST, fn(string $id): bool => $this->requests->platformIdExists($id));` — the `authoritativeIdExists` closure exists in Category to catch pre-Station legacy identifiers; Requests have no legacy identifiers of any kind, so this can simply be `fn(): bool => false`, flagged here as a green-field judgment call for review rather than decided silently.
   - `$postId = $this->requests->create($payload)` — `create()` keeps its existing idempotent-by-ref shape but now always writes `RequestLifecycle::STATUS_PENDING` (renamed from `STATUS_NEW`, see Lifecycle below) and **drops the `accepted_at` field it currently synthesizes** — the payload already carries `submitted` (`RequestSchema::validate()`), and "accepted" language is being retired per the naming-collision flag from the prior round.
   - `$this->requests->assignIdentifier($reservation, $postId)` (new method, mirrors `AdminCategoriesController::assignIdentifier()`) → calls `$this->platformIdentifiers->assign($reservation, $postId, [$this->requests, 'platformId'], [$this->requests, 'claimPlatformId'])`.
   - **Rollback on any throwable** from reservation or assignment: `wp_delete_post($postId, true)` only if `RequestRepository::platformId($postId)` is empty or matches the losing reservation's own ID (never delete a post a concurrent winning claim already bound — same guard `createCategory()` uses at lines 318-323), then `retireReservation($reservation, $postId)` equivalent. On rollback, `submitRequest()` returns a clean `500` and **does not** set the transient or send either email — this is a genuine behavior change (a submission can now fail where it previously always "succeeded" into a transient) and is called out explicitly for review, not buried: it is the direct consequence of making every Pending request durable-and-identified, which is the whole point of this phase.
5. `RequestRepository::platformId()` / `claimPlatformId()` (new methods, mirror `CategoryMeta::platformId()`/`claimPlatformId()`) use `get_post_meta($postId, 'cz_platform_id', true)` and `add_post_meta($postId, 'cz_platform_id', $id, true)` (atomic once-only claim, the post-meta analog of `add_term_meta($unique=true)`). `RequestRepository::platformIdExists(string $id): bool` (new) does a `meta_query` lookup, same shape as `findPostIdByRef()`.
6. Only now: generate the view secret, and build a **separate** transient payload rather than mutating `$payload` in place — `$transientPayload = $payload; $transientPayload['view_secret_hash'] = QuoteViewSecret::hash($viewSecret);` — so the durable CRM snapshot already written in step 4 never carries `view_secret_hash` (the auditor's explicit instruction: the hash is transient/security plumbing, not CRM business data). `set_transient('cz_quote_'.$quoteRef, $transientPayload, 7 * DAY_IN_SECONDS)` exactly as today.
7. Build `$quoteViewLink`, send both emails, return the same `{success, quote_id, message}` shape as today — no `platform_id`/`CZR` in the public response; identity stays admin-only/output-only, matching the Category/Package convention.

### Files changed

- **`src/PlatformIdentifier/PlatformIdentifierPolicy.php`** — add `public const REQUEST = 'request';` and `self::REQUEST => 'CZR'` to `PREFIXES` (two lines, same shape as every existing entry).
- **`src/Modules/Requests/Support/RequestLifecycle.php`** — rename `STATUS_NEW/REVIEWING/QUOTED/CLOSED` → `STATUS_PENDING/APPROVED/CANCELLED`; `defaultStatus()` → `STATUS_PENDING`; `label()` updated; add a transition-table method (e.g. `canTransition(string $from, string $to): bool`) encoding the auditor's exact rules — `pending→approved`, `pending→cancelled`, same-state repeat = idempotent success, the opposite terminal transition = reject. `updateStatus()`'s current membership-only `isValid()` check stays for format validity; the new transition method is what CRM-1C's Approve/Cancel routes will call before writing — built now, wired to routes later, so CRM-1C is pure route plumbing over already-correct rules.
- **`src/Modules/Requests/Support/RequestMetaSchema.php`** — `cz_request_status` default → `STATUS_PENDING`; register `cz_platform_id` post meta (`string`, `single`, `show_in_rest: false`, no default — mirrors how identity meta is deliberately never REST-exposed for direct mutation elsewhere).
- **`src/Modules/Requests/Repositories/RequestRepository.php`** — `create()`: write `STATUS_PENDING`, drop the `accepted_at` merge; `hydrate()`: fallback status → `STATUS_PENDING`; add `platformId()`, `claimPlatformId()`, `platformIdExists()`.
- **`src/Modules/Requests/Http/RequestsController.php`** — constructor DI for `PlatformIdentifierStation` and `RequestRepository` (currently has no constructor); `submitRequest()` reordered per above; `getQuote()`/`registerRoutes()` untouched (Phase 8J-C1 read boundary is confirmed independent, see below).
- **`src/Modules/Requests/RequestsModule.php`** — constructor accepts `PlatformIdentifierStation`, builds one `RequestRepository`, passes both into `new RequestsController(...)`. `QUOTE_VIEW_PATH`/`quoteViewUrl()`/`maybeRenderQuoteView()` untouched.
- **`src/Core/Plugin.php:46`** — `(new RequestsModule())->register();` → `(new RequestsModule($platformIdentifiers))->register();` (the already-constructed shared instance at line 34, same one `SurfacePackagesModule`/`ServiceModule`/`AdminModule` receive).
- **`src/Modules/Admin/Http/AdminRequestsController.php`** — remove `acceptRequest()` and its `POST /admin/requests/{ref}/accept` route registration (lines 40-51, 134-181 in the currently-read version). Nothing else in this controller changes: `listRequests()`/`getRequest()` keep reading from transients + `findAllAcceptedRefs()` exactly as today — rebuilding them to read `RequestRepository` directly is explicitly CRM-1B's job, not 1A's, and touching them now would blur the phase boundary.
- **`resources/ts/api/endpoints/admin.ts`** — remove `acceptIntakeRequest()` (already confirmed zero callers anywhere in `resources/ts`; it points at a route CRM-1A deletes, so leaving it would be a dead function pointing at a 404).
- **`resources/ts/api/types/admin.ts`** — update `RequestSummary`/`RequestEntry`'s status union type from the old vocabulary to `'pending' | 'approved' | 'cancelled'`. No runtime impact (unused), included so the type contract doesn't sit stale.

### Tests/contracts

- **New `tests/request-durable-submission.php`**, modeled directly on `tests/category-inline-identity-race.php`'s in-memory WP boundary (with `wp_insert_post`/`get_post`/`update_post_meta`/`add_post_meta`/`wp_delete_post`/`set_transient`/`wp_mail` stand-ins instead of the term equivalents), asserting:
  1. A validated submission creates exactly one durable Pending `cz_request` post with a valid `CZR` identity.
  2. A retried submission with the same `quote_ref` reuses the existing post/identity — mints no second `CZR`, calls `reserve()` zero times (spy-countable), still returns success.
  3. A losing concurrent identity claim (same race shape as the Category test, lines 178-201) fails closed without deleting or overwriting the winning post/identity.
  4. A reservation/assignment failure rolls back the just-inserted post, retires the reservation, and — critically, the new behavior — results in **zero** `set_transient` calls and **zero** `wp_mail` calls (spy counters at zero), proving the durable-identity step gates the customer-facing side effects rather than running in parallel/best-effort.
  5. The persisted `cz_request_data` meta never contains a `view_secret_hash` key, while the 7-day transient payload does.
- **Existing `tests/request-schema-*.php`** — check each for any assertion on `accepted_at` or the old status constants during implementation; update in place if found (not enumerated speculatively here since they weren't re-read line-by-line this round).
- **`npm run contract:platform-identity-schema`** — must pass unmodified against the new `REQUEST`/`CZR` entry; this is the existing gate documented in `docs/code-map/platform-identifier-station.md` as enforcing that no prefix is coined outside `PlatformIdentifierPolicy`.
- Confirm whether a `resources/ts` source-text contract already exists for `RequestLifecycle`-shaped strings (none found this round) — if the CRM-1B/1C phases add one, it inherits the renamed vocabulary; CRM-1A itself has no frontend consumer to break, since `acceptIntakeRequest`/list/detail typings are already unused.

### Code Map impact

- **`docs/code-map/quote-builder.md`**: update "`RequestRepository` owns persisted requests and `RequestLifecycle` owns their transitions" context to state durable creation now happens at submission time (not admin accept); document the `CZR` identity and its reserve/assign/rollback shape; replace the "admin request-review surface...is to be rebuilt in the Admin Station" line only once CRM-1B actually lands (still accurate as-is for CRM-1A, since no UI ships yet); add `tests/request-durable-submission.php` and any new/changed contract names to the Validation list.
- **`docs/code-map/platform-identifier-station.md`**: add `request`/`CZR` wherever it enumerates the live entity-type roster, alongside the existing Category/Package examples.
- No other Code Map needs a change — the customer secure quote-view boundary (`QuoteViewSecret`/`QuoteViewAccess`/`QuoteViewApp.tsx`) is confirmed independent: it reads only the 7-day transient, never `RequestRepository`, and CRM-1A's reordering explicitly keeps that transient's payload (`$transientPayload`) as the sole carrier of `view_secret_hash`.

### Open judgment calls flagged for review (not decided unilaterally)

1. `authoritativeIdExists` closure hardcoded to `fn(): bool => false` for a green-field entity type with no legacy identifiers (see step 4 above).
2. Reservation/assignment failure now fails the entire public submission closed (500, no transient, no emails) rather than degrading to today's transient-only behavior — a real behavior change, not just refactoring.
3. Removing `AdminRequestsController::acceptRequest()`/`/accept` outright in CRM-1A rather than leaving it as an inert stub — recommended because it is fully dead (zero frontend callers) and would otherwise sit alongside `updateStatus()`-based Approve/Cancel as a second, semantically wrong "create-on-accept" path once CRM-1C lands.

Set to **AWAITING CHATGPT REVIEW**. No source changed this round.
