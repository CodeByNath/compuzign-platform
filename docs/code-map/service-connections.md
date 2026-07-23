# Service Connections

## Purpose

Describes how a Service relates to the packages, promotions, and categories connected to it, and where that connection data is composed and persisted today.

## Status

The provider-neutral connection graph — a relation registry, a multi-provider coordinator, and Package/Promotion/read-only providers — was a Command Centre frontend system and has been removed with the Command Centre. No second graph replaced it: connection composition now lives directly in the shared entity-drawer compositions, each backed by its authoritative station hook and controller. Persistence authority never moved.

## Where connections live now

- **Package ↔ Service.** The Package Family drawer composes Services, Rate Sheet, and Tier dependency Connections. Composition: [PackageFamilyDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/package-family/PackageFamilyDrawerContent.tsx); client write boundary: [usePackageFamilyStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageFamilyStation.ts) and [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageStation.ts).
- **Category ↔ Service.** The Category drawer shows assigned-Service Connections as read-only projections; assignment stays Service-owned. See [Categories](categories.md).
- **Promotion ↔ Package.** Promotions are Package Station children; see [Promotions](promotions.md).

## Persistence authority

- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists Package source relationships in `cz_package_station`.
- [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) owns the manager/tier/bin mutations.
- [AdminPackageCategoryGroupsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminPackageCategoryGroupsController.php) exposes each Package Family's related native Service IDs, resolved by Package-owned `PackageCategoryGroups::relatedServiceIds()`.

Source facts stay read-only in the drawer; grouping, ordering, and membership are the mutable relationship state, and they patch through the authoritative station.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, `php tests/package-category-groups.php`, and `npm run docs:check`.

## Related Code Maps

[Service Catalogue](service-catalogue.md), [Package Manager](package-manager.md), and [Promotions](promotions.md).

## Related History

[Package Category Groups v1](../project-history/PackageCategoryGroups-v1.md) — the Package Category Group assignment model and dependency guards.
