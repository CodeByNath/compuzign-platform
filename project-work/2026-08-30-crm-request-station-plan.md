# CRM Request Station plan

## Status
- **AWAITING CHATGPT REVIEW** — both blockers resolved below. No source changes.
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

---

## Claude Report — CRM-1A revision, blockers resolved — 2026-08-30

No source changes. Both blockers addressed below; the three prior judgment calls are resolved per "Other decisions" (fail-closed approved, `/accept` removal approved, `platformIdExists()` now used instead of a hardcoded `false`).

### Blocker 1 — retry never mixes durable and incoming payloads

Revised `submitRequest()` step 3 (replaces the previous "skip straight to transient/email from the new payload" short-circuit):

```
$existingPostId = $this->requests->findPostIdByRef($quoteRef);
if ($existingPostId !== null) {
    $stored = $this->requests->findByRef($quoteRef)['data'];   // the durable snapshot, authoritative
    if (!self::payloadsMatch($stored, $payload)) {
        return 409 {"success": false, "message": "This quote reference was already submitted with different details. Please start a new request."};
        // no post mutation, no transient, no emails
    }
    $payload = $stored;   // reuse the STORED durable snapshot for transient/email regeneration —
                           // the incoming payload is discarded once proven identical, so the
                           // quote-view transient can never diverge from the durable record
    // fall through to step 6 (view secret / transient / emails) using this $payload
} else {
    // reserve -> create -> assign, as in the previous round's plan
}
```

`payloadsMatch(array $stored, array $incoming): bool` — new private helper on `RequestsController`, strict `===` comparison after unsetting the one known-volatile field, `submitted` (the `current_time('mysql')` timestamp `RequestSchema::validate()` stamps fresh on every call — the only field guaranteed to differ between two otherwise-identical resubmissions). Deliberately exact, not a semantic/fuzzy diff: any other field difference — including a re-ordered `items` array — is treated as a genuine collision, since a false "same" match is the dangerous direction here (it would regenerate a quote-view transient/email from data that silently doesn't match the durable Request), while a false "different" match only costs the customer a fresh `quote_ref`.

This makes the durable `cz_request` **and** every quote-view transient ever regenerated for that ref provably trace back to the exact payload that first created the durable record — never a payload the durable record hasn't seen.

**New regression coverage** (extends the `tests/request-durable-submission.php` design from the prior round):
- Same-ref, same-payload (differing only in `submitted`) retry: exactly one durable post/`CZR` exists after both calls; the second call's transient/email use the **first** call's stored snapshot verbatim; `reserve()` called exactly once total.
- Same-ref, different-payload (e.g. a different `email` or `items` entry) retry: second call returns `409`; the durable post/meta from the first call is byte-identical before and after; zero additional `set_transient`/`wp_mail` calls.

### Blocker 2 — legacy `new` records stay readable, no dual lifecycle system

`RequestLifecycle` keeps exactly one active vocabulary (`pending/approved/cancelled`) plus a narrow, private, read-only compatibility map — not a second active system:

```php
public const STATUS_PENDING   = 'pending';
public const STATUS_APPROVED  = 'approved';
public const STATUS_CANCELLED = 'cancelled';
public const ACTIVE_STATUSES  = [self::STATUS_PENDING, self::STATUS_APPROVED, self::STATUS_CANCELLED];

// Read-boundary compatibility only, for pre-CRM-1A `cz_request_status = new`
// records written by the now-retired admin /accept bridge. reviewing/quoted/
// closed had no active writer anywhere in production source (confirmed by
// repo-wide grep the prior round) and are deliberately NOT mapped — inventing
// migration behavior for a state nothing ever wrote would be a guess, not a
// fact-driven fix.
private const LEGACY_STATUS_MAP = ['new' => self::STATUS_PENDING];

public static function normalizeLegacy(string $status): string
{
    return self::LEGACY_STATUS_MAP[$status] ?? $status;
}
```

`RequestRepository::hydrate()`'s status line becomes:
```php
'status' => ($status !== '' && $status !== false)
    ? RequestLifecycle::normalizeLegacy((string) $status)
    : RequestLifecycle::STATUS_PENDING,
```
So every read path (`findAll()`, `findByRef()`, and therefore the Blocker-1 `payloadsMatch()`/reuse flow above) transparently reports `pending` for a legacy `new` record — the stored `cz_request_status` postmeta value itself is left untouched at `new` until an actual CRM mutation writes it. `updateStatus()` is unaffected: it validates the incoming target status against `ACTIVE_STATUSES` (never the stored value), so a legacy record can only ever be written forward into the new vocabulary, never back into the old one. This is the "normalize at the boundary, persist forward on next write" shape requested — one field, one active vocabulary, a documented and bounded read-time shim.

**New regression coverage**: a `cz_request` post seeded directly with `cz_request_status = 'new'` (bypassing `create()`, simulating a pre-CRM-1A record) reads back as `status: 'pending'` through `findByRef()`/`findAll()`, and — once `updateStatus()` writes `approved` to it — the stored postmeta itself becomes `approved`, never reverting to `new`.

### Carried forward unchanged from the prior round

File list, rollback order (reserve → `wp_insert_post` → `assign()` → rollback via `wp_delete_post` guarded by the same-reservation check, mirroring `AdminCategoriesController::createCategory()`), the separate-transient-payload fix so `cz_request_data` never carries `view_secret_hash`, `/accept` route removal, `PlatformIdentifierPolicy::REQUEST => 'CZR'`, and the Code Map updates to `docs/code-map/quote-builder.md` and `docs/code-map/platform-identifier-station.md` — all as reported in the prior round, with one correction: the `reserve()` call's `authoritativeIdExists` argument is now `fn(string $id): bool => $this->requests->platformIdExists($id)` (the already-planned repository method), not the hardcoded `fn(): bool => false` from the previous draft.

Set to **AWAITING CHATGPT REVIEW**. No source changed this round.
