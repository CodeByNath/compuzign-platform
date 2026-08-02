# Lifecycle and Module-State System

The locked platform contract for station identity, module pills/notifications,
drawer handoff, footer actions, and travel is [Station and Drawer Lifecycle
Contract v1](../architecture/StationDrawerLifecycleContract-v1.md). This map
describes the current implementation boundary. Package Family, Tier occupant,
and Tier Add-on conform; this does not promote Tier Group / Tier System or the
remaining Package surfaces.

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
- [useCategoryStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCategoryStation.ts) owns Category's local-pending to persisted-Pending Overview Save hand-off, draft-preferred projection, Publish, and explicit Disable/Enable mask. The retired Service Category Group station's hook is gone: Category carries no group concept.
- [usePromotionStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePromotionStation.ts) owns the current Promotion client lifecycle boundary; Promotion persistence remains in the Package repository.

Service, Service Category, Package Family, Tier occupant, and Tier Add-on are
the conforming inventory. A complete Overview Save creates the persisted
Pending record/occupant, preserves the mounted drawer during native-ID handoff,
and leaves Publish to settle/activate that existing identity. Tier uses
`is_explicitly_disabled`; its Add-on is the same occupant with `is_addon = true`
and optional dormant `CZTA`, not a second lifecycle. Explicit Disable is
Disabled, while Enable/Restore return to Pending by module readiness.
Tier Group / Tier System, Rate Sheet, and Promotion remain outside this
promotion with their existing source-specific creation/travel rules in the
[lifecycle contract](../architecture/StationDrawerLifecycleContract-v1.md#8-conformance-and-pending-inventory).

## Backend authority

[StationLifecycle.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Support/StationLifecycle.php) is shared transition/readiness infrastructure. Domain controllers apply it at their own REST boundaries: [ServiceController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Http/ServiceController.php), [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php), [PackageFamiliesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageFamiliesController.php), [PromotionsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Promotions/Http/PromotionsController.php), and [AdminCategoriesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminCategoriesController.php).

## Validation

Run `node scripts/module-state-snapshot.mjs`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Station Manager](station-manager.md), [Drawer System](drawer-system.md), [Service Station](service-station.md), [Package Station](package-station.md), [Tiers](tiers.md), and [Promotions](promotions.md).
