# Service Catalogue

## Purpose

Provides the “Your Service Manager” dashboard, Service creation, and canonical Service detail workspace. The dashboard is the family-first reading surface for Services plus Package-owned connections, Commercial Groups, and Rate Sheet configuration.

## Ownership

`useServiceStation` owns the loaded Service detail and per-module working state for a drawer session. WordPress service posts, taxonomies, and registered metadata remain authoritative. The catalogue may open Package Station connections, but it must not absorb their commercial state.

## Main Entry Points

### [ServiceCatalogWorkstation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/workstations/ServiceCatalogWorkstation.tsx)

Hosts the family cards and Details / Connections / Settings manager composition, page-level dirty-state guard/footer, create-Service flow, temporary Category Group management panel, and canonical Service drawer handoff. Use this file when changing the Service Catalog dashboard, Service creation, or dashboard action routing.

### [ServiceViewStep.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/workstations/ServiceViewStep.tsx)

Contains the canonical Details/Connections Service drawer; overview, inclusions, FAQs, and Package summary bindings; editors; footer lifecycle actions; publish/discard/exit dialogs; and Station Manager handoff. Use this file for Service drawer UI, edit/save flows, lifecycle controls, or connection navigation.

- [service.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/entities/service.ts) declares Service drawer/table placements. Use it when changing which modules appear in each view.

## UI and Drawers

- [ServiceOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/ServiceOverviewEditor.tsx) renders title, category, category-description, excerpt, and content fields. Use it for Service overview form behavior.
- [ServiceInclusionsEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/ServiceInclusionsEditor.tsx) edits ordered inclusion items. Use it for feature collection inputs and validation.
- [ServiceFaqsEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/ServiceFaqsEditor.tsx) edits question/answer collections. Use it for Service FAQ form behavior.
- [service.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/shells/bindings/service.tsx) defines Service shell data adapters and module editor bindings. Use it when changing schema-rendered fields or actions.

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

`ServiceCatalogWorkstation` contains the new-Service drawer, category normalization, and summary-to-detail handoff adapter used by Category surfaces. It resolves the Package Station compatibility host, renders `DynamicStationManager` in `service-catalog` mode, preserves page drafts through the shared shell adapter, and opens the canonical Service drawer. Package-owned state stays in the Package provider and existing manager save path.

`ServiceViewStep` remains the Service drawer root for overview, inclusions, FAQs, lifecycle, drafts, guards, and confirmations. Its legacy Station Manager handoff is pending removal. Persistence remains in `useServiceStation` and the API.

## Related Code Maps

[Categories](categories.md), [Service Connections](service-connections.md), [Drawer System](drawer-system.md), and [Lifecycle](lifecycle-system.md).
