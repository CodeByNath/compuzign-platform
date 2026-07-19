# Surface Packages Boundary

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

- `SurfacePackagesModule.php` — module wiring.
- `Http/PackageStationReadController.php` — public read projection.
- `Http/PackageStationController.php` — Package Manager, Tier, occupant-bin, and popular-Tier mutations.
- `Repositories/PackageRepository.php` — `cz_package_station` persistence, request cache, relationships, Promotions, and legacy migration.
- `Support/PackageManagerSchema.php`, `PackageSchema.php`, and `PackageCategoryGroups.php` — authoritative shape, readiness, occupant compatibility, and Package Family rules.

## Boundaries

Service-scoped compatibility URLs use Service only as navigation context; this module retains Package persistence. `occupant_id` is stable projection/UI identity, while fixed `slotId` remains the mutation/storage address. Tier pool writes go through `Service\Support\ServicePools`; do not touch Service pool meta directly or import `ServiceController`. Promotions persist through `PackageRepository` but their routes belong to `Modules/Promotions`.

Read [Package Manager](../../../../../../docs/code-map/package-manager.md), [Rate Sheet](../../../../../../docs/code-map/rate-sheet.md), [Tiers](../../../../../../docs/code-map/tiers.md), and [Promotions](../../../../../../docs/code-map/promotions.md).

## Validation

From the plugin root: `php tests/package-manager-schema.php`, `php tests/tier-occupant-compatibility.php`, `npx tsc --noEmit`, and `npm run docs:check`.
