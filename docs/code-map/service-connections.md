# Service Connections

## Purpose

Maps Service relationships to their current composition and persistence owners. There is no platform-wide relation registry: Station Manager registers and resolves surfaces and drawers, but it does not model, store, or mutate domain connections.

## Current connections

- **Package Family ↔ Service.** Package Station owns source relationships and native `related_service_ids`. [PackageFamilyDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/package-family/PackageFamilyDrawerContent.tsx) presents Service, Rate Sheet, and Tier dependency connections. [usePackageFamilyStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageFamilyStation.ts) is the Package Family client write boundary.
- **Tier ↔ Service.** The Package-owned Tier drawer consumes Service Station's public `serviceConnectionBinding`, authored in [service.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/drawer/schema/bindings/service.tsx) and exported from the Service barrel. Tier selection and persistence remain Package-owned; Service pool creation remains Service-owned.
- **Category ↔ Service.** The neutral Category drawer shows assigned-Service connections as a read-only projection. Service Home's Connections lane reads the SAME authoritative Category list (`fetchAdminCategories`, already carrying server-computed `assigned_count`) and presents Categories connected to at least one Service; it invents no second relationship model and performs no mutation. Its rows read in the connected-record grammar Package Manager's own Connections list uses — identity, Platform ID (`CZC`), a labelled Services count, the shared `cz-module-status-pill`, then View — under Service's own row classes, with no Package presentation import. Service assignment remains Service-owned; see [Categories](categories.md).
- **Promotion ↔ Package.** Promotion records share `cz_package_station` persistence, but Promotion ownership remains with the current Admin/Promotions residue and its routes remain in `Modules/Promotions`; Promotions are not Package Station children. See [Promotions](promotions.md).

Owning Station drawer compositions render these relationships. Station Manager carries only registered contracts and the opening record identity; Admin Station's drawer shell only hosts the resolved owner contract.

## Persistence boundaries

- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists Package source relationships and commercial records in `cz_package_station`.
- [PackageCategoryGroups.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageCategoryGroups.php) resolves Family membership and dependency guards.
- [PackageFamiliesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageFamiliesController.php) owns Package Family lifecycle routes and exposes the Package-owned relationship projection.
- [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) owns Package Manager, Tier, and bin mutations.
- [ServiceController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Http/ServiceController.php) owns Service relationships written through Service routes.

Read-model facts such as source labels and provenance remain projections. Mutable grouping, ordering, membership, and Tier selections patch through their authoritative Station boundaries.

## Validation

Run `php tests/package-category-groups.php`, `npx tsx scripts/service-catalogue-projection-contract.ts`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Service Station](service-station.md), [Package Station](package-station.md), [Service Catalogue](service-catalogue.md), and [Package Manager](package-manager.md).
