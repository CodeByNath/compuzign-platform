# Surface Packages Boundary

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

- `SurfacePackagesModule.php` — module wiring.
- `Http/PackageFamiliesController.php` — Package Family lifecycle and relationship routes.
- `Http/PackageStationReadController.php` — public read projection.
- `Http/PackageStationController.php` — Package Manager, Tier, occupant-bin, and popular-Tier mutations.
- `Repositories/PackageRepository.php` — `cz_package_station` persistence, request cache, relationships, Promotions, and legacy migration.
- `Support/TierInstanceSchema.php` (Package-owned Tier capability-instance envelope, with no consumer/Family fields), `PackageManagerSchema.php` (manager shape + the `rate_sheets[]` collection: migration, upsert/delete commit, per-Tier projection), `PackageSchema.php` (occupant compatibility, lifecycle, Tier↔Rate-Sheet binding + clear-on-switch), `PackageCategoryGroups.php` (Package Family rules), and `PackageStationSchema.php` (only the shared `sanitizeSourceRelationships` and `evaluateTierPricing` helpers — not the aggregate/shape authority).

## Boundaries

Service-scoped compatibility URLs use Service only as navigation context; this module retains Package persistence. `occupant_id` is stable projection/UI identity, while fixed `slotId` remains the mutation/storage address. Tier pool writes go through `Service\Support\ServicePools`; do not touch Service pool meta directly or import `ServiceController`. Promotions persist through `PackageRepository` but their routes belong to `Modules/Promotions`.

Read [Package Manager](../../../../../../docs/code-map/package-manager.md), [Rate Sheet](../../../../../../docs/code-map/rate-sheet.md), [Tiers](../../../../../../docs/code-map/tiers.md), [Tier Capability](../../../../../../docs/code-map/tier-capability.md), and [Promotions](../../../../../../docs/code-map/promotions.md).

## Validation

From the plugin root: `php tests/package-manager-schema.php`, `php tests/package-category-groups.php`, `php tests/active-package-contract.php`, `php tests/tier-occupant-compatibility.php`, `php tests/tier-pricing-parity.php`, `php tests/tier-instance-schema.php`, `php tests/tier-instance-migration.php`, `npx tsc --noEmit`, and `npm run docs:check`.
