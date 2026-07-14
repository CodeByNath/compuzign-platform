# Admin Relations Boundary

## Audit metadata

Last audited: 2026-07-14 Australia/Brisbane
Audited commit: `64416be` plus the Your Service Manager recomposition working tree
Audited paths:
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/serviceDrawerConfig.ts`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/packageManagerDrawers.ts`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageCategoryGroupCards.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageRateSheetEditor.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/usePageManagerShell.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/serviceManagerDrawers.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageManagerTierCards.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/ManagerSubTabs.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageServicesTable.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageCategoryGroupsSection.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageRateSheetFilters.tsx`
- `wp-content/plugins/compuzign-platform/resources/css/modules/admin.css`
Current state: `ServiceCatalogWorkstation` is the “Your Service Manager” host. Focused manager-owned drawers patch its mounted draft and page Save remains atomic. `ServiceViewStep` no longer discovers or opens a Station Manager. `StationManagerStep` and its nested portal have been removed. Service drawer configuration is isolated in `serviceDrawerConfig.ts`; Tier and Promotion configs live in `packageManagerDrawers.ts`. The mixed Package page remains for Phase D reduction.

## Entry guide

This folder owns the frontend relation-provider registry, Station Manager composition, provider-neutral coordination, Package/Promotion data providers, Package Category Groups, Service assignment, Rate Sheet filtering, and shared drawer configs. `DynamicStationManager.tsx` now has an explicit Service Catalog composition while retaining legacy Package/Promotion composition until their later phases. Presentation location never changes provider ownership.

A Family Card strip above the workspace nav establishes the Category Group scope (All Groups and Ungrouped are first-class). Services > Details contains only `PackageServicesTable`, with Category Group (workspace-controlled) / Category / Status filters and an adaptive Service collection whose rows become labeled cards at narrow drawer widths. Services > Connections contains the Package Category Group lifecycle station; Services has no Settings tab. Packages > Details contains only dynamic Tier occupant cards; Packages > Connections contains only the relationship table (with the existing All/Features/Common Questions/Attention filters); Packages > Settings contains the Commercial (option) Group create/rename/reorder/delete controls above Rate Sheet editing and filters. Promotions presents Details only.

Cards and nested Tier drawers use `occupant_id` as stable UI identity and pass the resolved `slotId` alongside it. `ServiceTierStep` re-resolves the occupant before using the fixed slot for reads, persistence, REST mutations, lifecycle, popular-Tier, and bin operations. Empty shells are absent from the card grid; fixed-shell ordering/restore consumers still use `TIER_KEYS`. Package Category Group ownership/filtering is deferred because occupants have no Category Group assignment.

Providers own adaptation and saves, but backend persistence remains in `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php` and admin REST controllers. Do not duplicate Package Station state, provider lifecycle, Service catalogue state, schema drawers, occupant persistence, or endpoint contracts here. Important dependencies are admin API types/endpoints, station hooks, schema shells, and `ActionShell`.

Read [Package Manager](../../../../../../../../docs/code-map/package-manager.md), [Tiers](../../../../../../../../docs/code-map/tiers.md), [Service Connections](../../../../../../../../docs/code-map/service-connections.md), [Rate Sheet](../../../../../../../../docs/code-map/rate-sheet.md), and [Promotions](../../../../../../../../docs/code-map/promotions.md). Read [Project History guidance](../../../../../../../../docs/project-history/000-README.md), and [Package Category Groups v1](../../../../../../../../docs/project-history/PackageCategoryGroups-v1.md) for the group registry, connect-and-assign, and dependency-guard decisions. UI placement does not change those ownership rules.

On entry: compare the audited paths with current files. If ownership still matches, do not repeat the full audit; inspect only changed or undocumented areas before editing.

## Exit guide

After relevant changes, replace this metadata and current-state summary; remove stale paths. Update affected Code Maps and, with user approval, a new Project History milestone when architecture, behavior, ownership, migration, lifecycle, or important decisions changed. Verify every documented path. Do not append audit logs.

With multiple agents, declare separate scopes, avoid overlapping edits, never reset/clean/restore unrelated changes, and report overlap before finishing.
