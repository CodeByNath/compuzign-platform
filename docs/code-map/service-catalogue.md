# Service Catalogue

## Purpose and ownership

Service Station owns the family-first Service Catalogue: Service browsing, creation handoff, Service drawer intent, data projection, and presentation kit. Service posts, direct Categories, meta, and lifecycle remain Service-owned. Package Family relationships remain Package-owned.

Admin Station is the presentation/control host, not the Catalogue owner. Admin's string-key presentation policy places the registered Service lower deck on the Services destination. Station Manager resolves the binding, data source, kit, intent, and drawer contract without owning their behavior.

## Registration and composition

[register.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/register.ts) registers:

- the Services navigation item and destination;
- `services` and `service-catalogue` data sources;
- the `service-lower-deck` template kit;
- the `service` drawer contract.

The Catalogue is no longer a wall of its own. [ServiceLowerDeck.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/presentation/ServiceLowerDeck.tsx) is the bound kit: it selects a lane and hands the Catalogue the template-kit props unchanged, so filters, sorting, pagination, table, and drawer intent behave exactly as before inside the `Details` lane. `Connections` and `Settings` are declared lanes with an empty state and nothing behind them. Lane semantics come from the Admin-owned `StationTabSet`; Service Home renders no Tier class and reaches no Package presentation module.

[useServiceCatalogue.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/surface/useServiceCatalogue.ts) composes Service summaries with Package Family relationships. [serviceCatalogueAdapter.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/surface/serviceCatalogueAdapter.ts) builds presentation rows, while [ServiceCatalogue.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/presentation/ServiceCatalogue.tsx) renders them and calls no endpoints.

[ServiceDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/surface/ServiceDrawerHost.tsx) adapts the Service-owned drawer composition to Station Manager's drawer contract. Admin Station's generic drawer shell hosts the resolved content and never saves Service data.

## Data boundaries

- [ServiceController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Http/ServiceController.php) owns Service REST reads and WordPress post/meta mutations.
- [PackageFamiliesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageFamiliesController.php) exposes Package Family rows with Package-owned `related_service_ids`.
- [usePackageFamilyRelationships.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageFamily/usePackageFamilyRelationships.ts) reads all Family lifecycle scopes; the Catalogue joins those native string Family IDs to numeric Service IDs without moving authority.

The Category filter uses the Service's direct Category slug. The Family filter uses `packageFamilies[].id` and rows show every related Family name. Service Category Group is not Catalogue grouping. The retired Command Centre manager and Rate Sheet editor are not part of this surface.

## Validation

Run `npx tsx scripts/service-catalogue-projection-contract.ts`, `npm run contract:station-tabset`, `php tests/package-category-groups.php`, `php tests/service-route-baseline.php`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Service Station](service-station.md), [Package Station](package-station.md), [Service Connections](service-connections.md), [Admin Station Drawer](admin-station-drawer.md), and [Station Manager](station-manager.md).
