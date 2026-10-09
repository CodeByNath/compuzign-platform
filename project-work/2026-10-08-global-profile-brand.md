# Account Station → Settings → Tools → Profile — Active Work

## Status
**AWAITING BUILDER RESPONSE — Phase 1 closeout evidence and browser-safety handoff.** Production `main` = `cda11026dbbff0574fef3b8c620f7e1cec842ee6` (exact reviewer-approved candidate, fast-forward from `3250f9a4`). No Phase 2 UI authorised.

## Reviewer cycle — 2026-10-09; Owner-reported Service restoration
**Verdict: Proceed with safeguards.** Production `main@cda11026dbbff0574fef3b8c620f7e1cec842ee6` remains the approved/deployed Phase 1 correction. Owner reports Codex's interactive Chrome audit **accidentally changed an existing Service state**; Owner has **re-enabled the Service**. Treat the Service incident as **restored per Owner report**, not independently reverified and not an outstanding requested mutation. Retain it as a **confirmed browser-automation safety failure**: browser-control permission did not authorize platform state changes. The incident does **not** establish an Account Station defect or reverse source approval.

**Claude's next action (no source changes authorised):** Read this file and `project-work/AGENTS.md`. Record/acknowledge that interactive production validation must be strictly read-only: no clicking uncertain controls that can Save/Publish/Disable/Enable or mutate records; no exploratory mutation, even under general browser permission. Review existing Phase 1 test/evidence and report which CompuZign integration/contract boundaries are covered, which remain unverified, and a safe non-production verification/defer proposal. Do not ask Owner to perform manual backend checks or re-test the restored Service. VS Code Chrome capability is unavailable in current Claude environment. Do not request new Codex production browser exploration until a safe, specifically bounded checklist is approved. The existing Phase 1 backend has no Profile UI to live-test. Stop for Reviewer after reporting; **Phase 2 is not authorised**.

## Owner correction — validation handoff boundary (2026-10-09)
Nath explicitly disallows further requests for "WordPress testing" or manual backend/REST/console validation. Both Builder and Reviewer must follow `project-work/AGENTS.md` Owner validation boundary. Previous requests for repeat authenticated GET/incognito checks, or Owner decisions framed around real-WP mutation tests, are **superseded**. Technical API/storage/authorization/lifecycle verification stays Builder-owned with independent Reviewer audit; it is not removed. Builder should first use authorized VS Code Chrome for read-only live CompuZign Admin checks at `https://compuzign.weerax.com/studio/` if available, then provide URL/screenshots and exact deployed SHA; never assume VS Code browser access exists. No further Owner backend testing; request Owner judgement only on the real Profile UI once available. No live Save/Publish/configuration or persistent-state change without specific authorization. This instruction does **not** by itself approve deferring required technical verification or authorize Phase 2.

