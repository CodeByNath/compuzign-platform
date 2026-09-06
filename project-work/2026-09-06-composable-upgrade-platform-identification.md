# Tier Catalogue Platform Identification — CZTC / CZTEC

## Status
- **AWAITING CHATGPT REVIEW — replacement commit pushed**
- Auditor verdict: **Proceed with safeguards**.
- Production remains `main@48cede2f00b7bd2ee202e94f82a61651ee694d3b`.
- The prior authoring-control candidate `review/composable-upgrade-authoring-control@335df721...` is superseded and was NOT pushed to `main`. It remains open on origin, unmerged, pending a decision on whether to delete it (branch deletion is classifier-blocked for Claude; flagging for manual cleanup).
- Replacement review branch: `review/tier-catalogue-identity@8ed1696b`, one clean commit on top of `main@48cede2f`, pushed to origin.

## Implementation report (Claude, 2026-09-06)

Safeguard check: confirmed no live/persisted CZTU or CZTEU data exists anywhere in the repo's stored fixtures, tests, or code — this is a pure rename plus a genuine (but backward-compatible-in-spirit) logic change to migration eligibility, never a data migration. No old-U compatibility family was created.

Per-item disposition:
1. **Done.** `PlatformIdentifierPolicy::TIER_UPGRADE`/`TIER_EDITION_UPGRADE` → `TIER_CATALOGUE`/`TIER_EDITION_CATALOGUE`; prefixes `CZTU`/`CZTEU` → `CZTC`/`CZTEC`.
2. **Done.** `upgrade_platform_id`/`edition_upgrade_platform_id` → `catalogue_platform_id`/`edition_catalogue_platform_id` across `PackageSchema`, `PackageRepository`, `PackageStationController`, `PackagePlatformIdentifierAdapters`, TS `types.ts`, drawer bindings/models. No U/C coexistence anywhere — grepped clean.
3. **Done.** `is_upgrade_offer` removed entirely from `PackageSchema` (draft/settle/overview functions), `PackageStationController` (draft save + both reserve blocks), and the rewritten test file. It never existed on `main`'s TS side (only on the superseded, unmerged authoring-control branch), so no TS removal was needed there.
4. **Done.** `settleComposableOccupant()`'s CZTC reserve block now runs unconditionally (no flag check) in the same try block as the primary CZT reserve — same reserve→persist→bind→reconcile choreography as before.
5. **Done.** `updateComposableOccupantEditionStatus()`'s CZTEC reserve block now runs unconditionally at the same first-Active gate as CZTE.
6. **Done, with a genuine logic change beyond rename.** `PackageRepository::tierCatalogueAssignmentPage()`/`tierEditionCatalogueAssignmentPage()` no longer filter by a flag — instead they only ever scan the ONE composable occupant location (`instance['composable_occupant']`) and its `occupant_bin[]` counterpart (filtered by `origin_tier === PackageSchema::COMPOSABLE_OCCUPANT_ORIGIN`), and never scan ordinary `instance['tiers']` slots at all, since an ordinary Tier occupant can never be a Tier Catalogue occupant under this design. This is stricter and more correct than a flag-based filter would have been. Same one-time Admin assignment action, no second migration UI/path.
7. **Done.** Overview/Edition Overview rows renamed to "Catalogue Platform ID"; presentation contract (`scripts/tier-catalogue-overview-presentation-contract.ts`, renamed from `composable-upgrade-overview-presentation-contract.ts`) re-verified passing.
8. **Done.** `skills/compuzign-platform-architecture/references/platform-id-families.md` table updated (CZTU/CZTEU rows → CZTC/CZTEC, with the unconditional-minting note replacing the old declaration-gated wording). No `docs/code-map/*.md` file referenced Upgrade identity terminology, so none needed updating.
9. **Untouched, confirmed by diff scope.** No customer-facing Upgrade Your Build/Build Your Own file was touched.
10. **Untouched.** No CRM/customer purchased-build identity work included.

### Files changed (22)
`src/PlatformIdentifier/PlatformIdentifierPolicy.php`, `src/PlatformIdentifier/TemporaryMigrationController.php`, `src/Modules/SurfacePackages/Repositories/PackageRepository.php`, `src/Modules/SurfacePackages/Http/PackageStationController.php`, `src/Modules/SurfacePackages/PlatformIdentifier/PackagePlatformIdentifierAdapters.php`, `src/Modules/SurfacePackages/Support/PackageSchema.php`, `resources/ts/package-station/types.ts`, `resources/ts/package-station/CLAUDE.md`, `resources/ts/package-station/drawer/schema/bindings/tier.tsx`, `resources/ts/package-station/drawer/schema/bindings/tierEdition.tsx`, `resources/ts/package-station/drawer/tier/tierDetailModel.ts`, `resources/ts/package-station/drawer/tier/tierEditionDetailModel.ts`, `resources/ts/admin-station/api/platformIdentifiers.ts`, `resources/ts/admin-station/shell/PlatformIdentifierMigrationNotice.tsx`, `package.json`, `dist/js/admin-station.js`, `scripts/tier-edition-admin-contract.ts`, `scripts/admin-platform-identifier-migration-sweep-contract.ts`, `scripts/composable-upgrade-overview-presentation-contract.ts` → renamed `scripts/tier-catalogue-overview-presentation-contract.ts`, `tests/composable-upgrade-platform-identity.php` → replaced by `tests/tier-catalogue-platform-identity.php`, and `skills/compuzign-platform-architecture/references/platform-id-families.md` (repo root, outside the plugin).

