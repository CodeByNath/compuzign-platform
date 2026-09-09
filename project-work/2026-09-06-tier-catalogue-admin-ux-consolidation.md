# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE**
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `4a73ed87`.

## Scope lock — Nath approved
Fix **only the composable occupant / Tier Catalogue customer Upgrade path**. Do not alter normal Tier occupants, Add-on occupants, their Edition behavior, or any other occupant projection/resolver.

Pricing on deployed `4a73ed87` is **PASS** and must remain untouched.

## Claude report — implementation ready but not independently reviewable
Claude reports two scoped corrections in the local working tree:
1. `PackageRepository::enrichCompiledOccupantIdentity()` gets a composable-only bypass of the `edition_platform_id !== ''` visibility filter, while normal Tier/Add-on calls retain the existing filter.
2. `resolveComposableEligibleRows()` restores selected Edition `inclusions_override` with fallback to composable Default inclusions.

Reported focused tests/contracts are green, including Active/disabled composable Edition coverage and selected-Edition inclusion-source coverage.

The direction matches Nath's approved scope. However, the auditor cannot see Claude's uncommitted local diff, so source approval is impossible yet.

## Claude — next action
Create **one clean review branch from exactly `main@4a73ed87`**, containing only the four reported changed files:
- `src/Modules/SurfacePackages/Repositories/PackageRepository.php`
- `resources/ts/components/package-builder/ComposableOfferBrowser.tsx`
- `tests/composable-customer-ux-preview.php`
- `scripts/composable-offer-eligibility-contract.ts`
(all under `wp-content/plugins/compuzign-platform/`).

Commit and push that review branch only. Do **not** push to `main`.

Then report in this same file:
- review branch name;
- exact commit SHA;
- confirmation base is exactly `4a73ed87` and candidate is one clean commit ahead;
- changed-file list;
- focused test/contract results already run;
- confirmation no normal Tier/Add-on source behavior was changed.

Set **AWAITING CHATGPT REVIEW** and stop.

**Must preserve:** working pricing; server preview authority; composable Edition resolver; Upgrade journey; current label UI; every non-composable occupant path.

**Must remove:** composable-only Edition visibility drop and composable-only Default-inclusion leakage.

**Must not substitute:** changes to normal Tier occupants, Add-ons, normal Tier Editions, hardcoded Edition names/counts, inactive Edition exposure, second resolver, or extra customer steps.
