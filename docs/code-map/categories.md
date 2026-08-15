# Categories

Category is the second current implementation of the locked [Station and Drawer Lifecycle Contract](../architecture/StationDrawerLifecycleContract-v1.md).

## Purpose and ownership

Category owns numeric identity and Overview draft/lifecycle. Category carries no group concept — the retired Service Category Group selector and its `group_id` create/update payload were removed (Service Category Group audit); see [Service Category Groups](category-groups.md) for what was removed and what legacy data remains, ignored. Assigned Services are read-only projections; assignment stays Service-owned.

`Core\Plugin` supplies the shared `PlatformIdentifierStation` through
`AdminModule` to the Category controller. Category owns both native
`wp_insert_term()` flows and atomically claims `cz_platform_id`; the Station owns
`CZC` reservation, binding, lookup, conflict, and tombstone. Station creation
still rejects duplicate names, while inline creation still returns the existing
term and preserves or ensures its identity. Numeric IDs and routes are unchanged.
The authenticated Platform-ID GET resolves only a bound Category and returns
the existing `CategoryMeta`/`categoryResponse` projection by native term ID.

## Shared drawer composition

- [CategoryDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/category/CategoryDrawerContent.tsx) assembles the drawer, modules, editor, dialogs, and footer.
- [useCategoryDrawerController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/category/useCategoryDrawerController.ts) owns tab/edit/dirty/panel/dialog state and coordinates authoritative actions. It renders no JSX.
- [category.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/schema/bindings/category.tsx) defines Category Overview and Assigned Services shells. Overview reads `CZC` read-only directly beneath the Category's own Name, the same pairing Service and Package Family Overview read with.
- [category.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/schema/entities/category.ts) is the neutral manifest. Optional `platformIdOf` exposes additive identity while `idOf` stays numeric.
- [CategoryOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/editors/CategoryOverviewEditor.tsx) edits name and description through the shared inline editor.
- [CategoryDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/serviceCategory/CategoryDrawerHost.tsx) is the Admin Station adapter; it resolves a native numeric id plus assigned Services and mounts the shared composition inside the one drawer shell. Its stable `'new'` sentinel resolves to `category: null` — no fabricated CategoryStationItem — so the same composition opens on its ordinary Overview module with nothing to fetch. A complete Overview Save creates the persisted Pending Category and `useCategoryStation.ts` seeds that returned projection inside the mounted drawer; Publish later settles and activates that same id.

## Ownership and host

Category is a neutral lifecycle mounted by Admin Station. Its composition,
controller, hook, schema/bindings, and editor are host-neutral.
`AdminCategoriesController.php` and `CategoryMeta.php` are authoritative.
Admin Station contributes only host/registration; placement does not transfer
domain ownership.

**Service Home Connections is the active Category entry point** and opens this
drawer by native ID. The registered `ServiceCategoryCarousel` data source is
currently unplaced.

## State and persistence

- [useCategoryStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCategoryStation.ts) owns draft-preferred local state, returned-ID hand-off, module evaluation, Overview create/save/revert/settle/publish, explicit Disable/Enable, archive/trash/restore/delete, and targeted mutation notification.
- [AdminCategoriesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminCategoriesController.php) owns Category routes.
- [CategoryMeta.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Support/CategoryMeta.php) owns stored shape/readiness and the scalar Platform-ID term-meta callbacks.
- [admin.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/admin.ts) owns typed endpoint calls and maps backend `platform_id` to application `platformId`.

## Invariants

Overview and Connections use shared schema shells, status pills, notifications, module footers, inline editor, and canonical lifecycle footer. A new Overview is Pending-dim until named; its complete Save creates a raw disabled/unmasked Pending term, seeds the returned identity in the same mounted drawer, and retains the publication notification. Only Publish settles and activates. Assigned Services is a read-only relationship projection, not a child editor. Disable writes a reversible mask, so every module reads Disabled; Enable and archive/trash restore clear the mask and return to Pending rather than activating. Empty Description is authoritative: settlement deletes the owned description meta instead of retaining stale text. Dirty close/tab changes are guarded. Presentation makes no API calls. Category id is never stringified.

## Validation

From the plugin root: `npx tsc --noEmit`, `npx tsx scripts/category-identifier-api-contract.ts`, `npm run build`, `npm run regression:category-create`, `php tests/category-pending-lifecycle.php`, `php tests/category-inline-identity-race.php`, `php tests/category-create-group-id-payload-contract.php`, and `npm run docs:check`. The unrelated module-state snapshot remains deferred.

## Related Code Maps

[Admin Station Drawer](admin-station-drawer.md), [Service Category Groups](category-groups.md), [Lifecycle](lifecycle-system.md).
