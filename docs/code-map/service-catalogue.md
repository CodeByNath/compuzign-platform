# Service Catalogue

## Purpose

Provides the family-first “Your Service Manager” dashboard, Service creation, the canonical detail workspace, Package-owned connections, Commercial Groups, and Rate Sheet configuration.

## Ownership

`useServiceStation` owns loaded Service detail and per-module drawer state. WordPress posts, taxonomies, and metadata remain authoritative. The catalogue may open Package Station connections but cannot absorb their commercial state.

## Main Entry Points

### [ServiceCatalogStation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/ServiceCatalogStation.tsx)

Hosts Station Home identity/freshness, loaded Service summaries, dirty-state guard/footer, Settings-tab creation actions, and canonical Service drawer handoff. It passes the loaded catalogue into the family-first manager, avoiding another Details request.

### [ServiceViewStep.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/ServiceViewStep.tsx)

Contains the Overview/Connections Service drawer, grouped module editors, lifecycle actions, and publish/discard/exit dialogs.

- [service.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/entities/service.ts) declares Service drawer/table placements.

## UI and Drawers

- [ServiceOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/ServiceOverviewEditor.tsx), [ServiceInclusionsEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/ServiceInclusionsEditor.tsx), and [ServiceFaqsEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/ServiceFaqsEditor.tsx) own their respective module forms.
- [ActionShell.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/ActionShell.tsx) supplies the compact entity header for Service and Tier drawers; [EntityDrawer.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/EntityDrawer.tsx) keeps schema-owned modules grouped inside Overview.
- [service.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/shells/bindings/service.tsx) defines Service shell adapters and bindings.
- [serviceManagerDrawers.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/serviceManagerDrawers.tsx) defines focused Package Family, family assignment, Connection, Commercial Group, Rate Row, Rate Sheet setup, and audit-only Price Settings drawers. Manager-owned drawers apply to the page draft only.
- [DynamicStationManager.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx) composes read-only summary metrics, family scope, Details / Connections / Settings, and draft-preferred Package section projections. Summary and collection surfaces share the same memoized projections.
- [PackageServicesTable.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageServicesTable.tsx) renders the browse-first Services collection, search and compact filters, derived connection health, canonical Service View/Edit actions, and focused Package-owned family reassignment.

## State and Providers

- [useServiceStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/service/useServiceStation.ts) owns detail loading, module drafts, saves/reverts, publish/settle, and status mutations. Import it from the station barrel; the old `hooks/useServiceStation.ts` path is deleted.
- [useAdminCatalog.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useAdminCatalog.ts) loads and refetches catalogue summaries.
- [usePageManagerShell.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/usePageManagerShell.tsx) adapts the shared manager exit-guard/footer contract to a station page without acquiring persistence.

## Backend and Persistence

[ServiceController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Http/ServiceController.php) owns Service REST behavior, [stations/service/](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/service/index.ts) is the typed frontend boundary every consumer imports from, and [PostTypeRegistrar.php](../../wp-content/plugins/compuzign-platform/src/Core/PostTypeRegistrar.php) registers post types. Service contracts, endpoints, and state are no longer re-exported by `api/types/admin.ts`, `api/endpoints/admin.ts`, or any `hooks/` path. The UI files themselves have not moved — they import across the boundary from their existing locations in `components/admin`.

## Internal File Navigation

| Concern | Marker | Contains | Read when... |
| --- | --- | --- | --- |
| Catalogue model | `SECTION: SERVICE_CATALOGUE_MODEL` | Status/category adapters and drawer handoff | Changing projections or handoff data |
| Service creation | `SECTION: SERVICE_CREATION` | Create drawer and submission | Changing Service creation |
| Catalogue dashboard | `SECTION: SERVICE_CATALOGUE_TABLE` | Page host, actions, manager scope, and drawer launch | Changing the catalogue UI |
| Drawer state | `SECTION: SERVICE_DRAWER_STATE` | Drafts, editors, dirty checks | Changing Service editing |
| Lifecycle | `SECTION: SERVICE_LIFECYCLE` | Publish, status, travel, exit guards | Changing Service actions |
| Module bindings | `SECTION: SERVICE_MODULE_BINDINGS` | Overview, inclusions, FAQs, Package summary | Changing module shells |
| Drawer render | `SECTION: SERVICE_DRAWER_RENDER` | Drawer, footer, and dialogs | Changing drawer composition |
| Service backend | `SECTION: SERVICE_ROUTES` / `*_HANDLERS` | `ServiceController` routes/handlers | Changing Service REST behavior |

## Runtime Flow

`ServiceCatalogStation` resolves the compatibility host, renders `service-catalog` mode, preserves drafts through the shared shell adapter, and opens first-level drawers. Station Home is read-first: metrics and connection health derive from Package projections; New Service and New Group begin in Settings. Service View/Edit uses the compact entity drawer; Edit starts its module-level Overview editor. Package-owned family, connection, group, Rate Row, and Rate Sheet setup drawers return changes to the dashboard draft; the page Save remains atomic.

`ServiceViewStep` remains the Service drawer root for overview, inclusions, FAQs, lifecycle, drafts, guards, and confirmations. It has no manager navigation or nested drawer path. Persistence remains in `useServiceStation`.

## Related Code Maps

[Service Station](service-station.md) (ownership boundary), [Categories](categories.md), [Service Connections](service-connections.md), [Drawer System](drawer-system.md), and [Lifecycle](lifecycle-system.md).

## Related History

[Service Manager UI and Entity Drawer Integration](../project-history/007-service-manager-ui-drawer-integration.md)
