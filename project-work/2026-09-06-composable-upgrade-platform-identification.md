# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **AWAITING CHATGPT REVIEW — Phase 1 implemented, one clean commit, not pushed to `main`**
- Auditor verdict (prior round): **Proceed with safeguards**.
- Production baseline: `main@28f716b1bde85717787418e29efbbf8dce978d3c` (unchanged — this round is on a review branch only).
- Previous cart/quote/PDF/email/View-Print/order flow remains closed and was not touched.
- Review branch: `review/composable-upgrade-identity` @ `c1dfc72254c56301a89caa3f08a3d4a9dca090f9` — one clean commit on top of production `main`. Pushed to origin.

## Phase 1 report

**Changed files** (9): `src/PlatformIdentifier/PlatformIdentifierPolicy.php`, `src/PlatformIdentifier/TemporaryMigrationController.php`, `src/Modules/SurfacePackages/Http/PackageStationController.php`, `src/Modules/SurfacePackages/PlatformIdentifier/PackagePlatformIdentifierAdapters.php`, `src/Modules/SurfacePackages/Repositories/PackageRepository.php`, `src/Modules/SurfacePackages/Support/PackageSchema.php`, `tests/composable-upgrade-platform-identity.php` (new), `tests/platform-identifier-temporary-migration.php` (updated for the version bump below), `skills/compuzign-platform-architecture/references/platform-id-families.md`.

