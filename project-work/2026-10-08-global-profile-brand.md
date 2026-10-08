# Account Station → Settings → Tools → Profile — Active Work

## Status
**SOURCE PUSH NOT APPROVED — ONE BOUNDED PHASE 1 CORRECTION.**
Reviewer verdict: **Proceed with safeguards** for candidate `1fa3355b3f35fe174dd31386da2c05257e017d13`; not authorised for `main`, deployment or Phase 2 UI. Builder Claude; Reviewer ChatGPT.

## Authority / baseline
`main` `8d1f0185811e69214c0fd85c29819eef0c5d9226`; topic `global-profile-platform-settings` `1fa3355b`. Owner-approved **Account Station → Settings → Tools → Profile**, prefixes `CZA/CZAS/CZAST/CZASTP` with 5-character suffix. Account is peer Station, other levels are child records/modules. Station Manager coordinates, Admin presents, Platform Identifier Station mints/binds. See [locked handover](2026-10-08-global-profile-brand-handover.md), `AGENTS.md`, `docs/ai-index.md`, Service source and `StationDrawerLifecycleContract-v1.md`.

## Independent review of `098999b6 → 1fa3355b`
Actual GitHub comparison: **three changed files** — `AccountController.php`, `tests/account-station.php`, `docs/code-map/account-station.md`. No unrelated source.

**Accepted changes:**
- Direct Publish now rejects a missing Profile bootstrap before `StationLifecycle::publish`, a guard needed because Account is a singleton without a Service-style numeric record route.
- Added stub-driven tests for interrupted/retried ID bootstrap, mismatched parent rejection, interleaved competing reservations, and canonical Brand isolation during later Pending drafts. Builder reports **42/42 passing**; not independently executed.
- Existing Service Station already has separate settle/status operations, active Station with Pending module drafts, and separate WordPress writes. Those are **accepted baseline**, not Account defects. Do not rebuild them or add general CAS/transactions. Phase 2 will connect Service-pattern settle-then-Publish in the Station-owned frontend hook.

**Actual remaining defect:** `AccountController::updateStatus` calls `applyDisabledMask` **before** its bootstrap guard. On an untouched install default `platform_status='disabled'` passes `StationLifecycle::isLive` and `action=disable` persists a mask despite no Account record or Platform ID. Service always requires an existing Service ID to address lifecycle routes. This is a new-domain bug, not a speculative higher standard.

## Builder — narrowly correct and return
1. Gate **Disable and Enable** against the same complete, durable Account identity as Publish. Never mutate a never-created Account. Reuse one coherent existence predicate; avoid a new framework.
2. Add focused before-first-Save tests proving both actions reject without option/registry writes, and post-bootstrap tests retaining Service's existing mask behaviour. Confirm all four identities, not only Profile field, are present when treating Account as bootstrapped.
3. Show the focused test result and any unresolved real concurrency limitations honestly: interleaved stub tests are **not** parallel WordPress/DB proof. Do not add locking/transactions without demonstrated platform-specific risk.
4. Retain Archive/Trash/permanent-delete conflict as explicitly deferred **Owner decision** for singleton identity; do not invent an exception or expand this patch. Keep other prior corrections and media/validation questions documented without unrelated redesign.
5. Update the same work file with exact SHA/diff/tests, set `AWAITING REVIEWER REVIEW`, push topic and coordination, then stop.

Existing inherited Platform Identifier test mismatch and oversized historic Code Map remain separately tracked; no unrelated fixes. Source ≤600 physical lines/file, Code Maps/work file ≤600 words. No release approval until independent review of the corrected candidate.
