# Manager Settings / Profile — Active Work

## Status
**BUILDER ACTION REQUIRED — STOP OLD PHASE 1B; CLEANUP + DESIGN GATE.**
Reviewer verdict: **Stop — architectural risk** for continuing the abandoned Global Profile implementation. No `main` push, deployment, or UI build. Builder Claude; Reviewer ChatGPT.

## Authority
Read `project-work/AGENTS.md`, [revised handover](2026-10-08-global-profile-brand-handover.md), root `AGENTS.md`, `docs/ai-index.md`, `docs/code-map/station-manager.md`, `docs/code-map/admin-station.md`, Platform Identifier Code Map/Policy and actual source. Keep **Settings as Settings**, not a new Station. Existing `station-manager/` is coordinator-only; Admin Station owns presentation. Do not silently reclassify either.

## Verified current state
`main`: `8d1f0185811e69214c0fd85c29819eef0c5d9226`.
Unmerged topic `global-profile-platform-settings`: `b434dfd4e53ae5145cce918bb12e182798060e7e`. The diff contains **19 changed files**, including new `src/PlatformSettings/` implementation, three Profile test files, Code Maps, Policy, Plugin wiring, and ID-family reference. Previous database CAS work is **not approved for release**. No confirmed source changes on `main`.

## Owner correction — binding
**Manager → Settings → Tools → Profile**, with these prefixes (five suffix characters each):
- Manager `CZMXXXXX`.
- Settings `CZMSXXXXX`.
- Tools `CZMSTXXXXX`.
- Profile `CZMSTPXXXXX`.

Retire previous planned `CZPS`/`CZPSP` prefixes. Profile is expandable (Brand now; About, Locations, Contact, Social Media later). Do not invent full Stations or databases for these levels. Platform Identifier Station remains sole identity mint/bind/lookup owner. Confirm actual persistent records and parent-child relationship for each ID; no decorative identities.

## Claude — next bounded task
1. **Inventory** all topic-only additions/modifications, dependencies/packages/lockfiles/generated assets and old `CZPS` references against `main`; distinguish pre-existing baseline. Verify local worktree before deletion. Report precise cleanup list.
2. **Remove/revert every abandoned topic-only change** on the **existing topic branch** only. Do not touch pre-existing Platform Identifier Station or any `main` behaviour. No dead references, orphan imports, obsolete tests/docs, unnecessary packages or scratch files. Show clean diff versus `main` or explicitly enumerate every retained intentional difference. Preserve Git history; no unsafe reset or force-push.
3. **Architecture report only after cleanup:** map Manager/Settings/Tools/Profile to current Manager/Admin presentation, ownership, durable records, API and ID registry. Flag any unresolved Manager identity/storage contradiction, recommend the simplest WordPress-backed model. **Do not implement the new hierarchy yet.**
4. Run safe focused non-destructive checks, inspect line counts (≤600 source lines/Code Map words), record exact topic SHA and evidence in this file as `AWAITING REVIEWER REVIEW`; push coordination + topic; stop.

**Reviewer must approve cleanup and ID mapping before any new source implementation.** Keep one work file; no new Station, WEX work, pricing changes or deployment.
