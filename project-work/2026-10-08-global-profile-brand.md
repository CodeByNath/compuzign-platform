# Account Station → Settings → Tools → Profile — Active Work

## Status
**SOURCE PUSH APPROVED — PHASE 1 BACKEND ONLY.**
Reviewer verdict: **Proceed with safeguards**. **Exact approved topic SHA: `3250f9a4e2babcc872f6e0db0d5c1590de9a63ae`.** Only that candidate may move to `main` through the normal Builder workflow; any source change requires another independent review. No Phase 2 UI or Account frontend integration authorised by this approval.

## Baseline and scope
`main` at audit: `8d1f0185811e69214c0fd85c29819eef0c5d9226`. Topic: `global-profile-platform-settings`. Actual main→topic diff: 13 files (Account backend, four Platform Identifier prefixes, tests, Code Maps, wiring). No new packages, frontend registration, WEX or other product areas. Old `PlatformSettings` candidate was fully reverted. Owner model: **Account Station → Settings → Tools → Profile**, prefixes `CZA/CZAS/CZAST/CZASTP` + five-character suffix. Account is peer Station; others are children, not Stations. Station Manager coordinates; Admin presents; Identifier Station mints/binds.

## Independent audit — 2026-10-09
Compared `1fa3355b` → `3250f9a4` (four files: `AccountController.php`, `AccountRepository.php`, `tests/account-station.php`, Account Code Map) and current full diff against `main`.

**Accepted:** `updateStatus()` now blocks Publish **and** Disable/Enable before Account bootstrap. `isBootstrapped()` requires nonempty IDs at all four levels rather than only Profile. The controller's existing authenticated route gate remains `PlatformAccess::CAP`. Service Station establishes independent settle/status endpoints, Active Station with Pending module drafts, and ordinary separate WordPress writes; do **not** reinterpret these baseline practices as Account architecture violations or demand new CAS/transaction machinery. Phase 1 is backend-only and its separate settle/status APIs match Service's integration model.

**Evidence:** Builder reports `php tests/account-station.php` **48/48** checks passed, including pre-bootstrap mask rejection and four-node presence; checks use WordPress option stubs rather than live WP/DB. Not independently executed by Reviewer. Independent source inspection confirms the added code paths. Pre-existing `tests/platform-identifier-station.php` `tier_catalogue` expected-vocabulary mismatch remains; do not silently widen this phase. Account Code Map reported 600 words; no changed PHP source exceeds 600 physical lines.

## Safeguards and next work
1. Builder may promote **only** reviewed SHA `3250f9a4` to `main`. Record resulting exact `main` SHA, Actions outcome and Hostinger deployment state in this same file. Never assume topic, main, workflow and runtime are identical.
2. **Phase 1 backend release requires boundary checks** for authenticated REST, capability/nonce, WordPress attachment validity, durable four-node bootstrap, retry, canonical/draft isolation and no unrelated impact; stub tests do not establish parallel DB guarantees. Capture deployment/runtime evidence as appropriate before closing the phase.
3. **Deferred Owner decision:** Account singleton Archive/Trash/permanent delete semantics versus locked Station travel contract. No UI controls or silent exemption for those actions until approved.
4. **Phase 2** (new peer frontend register-before-finalize, Admin placement, Profile editor, Service-pattern settle-then-Publish) remains separately gated; do not start by treating backend approval as UI approval. WEX, user roles, expanded Profile sections deferred.
5. On production push, set `AWAITING LIVE VALIDATION` with Nath's specific validation request, then stop; Reviewer closes only after deployment and live evidence.

Root `AGENTS.md`, `docs/ai-index.md`, `StationDrawerLifecycleContract-v1.md`, Service and Station Manager Code Maps are controlling. Keep all work in this file and preserve baseline-first auditing.
