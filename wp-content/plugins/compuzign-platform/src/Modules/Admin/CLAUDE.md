# Admin Backend Boundary

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

`AdminModule.php` wires the authenticated admin REST controllers. This module hosts no frontend surface — the admin frontend is the Admin Station. Controllers under `Http/` own Categories, requests, and overview route validation/orchestration. `Support/StationLifecycle.php`, `CategoryMeta.php`, and `PoolReferences.php` provide shared lifecycle, taxonomy-meta, and pool-reference rules. The former Service Category Group REST family (`AdminCategoryGroupsController`) is retired — see [Category Groups](../../../../../../docs/code-map/category-groups.md) for what remains.

`Core\Plugin` injects the shared backend `PlatformIdentifierStation` through
`AdminModule` into `AdminCategoriesController`. Category retains both term
creation flows and owns the atomic `cz_platform_id` term-meta callback and all
`platform_id` projections; the Station owns only permanent `CZC` reservation,
binding, lookup, conflicts, and tombstones. Platform identity is output-only.
The Category Platform-ID GET resolves through that Station and reuses the
native-term authoritative projection; numeric identity remains unchanged.

## Boundaries

This module does not own Services, Package Families, Package Station, or Promotions. Their handlers live in `Modules/Service`, `Modules/SurfacePackages`, and `Modules/Promotions`, even where compatibility URLs are Service-nested. Do not add `cz_service` behaviour, duplicate repository storage, or move frontend station/drawer ownership here. The shared admin capability is owned by `Core\PlatformAccess::CAP`.

Read [Categories](../../../../../../docs/code-map/categories.md), [Category Groups](../../../../../../docs/code-map/category-groups.md), [Service Station](../../../../../../docs/code-map/service-station.md), and [Lifecycle](../../../../../../docs/code-map/lifecycle-system.md).

## Validation

From the plugin root: `php tests/category-pending-lifecycle.php`,
`php tests/category-inline-identity-race.php`,
`php tests/category-create-group-id-payload-contract.php`,
`php tests/admin-requests-durable-surface.php`,
`npm run regression:category-create`, `npm run contract:platform-identity-schema`,
`npm run contract:requests-admin-station-surface`,
`npx tsc --noEmit`, and `npm run docs:check`.
