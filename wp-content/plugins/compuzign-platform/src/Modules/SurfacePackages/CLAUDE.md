# Surface Packages Boundary

## Audit metadata

Last audited: 2026-07-14 01:28 Australia/Brisbane
Audited commit: `7026fd74a339805cc29e98c1340a01349c4fa2d6` (current working-tree changes reviewed)
Audited paths:
- `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php`
- `wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminServicesController.php`
- `wp-content/plugins/compuzign-platform/resources/ts/api/types/admin.ts`
- `wp-content/plugins/compuzign-platform/tests/tier-occupant-compatibility.php`
Changes in audited revision: The Tier read projection was verified to expose stored `current_occupant.id` as `occupant_id` without changing Package Station persistence or lifecycle.

## Entry guide

This module owns the backend Package Station domain. `SurfacePackagesModule.php` registers health/read services; `PackageStationReadController.php` publishes the public Package Station read projection; `PackageManagerSchema.php` and `PackageSchema.php` define current sanitized shapes and readiness; `PackageCategoryGroups.php` manages Package-owned grouping rules. For Admin Tier detail, `PackageSchema::normaliseTierSlot()` exposes the existing `current_occupant.id` as nullable `occupant_id`; empty and legacy flat shells expose null.

`PackageRepository.php` remains the persistence authority for the single `cz_package_station` WordPress option, request cache, promotions, relationship/pool projections, and one-time legacy Service-meta migration. `occupant_id` is projection-only: no field, collection, migration, or lifecycle rule was added. Admin controllers may mutate through this authority but must not create parallel storage. Do not duplicate Package Station schemas, promotion collections, Category Group assignments, legacy migration, Service catalogue ownership, or presentation status logic.

Important dependencies are WordPress options/posts/taxonomies, Admin controllers, Cost Builder projections, and frontend relation providers. Admin occupant cards use the projected ID, but fixed shell keys remain authoritative for persistence, REST mutations, lifecycle, popular-Tier handling, and bin travel. Package Category Group assignment is not present on Tier occupants. Read [Package Manager](../../../../../../docs/code-map/package-manager.md), [Rate Sheet](../../../../../../docs/code-map/rate-sheet.md), [Tiers](../../../../../../docs/code-map/tiers.md), and [Promotions](../../../../../../docs/code-map/promotions.md). Read [Project History guidance](../../../../../../docs/project-history/000-README.md), and [Package Category Groups v1](../../../../../../docs/project-history/PackageCategoryGroups-v1.md) for the Package-owned group registry, station lifecycle, assignment, and guard decisions persisted by this module. The incremental occupant projection/UI change has no separate milestone document.

On entry: compare audited paths with current files. Reuse this verified boundary when it still matches; audit only changed or undocumented areas.

## Exit guide

After relevant changes, replace audit metadata and current-state statements, removing stale paths. Update affected Code Maps and, with user approval, a new Project History milestone for architecture, behavior, ownership, persistence/migration, lifecycle, or important decisions. Verify all documented paths. Do not append audit history.

With multiple agents, declare non-overlapping scopes, never reset/clean/restore unrelated work, and report overlap before finishing.
