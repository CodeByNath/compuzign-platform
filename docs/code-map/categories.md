# Categories

## Purpose

Provides the Category admin station, including overview authoring, Category Group membership, lifecycle actions, and navigation to assigned Services.

## Ownership

The Category station owns Category identity, its overview draft and lifecycle. Group membership is a separate structural mutation saved beside—but not inside—the overview draft. Assigned-Service counts and lists are projections from catalogue data; Categories must open the canonical Service drawer rather than own Service state.

## Main Entry Points

- [CategoryCatalogStation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/CategoryCatalogStation.tsx) renders Category tables and filters, loads Category/Service/Package context, creates Categories, and opens canonical drawers. Use it for Category catalogue or create-flow changes.
- [CategoryViewStep.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/CategoryViewStep.tsx) contains the Details/Connections drawer, assigned-Service summary, overview editor, group selector, footer lifecycle controls, and publish/discard/exit dialogs. Use it for Category drawer, membership, lifecycle, or Service handoffs.
- [category.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/entities/category.ts) declares Category table/drawer placements. Use it when changing visible modules or viewpoints.

## UI and Drawers

- [CategoryOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/CategoryOverviewEditor.tsx) renders name, description, and optional Category Group selection. Use it for Category overview form fields.
- [category.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/shells/bindings/category.tsx) binds Category overview and assigned-Service summaries to schema shells. Use it for drawer field presentation.
- [category.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/tables/category.tsx) projects Category station rows, status, counts, and actions. Use it for table columns and row actions.

## State and Providers

- [useCategoryStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCategoryStation.ts) owns draft-preferred Category state, module readiness, assigned counts, saves/reverts, settle/publish, status, restore, and delete actions. Use it for Category client state or mutations.

## Backend and Persistence

- [AdminCategoriesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminCategoriesController.php) registers Category list/create, overview save/settle/revert, status, membership, restore, and delete routes. Use it for backend validation or persistence flow.
- [CategoryMeta.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Support/CategoryMeta.php) defines Category/Group metadata keys, defaults, sanitization, and module-state helpers. Use it for stored shape and readiness rules.
- [admin.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/admin.ts) exposes typed Category and membership calls. Use it for client endpoint contracts.

## Internal File Navigation

| Concern | Marker | Contains | Read when... |
| --- | --- | --- | --- |
| Drawer model | `SECTION: CATEGORY_DRAWER_MODEL` | Config and Service handoff | Changing drawer entry |
| Overview | `SECTION: CATEGORY_OVERVIEW` | Overview and Group membership edits | Changing Category authoring |
| Lifecycle | `SECTION: CATEGORY_LIFECYCLE` | Publish, travel, close guards | Changing Category actions |
| Connections | `SECTION: CATEGORY_CONNECTIONS` | Assigned-Service transit | Changing Service navigation |
| Render | `SECTION: CATEGORY_DRAWER_RENDER` | Shell, footer, dialogs | Changing drawer UI |
| Routes | `SECTION: CATEGORY_ROUTES` | Category route registration | Changing endpoints |
| Handlers | `SECTION: CATEGORY_HANDLERS` | CRUD, membership, lifecycle | Changing backend behavior |
| Helpers | `SECTION: CATEGORY_HELPERS` | Lookup, validation, projection | Changing responses |

## Runtime Flow

`CategoryViewStep` builds the drawer config, derives assigned-Service counts, binds overview state, and owns transient editing, group selection, dirty/exit guards, footer actions, and publish/settle/enable/archive/trash confirmations. `useCategoryStation` applies mutations and refreshes canonical projections. Assigned Service cards reuse `ServiceViewStep` through the catalogue handoff adapter.

## Related Code Maps

[Category Groups](category-groups.md), [Service Catalogue](service-catalogue.md), and [Lifecycle](lifecycle-system.md).
