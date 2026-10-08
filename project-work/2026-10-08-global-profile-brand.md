# Global Profile — Active Work

## Status
**AWAITING REVIEWER REVIEW — Phase 1B real-engine CAS validation (see Builder validation).**
Reviewer verdict: **Proceed with safeguards**. Builder Claude; live validator Nath.
`main`: `8d1f0185811e69214c0fd85c29819eef0c5d9226`.
Topic `global-profile-platform-settings`: `b434dfd4e53ae5145cce918bb12e182798060e7e` (unchanged; no new push). Three branches exist; **no main push or Phase 2 yet**.

## Authority and locked contract
Read `project-work/AGENTS.md`, [locked handover](2026-10-08-global-profile-brand-handover.md), root `AGENTS.md`, `docs/ai-index.md`, relevant Code Maps and source. CompuZign owns global Settings `CZPSXXXXX` and Profile `CZPSPXXXXX`, records/assets, schema, domain validation, identity, and authenticated **platform API**. Runtime database/file storage remains internal infrastructure. Service Station merely presents Settings. Option A image processing and single-Save semantics remain locked. Phase 1A report preserved at coordination commit `d90da463`.

## Independent review — 2026-10-08
Verified pushed correction `236a345a → b434dfd4` (seven changed files). Coherent identity responsibility moved to `PlatformSettingsIdentity.php` (261 lines), main Station reduced to 409 lines; revised repository 212 lines and focused tests within 600-line limit. Canonical REST GET/POST and read-by-ID still exist in `PlatformSettingsController.php`, gated by platform capability + nonce. **Builder did not replace the Platform API with SQL calls.** The new database-specific SQL is inside `PlatformSettingsRepository::commitProfile()` only, to prevent a stale writer committing after losing its lock. UI clients must call REST; never invoke SQL directly.

**Remaining blocker:** The new single-statement conditional `UPDATE … INNER JOIN` using `BINARY` and exact serialized option bytes has **not been exercised against a real compatible database**; Builder used stubs. WordPress option-backed record bootstrap and the CAS mutation must also stay consistent across real cache/storage semantics. Source review alone cannot prove this failure-sensitive commit mechanism. Do not require platform consumers to know SQL, and do not promote MySQL syntax to the public Profile API or portable domain contract.

## Builder action requested (done below)
Real-engine validation of the conditional commit, any fix kept behind the repository, then gates; full wording in coordination commit `6114b28b`. Phases 2–4 locked.

## Builder validation — candidate `b434dfd4`, no source change
Throwaway local servers, fresh WordPress 7.1.3 with plugin active (real `wpdb`, options, object cache, nonce-gated REST), PHP 8.5.8: **MariaDB 11.8.9** and **MySQL 8.4.11**. No live data or runtime touched. **Deployed engine/version unconfirmed** — Nath: WP Admin → Tools → Site Health → Info → Database.

Identical results on both engines, all pass:
- First Save mints `CZPS`/`CZPSP`, revision 1; update Saves +1, IDs unchanged; all GET routes agree.
- Lock taken over between SELECT and CAS UPDATE → 409 `settings_busy`; Profile bytes untouched; new owner's lock kept.
- Same-revision commit by takeover winner → 409, winner preserved. Profile changed with lock held → 409 `revision_conflict`.
- 8 parallel REST Saves × 12 rounds, plus × 6 from a stale lock: exactly one 200, revision +1 each round.
- Stored bytes = `serialize()`; 200 KB payload (`%`, quotes, backslashes, NUL, CRLF, emoji) chain-commits. Case-only change (equal under `_ci`) rejected. Invalid UTF-8 refused without writing.
- Primed object cache invalidated; autoload `off`.
- Real DB error (lock-wait timeout) → 500 `storage_failed`, Profile untouched, lock released.

**Finding:** MySQL 8.4 raises warning 1287 (`BINARY expr` deprecated, future removal); MariaDB none. `CAST(… AS BINARY)` verified equivalent and warning-free on both. Proposed one-line repository-only change — **not made**; Reviewer decides.

**Gates:** focused 4/4 pass; suite 86/92, same six inherited failures as `main` (`main` additionally fails the identifier test fixed here). Changed source max 409 lines. Code Maps: `platform-settings` 553 words; **`platform-identifier-station` 698 (697 on `main`) — pre-existing over 600**, trim proposed, not made. Harness kept in Builder scratchpad, not committed.
