# Admin Relations Boundary

## Audit metadata

Last audited: 2026-07-19 Australia/Brisbane
Audited commit: `6ff7bdb` (drawer-kit relocation + Admin Station Service/Tier integration)
Audited paths:
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/serviceDrawerConfig.ts`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/packageManagerDrawers.ts`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageFamilyCards.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageRateSheetEditor.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/usePageManagerShell.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/serviceManagerDrawers.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageManagerTierCards.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/ManagerSubTabs.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageServicesTable.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageFamiliesSection.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageRateSheetFilters.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/ActionShell.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/AdminShell.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/DrawerTabs.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/ServiceCatalogStation.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/ServiceViewStep.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/ServiceTierStep.tsx`
- `wp-content/plugins/compuzign-platform/resources/css/modules/admin.css`
Current state: `ServiceCatalogStation` is the “Your Service Manager” supply/configuration host. New Service and New Group launch from its Settings tab. Focused manager-owned drawers patch its mounted draft and page Save remains atomic. Service and Tier entity drawers use the compact metadata header while their schema-owned Overview modules and inline editors remain authoritative. Their presentation and behaviour are owned by the neutral `entity-drawers/service/` and `entity-drawers/tier/` compositions, built on the generic `drawer-kit/` and mounted through the `drawer-kit/entityDrawerHost.ts` bridge; `ServiceViewStep` / `ServiceTierStep` are thin StepContext→bridge adapters (~50 lines each). **The Admin Station now mounts those same compositions** through its own thin adapters, so this folder is no longer the only host — do not add drawer presentation or behaviour here, and do not fork it there. See [Entity Drawer Recovery](../../../../../../../../docs/code-map/entity-drawer-recovery.md). `PackageManagerStation` renders the separate `packages` composition: supported Tier cards and Promotions only. The admin frame is full-width and left-aligned; the sidebar defaults to expanded above 1920px and icon-only at or below it.

## Entry guide

This folder owns the frontend relation-provider registry, provider-neutral coordination, Package/Promotion providers, Package Family assignment, Rate Sheet filtering, and focused drawer configs. `DynamicStationManager.tsx` requires either `service-catalog` supply configuration or `packages` Tier/Promotion presentation. Presentation location never changes provider ownership.

A Family Card strip above the workspace nav establishes the Package Family scope (All Groups and Ungrouped are first-class). On the `service-catalog` surface, Details contains `PackageServicesTable`, Connections contains the Package Family lifecycle station, and Settings begins with New Service/New Group before Commercial Groups and Rate Sheet configuration. The provider-only Services workspace still has no Settings tab. Packages > Details contains only dynamic Tier occupant cards; Packages > Connections contains only the relationship table (with the existing All/Features/Common Questions/Attention filters); Packages > Settings contains the Commercial (option) Group create/rename/reorder/delete controls above Rate Sheet editing and filters. Promotions presents Details only.

Cards and nested Tier drawers use `occupant_id` as stable UI identity and pass the resolved `slotId` alongside it. `ServiceTierStep` re-resolves the occupant before using the fixed slot for reads, persistence, REST mutations, lifecycle, popular-Tier, and bin operations. Empty shells are absent from the card grid; fixed-shell ordering/restore consumers still use `TIER_KEYS`. Package Family ownership/filtering is deferred because occupants have no Package Family assignment.

Providers own adaptation and saves, but backend persistence remains in `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php` and admin REST controllers. Do not duplicate Package Station state, provider lifecycle, Service catalogue state, schema drawers, occupant persistence, or endpoint contracts here. Important dependencies are admin API types/endpoints, station hooks, schema shells, and `ActionShell`.

Read [Package Manager](../../../../../../../../docs/code-map/package-manager.md), [Tiers](../../../../../../../../docs/code-map/tiers.md), [Service Connections](../../../../../../../../docs/code-map/service-connections.md), [Rate Sheet](../../../../../../../../docs/code-map/rate-sheet.md), and [Promotions](../../../../../../../../docs/code-map/promotions.md). Read [Project History guidance](../../../../../../../../docs/project-history/000-README.md), and [Package Category Groups v1](../../../../../../../../docs/project-history/PackageCategoryGroups-v1.md) for the group registry, connect-and-assign, and dependency-guard decisions. That milestone is immutable and keeps its original name; the entity it describes is now called Package Family in code. UI placement does not change those ownership rules.

On entry: compare the audited paths with current files. If ownership still matches, do not repeat the full audit; inspect only changed or undocumented areas before editing.

## Exit guide

After relevant changes, replace this metadata and current-state summary; remove stale paths. Update affected Code Maps and, with user approval, a new Project History milestone when architecture, behavior, ownership, migration, lifecycle, or important decisions changed. Verify every documented path. Do not append audit logs.

With multiple agents, declare separate scopes, avoid overlapping edits, never reset/clean/restore unrelated changes, and report overlap before finishing.
