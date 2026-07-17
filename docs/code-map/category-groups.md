# Service Category Groups

The taxonomy grouping of Service Categories. **Not** a [Package Family](package-manager.md) (KAIROS) — the Package-owned commercial grouping of *Services*. Both were once called "Category Group". Filename kept: links depend on it.

## Purpose

Provides the admin station for grouping Service Categories, editing group overview data, and navigating the group-to-category relationship.

## Ownership

The Service Category Group station owns group identity, overview draft state, lifecycle, and category membership. Individual Category stations own their own details and services; the group surface must hand off rather than duplicate those authorities.

Group and Category are **two stations sharing one taxonomy** (`cz_service_category`), discriminated by the `station_role` meta (`'group'` | `'category'`); membership is term parentage. Identity is the `term_id` (`int`).

## Main Entry Points

- [ServiceCategoryGroupCatalogStation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/ServiceCategoryGroupCatalogStation.tsx) renders Group tables/filters, creates groups, assembles live Category handoff context, and opens canonical drawers. Use it for Group catalogue or creation changes.
- [ServiceCategoryGroupViewStep.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/ServiceCategoryGroupViewStep.tsx) contains the Details/Connections drawer, assigned-Category summary, overview editor, lifecycle footer, and publish/discard/exit dialogs. Use it for Group drawer, lifecycle, or Category navigation.
- [serviceCategoryGroup.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/entities/serviceCategoryGroup.ts) declares Group table/drawer placements. Use it when changing modules or viewpoints.

## UI and Drawers

- [ServiceCategoryGroupOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/ServiceCategoryGroupOverviewEditor.tsx) renders Group name and description inputs. Use it for overview form behavior.
- [serviceCategoryGroup.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/shells/bindings/serviceCategoryGroup.tsx) binds overview and assigned-Category summaries to shells. Use it for drawer presentation.
- [serviceCategoryGroup.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/tables/serviceCategoryGroup.tsx) projects Group status, counts, and row actions. Use it for table presentation.

## State and Providers

- [useServiceCategoryGroupStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useServiceCategoryGroupStation.ts) owns draft-preferred Group state, module readiness, Category counts, saves/reverts, settle/publish, status, restore, and delete actions. Use it for Group state or mutations.

## Backend and Persistence

- [AdminCategoryGroupsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminCategoryGroupsController.php) registers Group list/create, overview lifecycle, status, restore, and delete routes. Use it for backend validation and mutations.
- [CategoryMeta.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Support/CategoryMeta.php) owns Group/Category metadata defaults, `station_role`, and sanitization. Use it for stored station shape.
- [TaxonomyRegistrar.php](../../wp-content/plugins/compuzign-platform/src/Core/TaxonomyRegistrar.php) registers the `cz_service_category` taxonomy both roles share. Use it for WordPress taxonomy boundaries.
- [admin.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/admin.ts) exposes typed Group REST calls. Use it for endpoint contracts.

## Naming and stable identifiers

Code symbols are `ServiceCategoryGroup*` / `SERVICE_CATEGORY_GROUP_ENTITY`. **Persisted names are deliberately unchanged** and must stay: the `/admin/category-groups` routes, the `'category-group'` entity id, the `'category-group-catalog'` station id, the `'category-group-overview'` module key and its note-id prefix, the PHP class names, and the `SECTION: CATEGORY_GROUP_*` markers below.

## Internal File Navigation

| Concern | Marker | Contains | Read when... |
| --- | --- | --- | --- |
| Drawer model | `SECTION: CATEGORY_GROUP_DRAWER_MODEL` | Config and Category handoff | Changing drawer entry |
| Overview | `SECTION: CATEGORY_GROUP_OVERVIEW` | Overview editing | Changing Group authoring |
| Lifecycle | `SECTION: CATEGORY_GROUP_LIFECYCLE` | Publish, travel, close guards | Changing Group actions |
| Connections | `SECTION: CATEGORY_GROUP_CONNECTIONS` | Assigned-Category transit | Changing Category navigation |
| Render | `SECTION: CATEGORY_GROUP_RENDER` | Shell, footer, dialogs | Changing drawer UI |
| Routes | `SECTION: CATEGORY_GROUP_ROUTES` | Group route registration | Changing endpoints |
| Handlers | `SECTION: CATEGORY_GROUP_HANDLERS` | CRUD and lifecycle | Changing backend behavior |
| Helpers | `SECTION: CATEGORY_GROUP_HELPERS` | Lookup and projection | Changing responses |

## Runtime Flow

The station loads group summaries and opens the canonical schema-bound drawer. `ServiceCategoryGroupViewStep` builds the drawer config, derives assigned-category counts, binds the overview shell, owns its edit/dirty/close-guard state, and orchestrates publish/settle, enable/disable, archive, trash, and confirmation chrome through `useServiceCategoryGroupStation`. Category membership opens the authoritative Category drawer rather than creating a group-local model.

Permanent delete is trashed-only and blocked (409, `assigned_count`) while child Categories remain; re-parenting is an explicit prior step.

## Related Code Maps

[Categories](categories.md), [Package Manager](package-manager.md) (Package Family), [Drawer System](drawer-system.md), and [Lifecycle](lifecycle-system.md).
