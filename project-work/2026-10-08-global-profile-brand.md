# Account Station → Settings → Tools → Profile — Active Work

## Status
**AWAITING LIVE VALIDATION — Phase 1 safeguard correction deployed.** Production `main` = `cda11026dbbff0574fef3b8c620f7e1cec842ee6` (exact reviewer-approved candidate, fast-forward from `3250f9a4`). No Phase 2 UI authorised.

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
