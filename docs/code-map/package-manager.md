# Package Manager

## Purpose

Owns Package Station persistence, Service supply configuration, and customer-facing Tier/Promotion presentation.

## Ownership

The Package Station owns `package_manager`, rate-sheet selections, tiers, promotions, bin entries, status, and `package_manager.category_groups`, assigned through Package-owned source relationships using `category_group_id`. Services stay Service-owned. The manager UI coordinates drafts but does not own lifecycle or persistence. `PackageRepository` is the persistence authority.

For the Service Catalogue, [PackageCategoryGroups.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageCategoryGroups.php) resolves each Family's related native Service IDs and the existing Package Family list route exposes them as `related_service_ids`. The Catalogue joins those rows into a multi-value Family projection. It never derives commercial grouping from the Service Category taxonomy parent: Service Category Group is not part of Catalogue grouping.

## Main Entry Points

### [PackageManagerStation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/PackageManagerStation.tsx)

Packages-only Tier/Promotion station. It resolves the compatibility host Service and renders `DynamicStationManager` in `packages` mode.

### [DynamicStationManager.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx)

Owns manager coordination. `service-catalog` renders Family Cards plus Details / Connections / Settings; `packages` renders Package Tier cards and Promotions. `selectedCategoryGroupId` filters the Service Catalog and never assigns Tier occupants.

[serviceManagerDrawers.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/serviceManagerDrawers.tsx) supplies focused manager-owned editors whose apply callbacks use the Package provider draft.

Package Family editing mounts shared [PackageFamilyDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/package-family/PackageFamilyDrawerContent.tsx); only creation retains a focused form. The same composition mounts under Admin Station with Overview/Connections, dependency counts, lifecycle, notifications, and dirty-close protection.

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
- [service-catalogue-projection-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/service-catalogue-projection-contract.ts)

## Related Code Maps

[Service Connections](service-connections.md), [Rate Sheet](rate-sheet.md), and [Tiers](tiers.md).

## Related History

[Package Category Groups v1](../project-history/PackageCategoryGroups-v1.md) — group registry rationale, lifecycle/guard invariants, deferred work.
