# Package Manager

## Purpose

Configures the Package Station’s relationship sources and manager-wide selections, exposing tier occupants and the commercial summary to admin surfaces.

## Ownership

The Package Station owns `package_manager`, rate-sheet selections, tiers, promotions, bin entries, status, and `package_manager.category_groups`, assigned to sources through `category_group_id`. Services stay Service-owned. The manager UI coordinates drafts but does not own lifecycle or persistence. `PackageRepository` is the persistence authority.

## Main Entry Points

### [PackageManagerWorkstation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/workstations/PackageManagerWorkstation.tsx)

Top-level workstation hosting `DynamicStationManager` on a page: resolves the compatibility host-Service id, supplies a page-level `ManagerShellContext` adapter, registers the AdminShell navigation interceptor, and opens Service, Tier, and Promotion drawers as first-level actions.

### [StationManagerStep.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/StationManagerStep.tsx)

Builds the Station Manager drawer action, hosts `DynamicStationManager`, and opens nested Promotion or Tier drawers via the shared configs in [stationManagerDrawers.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/stationManagerDrawers.ts). Tier-card handoff carries stable `occupantId` plus internal `slotId`.

### [DynamicStationManager.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx)

Composes Services, Packages, and Promotions, headed by the Family Card strip ([PackageCategoryGroupCards.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageCategoryGroupCards.tsx)); its `selectedCategoryGroupId` scope drives the Services filter, relationship-row scoping, and the Rate Sheet group filter through existing mechanisms.

### [package.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/providers/package.ts)

Adapts Package Station data into drafts, validation, saves, summaries, and continuations. Use its markers below.

## State and Providers

- [coordinator.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/coordinator.ts) owns provider-neutral state and validation.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageStation.ts) owns Package Station client state and mutations.
- [tierOccupants.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/utils/tierOccupants.ts) projects occupants and resolves them to slots.

## Backend and Persistence

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) constructs defaults and sanitizes manager sources, groups, category groups, and Rate Sheet selections, and carries supplying-Service provenance into the read model. Use it for persisted manager shape and validation rules.
- [PackageCategoryGroups.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageCategoryGroups.php) is the pure group-station collection: StationLifecycle transitions, overview draft/settle/revert, projections, and dependency guards. Use it for group behavior rules.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) owns the `cz_package_station` option, request cache, projections, and one-time legacy Service-meta migration. Use it for Package Station persistence or compatibility behavior.
- [AdminServicesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminServicesController.php) registers manager, Tier, promotion, pool, and Service REST routes. Use it for request validation and mutation endpoints.
- [AdminPackageCategoryGroupsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminPackageCategoryGroupsController.php) registers the `/admin/package-category-groups` station REST family (list/create/overview/status/restore/guarded delete).

## Internal File Navigation

| Concern | Marker | Contains | Read when... |
| --- | --- | --- | --- |
| Manager coordination | `SECTION: MANAGER_COORDINATION` | Provider drafts, validation, saves | Changing orchestration |
| Family scope | `SECTION: FAMILY_SCOPE` | Category Group cards and workspace scope | Changing scope behavior |
| Workspaces | `SECTION: SERVICE_WORKSPACE`, `PACKAGE_WORKSPACE`, `PROMOTION_WORKSPACE` | Connections = relationships; Settings = option Groups + Rate Sheet | Changing workspace UI |
| Rate Sheet editor | `SECTION: RATE_SHEET_EDITOR` | Save/validation; editor UI in [PackageRateSheetEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageRateSheetEditor.tsx) | Changing Rate Sheet UI |
| Package provider | `SECTION: PACKAGE_PROVIDER` | Read, validate, save, continuations | Changing provider behavior |
| Manager shape | `SECTION: MANAGER_SHAPE` | Defaults and sanitization | Changing persisted shape |
| Manager commit | `SECTION: MANAGER_COMMIT` | Validation and commit | Changing saves |
| Reconciliation | `SECTION: SOURCE_RECONCILIATION` | Pool source resolution | Changing source items |
| Read model | `SECTION: MANAGER_READ_MODEL` | Provenance and health | Changing projections |
| Rate Sheet projection | `SECTION: RATE_SHEET_PROJECTION` | Tier references | Changing Tier inputs |
| Persistence | `SECTION: STATION_PERSISTENCE` | Load, cache, save, migration | Changing storage |
| Source projections | `SECTION: SOURCE_PROJECTIONS` | Pools and provenance | Changing supply data |
| Lookups | `SECTION: PACKAGE_LOOKUPS` | Coverage and indexes | Changing Package discovery |
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
