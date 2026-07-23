# Package Manager

## Purpose

Owns Package Station persistence, Service supply configuration, and customer-facing Tier/Promotion presentation.

## Ownership

The Package Station owns `package_manager`, rate-sheet selections, tiers, promotions, bin entries, status, and `package_manager.category_groups`, assigned through Package-owned source relationships using `category_group_id`. Services stay Service-owned. The frontend coordinates drafts but does not own lifecycle or persistence. `PackageRepository` is the persistence authority.

For the Service Catalogue, [PackageCategoryGroups.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageCategoryGroups.php) resolves each Family's related native Service IDs and the existing Package Family list route exposes them as `related_service_ids`. The Catalogue joins those rows into a multi-value Family projection. It never derives commercial grouping from the Service Category taxonomy parent: Service Category Group is not part of Catalogue grouping.

The Admin Station **Packages** station is a full Package-domain workstation and the host of Station-level tools. Its first tool, the **Tier tool**, reuses the same authoritative `related_service_ids` (and each Family's `dependents`) to scope Tier occupants to a selected Package Family — Family is working scope only, never a tool owner or a Tier persistence owner (see [Tiers](tiers.md) and [Surface Binding](admin-station-surface-binding.md)). The Package Family drawer stays an entity editor: it hosts no tools, no Tier manager, and stores no tool activation.

## Frontend

The Command Centre provider-neutral manager — its coordinator, Package provider, Rate Sheet editor, and drawer configs — has been removed. Package-domain UI is now the Admin Station Packages station: its data source is [usePackageTierWorkspace.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/usePackageTierWorkspace.ts) and its presentation is detailed in [Tiers](tiers.md). Package Family editing mounts the shared [PackageFamilyDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/package-family/PackageFamilyDrawerContent.tsx) with Overview/Connections, dependency counts, lifecycle, notifications, and dirty-close protection; only creation retains a focused form.

## State

- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) owns Package Station client state and mutations.
- [usePackageFamilyStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageFamilyStation.ts) is the Package Family client write boundary: overview save/revert/settle, publish, enable/disable, archive/trash/restore, delete, module state, and mutation notification.
- [tierOccupants.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/tierOccupants.ts) projects occupants and resolves them to slots.

## Backend and Persistence

[PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) owns manager shape and validation; [PackageCategoryGroups.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageCategoryGroups.php) owns group lifecycle and guards; [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists `cz_package_station`; and [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) owns the manager/tier/bin/popular REST mutations, with the [Package Family](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageFamiliesController.php) controller owning group mutations. Package Station URLs stay Service-scoped (`/admin/services/{id}/package-station/...`) — `{id}` is navigation context only, never storage. Promotions are owned by [PromotionsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Promotions/Http/PromotionsController.php), which shares this repository; see [Service Station](service-station.md).

## Internal File Navigation

| Concern | Marker | Contains | Read when... |
| --- | --- | --- | --- |
| Manager shape | `SECTION: MANAGER_SHAPE` | Defaults and sanitization | Changing persisted shape |
| Manager commit | `SECTION: MANAGER_COMMIT` | Validation and commit | Changing saves |
| Reconciliation | `SECTION: SOURCE_RECONCILIATION` | Pool source resolution | Changing source items |
| Read model | `SECTION: MANAGER_READ_MODEL` | Provenance and health | Changing projections |
| Persistence | `SECTION: STATION_PERSISTENCE` | Load, cache, save, migration | Changing storage |
| Backend | `SECTION: PACKAGE_STATION` | Matching routes and handlers | Changing REST behavior |

## Validation

- [package-manager-schema.php](../../wp-content/plugins/compuzign-platform/tests/package-manager-schema.php)
- [package-category-groups.php](../../wp-content/plugins/compuzign-platform/tests/package-category-groups.php)
- [tier-occupant-admin-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/tier-occupant-admin-contract.ts)
- [service-catalogue-projection-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/service-catalogue-projection-contract.ts)

## Related Code Maps

[Service Connections](service-connections.md), [Rate Sheet](rate-sheet.md), and [Tiers](tiers.md).

## Related History

[Package Category Groups v1](../project-history/PackageCategoryGroups-v1.md) — group registry rationale, lifecycle/guard invariants, deferred work.
