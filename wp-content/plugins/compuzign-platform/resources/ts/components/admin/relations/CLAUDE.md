# Admin Relations Boundary

## Audit metadata

Last audited: 2026-07-14 01:28 Australia/Brisbane
Audited commit: `7026fd74a339805cc29e98c1340a01349c4fa2d6` (current working-tree changes reviewed)
Audited paths:
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/StationManagerStep.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageManagerTierCards.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/workstations/ServiceTierStep.tsx`
- `wp-content/plugins/compuzign-platform/resources/ts/components/admin/utils/tierOccupants.ts`
- `wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageStation.ts`
- `wp-content/plugins/compuzign-platform/resources/ts/api/types/admin.ts`
- `wp-content/plugins/compuzign-platform/scripts/tier-occupant-admin-contract.ts`
Changes in audited revision: The current Admin Tier occupant projection, dynamic Manager/overview cards, and stable occupant-to-fixed-slot drawer handoff were reviewed against the working tree.

## Entry guide

This folder owns the frontend relation-provider registry, Station Manager composition, provider-neutral coordination, Package/Promotion workspaces, Package Category Groups, Service assignment, and Rate Sheet filtering. `StationManagerStep.tsx` is the drawer/overlay entry; `DynamicStationManager.tsx` is the runtime composition root; `PackageManagerTierCards.tsx` renders the settled occupant collection rather than looping over fixed `TIER_KEYS`; `registry.ts` selects providers; `coordinator.ts` owns transient provider read models, drafts, validation, dirty state, and save aggregation.

Cards and nested Tier drawers use `occupant_id` as stable UI identity and pass the resolved `slotId` alongside it. `ServiceTierStep` re-resolves the occupant before using the fixed slot for reads, persistence, REST mutations, lifecycle, popular-Tier, and bin operations. Empty shells are absent from the card grid; fixed-shell ordering/restore consumers still use `TIER_KEYS`. Package Category Group ownership/filtering is deferred because occupants have no Category Group assignment.

Providers own adaptation and saves, but backend persistence remains in `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php` and admin REST controllers. Do not duplicate Package Station state, provider lifecycle, Service catalogue state, schema drawers, occupant persistence, or endpoint contracts here. Important dependencies are admin API types/endpoints, station hooks, schema shells, and `ActionShell`.

Read [Package Manager](../../../../../../../../docs/code-map/package-manager.md), [Tiers](../../../../../../../../docs/code-map/tiers.md), [Service Connections](../../../../../../../../docs/code-map/service-connections.md), [Rate Sheet](../../../../../../../../docs/code-map/rate-sheet.md), and [Promotions](../../../../../../../../docs/code-map/promotions.md). Read [Project History guidance](../../../../../../../../docs/project-history/000-README.md), and [Package Category Groups v1](../../../../../../../../docs/project-history/PackageCategoryGroups-v1.md) for the group registry, connect-and-assign, and dependency-guard decisions governing this folder's Package sections. The dynamic Admin occupant projection is an incremental UI/read-model change and has no separate milestone document.

On entry: compare the audited paths with current files. If ownership still matches, do not repeat the full audit; inspect only changed or undocumented areas before editing.

## Exit guide

After relevant changes, replace this metadata and current-state summary; remove stale paths. Update affected Code Maps and, with user approval, a new Project History milestone when architecture, behavior, ownership, migration, lifecycle, or important decisions changed. Verify every documented path. Do not append audit logs.

With multiple agents, declare separate scopes, avoid overlapping edits, never reset/clean/restore unrelated changes, and report overlap before finishing.
