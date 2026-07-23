# Service Catalogue

## Purpose and ownership

Provides the Admin Station's family-first Service Catalogue Home: Service browsing scoped by Package Family, Service creation, and Service drawer handoff.

Service posts/taxonomy/meta remain Service authority. Package connections and commercial state remain Package-owned. UI composition does not transfer either boundary.

## Admin Station host

The Admin Station is the sole host. [useServiceCatalogue.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/surface/useServiceCatalogue.ts) and [serviceCatalogueAdapter.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/surface/serviceCatalogueAdapter.ts) own the family-first Home read and projection; the presentation kit lives at [service-station/presentation/](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/presentation/). Service creation and drawer handoff open the shared composition through the drawer host below. The former Command Centre "Your Service Manager" dashboard, its provider-neutral manager composition, and Rate Sheet / Commercial Group configuration have been removed.

## Shared Service drawer

- [ServiceDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/drawer/ServiceDrawerContent.tsx) is the host-neutral composition for Overview, Features, FAQs, pricing Connections, module editing, dialogs, and footer.
- [useServiceDrawerController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/drawer/useServiceDrawerController.ts) coordinates focused module-editing, lifecycle, and exit-flow hooks; it renders no JSX.
- [service.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/drawer/schema/entities/service.ts), [service.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/drawer/schema/bindings/service.tsx), and editors under `entity-drawers/editors/` own neutral manifests, bindings, and forms.
- Admin Station mounts the same composition through [ServiceDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/surface/ServiceDrawerHost.tsx).

## State, REST, and persistence

- [stations/service/](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/index.ts) is the public typed frontend boundary. Its list response supplies the Service's direct Category, never the Category taxonomy parent. `useServiceStation.ts` owns fetch/mutation state; `derive.ts` owns pure projections.
- [ServiceController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Http/ServiceController.php) owns Service routes and WordPress post/meta mutations.
- [PackageFamiliesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageFamiliesController.php) exposes Package Family list rows with their related native Service IDs, resolved by Package-owned `PackageCategoryGroups::relatedServiceIds()` from source relationships.
- [usePackageFamilyRelationships.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageFamily/usePackageFamilyRelationships.ts) reads every Family lifecycle scope; `serviceCatalogueAdapter.ts` joins those relationships into `packageFamilies: Array<{ id: string; name: string }>` without moving Package authority into Service.
- [PostTypeRegistrar.php](../../wp-content/plugins/compuzign-platform/src/Core/PostTypeRegistrar.php) registers the post type; registration is not behaviour ownership.

The Catalogue Category filter matches the direct Service Category slug. The Family Group filter matches `packageFamilies[].id`, a native Package Family string ID, and rows render every related Family name. Service Category Group is not part of Catalogue grouping.

Presentation calls no endpoints. Service IDs remain numeric and Package Family IDs remain strings. Host adapters mount one composition; they must not fork it.

## Validation

From the plugin root: bundle/run `scripts/service-catalogue-projection-contract.ts`, `npx tsc --noEmit`, `npm run build`, `php tests/package-category-groups.php`, `php tests/service-route-baseline.php`, and `npm run docs:check`.

## Related Code Maps

[Service Station](service-station.md), [Service Connections](service-connections.md), [Drawer System](drawer-system.md), [Lifecycle](lifecycle-system.md), and [Admin Station Drawer](admin-station-drawer.md).
