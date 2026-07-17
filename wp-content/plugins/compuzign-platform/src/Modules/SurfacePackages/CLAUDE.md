# Surface Packages Boundary

## Audit metadata

Last audited: 2026-07-16 Australia/Brisbane
Audited commit: `a9f765f` (current working-tree changes reviewed)
Audited paths:
- `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php`
- `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php`
- `wp-content/plugins/compuzign-platform/resources/ts/api/types/admin.ts`
- `wp-content/plugins/compuzign-platform/tests/tier-occupant-compatibility.php`
Changes in audited revision: The `ServicePools` import moved to `Service\Support\ServicePools` when the Service module was established. Import path only — no Package Station behaviour, route, or persistence change.

## Entry guide

This module owns the backend Package Station domain. `SurfacePackagesModule.php` registers health/read services and both controllers; `PackageStationReadController.php` publishes the public Package Station read projection; `PackageStationController.php` owns the admin manager/tier/occupant-bin/popular REST mutations — moved here from the former `AdminServicesController`, with their Service-scoped URLs (`/admin/services/{id}/package-station/...`) deliberately unchanged, where `{id}` is navigation context only and never selects storage; `PackageManagerSchema.php` and `PackageSchema.php` define current sanitized shapes and readiness; `PackageCategoryGroups.php` manages Package-owned grouping rules. Promotions are a child collection of this station and are owned by the backend-only `Modules\Promotions` module, which holds no storage of its own and persists through this module's `PackageRepository` (see [Service Station](../../../../../../docs/code-map/service-station.md)). For Admin Tier detail, `PackageSchema::normaliseTierSlot()` exposes the existing `current_occupant.id` as nullable `occupant_id`; empty and legacy flat shells expose null.

Tier saves carrying `new_inclusions`/`new_faqs` call `Service\Support\ServicePools` — the inclusion/FAQ pools are Service-owned, so this module must write through that contract rather than touching `cz_service_*` meta. It is the only Service internal this module may import; never import `ServiceController`.

`PackageRepository.php` remains the persistence authority for the single `cz_package_station` WordPress option, request cache, promotions, relationship/pool projections, and one-time legacy Service-meta migration. `occupant_id` is projection-only: no field, collection, migration, or lifecycle rule was added. Admin controllers may mutate through this authority but must not create parallel storage. Do not duplicate Package Station schemas, promotion collections, Package Family assignments, legacy migration, Service catalogue ownership, or presentation status logic.

Important dependencies are WordPress options/posts/taxonomies, Admin controllers, Cost Builder projections, and frontend relation providers. Admin occupant cards use the projected ID, but fixed shell keys remain authoritative for persistence, REST mutations, lifecycle, popular-Tier handling, and bin travel. Package Family assignment is not present on Tier occupants. Read [Package Manager](../../../../../../docs/code-map/package-manager.md), [Rate Sheet](../../../../../../docs/code-map/rate-sheet.md), [Tiers](../../../../../../docs/code-map/tiers.md), and [Promotions](../../../../../../docs/code-map/promotions.md). Read [Project History guidance](../../../../../../docs/project-history/000-README.md), and [Package Category Groups v1](../../../../../../docs/project-history/PackageCategoryGroups-v1.md) for the Package-owned group registry, station lifecycle, assignment, and guard decisions persisted by this module. The incremental occupant projection/UI change has no separate milestone document.

On entry: compare audited paths with current files. Reuse this verified boundary when it still matches; audit only changed or undocumented areas.

## Exit guide

After relevant changes, replace audit metadata and current-state statements, removing stale paths. Update affected Code Maps and, with user approval, a new Project History milestone for architecture, behavior, ownership, persistence/migration, lifecycle, or important decisions. Verify all documented paths. Do not append audit history.

With multiple agents, declare non-overlapping scopes, never reset/clean/restore unrelated work, and report overlap before finishing.
