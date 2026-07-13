# Admin Relations Boundary

## Audit metadata

Last audited: 2026-07-14 02:40 Australia/Brisbane
Audited commit: `02a7bffafc6739417c95644904c91f726bc889a7` (current working-tree changes reviewed)
Audited paths:
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/StationManagerStep.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageManagerTierCards.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/ManagerSubTabs.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageServicesTable.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageCategoryGroupsSection.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageRateSheetFilters.tsx`
- `wp-content/plugins/compuzign-platform/resources/css/modules/admin.css`
Changes in audited revision: Station Manager canvas containment, Service filters, Category Group split actions, Package option-Group controls, and Rate Sheet presentation were verified without changing provider state, contracts, or save authority.

## Entry guide

This folder owns the frontend relation-provider registry, Station Manager composition, provider-neutral coordination, Package/Promotion data providers, Package Category Groups, Service assignment, and Rate Sheet filtering. `DynamicStationManager.tsx` presents three UI workspaces in order: Services, Packages, Promotions. Services and Packages both consume the existing Package provider draft/save state; they are presentation workspaces, not additional provider contracts.

Services > Details contains only `PackageServicesTable`, with Category Group / Category / Status filters and a horizontally contained table; Connections contains the Package Category Group lifecycle station without a duplicate heading and uses Edit split actions; Settings is reserved. Packages > Details contains only dynamic Tier occupant cards; Connections contains the relationship table plus its source-option Group create/rename/reorder/delete controls; Settings contains Rate Sheet editing and filters without redundant titles. Promotions retains its prior workspace behavior.

Cards and nested Tier drawers use `occupant_id` as stable UI identity and pass the resolved `slotId` alongside it. `ServiceTierStep` re-resolves the occupant before using the fixed slot for reads, persistence, REST mutations, lifecycle, popular-Tier, and bin operations. Empty shells are absent from the card grid; fixed-shell ordering/restore consumers still use `TIER_KEYS`. Package Category Group ownership/filtering is deferred because occupants have no Category Group assignment.

Providers own adaptation and saves, but backend persistence remains in `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php` and admin REST controllers. Do not duplicate Package Station state, provider lifecycle, Service catalogue state, schema drawers, occupant persistence, or endpoint contracts here. Important dependencies are admin API types/endpoints, station hooks, schema shells, and `ActionShell`.

Read [Package Manager](../../../../../../../../docs/code-map/package-manager.md), [Tiers](../../../../../../../../docs/code-map/tiers.md), [Service Connections](../../../../../../../../docs/code-map/service-connections.md), [Rate Sheet](../../../../../../../../docs/code-map/rate-sheet.md), and [Promotions](../../../../../../../../docs/code-map/promotions.md). Read [Project History guidance](../../../../../../../../docs/project-history/000-README.md), and [Package Category Groups v1](../../../../../../../../docs/project-history/PackageCategoryGroups-v1.md) for the group registry, connect-and-assign, and dependency-guard decisions. UI placement does not change those ownership rules.

On entry: compare the audited paths with current files. If ownership still matches, do not repeat the full audit; inspect only changed or undocumented areas before editing.

## Exit guide

After relevant changes, replace this metadata and current-state summary; remove stale paths. Update affected Code Maps and, with user approval, a new Project History milestone when architecture, behavior, ownership, migration, lifecycle, or important decisions changed. Verify every documented path. Do not append audit logs.

With multiple agents, declare separate scopes, avoid overlapping edits, never reset/clean/restore unrelated changes, and report overlap before finishing.
