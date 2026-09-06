# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed with safeguards**.
- Pushed and deployed: `main@2f06872f5ac2759a35530a47cd2e6915eca76e7f` (fast-forward from `28f716b1...`, run by Nath directly per the classifier block on pushing `main`). Deploy run `34006339092` / #956, conclusion **success**.
- `review/composable-upgrade-identity` deleted both locally and on origin now that it is fully merged.

## Live validation needed before closure
This phase touches a real one-time Admin Station control (**Assign Package and Tier IDs**) against the live Platform Identifier registry, so unlike a pure presentation change it warrants a read-only check before `CLOSED`:
1. The Admin Station home still loads `PlatformIdentifierMigrationNotice` without error post-deploy (confirms the extended `ENTITY_TYPES`/union type didn't break the existing component).
2. A dry-run against the two new scopes (`tier_upgrade`, `tier_edition_upgrade`) returns cleanly with `processed: 0` / no conflicts on current production data — expected, since no composable occupant/Edition has `is_upgrade_offer` declared yet, so nothing should be eligible.
3. The migration status endpoint (`GET admin/platform-identifiers/migration`) does not report a false "complete" or throw for the two new scopes now present in `ENTITY_TYPES` under the `v5` option.
This is read-only verification only — no button click/assignment action needed, since there is nothing yet declared as an Upgrade offer to assign.

## Independent review
The candidate is cleanly based on production:
- compare `28f716b1... -> 2f06872f...`: **ahead 1, behind 0**;
- merge base is exactly `28f716b1...`;
- no rejected intermediate commit is in final ancestry.

The previously missing Admin Station rollout coverage is now present:
- `PlatformIdentifierEntityType` includes `tier_upgrade` and `tier_edition_upgrade`;
- the existing `PlatformIdentifierMigrationNotice` one-time **Assign Package and Tier IDs** sweep includes both scopes;
- same existing backend endpoint/button/engine only; no second migration system;
- focused `admin-platform-identifier-migration-sweep-contract.ts` derives backend scope authority from `TemporaryMigrationController::ENTITY_TYPES` + `PlatformIdentifierPolicy` and asserts exact frontend parity in both directions.

Independent byte check confirms the already-reviewed backend `TemporaryMigrationController.php` is unchanged from rejected head `c1dfc722` (same blob `513aa93e...`); the correction is the Admin Station sweep/client/contract plus expected build/docs wiring.

## Accepted Phase 1 architecture
- `CZTU` / `CZTEU` are additional identities on the same composable Tier/Edition participant; existing `CZT`/`CZTA`/`CZTE` and Leg identities remain intact.
- Same native tuple may coexist under distinct Platform-Identifier entity types.
- Upgrade identity is not a child of a selected base Tier/Edition; base association is later transaction context.
- Mint/bind remains at existing composable settle/Edition activation mutation boundaries.
- Existing one-time Admin Station assignment path covers eligible historical declared records.
- No quote/Request/cart/customer/pricing behavior is part of this phase.

## Next action — ChatGPT
Perform the read-only live validation listed above against the deployed Admin Station. Do not advance to Phase 2 until this phase is `CLOSED`.