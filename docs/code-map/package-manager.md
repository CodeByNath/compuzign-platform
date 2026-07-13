# Package Manager

## Purpose

Configures the Package Station’s relationship sources and manager-wide selections, then exposes its tier occupants and commercial summary to admin surfaces.

## Ownership

The Package Station owns `package_manager`, rate-sheet selections, tiers, promotions, bin entries, station status, and the Package Category Group registry (`package_manager.category_groups` — permanent commercial buckets such as KAIROS, assigned to sources via `category_group_id`). Services and Service Categories stay Service-owned. The manager UI coordinates provider drafts but must not own tier lifecycle or duplicate Package Station persistence. `PackageRepository` is the independent persistence authority; a service ID is retained as routing and legacy-host context.

## Main Entry Points

### [StationManagerStep.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/StationManagerStep.tsx)

Builds the Station Manager action config, supplies service-scoped context, hosts `DynamicStationManager`, and opens nested Promotion or Tier drawers through portal overlays. Tier-card handoff carries stable `occupantId` plus the resolved internal `slotId`; the drawer uses occupant identity while existing Tier operations retain the slot address. Use this file when changing manager navigation, overlays, Back behavior, or Package/Promotion handoffs.

### [DynamicStationManager.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx)

Contains provider tabs/workspaces, manager drafts, Rate Sheet groups and source picker, validation summaries, dirty-exit confirmation, and coordinated Save footer behavior. Use this file when changing manager-wide UI, Rate Sheet editing, provider switching, or save/exit orchestration.

### [package.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/providers/package.ts)

Adapts Package Station data into manager sections, drafts, validation, save results, summaries, and continuations. Use this file when changing what Package Manager reads, validates, persists, or opens next.

## UI and Drawers

- [PackageManagerTierCards.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageManagerTierCards.tsx) renders the dynamic settled-occupant collection supplied by `usePackageStation`, excluding empty fixed shells. Cards are keyed and selected by `occupant_id`, while their View/Edit handoff retains the resolved `slotId`. This surface does not yet filter occupants by Package Category Group because no Tier occupant carries a Category Group assignment.
- [ManagerSubTabs.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/ManagerSubTabs.tsx) renders provider sub-navigation with per-provider labels (package: Services / Service Connections / Settings). Use it for manager tab labels and selection behavior.
- [PackageServicesTable.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageServicesTable.tsx) lists all catalog Services with pool counts and the Package Category Group dropdown — the connect-and-assign gesture into the provider draft. Use it for the Services tab table.
- [PackageCategoryGroupsSection.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageCategoryGroupsSection.tsx) manages the group station (create, draft apply/discard, publish/disable, archive/trash/restore, guarded delete) under Service Connections.
- [PackageRateSheetFilters.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageRateSheetFilters.tsx) filters Rate Sheet rows by Package Category Group, Service Category, Service, Inclusion Group, status, and search.

## State and Providers

- [coordinator.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/coordinator.ts) owns provider ordering, read models, draft state, dirty checks, validation aggregation, and save-result application. Use it for manager state rules independent of UI.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageStation.ts) owns Package Station fetch/mutation state, derives the visible Tier occupant collection, resolves occupant IDs to fixed slots, and retains slot-addressed Tier, bin, pool, popular-tier, and lifecycle API actions. Use it when changing client state or mutation behavior.
- [tierOccupants.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/utils/tierOccupants.ts) is the pure Admin projection and occupant-to-slot resolver used by Manager cards and the Tier drawer handoff.

## Backend and Persistence

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) constructs defaults and sanitizes manager sources, groups, category groups, and Rate Sheet selections, and carries supplying-Service provenance into the read model. Use it for persisted manager shape and validation rules.
- [PackageCategoryGroups.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageCategoryGroups.php) is the pure group-station collection: StationLifecycle transitions, overview draft/settle/revert, projections, and dependency guards. Use it for group behavior rules.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) owns the `cz_package_station` option, request cache, projections, and one-time legacy Service-meta migration. Use it for Package Station persistence or compatibility behavior.
- [AdminServicesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminServicesController.php) registers manager, Tier, promotion, pool, and Service REST routes. Use it for request validation and mutation endpoints.
- [AdminPackageCategoryGroupsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminPackageCategoryGroupsController.php) registers the `/admin/package-category-groups` station REST family (list/create/overview/status/restore/guarded delete).

## Validation

- [manager-coordinator-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/manager-coordinator-contract.ts)
- [package-manager-schema.php](../../wp-content/plugins/compuzign-platform/tests/package-manager-schema.php)
- [package-category-groups.php](../../wp-content/plugins/compuzign-platform/tests/package-category-groups.php)
- [tier-occupant-admin-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/tier-occupant-admin-contract.ts)

## Related Code Maps

[Service Connections](service-connections.md), [Rate Sheet](rate-sheet.md), and [Tiers](tiers.md).

## Related History

[Package Category Groups v1](../project-history/PackageCategoryGroups-v1.md) — group registry rationale, lifecycle/guard invariants, deferred work.
