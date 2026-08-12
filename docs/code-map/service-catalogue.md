# Service Catalogue

Service Catalogue follows the locked [Station and Drawer Lifecycle Contract](../architecture/StationDrawerLifecycleContract-v1.md): Overview Save creates the persisted Pending Service, and Publish acts only on its returned ID.

## Purpose and ownership

Service Station owns the family-first Service Catalogue: Service browsing, creation handoff, Service drawer intent, data projection, and presentation kit. Service posts, direct Categories, meta, and lifecycle remain Service-owned. Package Family relationships remain Package-owned.

Admin Station is the presentation/control host, not the Catalogue owner. Admin's string-key presentation policy places the registered Service lower deck on the Services destination. Station Manager resolves the binding, data source, kit, intent, and drawer contract without owning their behavior.

## Registration and composition

[register.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/register.ts) registers:

- the Services navigation item and destination;
- `services` and `service-catalogue` data sources;
- the `service-lower-deck` template kit;
- the `service` drawer contract.

Admin Station's `service-lower-deck` surface binding carries the deck's own action intents: `view` (Service), `view-category` (opens the `category` drawer key from the same lane), `create-service`, and `create-category` (both open at the `'new'` recordId sentinel) — one surface dispatching to more than one registered drawer key, the same shape the Tier binding already uses.

The Catalogue is no longer a wall of its own. [ServiceLowerDeck.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/presentation/ServiceLowerDeck.tsx) is the bound kit: it selects a lane and hands the Catalogue the template-kit props unchanged, so filters, sorting, pagination, table, and drawer intent behave exactly as before inside the `Details` lane. `Connections` and `Settings` are Service's own lanes now: [ServiceConnectionsLane.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/presentation/ServiceConnectionsLane.tsx) renders a read-only, shared-list projection of Categories connected to at least one Service (`assigned_count > 0`) via [useServiceHomeConnections](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/surface/serviceHomeConnections.ts), View opening the mature `category` drawer by real numeric id; [ServiceSettingsLane.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/presentation/ServiceSettingsLane.tsx) renders exactly two launchers, Create Service and Create Category, both opening their mature drawers at the `'new'` recordId sentinel. Lane semantics come from the Admin-owned `StationTabSet`; Service Home renders no Tier class and reaches no Package presentation module.

[useServiceCatalogue.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/surface/useServiceCatalogue.ts) composes Service summaries with Package Family relationships. [serviceCatalogueAdapter.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/surface/serviceCatalogueAdapter.ts) builds presentation rows, while [ServiceCatalogue.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/presentation/ServiceCatalogue.tsx) renders them and calls no endpoints.

[ServiceDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/surface/ServiceDrawerHost.tsx) adapts the Service-owned drawer composition to Station Manager's drawer contract, and resolves the stable `'new'` recordId sentinel to `service: null` — no fabricated ServiceItem — so the SAME mature composition opens on its ordinary Overview module with nothing to fetch. [useServiceStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/useServiceStation.ts) represents that pending state with its own local Overview draft; a complete Overview Save creates a persisted Pending Service record with its Overview draft and final-seeds detail before replacing the local `null` identity. Before that hand-off child modules remain visible but Edit-locked; afterward they save against the returned ID, while Publish settles and activates that existing record. Admin Station's generic drawer shell hosts the resolved content and never saves Service data.

## Data boundaries

- [ServiceController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Http/ServiceController.php) owns Service REST reads and WordPress post/meta mutations.
- [PackageFamiliesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageFamiliesController.php) exposes Package Family rows whose `related_service_ids` come from the assigned Tier Group's own walk — the same one supplying the Family card's counts, so the filter and the count cannot disagree. Not `sources[].category_group_id`, which holds one Family per Service and hid every shared Service.
- [usePackageFamilyRelationships.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageFamily/usePackageFamilyRelationships.ts) reads all Family lifecycle scopes; the Catalogue joins those native string Family IDs to numeric Service IDs without moving authority.

The Category filter uses the Service's direct Category slug. The Family filter uses `packageFamilies[].id` and rows show every related Family name. Service Category Group is not Catalogue grouping. The retired Command Centre manager and Rate Sheet editor are not part of this surface.

## Validation

Run `npm run contract:service-catalogue-projection`, `npm run contract:station-tabset`, `npm run contract:service-home-connections`, `npm run regression:service-create`, `npm run regression:category-create`, `php tests/package-category-groups.php`, `php tests/service-route-baseline.php`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Service Station](service-station.md), [Package Station](package-station.md), [Service Connections](service-connections.md), [Admin Station Drawer](admin-station-drawer.md), and [Station Manager](station-manager.md).
