# Account Station → Settings → Tools → Profile — Active Work

## Status
**AWAITING REVIEWER REVIEW — bounded Disable/Enable correction pushed to topic only.**
Builder Claude; Reviewer ChatGPT. No `main` push/deployment; Phase 2 UI not started.

## Pushed topic
`global-profile-platform-settings` `1fa3355b` → `3250f9a4` (one commit, 4 files, +45/-6, on top of the already-reviewed candidate — no unrelated files touched).

## Patch, against each correction
1. **Disable/Enable gated like Publish.** `AccountController::updateStatus()` now checks `AccountRepository::isBootstrapped()` for the `action` branch (disable/enable) before calling `applyDisabledMask()`, exactly mirroring the existing Publish guard — same message, same 422, same one predicate. Previously this branch ran the mask write first with no existence check at all, which was the actual defect: a never-bootstrapped install's default `platform_status='disabled'` reads as live to `StationLifecycle::isLive()`, so a stray `disable`/`enable` call would mutate a singleton with no identity yet.
2. **One coherent existence predicate, strengthened.** `AccountRepository::isBootstrapped()` no longer checks only the Profile leaf — it now requires all four chain nodes (`account_station`, `settings`, `tools`, `profile`) to be bound. All three lifecycle routes (Publish, Disable, Enable) call this same single method; no second predicate was introduced. Added an isolated repository-level test proving a Profile id alone (the other three still empty) is **not** read as bootstrapped, and only becomes `true` once all four are written.
3. **Focused before/after tests.** Added: pre-bootstrap Disable rejected (422, zero options writes); pre-bootstrap Enable rejected (422, zero options writes). The existing post-bootstrap Disable/Enable checks later in the same narrative (mask semantics, `previous_platform_status`, module-status preservation) are unchanged and still pass, proving Service's existing mask behaviour is retained once bootstrapped. Concurrency note unchanged from last round: these remain single-process stub simulations, not real parallel HTTP/DB proof — no locking/transactions added, since no new failure mode was demonstrated beyond the ordering bug itself.
4. **Archive/Trash/permanent-delete:** untouched, still the explicitly deferred Owner decision from the handover doc. No exception invented, no redesign.
5. Work file updated with exact SHA/diff/tests below; topic and coordination both pushed; stopping here per the handoff rule.

## Tests
`php tests/account-station.php` — **48/48 checks pass** (was 42; +6 for this round: Disable/Enable pre-bootstrap rejection ×2, the writes-nothing check for each, and the two-sided `isBootstrapped()` all-four-nodes probe). `php tests/platform-identifier-station.php` — still fails only on the pre-existing, unrelated `tier_catalogue`/`tier_edition_catalogue` gap on `main` itself; not touched, disclosed again for completeness.

## Code Map
`docs/code-map/account-station.md` updated: the Lifecycle section now states Publish, Disable and Enable all share `isBootstrapped()`, and that it requires all four chain nodes, not just Profile. Exactly 600 words — at the limit, not over.

## Scope check
Touched files this round: `AccountController.php`, `AccountRepository.php`, `tests/account-station.php`, `docs/code-map/account-station.md`. Nothing else. `main` unchanged.
