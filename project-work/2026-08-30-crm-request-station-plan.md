# CRM Request Station plan

## Status
- **AWAITING CHATGPT REVIEW** — lock ownership/CAS takeover resolved below. No source changes.
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

---

## Claude Report — CRM-1A revision, lock ownership + CAS takeover — 2026-08-30

No source changes. Everything else from the prior three rounds is unchanged. This round replaces the flawed `delete_option()`-then-`add_option()` takeover with an opaque-token, compare-and-swap design — no generic locking subsystem, four narrow methods on `RequestRepository` only.

### Lock value shape

The stored option value is a single opaque string, `"{token}|{claimedAt}"` (`token` = `bin2hex(random_bytes(16))`, matching the codebase's existing `QuoteViewSecret::generate()` precedent for random tokens) — never an array, so it round-trips through `$wpdb` as literal bytes with no `maybe_serialize()` ambiguity to reason about in a `WHERE` clause. Every method that would mutate an existing lock takes the **exact previously-observed value string** as its comparison operand — nothing is ever reconstructed or assumed.

### Four primitives (`RequestRepository`, narrow, Request-specific)

```php
claimCreationLock(string $quoteRef): ?string
// add_option($this->lockKey($quoteRef), $value, '', 'no') — fresh insert, already atomic.
// Returns the value string it just wrote, or null if the option already existed.

releaseCreationLock(string $quoteRef, string $myLockValue): void
// $wpdb->query($wpdb->prepare(
//     "DELETE FROM {$wpdb->options} WHERE option_name = %s AND option_value = %s",
//     $this->lockKey($quoteRef), $myLockValue
// ));
// Deletes ONLY if the row still holds exactly the value this call wrote. If a stale-takeover has
// since replaced it, the WHERE doesn't match, 0 rows affected, silent no-op — this call's release can
// never remove a different owner's fresh claim, including its own former lock after losing a takeover race.

observeLockValue(string $quoteRef): ?string
// Plain get_option() — read-only, used to decide staleness and as the CAS comparison operand.

takeoverStaleLock(string $quoteRef, string $observedValue): ?string
// $affected = $wpdb->query($wpdb->prepare(
//     "UPDATE {$wpdb->options} SET option_value = %s WHERE option_name = %s AND option_value = %s",
//     $newValue, $this->lockKey($quoteRef), $observedValue
// ));
// return $affected === 1 ? $newValue : null;
// A SINGLE atomic conditional UPDATE — compare-and-swap on the exact bytes this caller last observed.
// If anyone else's claim/release/takeover has touched the row since, $observedValue no longer matches,
// the UPDATE affects 0 rows, and this call gets null back — it never deletes or overwrites what it finds.
```

### Orchestration — `acquireOrJoinDurableRequest()` (new private method, replaces the round-3 sketch)

```php
$existing = $this->requests->findPostIdByRef($quoteRef);
if ($existing !== null) return ['post_id' => $existing, 'created_by_this_call' => false];

$myLockValue = $this->requests->claimCreationLock($quoteRef);

if ($myLockValue === null) {
    // Someone else holds it: poll ~2s (40 x 50ms) for their post.
    if ($found = $this->pollForPost($quoteRef, 40)) {
        return ['post_id' => $found, 'created_by_this_call' => false];
    }

    // Still nothing: at most ONE takeover attempt, CAS-only, never a blind delete+add.
    $observed = $this->requests->observeLockValue($quoteRef);
    if ($observed !== null && self::lockAgeFrom($observed) > 10) {
        $myLockValue = $this->requests->takeoverStaleLock($quoteRef, $observed);
        // null here means we lost the CAS race to a concurrent taker — the required A/B case.
    }

    if ($myLockValue === null) {
        // Either takeover wasn't warranted or we lost it — one more short poll, then give up.
        if ($found = $this->pollForPost($quoteRef, 20)) {
            return ['post_id' => $found, 'created_by_this_call' => false];
        }
        return ['post_id' => null, 'created_by_this_call' => false];  // -> submitRequest() returns 503; nothing created, nothing to roll back
    }
}

// We hold the lock now — either a fresh claim or a won CAS takeover.
try {
    $existing = $this->requests->findPostIdByRef($quoteRef);  // closes the narrow claim/insert window
    if ($existing !== null) return ['post_id' => $existing, 'created_by_this_call' => false];
    return $this->createDurableRequest($payload);  // reserve -> wp_insert_post -> assign -> rollback-on-failure, unchanged from round 2/3
} finally {
    $this->requests->releaseCreationLock($quoteRef, $myLockValue);
}
```

`submitRequest()` calls this once, then branches exactly as in round 3: `post_id === null` → `503`; `created_by_this_call === true` → skip comparison, proceed straight to view-secret/transient/email using `$payload` as-is (it IS what was just written); otherwise → the unchanged Blocker-1 `payloadsMatch()`/reuse-or-`409` flow. Rollback (`wp_delete_post`) still only ever runs inside `createDurableRequest()`, against the post ID its own `wp_insert_post()` call just returned — the ownership contract from round 3 is unchanged, now built on a lock that can't silently change hands underneath it.

### Required regression — caller A / caller B stale-takeover race

New case in `tests/request-durable-submission.php`: a lock is seeded already stale (`claimedAt` > 10s old, no corresponding post — simulating a crashed prior winner). Caller B's `takeoverStaleLock()` is invoked first and succeeds (row now holds B's fresh value). Caller A then attempts `takeoverStaleLock()` using the **original stale value** it observed before B ran (mirrors the audit's exact ordering: "A observes a stale lock, B acquires/replaces it before A attempts takeover"). Assert:
- A's `takeoverStaleLock()` returns `null` (CAS comparison fails — the row no longer holds the value A observed).
- The option row still holds exactly B's value afterward, untouched by A.
- A never calls `wp_insert_post()` (no duplicate creation attempt) — it falls through to `pollForPost()` instead.
- Once B finishes creating its post, A's fallback poll finds it and A converges via the ordinary `created_by_this_call === false` reuse path.

Existing coverage from round 3 (concurrent-identical, concurrent-conflicting, assignment-failure rollback, stale-lock recovery with no live contender) is retained, re-expressed against the four new primitives above instead of the round-3 `delete_option()`-then-`add_option()` shape.

Set to **AWAITING CHATGPT REVIEW**. No source changed this round.
