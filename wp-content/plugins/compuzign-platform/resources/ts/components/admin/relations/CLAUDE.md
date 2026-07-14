# Admin Relations Boundary

## Audit metadata

Last audited: 2026-07-14 Australia/Brisbane
Audited commit: `a3b47aa0b95fd335dcf60aac0f89b4def3a06fce` (plus working-tree Phase 1 changes)
Audited paths:
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/StationManagerStep.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/stationManagerDrawers.ts`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageCategoryGroupCards.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageRateSheetEditor.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageManagerTierCards.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/ManagerSubTabs.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageServicesTable.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageCategoryGroupsSection.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageRateSheetFilters.tsx`
- `wp-content/plugins/compuzign-platform/resources/css/modules/admin.css`
Changes in audited revision and current working tree: Phase 1 re-hosting — `stationManagerDrawers.ts` extracts the Promotion/Service Detail/Package Tier drawer configs shared by `StationManagerStep` (drawer host, unchanged behavior) and the new top-level `workstations/PackageManagerWorkstation.tsx` (page host with a page-level `ManagerShellContext` adapter and AdminShell navigation interceptor). `ManagerShellContext` is now exported from `DynamicStationManager.tsx`. Phase 2 adds the family-first workspace: `PackageCategoryGroupCards.tsx` renders the Category Group scope strip from the manager's existing group registry state (no extra fetch); `selectedCategoryGroupId` ('all' | 'unassigned' | group id) drives the Services table's now-controllable Category Group filter, relationship-row scoping via `assignmentByServiceId` (exported from `PackageRateSheetFilters.tsx`), and the Rate Sheet `categoryGroup` filter. `PackageCategoryGroupsSection.tsx` exports `groupStatusPill`, `dependentsSummary`, `currentGroupLifecycleOperations`, and `PackageCategoryGroupConfirmDialog` so the strip and section share one lifecycle implementation. The relations projection row carries optional `sourceServiceId` provenance (read-model only). Phase 3 consolidates the workspace layout: sub-tabs render only where populated (Services: Details/Connections; Packages: Details/Connections/Settings; Promotions: Details only — the empty Services > Settings and Promotion placeholders are gone). Packages > Connections now contains only the relationship table; the Commercial (option) Group structure section moved beside the Rate Sheet under Packages > Settings (host-side ordering: Groups above Rate Sheet; provider section contracts unchanged). The inline Rate Sheet editor was extracted verbatim to `PackageRateSheetEditor.tsx` — the manager retains `editingRateSheet` (dirty/exit-guard input), save/validation (`saveRateSheet`), and the source-preview draft; the component owns only editor-local UI state. Provider state, contracts, coordinator behavior, and save authority are unchanged.

## Entry guide

This folder owns the frontend relation-provider registry, Station Manager composition, provider-neutral coordination, Package/Promotion data providers, Package Category Groups, Service assignment, Rate Sheet filtering, and the shared Station Manager drawer configs (`stationManagerDrawers.ts`) consumed by both the drawer entry (`StationManagerStep`) and the Package Manager workstation page. `DynamicStationManager.tsx` presents three UI workspaces in order: Services, Packages, Promotions. Services and Packages both consume the existing Package provider draft/save state; they are presentation workspaces, not additional provider contracts.

A Family Card strip above the workspace nav establishes the Category Group scope (All Groups and Ungrouped are first-class). Services > Details contains only `PackageServicesTable`, with Category Group (workspace-controlled) / Category / Status filters and an adaptive Service collection whose rows become labeled cards at narrow drawer widths. Services > Connections contains the Package Category Group lifecycle station; Services has no Settings tab. Packages > Details contains only dynamic Tier occupant cards; Packages > Connections contains only the relationship table (with the existing All/Features/Common Questions/Attention filters); Packages > Settings contains the Commercial (option) Group create/rename/reorder/delete controls above Rate Sheet editing and filters. Promotions presents Details only.

Cards and nested Tier drawers use `occupant_id` as stable UI identity and pass the resolved `slotId` alongside it. `ServiceTierStep` re-resolves the occupant before using the fixed slot for reads, persistence, REST mutations, lifecycle, popular-Tier, and bin operations. Empty shells are absent from the card grid; fixed-shell ordering/restore consumers still use `TIER_KEYS`. Package Category Group ownership/filtering is deferred because occupants have no Category Group assignment.

Providers own adaptation and saves, but backend persistence remains in `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php` and admin REST controllers. Do not duplicate Package Station state, provider lifecycle, Service catalogue state, schema drawers, occupant persistence, or endpoint contracts here. Important dependencies are admin API types/endpoints, station hooks, schema shells, and `ActionShell`.

Read [Package Manager](../../../../../../../../docs/code-map/package-manager.md), [Tiers](../../../../../../../../docs/code-map/tiers.md), [Service Connections](../../../../../../../../docs/code-map/service-connections.md), [Rate Sheet](../../../../../../../../docs/code-map/rate-sheet.md), and [Promotions](../../../../../../../../docs/code-map/promotions.md). Read [Project History guidance](../../../../../../../../docs/project-history/000-README.md), and [Package Category Groups v1](../../../../../../../../docs/project-history/PackageCategoryGroups-v1.md) for the group registry, connect-and-assign, and dependency-guard decisions. UI placement does not change those ownership rules.

On entry: compare the audited paths with current files. If ownership still matches, do not repeat the full audit; inspect only changed or undocumented areas before editing.

## Exit guide

After relevant changes, replace this metadata and current-state summary; remove stale paths. Update affected Code Maps and, with user approval, a new Project History milestone when architecture, behavior, ownership, migration, lifecycle, or important decisions changed. Verify every documented path. Do not append audit logs.

With multiple agents, declare separate scopes, avoid overlapping edits, never reset/clean/restore unrelated changes, and report overlap before finishing.
