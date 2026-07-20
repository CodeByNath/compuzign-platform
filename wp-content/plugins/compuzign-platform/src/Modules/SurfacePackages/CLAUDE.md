# Surface Packages Boundary

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

- `SurfacePackagesModule.php` — module wiring.
- `Http/PackageStationReadController.php` — public read projection.
- `Http/PackageStationController.php` — Package Manager, Tier, occupant-bin, and popular-Tier mutations.
- `Repositories/PackageRepository.php` — `cz_package_station` persistence, request cache, relationships, Promotions, and legacy migration.
- `Support/PackageManagerSchema.php`, `PackageSchema.php`, and `PackageCategoryGroups.php` — authoritative shape, readiness, occupant compatibility, and Package Family rules. `PackageCategoryGroups` also owns Family-scoped Tool / Skill activation (`tools` map on the group row + `setTool`).
- `Support/PackageToolRegistry.php` — the Family / Group tool catalogue (metadata only: known keys + availability). Tier is the one available tool; Promotion / Bundle / Campaign are declared future tools and cannot be enabled. No business rules, endpoints, or lifecycle live here.

## Boundaries

Service-scoped compatibility URLs use Service only as navigation context; this module retains Package persistence. `occupant_id` is stable projection/UI identity, while fixed `slotId` remains the mutation/storage address. A tool assignment is owned by the Package Family / Group (`group_id`), never a global Package-Station singleton; activating Tier flips a boolean on the group row and creates no Tier occupant. Tier data stays station-global and is projected per Family through source relationships — the Family activation controls access/presentation only. Tier pool writes go through `Service\Support\ServicePools`; do not touch Service pool meta directly or import `ServiceController`. Promotions persist through `PackageRepository` but their routes belong to `Modules/Promotions`.

Read [Package Manager](../../../../../../docs/code-map/package-manager.md), [Rate Sheet](../../../../../../docs/code-map/rate-sheet.md), [Tiers](../../../../../../docs/code-map/tiers.md), and [Promotions](../../../../../../docs/code-map/promotions.md).

## Validation

From the plugin root: `php tests/package-manager-schema.php`, `php tests/tier-occupant-compatibility.php`, `npx tsc --noEmit`, and `npm run docs:check`.
