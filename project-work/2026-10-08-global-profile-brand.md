# Global Profile — Active Work

## Status
**SOURCE PUSH NOT APPROVED — Phase 1B backend correction gate.**
Reviewer verdict: **Proceed with safeguards**. Builder Claude; live validator Nath.
`main`: `8d1f0185811e69214c0fd85c29819eef0c5d9226`.
Reviewed topic `global-profile-platform-settings`: `b434dfd4e53ae5145cce918bb12e182798060e7e`. Three branches exist; **no main push or Phase 2 yet**.

## Authority and locked contract
Read `project-work/AGENTS.md`, [locked handover](2026-10-08-global-profile-brand-handover.md), root `AGENTS.md`, `docs/ai-index.md`, relevant Code Maps and source. CompuZign owns global Settings `CZPSXXXXX` and Profile `CZPSPXXXXX`, records/assets, schema, domain validation, identity, and authenticated **platform API**. Runtime database/file storage remains internal infrastructure. Service Station merely presents Settings. Option A image processing and single-Save semantics remain locked. Phase 1A report preserved at coordination commit `d90da463`.

## Independent review — 2026-10-08
Verified pushed correction `236a345a → b434dfd4` (seven changed files). Coherent identity responsibility moved to `PlatformSettingsIdentity.php` (261 lines), main Station reduced to 409 lines; revised repository 212 lines and focused tests within 600-line limit. Canonical REST GET/POST and read-by-ID still exist in `PlatformSettingsController.php`, gated by platform capability + nonce. **Builder did not replace the Platform API with SQL calls.** The new database-specific SQL is inside `PlatformSettingsRepository::commitProfile()` only, to prevent a stale writer committing after losing its lock. UI clients must call REST; never invoke SQL directly.

**Remaining blocker:** The new single-statement conditional `UPDATE … INNER JOIN` using `BINARY` and exact serialized option bytes has **not been exercised against a real compatible database**; Builder used stubs. WordPress option-backed record bootstrap and the CAS mutation must also stay consistent across real cache/storage semantics. Source review alone cannot prove this failure-sensitive commit mechanism. Do not require platform consumers to know SQL, and do not promote MySQL syntax to the public Profile API or portable domain contract.

## Exact next Builder action — same topic branch
1. Validate conditional Profile commit with an **isolated throwaway database** matching the deployed runtime engine/version, without touching live CompuZign data: successful first/update Save, lock takeover between check and write, competing same-revision commits, exact option serialization and cache invalidation, no overwrite, failure response. Report engine/version and reproducible evidence. **No changes to production runtime.**
2. If SQL portability/runtime compatibility requires a change, keep it exclusively behind `PlatformSettingsRepository`/storage adapter boundary; preserve existing REST routes, Platform IDs, persistent schema and one-Save protections. No new database framework or unapproved backend switch.
3. Confirm focused tests and baseline six failures; verify every changed source file ≤600 lines, Code Maps ≤600 words, active work file ≤600 words. Document actual measurements, exact candidate SHA and test results.

Report in **this work file**, set `AWAITING REVIEWER REVIEW`, push same topic branch only and stop. Reviewer verifies before any `SOURCE PUSH APPROVED`. Phases 2–4 locked.
