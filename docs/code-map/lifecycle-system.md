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
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) owns Package/Tier drafts, settle, enabled/popular state, pool operations, and occupant-bin travel.
- [usePackageFamilyStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageFamilyStation.ts) owns Package Family draft and lifecycle actions.
- [useCategoryStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCategoryStation.ts) and [useServiceCategoryGroupStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useServiceCategoryGroupStation.ts) own current Category residue state.
- [usePromotionStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePromotionStation.ts) owns the current Promotion client lifecycle boundary; Promotion persistence remains in the Package repository.

## Backend authority

[StationLifecycle.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Support/StationLifecycle.php) is shared transition/readiness infrastructure. Domain controllers apply it at their own REST boundaries: [ServiceController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Http/ServiceController.php), [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php), [PackageFamiliesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageFamiliesController.php), [PromotionsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Promotions/Http/PromotionsController.php), [AdminCategoriesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminCategoriesController.php), and [AdminCategoryGroupsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminCategoryGroupsController.php).

## Validation

Run `node scripts/module-state-snapshot.mjs`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Station Manager](station-manager.md), [Drawer System](drawer-system.md), [Service Station](service-station.md), [Package Station](package-station.md), [Tiers](tiers.md), and [Promotions](promotions.md).
