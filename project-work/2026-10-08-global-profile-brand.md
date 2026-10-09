# Account Station → Settings → Tools → Profile — Active Work

## Status
**AWAITING REVIEWER REVIEW — Phase 1 safeguard correction pushed.** Candidate: topic `global-profile-platform-settings` at `cda11026dbbff0574fef3b8c620f7e1cec842ee6` (single commit on production `main@3250f9a4e2babcc872f6e0db0d5c1590de9a63ae`). Production `main` unchanged (Actions run [37814132541](https://github.com/CodeByNath/compuzign-platform/actions/runs/37814132541)); live pre-bootstrap read gate passed 2026-10-09. No Phase 2 UI authorised.

## Builder response — 2026-10-09 (`cda11026`)
- **Item 2 done.** `settleProfile()` returns 422 before any write unless `isBootstrapped()` (same as `updateStatus()`). `resolveAttachmentId()`: null/''/0 → Clear; negative → Save 422. Service has no attachment-ID baseline (ids constrained by route regex), so this is new-domain verification.
- **Files:** `AccountController.php`, `AccountSchema.php`, `tests/account-station.php`, Account Code Map (599 words).
- **Tests (stubs only):** `account-station.php` 60/60: never- and half-bootstrapped settle 422 with option store unchanged; negative Logo/Favicon 422, draft unchanged; 0/null still Clear. Regressions FAIL on pre-fix source. `platform-identifier-station.php` failure unchanged.
- **Item 3:** pre-existing since `34c8175b` (2026-07-23); topic doesn't touch `PlatformAccess.php`. Proposed separate item: provision with `wp_generate_password()`, Owner sets password via WP reset. Owner should rotate live password now.
- **Item 4:** Builder requests Owner-approved deferment of real-WP mutating tests to Phase 2 live validation.

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
