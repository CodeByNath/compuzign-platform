# Surface Packages Boundary

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

- `SurfacePackagesModule.php` — module wiring.
- `Http/PackageFamiliesController.php` — Package Family lifecycle and relationship routes.
- `Http/PackageStationReadController.php` — authenticated assigned-instance summary rows for admin consumers.
- `Http/PackageStationController.php` — global Tier-instance/assignment collection routes plus instance-scoped Tier, occupant-bin, and popular-Tier mutations; legacy unscoped Tier paths temporarily alias `ti_primary`.
- `Repositories/PackageRepository.php` — `cz_package_station` persistence, request cache, relationships, Promotions, legacy migration, all-instance Rate Sheet usage guards, and assignment-resolved Cost Builder indexing.
- `Support/TierInstanceSchema.php` (Package-owned Tier capability-instance envelope, with no consumer/Family fields), `TierAssignmentSchema.php` (the separate Package Family ↔ Tier Instance usage edge), `PackageManagerSchema.php` (manager shape + the `rate_sheets[]` collection: migration, upsert/delete commit, per-Tier projection), `PackageSchema.php` (occupant compatibility, lifecycle, Tier↔Rate-Sheet binding + clear-on-switch), `PackageCategoryGroups.php` (Package Family rules), and `PackageStationSchema.php` (only the shared `sanitizeSourceRelationships` and `evaluateTierPricing` helpers — not the aggregate/shape authority).

## Boundaries

Service-scoped URLs use Service only as navigation context; canonical Tier reads/mutations include `tier-instances/{instance}` before slot/bin resolution. The assignment ledger and Tier-instance collection use global Package-owned routes. This module retains Package persistence. `occupant_id` is stable projection/UI identity, while `(tier_instance_id, slotId)` is the mutation/storage address. Tier pool writes go through `Service\Support\ServicePools`; do not touch Service pool meta directly or import `ServiceController`. Promotions persist through `PackageRepository` but their routes belong to `Modules/Promotions`.

Read [Package Manager](../../../../../../docs/code-map/package-manager.md), [Rate Sheet](../../../../../../docs/code-map/rate-sheet.md), [Tiers](../../../../../../docs/code-map/tiers.md), [Tier Capability](../../../../../../docs/code-map/tier-capability.md), and [Promotions](../../../../../../docs/code-map/promotions.md).

## Validation

From the plugin root: `php tests/package-manager-schema.php`, `php tests/package-category-groups.php`, `php tests/active-package-contract.php`, `php tests/tier-occupant-compatibility.php`, `php tests/tier-pricing-parity.php`, `php tests/tier-instance-schema.php`, `php tests/tier-instance-migration.php`, `php tests/tier-assignment-schema.php`, `php tests/tier-assignment-family-flow.php`, `php tests/tier-instance-mutations.php`, `php tests/tier-instance-guards.php`, `php tests/package-capability-peer-isolation.php`, `php tests/tier-instance-public-projection.php`, `npm run contract:package-family-capability`, `npm run contract:tier-instance-scope`, `npx tsc --noEmit`, and `npm run docs:check`.
