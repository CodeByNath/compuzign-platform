# Promotions

## Purpose

Creates and manages promotions as child records of the Package Station, with overview editing, lifecycle operations, and relation-provider participation.

## Ownership

The Package Station owns the promotions collection and `PackageRepository` persists it. The client write boundary owns draft adaptation and the local edit session. Promotions must not be persisted as Service-owned metadata even though compatibility routes carry a service ID.

## Frontend

The Promotion manager, focused drawer, overview editor, and drawer manifest were hosted in the retired Command Centre and have been removed. Promotion authoring is to be rebuilt in the Admin Station; the client write boundary and backend authority below are unchanged.

## State

- [usePromotionStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePromotionStation.ts) owns selected Promotion state, module evaluation, saves/reverts, publish/toggle, and travel actions. Use it for client lifecycle or mutation behavior.
- [stationPrimitives.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/stationPrimitives.ts) provides shared loading/error mutation wrappers. Use it for cross-station action mechanics.

## Backend and Persistence

- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists Promotion children in the Package Station and migrates legacy Promotion meta. Use it for collection storage and projections.
- [PromotionsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Promotions/Http/PromotionsController.php) registers Promotion create, module save/revert, settle, publish, toggle, archive/trash/restore/delete routes. Use it for backend lifecycle behavior. Wired by [PromotionsModule.php](../../wp-content/plugins/compuzign-platform/src/Modules/Promotions/PromotionsModule.php) — a backend-only module holding no storage of its own; `PackageRepository` (`cz_package_station`) stays the persistence authority. Moved here from `AdminServicesController`; the nested URLs (`/admin/services/{id}/package-station/promotions/...`) are unchanged compatibility contracts, where `{id}` is navigation context only. See [Service Station](service-station.md).
- [admin.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/admin.ts) exposes typed Promotion REST calls. Use it for frontend/backend contract changes.

## Internal File Navigation

| Concern | Marker | Contains | Read when... |
| --- | --- | --- | --- |
| Promotion schema | `SECTION: PROMOTION_SCHEMA` | Identity, drafts, lifecycle, sanitization | Changing Promotion data |
| Promotion routes | `SECTION: PROMOTIONS ROUTES` | REST registration | Changing endpoints |
| Promotion handlers | `SECTION: PROMOTIONS HANDLERS` | CRUD, modules, lifecycle | Changing backend behavior |

## Runtime Flow

`usePromotionStation` loads the Package Station promotions collection and drives mutations. Saves target that collection; lifecycle operations settle, publish, toggle, archive, trash, restore, or permanently delete an occupant.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, `php tests/service-route-baseline.php`, and `npm run docs:check`.

## Related Code Maps

[Service Connections](service-connections.md), [Package Manager](package-manager.md), and [Lifecycle](lifecycle-system.md).
