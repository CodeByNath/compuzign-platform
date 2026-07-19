# Service Catalogue

## Purpose and ownership

Provides Command Centre's family-first “Your Service Manager” dashboard, Service creation, Service drawer handoff, Package-owned connections, Commercial Groups, and Rate Sheet configuration.

Service posts/taxonomy/meta remain Service authority. Package connections and commercial state remain Package-owned. UI composition does not transfer either boundary.

## Command Centre host

- [ServiceCatalogStation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/ServiceCatalogStation.tsx) owns the dashboard host, catalogue freshness, creation actions, page dirty guard/footer, manager composition, and drawer launch.
- [ServiceViewStep.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/ServiceViewStep.tsx) is only the `StepContext → EntityDrawerHostBridge` adapter. It does not own Service modules or lifecycle.
- [DynamicStationManager.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx) composes Family scope and Details/Connections/Settings provider workspaces.
- [serviceManagerDrawers.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/serviceManagerDrawers.tsx) owns focused Package Family, connection, group, Rate Row, setup, and audit-only price drawers. Their callbacks patch the Package provider draft; page Save remains atomic.

## Shared Service drawer

- [ServiceDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/service/ServiceDrawerContent.tsx) is the host-neutral composition for Overview, Features, FAQs, pricing Connections, module editing, dialogs, and footer.
- [useServiceDrawerController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/service/useServiceDrawerController.ts) coordinates focused module-editing, lifecycle, and exit-flow hooks; it renders no JSX.
- [service.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/schema/entities/service.ts), [service.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/schema/bindings/service.tsx), and editors under `entity-drawers/editors/` own neutral manifests, bindings, and forms.
- Admin Station mounts the same composition through [ServiceDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/serviceSurface/ServiceDrawerHost.tsx).

## State, REST, and persistence

- [stations/service/](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/service/index.ts) is the public typed frontend boundary. `useServiceStation.ts` owns fetch/mutation state; `derive.ts` owns pure projections.
- [ServiceController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Http/ServiceController.php) owns Service routes and WordPress post/meta mutations.
- [PostTypeRegistrar.php](../../wp-content/plugins/compuzign-platform/src/Core/PostTypeRegistrar.php) registers the post type; registration is not behaviour ownership.

Presentation calls no endpoints. Service ids remain numeric. Host adapters mount one composition; they must not fork it.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, `php tests/service-route-baseline.php`, and `npm run docs:check`.

## Related Code Maps

[Service Station](service-station.md), [Service Connections](service-connections.md), [Drawer System](drawer-system.md), [Lifecycle](lifecycle-system.md), and [Admin Station Drawer](admin-station-drawer.md).
