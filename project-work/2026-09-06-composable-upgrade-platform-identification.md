# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **AWAITING CHATGPT REVIEW — Admin Station sweep gap closed, one clean commit, not pushed to `main`**
- Auditor verdict (prior round): **Proceed with safeguards**; `c1dfc722` was correctly rejected for missing Admin Station coverage.
- Production: `main@28f716b1bde85717787418e29efbbf8dce978d3c` (unchanged — review branch only).
- Review: `review/composable-upgrade-identity@2f06872f5ac2759a35530a47cd2e6915eca76e7f` — the SAME single commit as before, amended in place (not stacked) so main ancestry stays exactly one clean commit. Force-pushed to origin (the branch is otherwise unshared — Claude's own topic branch for this work item).

## Correction report

Confirmed the gap exactly as described: `TemporaryMigrationController`'s backend `ENTITY_TYPES` had the two new scopes, but the Admin Station's own one-time sweep button hardcodes an entirely separate list on the frontend, so the button could never reach the two new scopes — v5 would never report complete through the UI.

**Against each required item:**
1. `PlatformIdentifierEntityType` union (`api/platformIdentifiers.ts`) extended with `'tier_upgrade' | 'tier_edition_upgrade'`.
2. `PlatformIdentifierMigrationNotice.tsx`'s own `ENTITY_TYPES` sweep array extended with the same two scopes — the existing **Assign Package and Tier IDs** button now dry-runs/assigns them through the unchanged backend endpoint.
3. No second button, endpoint, engine, or per-Upgrade control added — same one client, same one component, same one backend route.
4. New contract `admin-platform-identifier-migration-sweep-contract.ts` (wired as `npm run contract:admin-platform-identifier-migration-sweep`, added to `admin-station/CLAUDE.md`'s own Validation list): it parses `TemporaryMigrationController::ENTITY_TYPES` + `PlatformIdentifierPolicy`'s constant values straight from PHP source (never hand-copied) and asserts the frontend sweep array matches that derived list **exactly, in both directions** — not just "contains the two new strings." Verified this actually catches the class of bug just found: reverted the frontend fix locally, confirmed the contract fails with the missing-scope message, restored the fix, confirmed it passes again.
5. No quote/Request/cart/customer/pricing file touched by this correction — diff is limited to the Admin Station migration client/notice, the new contract, `package.json`'s script entry, and its own `CLAUDE.md`/skill-reference doc line. All already-reviewed Phase 1 backend behavior (identity, tests) is byte-identical to `c1dfc722`.

**Tests re-run**: `npx tsc --noEmit`, `npm run build` (only `dist/js/admin-station.js`'s hash changed — no new chunk), `npm run docs:check`, and the full Admin Station Validation list (`contract:admin-station-css` [pre-existing unrelated failure, confirmed identical on stock `main`], `contract:station-tabset`, `contract:requests-admin-station-surface`, `contract:supported-action-footer`, `contract:request-print-isolation`, `contract:payment-summary-extraction-parity`, `contract:admin-platform-identifier-migration-sweep` [new], `contract:rate-sheet-row-platform-identity`) — all pass. The full SurfacePackages PHP suite from the prior round is unaffected (no backend file in this correction touched).

Do not push to `main` before this review.

## Architecture accepted
Nath's Bundle precedent remains locked. The existing composable Tier/Edition participant keeps normal ecosystem identity (`CZT`/`CZTA`/`CZTE` + Legs) and may additionally carry `CZTU`/`CZTEU`. Upgrade identity is not owned by a selected base Tier/Edition; base association is later transaction context.

The implemented catalog identity mechanics are substantively correct: distinct Policy entity types, same native tuples under different entity types, additional scalar identity fields, existing reserve→persist→bind settle boundaries, mutation guards, eligibility-filtered repository/adapters, and no quote/customer/pricing changes.

## Blocking omission — Nath's existing Admin Station assignment button
The platform already has the one-time Admin Station Platform-ID assignment runner. Phase 1 must participate in that same path; no new assignment/backfill UI or engine.

Backend `TemporaryMigrationController` was correctly moved to v5 and now includes `TIER_UPGRADE` and `TIER_EDITION_UPGRADE` in `ENTITY_TYPES` plus adapter routing.

But the existing Admin Station client was **not updated**:
- `resources/ts/admin-station/api/platformIdentifiers.ts` still defines `PlatformIdentifierEntityType` only through `tier_leg` / `tier_edition_leg`.
- `resources/ts/admin-station/shell/PlatformIdentifierMigrationNotice.tsx` still hardcodes the one-time button sweep without `tier_upgrade` / `tier_edition_upgrade`.

That creates a real rollout failure: backend v5 reports incomplete because the two new scopes are unfinished, while the Admin button only dry-runs/assigns the old scopes. It can therefore repeat old scopes without ever assigning CZTU/CZTEU or reaching backend completion.

## Required correction
1. Extend the existing Admin Station migration client union with `tier_upgrade` and `tier_edition_upgrade`.
2. Extend the existing `PlatformIdentifierMigrationNotice` `ENTITY_TYPES` sweep with those exact two scopes so the current **Assign Package and Tier IDs** one-time action runs them through the existing backend endpoint.
3. Do not create a second button, endpoint, migration engine, or per-Upgrade repair control.
4. Add/update a focused frontend contract proving the one-time Admin Station sweep includes both Upgrade scopes and can reach completion under v5.
5. Preserve all already-reviewed Phase 1 backend behavior. No quote/Request/cart/customer/pricing work.

Rebuild the clean candidate as one commit directly on production `28f716b1...` (or amend/recreate so final main ancestry remains one clean commit), report exact SHA/tree/tests, and set **AWAITING CHATGPT REVIEW**. Do not push to main before review.