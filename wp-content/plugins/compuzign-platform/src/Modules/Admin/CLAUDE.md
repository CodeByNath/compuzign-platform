# Admin Backend Boundary

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

`AdminModule.php` wires authenticated admin controllers. `AdminRouter.php` serves the Command Centre shell. Controllers under `Http/` own Categories, Service Category Groups, Package Families, requests, and overview route validation/orchestration. `Support/StationLifecycle.php`, `CategoryMeta.php`, and `PoolReferences.php` provide shared lifecycle, taxonomy-meta, and pool-reference rules.

## Boundaries

This module does not own Services, Package Station, or Promotions. Their handlers live in `Modules/Service`, `Modules/SurfacePackages`, and `Modules/Promotions`, even where compatibility URLs are Service-nested. Do not add `cz_service` behaviour, duplicate repository storage, or move frontend station/drawer ownership here. `AdminRouter::CAP` remains the shared admin capability.

Read [Categories](../../../../../../docs/code-map/categories.md), [Category Groups](../../../../../../docs/code-map/category-groups.md), [Service Station](../../../../../../docs/code-map/service-station.md), and [Lifecycle](../../../../../../docs/code-map/lifecycle-system.md).

## Validation

From the plugin root: `php tests/service-route-baseline.php`, `npx tsc --noEmit`, and `npm run docs:check`.
