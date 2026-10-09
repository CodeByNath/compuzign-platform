# Account Station → Settings → Tools → Profile — Active Work

## Status
**READY FOR BUILDER — Phase 1 bounded contract evidence.** Reviewer verdict **Proceed with safeguards**. Production `main@cda11026dbbff0574fef3b8c620f7e1cec842ee6`, exact approved safeguard correction; [Actions deployment 37890270052](https://github.com/CodeByNath/compuzign-platform/actions/runs/37890270052) succeeded. Phase 2 frontend **not authorised**.

## Accepted architecture / boundaries
Account is a peer Station; Settings, Tools, Profile are Account-owned children, Brand is Profile's first module. IDs: `CZA/CZAS/CZAST/CZASTP`; Identifier Station mints/binds; Account owns drafts, canonical storage and lifecycle. Service/Category and the locked Station lifecycle are the comparison baseline. No source change from Reviewer; no other Station refactor.

## Evidence and decisions — 2026-10-09
- Independently accepted `cda11026` correction: settle rejects absent/incomplete four-node bootstrap before writes; negative Logo/Favicon ID rejects Save; zero/null still Clear. Builder reports **60/60** in-process contract checks, not independently executed.
- Owner's earlier live authenticated GET returned HTTP 200, expected unbootstrapped state, and incognito GET denied access, **on prior SHA `3250f9a4` only**. No Account Profile frontend exists in Phase 1. Do not claim the old browser check proves new SHA.
- Claude reports no Chrome/computer-use capability in current VS Code session. Do not ask Owner for manual API/console/backend checks. Chrome on production is strictly read-only absent exact action authorization.
- In a separate Codex browser audit, a Service was accidentally changed; Owner says Service is re-enabled. **Restoration is Owner-reported, not independently verified.** The unintended mutation remains a browser-safety incident, not an Account source defect.
- `src/Core/PlatformAccess.php` contains a **pre-existing** hardcoded default account password. Urgent separate credential rotation/provisioning security action remains open. Do not reproduce password in reports.
- Singleton Archive/Trash/permanent deletion decision deferred; no silent lifecycle exemption.

## Reviewer decision on latest Claude report
**Proceed with safeguards; do NOT accept blanket deferral of all seven gaps to Phase 2.** Claude's coverage inventory is credible against source: in-process test stubs call real controller handlers but not actual REST dispatch/capability, Media Library, persistent DB or concurrent HTTP behavior. Do not treat missing integration evidence as an Account architecture failure, and do not require unsafe production mutations.

## Next bounded Builder action
1. Extend existing **Account contract tests only** (or a focused peer file if warranted) to assert canonical `registerRoutes()` route/method/permission registrations and `requireAdmin()` allowed/denied cases using non-production stubs. Verify tests genuinely exercise source. Follow root `AGENTS.md`, local authority, Service baseline. Do not change Account production behaviour.
2. Run focused checks; record exact changed paths, evidence, SHA and known test limits. Submit topic branch to independent Reviewer (`AWAITING REVIEWER REVIEW`) before any push to `main`. Do not bypass three-branch limit; reuse current topic branch.
3. Propose a **non-production** end-to-end integration path for persistence, attachments, POST lifecycle and concurrency; identify which checks can only be completed once Phase 2 UI exists. Do not claim UI use alone proves all integration properties. No production POST, Save/Publish, Service tests or live browser exploration.
4. Flag separate security correction for hardcoded default credential; Owner should rotate existing account password if present. No security source changes inside this bounded contract phase.

**Owner-facing rule:** validate CompuZign UI only when useful; never assign manual backend/runtime testing to Owner. **Stop for Reviewer after Builder handoff; Phase 2 remains held.**
