# Service Category Groups

The taxonomy grouping of Service Categories. **Not** a [Package Family](package-manager.md) (KAIROS) — the Package-owned commercial grouping of *Services*. Both were once called "Category Group". Filename kept: links depend on it.

## Purpose

Owns grouping Service Categories, editing group overview data, and navigating the group-to-category relationship.

## Ownership

The Service Category Group owns group identity, overview draft state, lifecycle, and category membership. Individual Category stations own their own details and services; the group surface must hand off rather than duplicate those authorities.

Group and Category are **two roles sharing one taxonomy** (`cz_service_category`), discriminated by the `station_role` meta (`'group'` | `'category'`); membership is term parentage. Identity is the `term_id` (`int`).

## Frontend

The Group catalogue station, its Details/Connections drawer, overview editor, and schema table/shell bindings were hosted in the retired Command Centre and have been removed. The Admin Station carries only a shared Category Group **card** kit under `admin-station/presentation/category-groups/`, consumed by other stations for card rendering — not a full management station. Group management is to be rebuilt in the Admin Station; the client write boundary and backend authority below are unchanged.

## State

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
| Routes | `SECTION: CATEGORY_GROUP_ROUTES` | Group route registration | Changing endpoints |
| Handlers | `SECTION: CATEGORY_GROUP_HANDLERS` | CRUD and lifecycle | Changing backend behavior |
| Helpers | `SECTION: CATEGORY_GROUP_HELPERS` | Lookup and projection | Changing responses |

## Runtime Flow

`useServiceCategoryGroupStation` owns draft-preferred Group state, Category counts, saves/reverts, settle/publish, status, restore, and delete, driving mutations through the backend routes. Category membership resolves to the authoritative Category rather than a group-local model.

Permanent delete is trashed-only and blocked (409, `assigned_count`) while child Categories remain; re-parenting is an explicit prior step.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Categories](categories.md), [Package Manager](package-manager.md) (Package Family), [Drawer System](drawer-system.md), and [Lifecycle](lifecycle-system.md).
