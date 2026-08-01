# Categories

## Purpose and ownership

Category owns numeric identity and Overview draft/lifecycle. Category carries no group concept — the retired Service Category Group selector and its `group_id` create/update payload were removed (Service Category Group audit); see [Service Category Groups](category-groups.md) for what was removed and what legacy data remains, ignored. Assigned Services are read-only projections; assignment stays Service-owned.

## Shared drawer composition

- [CategoryDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/category/CategoryDrawerContent.tsx) assembles the shared `EntityDrawer`, Overview/Connections modules, inline editor, dialogs, and record footer.
- [useCategoryDrawerController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/category/useCategoryDrawerController.ts) owns tab/edit/dirty/panel/dialog state and coordinates authoritative actions. It renders no JSX.
- [category.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/schema/bindings/category.tsx) defines Category Overview and Assigned Services shells.
- [category.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/schema/entities/category.ts) is the neutral drawer manifest.
- [CategoryOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/editors/CategoryOverviewEditor.tsx) edits name and description through the shared inline editor.
- [CategoryDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/serviceCategory/CategoryDrawerHost.tsx) is the Admin Station adapter; it resolves a native numeric id plus assigned Services and mounts the shared composition inside the one drawer shell. It also resolves the stable `'new'` recordId sentinel to `category: null` — no fabricated CategoryStationItem — so the SAME composition opens on its ordinary Overview module with nothing to fetch; [useCategoryStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCategoryStation.ts) represents that pending state with its own local Overview draft and exposes `createCategory()`, the footer Publish's one authoritative creation.

## Ownership verdict and Admin Station's actual role

Category is a **neutral entity lifecycle mounted by Admin Station**, not Admin-owned business logic: `CategoryDrawerContent`, `useCategoryDrawerController`, `useCategoryStation`, the schema/bindings, and the inline editor are host-neutral and import no Admin Station module beyond legitimate shared presentation/icons. `Modules/Admin`'s `AdminCategoriesController.php`/`CategoryMeta.php` are the genuine, current, authoritative Category backend — not legacy residue; the name reflects that Category is philosophically an admin-only taxonomy concept, not that the module is stale. Admin Station's own contribution is strictly host/registration: `CategoryDrawerHost.tsx` (id resolution and mount) and the `category` key's registration in `admin-station/register.ts`. Screen placement under `admin-station/` does not transfer domain ownership.

**Service Home Connections is the active Category entry point today** (`service-lower-deck`'s Connections lane; see [Service Catalogue](service-catalogue.md)'s Registration section): it reads the authoritative Category list and its View action opens this same `category` drawer by real id. A prior `ServiceCategoryCarousel` template kit and its `service-categories` data source were registered but never bound to any surface placement — dead code, removed (Category dead-code audit).

## State and persistence

- [useCategoryStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCategoryStation.ts) owns draft-preferred local state, module evaluation, overview save/revert/settle/publish, status, archive/trash/restore/delete, and targeted mutation notification.
- [AdminCategoriesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminCategoriesController.php) owns Category routes.
- [CategoryMeta.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Support/CategoryMeta.php) owns stored shape/readiness.
- [admin.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/admin.ts) owns typed endpoint calls.

## Disable/Enable mask

Mirrors Service Station's mask exactly (see [Service Station](service-station.md)'s Disable/Enable mask section for the full rule) — `PATCH /admin/categories/{id}/status` accepts either `platform_status` (Publish/Archive/Trash, the generic `StationLifecycle::applyStatus` engine) or `action: disable|enable` (mutually exclusive), routed to `AdminCategoriesController::updateDisabledMask`. Enable never republishes: it clears the `previous_platform_status` mask and leaves `platform_status` at `disabled`, never `active` — Publish is a separate, later decision. Frontend: `useCategoryStation` exposes `isDisabledMasked`; `toggleActive` calls Enable only when masked, Disable otherwise — never `isActive`-keyed, mirroring `useServiceStation`'s fixed decision. `isNewNeverPublished`/`hasBeenPublished` (`useCategoryDrawerController`) key off a new `hasSettledOverview` ref (latches true the first time `module_status.overview` is observed `'settled'`, never resets) instead of the transition label directly — a brand-new Category's overview also starts `'pending'` (`createCategory` seeds it that way too), so the label alone never distinguished "genuinely new" from "previously published, mid-edit". `categoryOverviewModule.resolveStatus` (`drawer-kit/utils/moduleNotifications/category.ts`) dropped its own "settled+inactive → Disabled" branch — the pre-mask stance, now superseded: masked-Disabled is handled upstream by `evaluateModule`'s `ctx.disabled` fact, so this resolver only runs unmasked, where settled-but-inactive now reads `pending-full`, matching Service's Overview. `CanonicalEntityFooter` (shared with Package Family and Tier System) gained an optional `isDisabledMasked` prop, defaulted `true` (the original always-"Enable" behaviour), so those two callers are unaffected until they separately adopt the mask.

## Invariants

Overview and Connections use shared schema shells, status pills, notifications, module footers, inline editor, and canonical lifecycle footer. Dirty close/tab changes are guarded. Presentation makes no API calls. Category id is never stringified.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, `node scripts/module-state-snapshot.mjs`, `npm run regression:category-create`, `npm run regression:category-disable-enable`, `php tests/category-lifecycle-mask.php`, and `npm run docs:check`.

## Related Code Maps

[Admin Station Drawer](admin-station-drawer.md), [Service Category Groups](category-groups.md), [Lifecycle](lifecycle-system.md).
