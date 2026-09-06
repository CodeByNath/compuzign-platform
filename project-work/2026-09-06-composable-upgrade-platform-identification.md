# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **READY FOR CLAUDE — Phase 1 source review found missing Admin Station one-time assignment coverage**
- Auditor verdict: **Proceed with safeguards; current `c1dfc722` NOT approved for main**.
- Production: `main@28f716b1bde85717787418e29efbbf8dce978d3c`.
- Review: `review/composable-upgrade-identity@c1dfc72254c56301a89caa3f08a3d4a9dca090f9`, exactly one clean commit on production.

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