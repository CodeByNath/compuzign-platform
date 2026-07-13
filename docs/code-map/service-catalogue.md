# Service Catalogue

## Purpose

Provides the admin catalogue, service creation, and canonical Service detail workspace for overview, inclusions, FAQs, status, and adjacent commercial connections.

## Ownership

`useServiceStation` owns the loaded Service detail and per-module working state for a drawer session. WordPress service posts, taxonomies, and registered metadata remain authoritative. The catalogue may open Package Station connections, but it must not absorb their commercial state.

## Main Entry Points

### [ServiceCatalogWorkstation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/workstations/ServiceCatalogWorkstation.tsx)

Contains the Service table, category/status filters, create-Service drawer, locked pre-creation cards, category normalization, and summary-to-drawer handoff adapters. Use this file when changing catalogue rows, filters, Service creation, or drawer launch data.

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

## Backend and Persistence

- [AdminServicesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminServicesController.php) registers Service CRUD, module save/settle/revert, status, and Package Station compatibility routes. Use it for backend request validation and Service persistence flows.
- [admin.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/admin.ts) is the typed frontend boundary for all admin REST calls. Use it when adding or changing client endpoint contracts.
- [PostTypeRegistrar.php](../../wp-content/plugins/compuzign-platform/src/Core/PostTypeRegistrar.php) registers authoritative WordPress post types. Use it for Service/request entity registration, not drawer behavior.

## Runtime Flow

`ServiceCatalogWorkstation` also contains the new-Service drawer, category normalization, and the summary-to-detail handoff adapter used by Category surfaces. It loads catalogue and package summaries, filters table rows, creates Services, and opens the canonical detail step.

`ServiceViewStep` is the large Service drawer composition root. It binds overview, inclusions, FAQs, and package summary; owns transient editor drafts, dirty checks, footer actions, publish/settle/enable/archive/trash flows, close guards, and confirmation dialogs. Its Connections tab discovers registered providers and hands Package Manager orchestration to `StationManagerStep`. Persistence remains in `useServiceStation` and the API, not in either component.

## Related Code Maps

[Categories](categories.md), [Service Connections](service-connections.md), [Drawer System](drawer-system.md), and [Lifecycle](lifecycle-system.md).
