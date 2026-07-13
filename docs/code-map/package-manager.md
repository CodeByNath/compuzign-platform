# Package Manager

## Purpose

Configures the Package Station’s relationship sources and manager-wide selections, then exposes its tier occupants and commercial summary to admin surfaces.

## Ownership

The Package Station owns `package_manager`, rate-sheet selections, tiers, promotions, bin entries, and station status. The manager UI coordinates provider drafts but must not own tier lifecycle or duplicate Package Station persistence. `PackageRepository` is the independent persistence authority; a service ID is retained as routing and legacy-host context.

## Main Entry Points

### [StationManagerStep.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/StationManagerStep.tsx)

Builds the Station Manager action config, supplies service-scoped context, hosts `DynamicStationManager`, and opens nested Promotion or Tier drawers through portal overlays. Use this file when changing manager navigation, overlays, Back behavior, or Package/Promotion handoffs.

### [DynamicStationManager.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx)

Contains provider tabs/workspaces, manager drafts, Rate Sheet groups and source picker, validation summaries, dirty-exit confirmation, and coordinated Save footer behavior. Use this file when changing manager-wide UI, Rate Sheet editing, provider switching, or save/exit orchestration.

### [package.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/providers/package.ts)

Adapts Package Station data into manager sections, drafts, validation, save results, summaries, and continuations. Use this file when changing what Package Manager reads, validates, persists, or opens next.

## UI and Drawers

- [PackageManagerTierCards.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageManagerTierCards.tsx) renders fixed-tier summary cards and View/Edit actions. Use it for manager tier-card presentation.
- [ManagerSubTabs.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/ManagerSubTabs.tsx) renders provider sub-navigation. Use it for manager tab labels and selection behavior.

## State and Providers

- [coordinator.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/coordinator.ts) owns provider ordering, read models, draft state, dirty checks, validation aggregation, and save-result application. Use it for manager state rules independent of UI.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageStation.ts) owns Package Station fetch/mutation state and Tier, bin, pool, popular-tier, and lifecycle API actions. Use it when changing client state or mutation behavior.

## Backend and Persistence

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) constructs defaults and sanitizes manager sources, groups, and Rate Sheet selections. Use it for persisted manager shape and validation rules.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) owns the `cz_package_station` option, request cache, projections, and one-time legacy Service-meta migration. Use it for Package Station persistence or compatibility behavior.
- [AdminServicesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminServicesController.php) registers manager, Tier, promotion, pool, and Service REST routes. Use it for request validation and mutation endpoints.

## Validation

- [manager-coordinator-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/manager-coordinator-contract.ts)
- [package-manager-schema.php](../../wp-content/plugins/compuzign-platform/tests/package-manager-schema.php)

## Related Code Maps

[Service Connections](service-connections.md), [Rate Sheet](rate-sheet.md), and [Tiers](tiers.md).
