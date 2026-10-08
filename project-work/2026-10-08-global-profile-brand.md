# Global Profile — Active Work

## Status
**SOURCE PUSH NOT APPROVED — Phase 1B bounded correction.**
Reviewer verdict: **Proceed with safeguards**. Builder Claude; live validator Nath.
Production `main`: `8d1f0185811e69214c0fd85c29819eef0c5d9226`.
Topic `global-profile-platform-settings`: `236a345a903c666333f4df11aa2d5d0f24f80b6c`.
Three existing branches; **no deployment or Phase 2 yet**.

## Authority
Read `project-work/AGENTS.md`, [locked handover](2026-10-08-global-profile-brand-handover.md), root `AGENTS.md`, `docs/ai-index.md`, relevant Code Maps, `PlatformIdentifierPolicy.php`, actual source and pushed diff. Platform Settings `CZPSXXXXX` and Profile `CZPSPXXXXX` are permanent identities via existing Platform Identifier Station, with parent-child links. CompuZign owns Profile, assets, persistence and authenticated APIs; Service Settings only presents it. Owner Option A supports secure image decoding/conversion. Full Phase 1A evidence: coordination commit `d90da463`.

## Independent Phase 1B review — 2026-10-08
Independently compared original candidate `58cf5dc8` with correction `236a345a`: five correction files, including new `tests/platform-settings-safety.php`. Reviewed actual image processing, canonical GET identity verification, non-overwriting asset storage, lock-aware sweep, and test cases. **Four prior defects substantially corrected.** Builder reports 86/92 PHP tests passing; six said to fail on baseline. Tests not independently executed. No production or live proof yet.

## Blocking corrections — same topic branch only
1. **Source length:** `src/PlatformSettings/PlatformSettingsStation.php` is **611 physical lines** (limit **600**). Refactor by coherent responsibility, not cosmetic chopping; preserve public API, identity, failure paths and contracts. No added code file over 600 lines or 1,000 under any circumstances. Verify all modified code lengths and report measurements.
2. **Atomicity:** `saveProfile()` checks `holdsLock()`, then calls non-CAS `writeProfile()`. A 60-second lock may expire between those operations; another writer could commit a newer revision. Demonstrate/provide safe **atomic revision-and-lock-conditioned Profile commit**, or a rigorously proven serialization contract without stale-writer overwrite. Test simulated lock takeover *between check and write*, concurrent expected revisions, and no referenced-file deletion. Do not widen into unrelated storage framework.
3. **Validation evidence:** rerun Phase 1B focused tests and broader contracts; identify exact six inherited failures by test name against `main`. No claim of full pass without evidence.

## Documentation discipline
This active file must remain **≤600 words**. Keep durable full requirements in handover, exact evidence in source Code Maps/tests and Git commit history. Code Maps ≤600 words; source code ≤600 lines per file, ≤1,000 absolute. Builder may condense this reviewer narrative **only to preserve status, gates, findings and instructions**; no dropping accepted constraints.

## Handoff
Claude implements the above corrections, pushes **same topic branch only**, records exact new SHA, code/document line/word counts and tests here, sets `AWAITING REVIEWER REVIEW`, then stops. Reviewer independently audits actual pushed diff and sets `SOURCE PUSH APPROVED` or `SOURCE PUSH NOT APPROVED`. Phases 2–4 remain locked.