**Against each requirement:**
1. `TIER_UPGRADE`→`CZTU`, `TIER_EDITION_UPGRADE`→`CZTEU` added to `PlatformIdentifierPolicy`. Collision-safety is structural (anchored-full-string regex, same reasoning already documented for `CZTL`/`CZTEL`) and proven by the new test resolving both `CZT`/`CZTU` (and `CZTE`/`CZTEU`) off the identical native reference with no cross-contamination.
2. `PackageRepository` gained `tierUpgrade{PlatformId,PlatformIdExists,AssignmentPage,Projection}()`/`claimTierUpgradePlatformId()` and the Edition-level equivalents, reusing the existing `locateTierOccupant()`/`locateTierEdition()` private scanners unchanged. Every existing `CZT`/`CZTA`/`CZTE`/`CZTL`/`CZTEL` read/write path is untouched.
3. Native reference is the identical `PackagePlatformNativeReference::tierOccupant()`/`tierEdition()` tuple `CZT`/`CZTE` already use for the same record — no `upgrade_pairings[]`, no base-occupant qualifier, no positional identity, no second engine.
4. `PackagePlatformIdentifierAdapters::tierUpgrade()`/`tierEditionUpgrade()` added, same five-callback shape as every existing factory. `TemporaryMigrationController::ENTITY_TYPES`/`adapterFor()` extended; progress/lock option bumped `v4`→`v5` (same precedent as the `v3`→`v4` bump for `TIER_LEG`/`TIER_EDITION_LEG`) so an already-`complete` install gets a fresh dry-run for these two scopes.
5. New `is_upgrade_offer` boolean, admin-set via `saveComposableOccupantModule()`'s overview branch (occupant) and the existing Edition overview draft (Edition) — threaded through the same draft/settle plumbing `is_addon`/`contact` already use. Explicitly never wired into the normal (non-composable) occupant's own overview save, so it only ever gates minting on the composable side. Changes no pricing/eligibility/routing/presentation — verified by the full existing SurfacePackages test suite passing unchanged.
6. `CZTU` reserve/bind added inside `settleComposableOccupant()`; `CZTEU` reserve/bind added inside `updateComposableOccupantEditionStatus()` — never wired into `settlePackageStationTier()`/`updateTierEditionStatus()` (the normal occupant's own endpoints). Same reserve→persist→bind sequence and reconciliation-on-stuck-reservation behavior as every existing identity in these functions, proven by the new test's repeat-Publish/repeat-activation checks.
7. `rejectPlatformIdMutation()`'s guarded field list extended to `upgrade_platform_id`/`upgradePlatformId`/`edition_upgrade_platform_id`/`editionUpgradePlatformId`.
8. No quote/Request/cart/UI/customer-facing file touched — confirmed by the diff (backend PHP only, no `resources/ts` changes, no rebuild needed).

**A real bug found and fixed via testing** (not in the approved design, an implementation defect): `PackageSchema::upsertOccupant()` didn't initialize/preserve `upgrade_platform_id` the way it already does for `cz_platform_id`/`addon_platform_id` — a bound `CZTU` would have been silently wiped on the next ordinary Publish. Fixed by adding the same `$existingUpgradePlatformId` capture-and-preserve `cz_platform_id`/`addon_platform_id` already get. The new test's repeat-Publish assertions are what caught this before it shipped.

**Tests**: new `tests/composable-upgrade-platform-identity.php` — 6 scenarios covering every acceptance-test bullet below via the real `PackageStationController`/`PlatformIdentifierStation`/`PackageRepository` (only WordPress core functions stubbed, same convention as `tier-occupant-platform-identity.php`). Full existing SurfacePackages suite (`SurfacePackages/CLAUDE.md`'s own Validation list, ~50 PHP tests + 11 JS contracts + `tsc --noEmit` + `docs:check`) re-run clean; the one pre-existing unrelated failure (`tests/tier-capability-invariants.php`) reproduced identically on a clean `main` checkout before touching anything.

## Acceptance tests — verified

- declaration false/absent → no `CZTU`/`CZTEU` minted, legacy behavior byte-unchanged. ✓ (Test 1, Test 5)
- declaration true → `CZTU` minted once; repeat settle reconciles the same id. ✓ (Test 2)
- activated composable Edition → `CZTEU` minted once; repeat lifecycle action keeps the same id. ✓ (Test 4)
- ecosystem ids remain unchanged alongside Upgrade ids. ✓ (Test 2, Test 4 — `CZT`/`CZTE` values identical before/after)
- native-reference/entity-type separation permits the same tuple for `CZT`+`CZTU` and `CZTE`+`CZTEU` without registry collision. ✓ (Test 3, via `resolve()`/`lookupNative()` disambiguating by entity type)
- migration/assignment enumerates only eligible declared records and never mints on read. ✓ (Test 6)
- no customer output or pricing/resolver/snapshot behavior changes. ✓ (full existing suite unchanged; no consumption-path file touched)

Do not push to `main` before this review.

## Locked architecture
Nath's Bundle analogy is the governing precedent.

A Bundle participates in the ordinary Rate Sheet pipeline with ordinary row identity (`item_id` + CZPRCI) while separately retaining Bundle identity (`bundle_id` + CZPRCB). The identities coexist; Bundle identity says what the commercial thing is, while Rate Sheet identity keeps it in the Rate Sheet ecosystem. Neither replaces the other and the Bundle does not become a child of the row.

Upgrade follows the same dual-identity rule:
- existing composable Tier participant keeps its normal Tier ecosystem identity/routing (`CZT`/`CZTA` + CZTL);
- a composable Edition keeps `CZTE` + CZTEL;
- the same participant may additionally carry `CZTU` / `CZTEU` declaring Upgrade capability/type;
- CZTU/CZTEU are **not** children of a selected base Tier/Edition;
- no base occupant/Edition belongs in the catalog native reference;
- customer base-plan association is later quote/transaction context only.

Native identity scope accepted:
- CZTU uses the composable occupant's own stable native tuple `(tier_instance_id, occupant_id)` under a distinct Platform Identifier entity type;
- CZTEU uses `(tier_instance_id, occupant_id, edition_id)` under its distinct entity type.
Using the same native tuple under different entity types is intentional dual identity, not substitution.

## Phase 1 — implement catalog side only
Implement CZTU + CZTEU together, reusing existing Package/Platform-Identifier machinery.

Required:
1. Add `TIER_UPGRADE -> CZTU` and `TIER_EDITION_UPGRADE -> CZTEU` to `PlatformIdentifierPolicy`; prove prefix disambiguation/collision safety.
2. Add Package-owned scalar storage/read/claim/exists/enumerate/project support for the additional Upgrade IDs on the existing composable occupant/Edition records. Preserve every existing CZT/CZTA/CZTE/CZTL/CZTEL value.
3. Reuse existing occupant/Edition native-reference tuple shapes; do not introduce base-qualified Upgrade references, `upgrade_pairings[]`, positional identity, or a second identity engine.
4. Add adapters and Temporary Migration Station coverage through the existing generic mechanisms; no read-time mint/backfill.
5. Add an explicit admin-owned declaration on the composable occupant that authorizes Upgrade identity minting. It is a capability/type declaration, **not an exclusive role**: the same composable ecosystem participant may later carry another independent type identity (for example future Custom/New-Build work). Do not make this flag change pricing, customer eligibility, routing, or presentation.
6. Mint/bind CZTU only through the existing real composable-occupant settle mutation; mint/bind CZTEU only through the existing Edition activation/settle boundary. Preserve reserve -> persist -> bind and reconciliation/idempotency behavior.
7. Reject client-supplied Platform IDs through the existing mutation guard.
8. No quote/Request/cart/UI/customer consumption in this phase.

## Acceptance tests
- declaration false/absent -> no CZTU/CZTEU minted and legacy behavior unchanged;
- declaration true -> CZTU minted once; repeat settle reconciles same ID;
- activated composable Edition -> CZTEU minted once; repeat lifecycle action keeps same ID;
- ecosystem IDs remain unchanged alongside Upgrade IDs;
- native-reference/entity-type separation permits same tuple for CZT+C ZTU and CZTE+CZTEU without registry collision;
- migration/assignment enumerates only eligible existing declared records and never mints on read;
- no customer output or pricing/resolver/snapshot behavior changes.

Use one clean review branch from current `main`. Report exact changed files, focused tests, candidate SHA/tree, and set **AWAITING CHATGPT REVIEW**. Do not push to `main` before independent review.