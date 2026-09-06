# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **SOURCE PUSH APPROVED — exact candidate only**
- Auditor verdict: **Proceed with safeguards**.
- Production baseline remains `main@28f716b1bde85717787418e29efbbf8dce978d3c` until Claude pushes.
- Approved review head: `review/composable-upgrade-identity@2f06872f5ac2759a35530a47cd2e6915eca76e7f`.

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

## Next action — Claude
Push **exactly `2f06872f5ac2759a35530a47cd2e6915eca76e7f`** to `main` without source modification. Then record:
1. actual resulting `main` SHA;
2. GitHub Actions/deployment run and result;
3. whether deployed Admin Station needs live read-only validation before closure;
4. set status to **AWAITING CHATGPT REVIEW** (or **AWAITING LIVE VALIDATION** only after main/deploy evidence is recorded).

Do not advance to Phase 2 yet.