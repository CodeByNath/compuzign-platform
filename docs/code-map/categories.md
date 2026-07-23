# Categories

## Purpose and ownership

Category owns numeric identity, Overview draft/lifecycle, and optional Service Category Group membership. Membership is a separate structural mutation, saved beside—not inside—the Overview draft. Assigned Services are read-only projections; assignment stays Service-owned.

## Shared drawer composition

- [CategoryDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/category/CategoryDrawerContent.tsx) assembles the shared `EntityDrawer`, Overview/Connections modules, inline editor, dialogs, and record footer.
- [useCategoryDrawerController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/category/useCategoryDrawerController.ts) owns tab/edit/dirty/panel/dialog state and coordinates authoritative actions. It renders no JSX.
- [category.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/schema/bindings/category.tsx) defines Category Overview and Assigned Services shells.
- [category.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/schema/entities/category.ts) is the neutral drawer manifest.
- [CategoryOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/editors/CategoryOverviewEditor.tsx) edits name, description, and structural group selection through the shared inline editor.
- [CategoryDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/serviceCategory/CategoryDrawerHost.tsx) is the Admin Station adapter; it resolves a native numeric id plus assigned Services and mounts the shared composition inside the one drawer shell.

## Admin Station card flow

`ServiceCategoryCarousel` emits `view` with `category.id` → the `service-categories` surface binding names the `category` template → `CategoryDrawerHost` resolves with strict numeric equality → `CategoryDrawerContent` mounts inside the one `AdminStationDrawer`. Successful mutations refresh only that carousel wall.

## State and persistence

- [useCategoryStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCategoryStation.ts) owns draft-preferred local state, module evaluation, overview save/revert/settle/publish, group membership, status, archive/trash/restore/delete, and targeted mutation notification.
- [AdminCategoriesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminCategoriesController.php) owns Category routes.
- [CategoryMeta.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Support/CategoryMeta.php) owns stored shape/readiness.
- [admin.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/admin.ts) owns typed endpoint calls.

## Invariants

Overview and Connections use shared schema shells, status pills, notifications, module footers, inline editor, and canonical lifecycle footer. Dirty close/tab changes are guarded. Presentation makes no API calls. Category id is never stringified.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, `node scripts/module-state-snapshot.mjs`, and `npm run docs:check`.

## Related Code Maps

[Admin Station Drawer](admin-station-drawer.md), [Service Category Groups](category-groups.md), [Lifecycle](lifecycle-system.md).