### Tests
- `tests/tier-catalogue-platform-identity.php` (rewritten — 5 tests, replacing the old flag-toggle tests with unconditional-minting proofs, including a second-Edition mint proof and an ordinary-Tier-never-enumerated proof): PASS.
- Full adjacent Surface Packages PHP suite (~45 files) and `tests/platform-identifier-temporary-migration.php`: PASS. One pre-existing failure (`tests/tier-capability-invariants.php`) confirmed present on baseline `main@48cede2f` before any of this branch's changes — unrelated, not introduced by this work.
- `npx tsc --noEmit`: clean.
- `npm run contract:tier-catalogue-overview-presentation`, `contract:tier-edition-admin`, `contract:admin-platform-identifier-migration-sweep`, `contract:tier-edition-switch`, `contract:tier-edition-move-to-bin`: PASS.
- `npm run regression:tier-occupant-lifecycle`, `regression:tier-edition-lifecycle`: fail identically on baseline `main@48cede2f` (unrelated, pre-existing stale-bundle-cache issue in an unrelated `audienceGroups` code path) — confirmed via `git stash` bisection before reporting, not a regression from this branch.
- `npm run docs:check`: PASS (118 Markdown files, 47 Code Maps).
- `npm run build`: clean, only `dist/js/admin-station.js` changed.

SHA: `8ed1696b` on `review/tier-catalogue-identity`, pushed to origin. Awaiting review before any push to `main`.

## Architecture locked
Admin has one composable catalogue model, named **Tier Catalogue**. There are not separate Admin Upgrade and Custom declarations.

Tier Catalogue occupant:
- `CZT...` normal Tier identity
- `CZTC...` Tier Catalogue identity

Tier Catalogue Edition:
- `CZTE...` normal Edition identity
- `CZTEC...` Tier Catalogue Edition identity

Reuse the already-built U identity path by converting it. Do not build a parallel identity system.

Retire from the model:
- `CZTU` / `CZTEU`
- Upgrade-specific Platform Identifier type names
- `is_upgrade_offer` and its proposed Admin declaration control/gating

No second Custom/C identity family is to be introduced. Production code search currently shows no `CZTC`/`CZTEC` implementation, so this replacement becomes the single C=Catalogue path.

## Exact implementation instruction
On a clean review branch from current production:
1. Rename/reclassify the existing U Platform Identifier families to **Tier Catalogue** / **Tier Catalogue Edition**, prefixes `CZTC` / `CZTEC`.
2. Rename U-specific storage/projection/frontend fields to Catalogue terminology consistently. Do not keep U and C as two coexisting secondary identities.
3. Remove `is_upgrade_offer` from schema, drafts, API handling, frontend types, tests, and authoring-control work. Catalogue identity is inherent to the existing composable/Tier Catalogue record.
4. Every settled Tier Catalogue occupant automatically reserves/persists/binds CZTC alongside CZT through the same lifecycle choreography already implemented for U.
5. Every activated Tier Catalogue Edition automatically reserves/persists/binds CZTEC alongside CZTE through the same Edition choreography.
6. Rename/extend the existing one-time Platform-ID migration scope so existing Tier Catalogue occupants/Editions can receive missing CZTC/CZTEC through the same Admin assignment action. No second migration UI/path.
7. Overview shows **Tier Platform ID + Catalogue Platform ID**; Edition Overview shows **Edition Platform ID + Catalogue Platform ID** when assigned.
8. Update affected Platform-Identifier architecture/current Code Map terminology from Upgrade identity to Tier Catalogue identity.
9. **Customer-facing Upgrade Your Build is frozen.** Do not change customer Upgrade/Build Your Own UX, composable selection, Edition behaviour, pricing, Commercial Legs, quote/cart, Request, PDF/email/order, billing, CRM, or resolver behaviour.
10. No customer/CRM purchased-build identity in this phase; that is future CRM work.

## Safeguard
The live validation did not produce a U identifier. Do not create an old-U compatibility family. If the implementation audit finds actual persisted/bound CZTU/CZTEU data or a migration case that would make this replacement destructive, stop and report before changing permanent identifiers.

Return one clean replacement review commit from `main@48cede2f...`, report exact files/tests/SHA, and set **AWAITING CHATGPT REVIEW**. Do not push `main` before review.