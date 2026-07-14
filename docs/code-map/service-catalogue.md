# Service Catalogue

## Purpose

Provides the “Your Service Manager” dashboard, Service creation, and canonical Service detail workspace. The dashboard is the family-first surface for Services plus Package-owned connections, Commercial Groups, and Rate Sheet configuration.

## Ownership

`useServiceStation` owns the loaded Service detail and per-module working state for a drawer session. WordPress service posts, taxonomies, and registered metadata remain authoritative. The catalogue may open Package Station connections, but it must not absorb their commercial state.

## Main Entry Points

### [ServiceCatalogWorkstation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/workstations/ServiceCatalogWorkstation.tsx)

Hosts Station Home identity/freshness, loaded Service summaries, dirty-state guard/footer, creation, Category Group actions, and canonical Service drawer handoff. It passes the loaded catalogue into the family-first manager, avoiding another Details request.

### [ServiceViewStep.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/workstations/ServiceViewStep.tsx)

Contains the canonical Details/Connections Service drawer, module bindings/editors, footer lifecycle actions, and publish/discard/exit dialogs.

- [service.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/entities/service.ts) declares Service drawer/table placements.

## UI and Drawers

- [ServiceOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/ServiceOverviewEditor.tsx), [ServiceInclusionsEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/ServiceInclusionsEditor.tsx), and [ServiceFaqsEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/ServiceFaqsEditor.tsx) own their respective module forms.
- [service.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/shells/bindings/service.tsx) defines Service shell adapters and editor bindings.
- [serviceManagerDrawers.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/serviceManagerDrawers.tsx) defines focused Category Group, family assignment, Connection, Commercial Group, Rate Row, Rate Sheet setup, and audit-only Price Settings drawers. Manager-owned drawers apply to the page draft only.
- [DynamicStationManager.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx) composes read-only summary metrics, family scope, Details / Connections / Settings, and the draft-preferred Package section projections. Summary and collection surfaces share the same memoized projections.
- [PackageServicesTable.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageServicesTable.tsx) renders the browse-first Services collection, search and compact filters, derived connection health, canonical Service View/Edit actions, and focused Package-owned family reassignment.

## State and Providers

- [useServiceStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useServiceStation.ts) owns detail loading, module drafts, saves/reverts, publish/settle, and status mutations.
- [useAdminCatalog.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useAdminCatalog.ts) loads and refetches catalogue summaries.
- [usePageManagerShell.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/usePageManagerShell.tsx) adapts the shared manager exit-guard/footer contract to a workstation page without acquiring persistence.

## Backend and Persistence

[AdminServicesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminServicesController.php) owns Service REST behavior, [admin.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/admin.ts) is the typed frontend boundary, and [PostTypeRegistrar.php](../../wp-content/plugins/compuzign-platform/src/Core/PostTypeRegistrar.php) registers authoritative post types.

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
| Service backend | `SECTION: SERVICE_CATALOGUE` | Matching routes and handlers | Changing Service REST behavior |

## Runtime Flow

`ServiceCatalogWorkstation` resolves the compatibility host, renders `service-catalog` mode, preserves drafts through the shared shell adapter, and opens focused first-level drawers. Station Home is read-first: metrics and connection health derive from the existing Package projections, while Service View/Edit uses the canonical drawer and Edit starts its Overview editor. Package-owned family, connection, group, Rate Row, and full Rate Sheet setup drawers return changes to the dashboard draft; the page Save remains atomic.

`ServiceViewStep` remains the Service drawer root for overview, inclusions, FAQs, lifecycle, drafts, guards, and confirmations. It has no manager navigation or nested drawer path. Persistence remains in `useServiceStation` and the API.

## Related Code Maps

[Categories](categories.md), [Service Connections](service-connections.md), [Drawer System](drawer-system.md), and [Lifecycle](lifecycle-system.md).
