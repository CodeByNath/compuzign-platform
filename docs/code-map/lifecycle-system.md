# Lifecycle and Module-State System

## Ownership

Each domain backend/controller owns canonical lifecycle transitions and persisted drafts. Its Station hook owns request-scoped loading, mutation state, and draft-preferred projections. Shared utilities derive status and notifications only; they never persist lifecycle state.

Station Manager has no lifecycle rules or records. Registering a source, kit, or drawer makes a capability resolvable but does not move lifecycle authority. Admin Station hosts resolved presentation and retains Category/Promotion residue; it does not save Service or Package records.

## Shared mechanics and presentation

- [stationPrimitives.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/stationPrimitives.ts) provides shared mutation loading/error wrappers and patch/result helpers.
- [moduleStatus.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/utils/moduleStatus.tsx) derives completeness, entity/module states, commercial summaries, catalogue buckets, and status presentation. It is policy/derivation, not a store.
- [moduleNotifications/](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/utils/moduleNotifications/index.ts) contains the generic evaluator plus Service, Package, Tier, Promotion, Category, and Package Family rule groups. Rules derive notes/readiness and render nothing.
- [CanonicalEntityFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/CanonicalEntityFooter.tsx) maps canonical states into the shared record-footer grammar.

## Domain state boundaries

- [useServiceStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/useServiceStation.ts) owns Service detail, module drafts, saves/reverts, settle/publish, and travel actions; [derive.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/derive.ts) holds pure projections.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) owns one selected Tier instance's drafts, settle, enabled/popular state, pool operations, and occupant-bin travel. Instance identity is its second positional argument; `null` holds the same unloaded state as a missing Service navigation context.
- [usePackageFamilyStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageFamilyStation.ts) owns Package Family draft and lifecycle actions.
- [useCategoryStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCategoryStation.ts) owns current Category residue state. The retired Service Category Group station's hook is gone (Service Category Group audit): Category carries no group concept.
- [usePromotionStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePromotionStation.ts) owns the current Promotion client lifecycle boundary; Promotion persistence remains in the Package repository.

## Disable/Enable mask

Service ([Service Station](service-station.md)) and Category ([Categories](categories.md)) implement this correctly; see their own Code Maps for the full rule. In short: Enable must never republish. It clears the `previous_platform_status` mask and leaves `platform_status` at `disabled` (presented as Pending) — restoring every permitted action (Edit/Save, Publish, Disable, Archive, Trash) without settling or activating anything. Only Publish may move an entity to `active`. Any entity carrying the same `module_status`/drafts/settle/publish shape needs this same Enable behaviour, since for these entities "administratively enabled" and "published/live" are distinct states.

Two places still carry the pre-fix defect — Enable jumps straight to `active` instead of restoring Pending — found during the Category audit (Category dead-code/mask cleanup) but out of scope to fix there:

- **Package Family** — `usePackageFamilyStation.ts`'s `toggleActive` calls `applyStatus(isActive ? 'disabled' : 'active')` directly; `PackageFamiliesController::updateStatus` passes that target straight through `PackageCategoryGroups::applyStatus` (the permissive engine call), with no disable/enable action distinction. This is live and user-reachable through the Package Family drawer today.
- **Promotions** — `usePromotionStation.ts`'s `togglePromotion` → `PromotionsController::togglePromotion` → the shared `StationLifecycle::toggle()` primitive itself performs a direct active⇄disabled flip with no mask concept, despite Promotion instances carrying full `module_status`/drafts/settle/publish machinery. This is currently latent, not live: no Promotions drawer is registered anywhere (Promotion authoring was removed with the retired Command Centre and, per [Promotions](promotions.md), is still to be rebuilt in the Admin Station), so nothing can click Enable today. It matters because the flaw lives in the *shared* `toggle()` helper — any future caller, including the rebuilt Promotions drawer, inherits it unless `StationLifecycle::toggle()` itself is corrected.

Package Tier's fixed-slot occupant Enable/Disable (`usePackageStation.ts`'s `toggleTierEnabled`, `TierDrawerFooter.tsx`) is a different, unaffected model: a per-occupant `enabled: boolean`, not a `platform_status` lifecycle, with no Pending/review state to violate. The Tier System aggregate itself (`TierSystemContent.tsx`) has no Enable/Disable action at all — only Publish, Apply, and guarded Delete.

## Backend authority

[StationLifecycle.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Support/StationLifecycle.php) is shared transition/readiness infrastructure. Domain controllers apply it at their own REST boundaries: [ServiceController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Http/ServiceController.php), [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php), [PackageFamiliesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageFamiliesController.php), [PromotionsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Promotions/Http/PromotionsController.php), and [AdminCategoriesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminCategoriesController.php).

## Validation

Run `node scripts/module-state-snapshot.mjs`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Station Manager](station-manager.md), [Drawer System](drawer-system.md), [Service Station](service-station.md), [Package Station](package-station.md), [Tiers](tiers.md), and [Promotions](promotions.md).
