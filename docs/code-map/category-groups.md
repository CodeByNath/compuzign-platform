# Category Groups

## Purpose

Provides the admin station for grouping categories, editing group overview data, and navigating the group-to-category relationship.

## Ownership

The Category Group station owns group identity, overview draft state, lifecycle, and category membership. Individual Category stations own their own details and services; the group surface must hand off rather than duplicate those authorities.

## Main Entry Points

- [CategoryGroupCatalogWorkstation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/workstations/CategoryGroupCatalogWorkstation.tsx) renders Group tables/filters, creates groups, assembles live Category handoff context, and opens canonical drawers. Use it for Group catalogue or creation changes.
- [CategoryGroupViewStep.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/workstations/CategoryGroupViewStep.tsx) contains the Details/Connections drawer, assigned-Category summary, overview editor, lifecycle footer, and publish/discard/exit dialogs. Use it for Group drawer, lifecycle, or Category navigation.
- [categoryGroup.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/entities/categoryGroup.ts) declares Group table/drawer placements. Use it when changing modules or viewpoints.

## UI and Drawers

- [CategoryGroupOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/CategoryGroupOverviewEditor.tsx) renders Group name and description inputs. Use it for overview form behavior.
- [categoryGroup.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/shells/bindings/categoryGroup.tsx) binds overview and assigned-Category summaries to shells. Use it for drawer presentation.
- [categoryGroup.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/tables/categoryGroup.tsx) projects Group status, counts, and row actions. Use it for table presentation.

## State and Providers

- [useCategoryGroupStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCategoryGroupStation.ts) owns draft-preferred Group state, module readiness, Category counts, saves/reverts, settle/publish, status, restore, and delete actions. Use it for Group state or mutations.

## Backend and Persistence

- [AdminCategoryGroupsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminCategoryGroupsController.php) registers Group list/create, overview lifecycle, status, restore, and delete routes. Use it for backend validation and mutations.
- [CategoryMeta.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Support/CategoryMeta.php) owns Group/Category metadata defaults and sanitization. Use it for stored station shape.
- [TaxonomyRegistrar.php](../../wp-content/plugins/compuzign-platform/src/Core/TaxonomyRegistrar.php) registers Category and Group taxonomies. Use it for WordPress taxonomy boundaries.
- [admin.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/admin.ts) exposes typed Group REST calls. Use it for endpoint contracts.

## Runtime Flow

The workstation loads group summaries and opens the canonical schema-bound drawer. `CategoryGroupViewStep` builds the drawer config, derives assigned-category counts, binds the overview shell, owns its edit/dirty/close-guard state, and orchestrates publish/settle, enable/disable, archive, trash, and confirmation chrome through `useCategoryGroupStation`. Category membership opens the authoritative Category drawer rather than creating a group-local model.

## Related Code Maps

[Categories](categories.md), [Drawer System](drawer-system.md), and [Lifecycle](lifecycle-system.md).
