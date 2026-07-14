# Service Catalogue

## Purpose

Provides the “Your Service Manager” dashboard, Service creation, and canonical Service detail workspace. The dashboard is the family-first surface for Services plus Package-owned connections, Commercial Groups, and Rate Sheet configuration.

## Ownership

`useServiceStation` owns the loaded Service detail and per-module working state for a drawer session. WordPress service posts, taxonomies, and registered metadata remain authoritative. The catalogue may open Package Station connections, but it must not absorb their commercial state.

## Main Entry Points

### [ServiceCatalogWorkstation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/workstations/ServiceCatalogWorkstation.tsx)

Hosts the family cards and Details / Connections / Settings manager composition, page-level dirty-state guard/footer, create-Service flow, focused Category Group actions, and canonical Service drawer handoff. Use this file when changing the Service Catalog dashboard, Service creation, or dashboard action routing.

### [ServiceViewStep.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/workstations/ServiceViewStep.tsx)

Contains the canonical Details/Connections Service drawer; overview, inclusions, FAQs, and Package summary bindings; editors; footer lifecycle actions; publish/discard/exit dialogs; and Station Manager handoff. Use this file for Service drawer UI, edit/save flows, lifecycle controls, or connection navigation.

- [service.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/entities/service.ts) declares Service drawer/table placements. Use it when changing which modules appear in each view.

## UI and Drawers

- [ServiceOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/ServiceOverviewEditor.tsx) renders title, category, category-description, excerpt, and content fields. Use it for Service overview form behavior.
- [ServiceInclusionsEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/ServiceInclusionsEditor.tsx) edits ordered inclusion items. Use it for feature collection inputs and validation.
- [ServiceFaqsEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/ServiceFaqsEditor.tsx) edits question/answer collections. Use it for Service FAQ form behavior.
- [service.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/shells/bindings/service.tsx) defines Service shell data adapters and module editor bindings. Use it when changing schema-rendered fields or actions.
- [serviceManagerDrawers.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/serviceManagerDrawers.tsx) defines focused Category Group, Connection, Commercial Group, Rate Row, and audit-only Price Settings drawers. Manager-owned drawers apply to the mounted page draft; they do not persist independently.

## State and Providers

- [useServiceStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useServiceStation.ts) owns authoritative detail loading, draft-preferred module state, saves/reverts, publish/settle, and status mutations. Use it for Service drawer state and API behavior.
- [useAdminCatalog.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useAdminCatalog.ts) loads and refetches catalogue summaries. Use it for catalogue request state.
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

`ServiceCatalogWorkstation` resolves the compatibility host, renders `service-catalog` mode, preserves drafts through the shared shell adapter, and opens focused first-level drawers. Service View/Edit uses the canonical drawer; Edit requests start its Overview editor. Package-owned drawer changes return to the dashboard draft and the page Save remains atomic.

`ServiceViewStep` remains the Service drawer root for overview, inclusions, FAQs, lifecycle, drafts, guards, and confirmations. It has no manager navigation or nested drawer path. Persistence remains in `useServiceStation` and the API.

## Related Code Maps

[Categories](categories.md), [Service Connections](service-connections.md), [Drawer System](drawer-system.md), and [Lifecycle](lifecycle-system.md).