## Builder deployment handoff — 2026-10-09
- Pushed exact approved SHA `cda11026` to `main` (fast-forward `3250f9a4..cda11026`); no other source change. Topic branch still at the same SHA.
- Actions **Deploy to Hostinger** run [37890270052](https://github.com/CodeByNath/compuzign-platform/actions/runs/37890270052): `success`, headSha `cda11026dbbff0574fef3b8c620f7e1cec842ee6`, completed 2026-10-09T05:48:08Z.
- At this handoff Builder had not supplied independent browser evidence. New governance permits read-only VS Code Chrome live validation if available and authorized; it does not retroactively establish a browser check.

**SUPERSEDED: historical live-validation request (do not ask Nath to perform):**
1. Signed in as the platform admin, open `/wp-json/compuzign/v1/admin/account-station` → expect 200 with the same pre-bootstrap shape as before (no new errors).
2. Signed out / private window, same URL → expect 401/403 denial.
3. Do **not** POST to `/profile`, `/profile/settle` or `/status` on production.

**Owner decisions outstanding (not Builder-actionable):**
- Technical agents must determine and document safe CompuZign lifecycle/integration verification; any remaining technical-evidence gate is not a manual task for Nath.
- Rotate the existing `accountmanager` live credential; approve opening a separate bounded work item for `PlatformAccess.php` secure provisioning (`wp_generate_password()`).
- Singleton Archive/Trash decision remains deferred.

## Independent Reviewer decision — 2026-10-09
**Verdict: Proceed with safeguards.** Independently verified remote topic `global-profile-platform-settings@cda11026dbbff0574fef3b8c620f7e1cec842ee6` is exactly one commit ahead of `main@3250f9a4e2babcc872f6e0db0d5c1590de9a63ae` (four changed files: Controller, Schema, Account contract, Code Map). `settleProfile()` now checks the existing four-node `isBootstrapped()` before writing; negative attachment IDs now fail rather than clear, preserving null/zero Clear. Inspected regressions explicitly assert 422 and unchanged option/draft on never-/half-bootstrap and negative Logo/Favicon. Builder reports 60/60 stub checks passing; Reviewer did not execute them. **Source push approved for this exact candidate only**; any changed source requires re-review. Builder may fast-forward this SHA to `main`, verify Actions for the same SHA, then hand off deployment evidence. The earlier Nath live GET/401 tests validated the previous production SHA only; do not claim they validate the new deployment. Real WordPress mutation testing deferred **only if Owner approves**; Phase 2 remains held. Pre-existing default-user password issue is a separate security correction, not a newly introduced defect in this candidate; Owner should rotate any existing live credential and review provisioning promptly. No reviewer source edits.

## Builder response — 2026-10-09 (`cda11026`)
- **Item 2 done.** `settleProfile()` returns 422 before any write unless `isBootstrapped()` (same as `updateStatus()`). `resolveAttachmentId()`: null/''/0 → Clear; negative → Save 422. Service has no attachment-ID baseline (ids constrained by route regex), so this is new-domain verification.
- **Files:** `AccountController.php`, `AccountSchema.php`, `tests/account-station.php`, Account Code Map (599 words).
- **Tests (stubs only):** `account-station.php` 60/60: never- and half-bootstrapped settle 422 with option store unchanged; negative Logo/Favicon 422, draft unchanged; 0/null still Clear. Regressions FAIL on pre-fix source. `platform-identifier-station.php` failure unchanged.
- **Item 3:** pre-existing since `34c8175b` (2026-07-23); topic doesn't touch `PlatformAccess.php`. Proposed separate item: provision with `wp_generate_password()`, Owner sets password via WP reset. Owner should rotate live password now.
- **Item 4:** Builder requests Owner-approved deferment of real-WP mutating tests to Phase 2 live validation.

## Reviewer source verdict — 2026-10-09
**Proceed with safeguards.** Independently checked topic `cda11026dbbff0574fef3b8c620f7e1cec842ee6`: direct child of production `main@3250f9a4`, exactly four changed files (Account controller, schema, contract test, Code Map). The new `settleProfile()` guard fails 422 before canonical/lifecycle writes on incomplete identity; `resolveAttachmentId()` rejects negatives while retaining null/empty/zero Clear. Tests add never-/half-bootstrap unchanged-storage checks and negative Logo/Favicon unchanged-draft checks; Builder reports 60/60 passing, not independently run. Scope respects Account persistence and Service baseline. **Source push approved for this exact SHA only**; any source change requires re-review. Builder may fast-forward this reviewed commit to `main` and record exact Actions deployment; no Phase 2 UI or unapproved live POST testing.

**Unresolved gates:** Production still runs old `3250f9a4` until new approved push/deploy. Nath already passed pre-bootstrap read-only REST gate on old SHA; do not re-ask that check as if it proved new code. Mutating real-WP lifecycle validation requires Owner-authorised safe test/defer decision; Builder requested deferral to Phase 2, **not yet Owner-approved**. Existing hardcoded provisioning password predates this change; separately assess and rotate any live account credential. Do not close Phase 1 or begin Phase 2 automatically.

## Baseline and scope
`main` at audit: `8d1f0185811e69214c0fd85c29819eef0c5d9226`. Topic: `global-profile-platform-settings`. Actual main→topic diff: 13 files (Account backend, four Platform Identifier prefixes, tests, Code Maps, wiring). No new packages, frontend registration, WEX or other product areas. Old `PlatformSettings` candidate was fully reverted. Owner model: **Account Station → Settings → Tools → Profile**, prefixes `CZA/CZAS/CZAST/CZASTP` + five-character suffix. Account is peer Station; others are children, not Stations. Station Manager coordinates; Admin presents; Identifier Station mints/binds.

## Independent audit — 2026-10-09
Compared `1fa3355b` → `3250f9a4` (four files: `AccountController.php`, `AccountRepository.php`, `tests/account-station.php`, Account Code Map) and current full diff against `main`.

**Accepted:** `updateStatus()` now blocks Publish **and** Disable/Enable before Account bootstrap. `isBootstrapped()` requires nonempty IDs at all four levels rather than only Profile. The controller's existing authenticated route gate remains `PlatformAccess::CAP`. Service Station establishes independent settle/status endpoints, Active Station with Pending module drafts, and ordinary separate WordPress writes; do **not** reinterpret these baseline practices as Account architecture violations or demand new CAS/transaction machinery. Phase 1 is backend-only and its separate settle/status APIs match Service's integration model.

**Evidence:** Builder reports `php tests/account-station.php` **48/48** checks passed, including pre-bootstrap mask rejection and four-node presence; checks use WordPress option stubs rather than live WP/DB. Not independently executed by Reviewer. Independent source inspection confirms the added code paths. Pre-existing `tests/platform-identifier-station.php` `tier_catalogue` expected-vocabulary mismatch remains; do not silently widen this phase. Account Code Map reported 600 words; no changed PHP source exceeds 600 physical lines.

## Safeguards and next work — Reviewer verdict: Proceed with safeguards
1. **Done:** exact reviewed `main` commit deployed; Nath completed authenticated GET and unauthenticated denial checks. Do not request these again.
2. **Builder bounded Phase 1 correction:** pre-bootstrap settle rejection and negative attachment-ID rejection with regressions — Builder reports done in `cda11026` (see Builder response).
3. **Security review required before closure:** `src/Core/PlatformAccess.php` provisions a default `accountmanager` with a hardcoded password. Have Builder assess whether this is pre-existing baseline and propose a separate, strictly bounded secure provisioning change; Owner should rotate the account password if present. Do not print credentials in handoffs or extend Account product scope casually.
4. **Unverified:** authenticated POST dispatch, real WordPress attachment acceptance/rejection, durable four-node bootstrap/retry, draft-versus-canonical isolation, settlement and Publish/Disable/Enable. Existing 48/48 checks are stubbed controller tests only. Builder to provide proportional real-WP evidence or explicitly request Owner-approved deferment of mutating tests; do not call POST against production solely for verification.
5. **Deferred:** singleton Archive/Trash/permanent deletion Owner decision; Phase 2 peer frontend, Admin placement, Profile editor, WEX, multiuser/roles. No further phase is authorised until Phase 1 safeguards are reviewed or explicitly deferred.

## Builder live-validation cycle check — 2026-10-09
- Confirmed local/remote `main` = `cda11026dbbff0574fef3b8c620f7e1cec842ee6`, matching the recorded deployed SHA exactly; no source drift.
- No authorized VS Code Chrome/browser capability is present in this Builder session, so no read-only live Admin UI check could be attempted this cycle.
- This correction (`cda11026`) is backend-only; no Phase 2 UI is authorised, so there is no CompuZign Admin/customer UI surface yet on which Nath could perform a meaningful live check of `settleProfile()`'s new pre-bootstrap/negative-attachment-ID guard.
- Per `project-work/AGENTS.md` Owner validation boundary: recording that this UI validation is unavailable and deferring it to the relevant UI phase, rather than requesting a manual backend/REST substitute from Nath.
- Status unchanged (`AWAITING LIVE VALIDATION`); no further Builder action pending Reviewer/Owner decision on closing or deferring this gate.

## Claude coverage report — 2026-10-09 (no source changes; responding to Reviewer cycle above)
**Browser-safety acknowledgment:** interactive production validation is read-only only — no Save/Publish/Disable/Enable or other mutating click, even under general browser permission, without separate explicit Owner authorization for that exact action. No authorized VS Code Chrome capability exists in this Claude environment this cycle, so no live check (read-only or otherwise) was attempted. No new Codex production browser exploration is requested. Not asking Nath to re-test the restored Service or perform any manual backend check.

**Source reviewed:** `main@cda11026` — `AccountController.php`, `AccountSchema.php`, `tests/account-station.php` (not present on `Project-work-instructions`'s own `wp-content` snapshot; read via `git show main:<path>` without altering this branch's tree).

**Covered by the existing stub suite (`tests/account-station.php`, in-process PHP calling the real controller/schema/repository classes against an in-memory options array):**
- Four-node bootstrap: first-Save mint, parent-chain correctness, idempotent resume, interrupted-bootstrap resume, corrupted-parent conflict rejection, losing-concurrent-reservation fails closed.
- `isBootstrapped()` requires all four nodes, never the Profile leaf alone.
- The Phase 1 fix itself: `settleProfile()` 422s pre-/half-bootstrap with zero writes (draft, canonical, lifecycle all unchanged); `updateStatus()` 422s Publish and Disable/Enable pre-bootstrap with zero writes.
- `resolveAttachmentId()`: valid image id accepted; non-existent id 422s the whole Save closed; negative id 422s closed (both Logo and Favicon); `0`/`null` remain deliberate Clears.
- Draft/canonical isolation (pending draft never leaks into canonical read; settle is the only promotion path) and module_status transitions (pending on Save, settled on settle, untouched by Disable).
- Publish/Disable/Enable state machine: disabled→active once, reject re-publish, Disable masks with `previous_platform_status` capture, Enable always lands back in unmasked disabled (never straight to active).

**Not covered — real-WordPress/integration surface, unverified by this suite:**
1. Real REST dispatch: route registration, nonce/cookie auth, and `requireAdmin()`/`current_user_can(PlatformAccess::CAP)` evaluated against the real capability framework. The stub calls controller handler methods directly and never exercises `registerRoutes()` or `requireAdmin()` at all.
2. `wp_attachment_is_image()` against real Media Library rows — the stub hardcodes a fake attachment id in a PHP array, not a real post/mime-type check.
3. Real `get_option`/`update_option`/`add_option` persistence to the live options table — durability, autoload, and serialization are stubbed as a plain in-memory array.
4. True concurrent-request behavior at the real DB/locking level — the race test shares one in-process array across two Repository instances in a single PHP process, not two real concurrent HTTP requests.
5. The pre-existing hardcoded `accountmanager` provisioning password (separate flagged item, not touched by this fix) and whether the live credential has actually been rotated.
6. `POST /profile/settle` and `POST /status` have never been exercised against production at all, at any SHA — Nath's only prior live check was an authenticated `GET /admin/account-station` against the **old** `3250f9a4` SHA, which predates this fix and does not validate it.
7. No Profile UI exists yet (Phase 2 not authorised), so no end-to-end click path has ever driven this code.

**Safe non-production verification/defer proposal:** Builder has no local WP environment, and interactive production validation must stay strictly read-only with no further Owner-performed backend/REST checks — so none of the seven gaps above can be closed safely right now. Proposing: (a) defer all seven to Phase 2, when the real Profile UI exists and normal intended use naturally exercises `POST /profile`, `/settle`, and `/status` end-to-end, at which point Nath's live validation is of the actual UI, matching the Owner validation boundary; (b) as a zero-risk, no-mutation supplementary step Builder could take now if separately authorized, extend the existing PHP stub suite to also call `registerRoutes()`/`requireAdmin()` with a stubbed `current_user_can()`, closing gap 1 without touching live WordPress. No Owner action is requested beyond reading this report. Stopping here for Reviewer; Phase 2 remains not authorised.
