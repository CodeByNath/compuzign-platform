# Account Station → Settings → Tools → Profile — Active Work

## Status
**SOURCE PUSH APPROVED — Account Station contract-only extension.** Topic `global-profile-platform-settings@4d8a5c4a`, one commit ahead of reviewed `cda11026`. Production `main` unchanged at `cda11026dbbff0574fef3b8c620f7e1cec842ee6`; [Actions deployment 37890270052](https://github.com/CodeByNath/compuzign-platform/actions/runs/37890270052) still the deployed candidate. Phase 2 frontend **not authorised**.

## Reviewer source decision — 2026-10-09
**Verdict: Proceed with safeguards.** Independently verified topic `global-profile-platform-settings@4d8a5c4a43a4cd21897f902ef2cae510805d0bd1` is exactly one commit ahead of `main@cda11026dbbff0574fef3b8c620f7e1cec842ee6`; diff changes **only** `wp-content/plugins/compuzign-platform/tests/account-station.php` (+88 lines). Test invokes actual `registerRoutes()`, captures four paths/methods/callbacks/permission hooks and expected argument keys; invokes actual `requireAdmin()` with stubbed capability true/false and asserts `PlatformAccess::CAP`. No product source edits or Station ownership changes. Builder reports 84/84 passing, not independently executed. The arg test checks **keys**, not complete validation semantics; full REST dispatch/persistence/Media Library/concurrent HTTP remain unverified and must not be claimed as passing.

**SOURCE PUSH APPROVED for the exact SHA only.** Builder may fast-forward this reviewed commit to `main` through established workflow, confirm exact GitHub Actions evidence, and report in this file. No repeat Owner backend checks, no production mutations, no Phase 2 UI until separate authorization. Maintain hardcoded-credential issue as separate security work; production credential rotation remains recommended. Browser-automation incident retains strict read-only boundary. After deployment return to Reviewer for Phase 1 closeout/defer decision, without silently waiving integration evidence.

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

## Builder bounded response — 2026-10-09 (`4d8a5c4a`)
- **1–2 done.** Extended only `tests/account-station.php` (no production source touched): captures real `register_rest_route()` calls (as `tests/service-route-baseline.php` does) to assert all four routes' namespace/method/callback/`permission_callback`/args; `current_user_can()` is now controllable (every other `tests/` stub of it always returns `true`), so `requireAdmin()`'s denied branch is actually exercised and shown to check the real `PlatformAccess::CAP` constant, not a hardcoded string. `php tests/account-station.php`: **84/84** (was 60/60). Pushed `4d8a5c4a`, one commit ahead of reviewed `cda11026`, diff is this one file. Limit unchanged: still in-process PHP against stubs, no real REST/HTTP dispatch, role resolution, or Media Library.
- **3.** Persistence/attachment/POST-lifecycle/concurrency verification needs a disposable WordPress instance (`wp-env`/WP-CLI + throwaway DB) Builder doesn't have locally; concurrency needs real concurrent HTTP, not one CLI process. Real nonce/cookie auth and Media Library selection can only be proven once the Phase 2 UI exists to generate authentic requests (gap 6/7 in Claude's prior report).
- **4.** No security source change made; `PlatformAccess.php`'s hardcoded password stays flagged for Owner rotation and a separate provisioning item.
- Three-branch limit respected, topic branch reused. Submitting for independent Reviewer audit.
