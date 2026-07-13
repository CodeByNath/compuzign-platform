# Admin Backend Boundary

## Audit metadata

Last audited: 2026-07-14 01:28 Australia/Brisbane
Audited commit: `7026fd74a339805cc29e98c1340a01349c4fa2d6` (current working-tree changes reviewed)
Audited paths:
- `wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminServicesController.php`
- `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php`
- `wp-content/plugins/compuzign-platform/resources/ts/api/types/admin.ts`
- `wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageStation.ts`
Changes in audited revision: The existing Admin Package Station Tier read assembly was verified against the new `occupant_id` projection and unchanged slot-addressed mutation routes.

## Entry guide

This module owns authenticated admin REST routing and mutation orchestration for Services, Categories, Category Groups, Package Category Groups, Package/Tier/Promotion compatibility routes, requests, and overview data. `AdminModule.php` wires controllers; `AdminRouter.php` serves the admin shell; controllers under this folder's `Http` directory own route validation and responses. `StationLifecycle.php`, `CategoryMeta.php`, and `PoolReferences.php` provide shared lifecycle, metadata, and pool-reference rules. `AdminServicesController::getPackageStation()` assembles Tier details through `PackageSchema::normaliseTierSlot()`, so settled records now include nullable `occupant_id` projected from `current_occupant.id`.

Persistence remains with WordPress entity/meta APIs and domain repositories—especially `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php`. The Tier route family remains addressed by fixed shell/slot IDs for module saves, settle, enabled state, popular Tier, archive, restore targeting, trash, and delete; the Admin UI's occupant identity does not alter those routes. Do not duplicate repository storage, frontend station hooks, schema UI, Cost Builder projections, or Package schema authority inside controllers. Keep permission checks and REST contracts aligned with `wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/admin.ts` and `wp-content/plugins/compuzign-platform/resources/ts/api/types/admin.ts`.

Tier occupant cards and drawer selection use `occupant_id`, but the client resolves it to `slotId` before invoking mutations. Fixed-shell consumers continue to use `TIER_KEYS`. Package Category Group filtering is not implemented because Tier occupants have no Category Group assignment.

Read [Service Catalogue](../../../../../../docs/code-map/service-catalogue.md), [Categories](../../../../../../docs/code-map/categories.md), [Category Groups](../../../../../../docs/code-map/category-groups.md), [Package Manager](../../../../../../docs/code-map/package-manager.md), [Tiers](../../../../../../docs/code-map/tiers.md), and [Lifecycle](../../../../../../docs/code-map/lifecycle-system.md). Read [Project History guidance](../../../../../../docs/project-history/000-README.md), and [Package Category Groups v1](../../../../../../docs/project-history/PackageCategoryGroups-v1.md) for the `/admin/package-category-groups` REST family, lifecycle, and dependency-guard decisions. The incremental Admin projection/UI change has no separate milestone document.

On entry: compare audited paths with current files. If registration, ownership, and routes still match, audit only changed or undocumented controllers.

## Exit guide

After relevant changes, replace audit metadata and stale current-state information. Update related Code Maps and, with user approval, create a new history milestone for significant architecture, behavior, ownership, migration, lifecycle, or design decisions. Verify every path; never append audit logs.

With multiple agents, declare separate controller/file scopes, avoid overlap, never reset/clean/restore unrelated work, and report overlap before finishing.
