# Package Manager

## Purpose and naming

The **Package Manager is Package-internal supply configuration, not the platform Station Manager**. It models the sources, relationships, grouping decisions, and Rate Sheet data from which Package Tiers are configured. [Station Manager](station-manager.md) only coordinates registered capabilities; it owns none of this data or behavior.

## Ownership

Package Station owns the Package Manager contract, API calls, client state, presentation, validation, and persistence. Services and their inclusion/FAQ pools remain Service-owned inputs. Package may create canonical pool items only through Service Station's public boundary; it does not write Service meta directly.

Admin Station is the presentation/control host. Its policy selects where registered Package surfaces appear, but it does not own Package Manager state, Package Family relationships, pricing, Tier lifecycle, or saves.

## Frontend

- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/types.ts) defines `PackageManagerReadModel`, source relationships, item decisions, groups, and Rate Sheet contracts.
- [api.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/api.ts) is the Package endpoint boundary.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) owns Package/Tier reads and mutations.
- [usePackageFamilyStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageFamilyStation.ts) owns Package Family lifecycle actions and derives its relationship-module state.
- [register.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/register.ts) registers Package navigation, destinations, data sources (including the `rate-sheet-tool` controller source), the Tier workspace and Rate Sheet tool kits, and Package drawers. It is boot-entry-only.
- [surface/rateSheetTool/](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/) and [presentation/rate-sheet-tool/](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/) — the Rate Sheet authoring surface (see [Rate Sheet](rate-sheet.md)). It reuses the manager read/save endpoints and IDs; it is not a second authority and adds no endpoint or storage.

The retired Command Centre editor is not an alternative authority. Rate Sheet authoring is provided by the Package Station Rate Sheet tool, which reuses the existing manager save contract and persistence boundary.

## Backend and persistence

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) owns manager shape, sanitization, source reconciliation, and read projection.
- [PackageStationSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageStationSchema.php) owns Package Station shape, Rate Sheet validation, Tier pricing, and commercial projection.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists the single `cz_package_station` option and resolves relationships.
- [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) owns manager, Tier, bin, and popular-Tier routes.
- [PackageFamiliesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageFamiliesController.php) owns Package Family lifecycle routes and exposes Package-owned related Service IDs.

Service-scoped Package URLs use the Service ID as navigation context, never as Package storage ownership. Promotion records share Package-owned persistence while their current REST handlers remain in `Modules/Promotions`.

## Validation

Run `php tests/package-manager-schema.php`, `php tests/package-category-groups.php`, `npx tsx scripts/tier-occupant-admin-contract.ts`, `npx tsx scripts/service-catalogue-projection-contract.ts`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Package Station](package-station.md), [Rate Sheet](rate-sheet.md), [Tiers](tiers.md), and [Service Connections](service-connections.md).
