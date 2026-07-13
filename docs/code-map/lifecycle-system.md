# Lifecycle and Module-State System

## Purpose

Normalizes platform lifecycle, per-module draft transitions, status presentation, notifications, settle/revert behavior, and station-hook mutation state.

## Ownership

Backend station/controller boundaries own canonical lifecycle transitions and persisted drafts. Station hooks own request-scoped loading and mutation state. Presentation utilities derive pills and notifications only; they must not invent or persist lifecycle state.

## Main Entry Points

- [stationPrimitives.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/stationPrimitives.ts) provides shared mutation loading/error wrappers and result handling. Use it when changing cross-station action mechanics.
- [moduleStatus.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/utils/moduleStatus.tsx) derives completeness, Service/Tier/Package/Promotion statuses, commercial summaries, catalogue buckets, and pills/dots. Use it for presentation-state rules, never persistence.
- [moduleNotifications.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/utils/moduleNotifications.ts) declares module evaluators, readiness rules, and contextual notification copy. Use it for module validation and guidance panels.

`moduleStatus.tsx` is a presentation-policy module, not a lifecycle store. It centralizes completeness checks; Service, Tier, Package Manager, Promotion, and commercial-summary status resolution; status-dot/pill rendering; and Service catalogue filter/display status. It is depended on by station hooks, relation providers, notifications, table schemas, and large Service/Tier workspaces.

## State and Providers

- [useServiceStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useServiceStation.ts) owns Service detail fetch, module drafts, save/revert, settle/publish, and travel actions. Use it for Service lifecycle state.
- [useCategoryStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCategoryStation.ts) owns Category projection, readiness, draft, lifecycle, restore, and delete actions. Use it for Category state transitions.
- [useCategoryGroupStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCategoryGroupStation.ts) provides the equivalent Group lifecycle boundary. Use it for Category Group transitions.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageStation.ts) owns Package/Tier drafts, settle, enable, bin travel, pool, and popular-tier actions. Use it for Package occupant state.
- [usePromotionStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePromotionStation.ts) owns Promotion drafts, publish/toggle, and travel actions. Use it for Promotion state.

## Backend and Persistence

- [StationLifecycle.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Support/StationLifecycle.php) centralizes module transition defaults, draft/settled handling, status travel, and readiness helpers. Use it for shared backend lifecycle invariants.
- [AdminServicesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminServicesController.php) applies lifecycle routes to Services, Tiers, and Promotions. Use it for those REST transitions.
- [AdminCategoriesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminCategoriesController.php) applies lifecycle and readiness rules to Categories. Use it for Category routes.
- [AdminCategoryGroupsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminCategoryGroupsController.php) applies them to Groups. Use it for Group routes.

## Validation

- [module-state-snapshot.mjs](../../wp-content/plugins/compuzign-platform/scripts/module-state-snapshot.mjs)
- [module-state.v1.json](../../wp-content/plugins/compuzign-platform/scripts/__snapshots__/module-state.v1.json)

## Related Code Maps

[Drawer System](drawer-system.md), [Service Catalogue](service-catalogue.md), [Tiers](tiers.md), and [Promotions](promotions.md).
