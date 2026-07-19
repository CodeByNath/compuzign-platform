# Package Manager

## Purpose

Owns Package Station persistence while exposing two bounded admin surfaces: Service-owned supply configuration in Your Service Manager, and customer-facing Tier/Promotion presentation in Packages.

## Ownership

The Package Station owns `package_manager`, rate-sheet selections, tiers, promotions, bin entries, status, and `package_manager.category_groups`, assigned to sources through `category_group_id`. Services stay Service-owned. The manager UI coordinates drafts but does not own lifecycle or persistence. `PackageRepository` is the persistence authority.

## Main Entry Points

### [PackageManagerStation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/PackageManagerStation.tsx)

Packages-only Tier/Promotion station. It resolves the compatibility host Service and renders `DynamicStationManager` in `packages` mode.

### [DynamicStationManager.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx)

Owns manager coordinator state with two required compositions. `service-catalog` renders Family Cards plus Details / Connections / Settings; `packages` renders only Package Tier cards and Promotions. `selectedCategoryGroupId` drives Service Catalog filtering and never assigns Tier occupants.

[serviceManagerDrawers.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/serviceManagerDrawers.tsx) supplies focused manager-owned editors whose apply callbacks use the Package provider draft.

Existing Package Family editing in that file now mounts the shared mature [PackageFamilyDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/package-family/PackageFamilyDrawerContent.tsx); only new-Family creation retains a focused create form. The same composition mounts under the Admin Station adapter, with Overview/Connections, dependency counts, shared inline editing, lifecycle footer, notifications, and dirty-close protection.

[serviceDrawerConfig.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/serviceDrawerConfig.ts) owns the canonical Service drawer config. [packageManagerDrawers.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/packageManagerDrawers.ts) separately owns Tier and Promotion configs. The former full manager drawer and nested portal path have been removed.

### [package.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/providers/package.ts)

Adapts Package Station data into drafts, validation, saves, summaries, and continuations. Use its markers below.

## State and Providers

- [coordinator.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/coordinator.ts) owns provider-neutral state and validation.
- [usePageManagerShell.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/usePageManagerShell.tsx) supplies the shared page footer and dirty-navigation adapter used by station hosts.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageStation.ts) owns Package Station client state and mutations.
- [usePackageFamilyStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageFamilyStation.ts) is the Package Family client write boundary: overview save/revert/settle, publish, enable/disable, archive/trash/restore, delete, module state, and mutation notification.
- [tierOccupants.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/shared/tierOccupants.ts) projects occupants and resolves them to slots.

## Backend and Persistence

[PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) owns manager shape and validation; [PackageCategoryGroups.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageCategoryGroups.php) owns group lifecycle and guards; [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists `cz_package_station`; and [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) owns the manager/tier/bin/popular REST mutations, with the [Package Family](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminPackageCategoryGroupsController.php) controller owning group mutations. Package Station URLs stay Service-scoped (`/admin/services/{id}/package-station/...`) — `{id}` is navigation context only, never storage. Promotions are owned by [PromotionsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Promotions/Http/PromotionsController.php), which shares this repository; see [Service Station](service-station.md).

## Internal File Navigation

| Concern | Marker | Contains | Read when... |
| --- | --- | --- | --- |
| Manager coordination | `SECTION: MANAGER_COORDINATION` | Provider drafts, validation, saves | Changing orchestration |
| Family scope | `SECTION: FAMILY_SCOPE` | Package Family cards and workspace scope | Changing scope behavior |
| Rate Sheet editor | `SECTION: RATE_SHEET_EDITOR` | Save/validation; editor UI in [PackageRateSheetEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageRateSheetEditor.tsx) | Changing Rate Sheet UI |
| Package provider | `SECTION: PACKAGE_PROVIDER` | Read, validate, save, continuations | Changing provider behavior |
| Manager shape | `SECTION: MANAGER_SHAPE` | Defaults and sanitization | Changing persisted shape |
| Manager commit | `SECTION: MANAGER_COMMIT` | Validation and commit | Changing saves |
| Reconciliation | `SECTION: SOURCE_RECONCILIATION` | Pool source resolution | Changing source items |
| Read model | `SECTION: MANAGER_READ_MODEL` | Provenance and health | Changing projections |
| Persistence | `SECTION: STATION_PERSISTENCE` | Load, cache, save, migration | Changing storage |
| Backend | `SECTION: PACKAGE_STATION` | Matching routes and handlers | Changing REST behavior |

## Validation

- [manager-coordinator-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/manager-coordinator-contract.ts)
- [package-manager-schema.php](../../wp-content/plugins/compuzign-platform/tests/package-manager-schema.php)
- [package-category-groups.php](../../wp-content/plugins/compuzign-platform/tests/package-category-groups.php)
- [tier-occupant-admin-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/tier-occupant-admin-contract.ts)

## Related Code Maps

[Service Connections](service-connections.md), [Rate Sheet](rate-sheet.md), and [Tiers](tiers.md).

## Related History

[Package Category Groups v1](../project-history/PackageCategoryGroups-v1.md) — group registry rationale, lifecycle/guard invariants, deferred work.
