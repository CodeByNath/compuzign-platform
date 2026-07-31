# Service Category Groups (retired)

The former taxonomy grouping of Service Categories. **Not** a [Package Family](package-manager.md) (KAIROS) — the Package-owned commercial grouping of *Services*. Both were once called "Category Group". Filename kept: links depend on it.

## Status

Retired (Service Category Group audit). The Group catalogue station, its Details/Connections drawer, overview editor, and schema/table bindings were already removed with the retired Command Centre; this audit removed the remaining backend and frontend wiring that had no live consumer:

- `AdminCategoryGroupsController.php` (the `/admin/category-groups` REST family) — deleted, deregistered from `AdminModule.php`.
- [useServiceCategoryGroupStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useServiceCategoryGroupStation.ts) and every `ServiceCategoryGroup*` type/endpoint in `api/types/admin.ts` / `api/endpoints/admin.ts` — deleted (zero remaining consumers once the Category create/edit drawer's Group selector was removed).
- `serviceCategoryGroupOverviewModule` in `drawer-kit/utils/moduleNotifications/category.ts` — deleted.
- The Category station's own group-assignment mechanism (`group_id` on create, the `/admin/categories/{id}/group` route, `CategoryOverviewEditor`'s Group selector) — deleted. Category creation and editing carry Name and Description only; see [Categories](categories.md).

## What still exists, deliberately

`cz_service_category` terms with `station_role` meta of `'group'` (created by the retired Command Centre) may still exist in the database. [CategoryMeta.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Support/CategoryMeta.php) still recognises `'group'` as a valid `station_role` and [AdminCategoriesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminCategoriesController.php)'s `listCategories()` still filters on `station_role === 'category'` — this is intentional and load-bearing: it is what keeps those legacy group terms from leaking into the Category list, not a residue of the retired management surface. No code reads or writes `station_role: 'group'` term data otherwise; no route creates, edits, or deletes it.

`admin-station/presentation/category-groups/` (the generic `CategoryGroupCard`/`CategoryGroupCardGrid`/`CategoryGroupCardsKit` presentation kit) is unrelated to this retired station — it is an entity-neutral card grid reused by the Package Family wall and Service cards, kept under this legacy directory name for stable import paths. See [Admin Station Cards](admin-station-cards.md).

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, `php tests/service-route-baseline.php`, and `npm run docs:check`.

## Related Code Maps

[Categories](categories.md), [Package Manager](package-manager.md) (Package Family), [Drawer System](drawer-system.md), and [Lifecycle](lifecycle-system.md).
