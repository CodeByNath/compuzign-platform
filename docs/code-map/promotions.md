# Promotions

## Purpose

Creates and manages promotions as child records of the Package Station, with overview editing, lifecycle operations, and relation-provider participation.

## Ownership

The Package Station owns the promotions collection and `PackageRepository` persists it. A promotion provider owns manager draft adaptation; the focused promotion drawer owns its local edit session. Promotions must not be persisted as Service-owned metadata even though compatibility routes carry a service ID.

## Main Entry Points

- [PromotionManagerWorkspace.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PromotionManagerWorkspace.tsx) renders Promotion cards, current/bin views, status summaries, and create/view/edit actions inside Station Manager. Use it for manager Promotion presentation and navigation.
- [PromotionOverviewDrawerStep.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PromotionOverviewDrawerStep.tsx) contains the focused Promotion drawer, overview form handoff, lifecycle footer, dirty/exit guards, and publish/discard/archive/trash confirmations. Use it for Promotion authoring and lifecycle UI.
- [promotion.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/providers/promotion.ts) adapts promotion collections into manager read models, drafts, validation, saves, cards, and continuations. Use it for provider behavior.

## UI and Drawers

- [PromotionOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/PromotionOverviewEditor.tsx) renders Promotion identity, offer, schedule, and display-context fields. Use it for overview form inputs and validation feedback.
- [promotion.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/entities/promotion.tsx) declares Promotion drawer module placements. Use it when changing schema-rendered Promotion layout.

## State and Providers

- [usePromotionStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePromotionStation.ts) owns selected Promotion state, module evaluation, saves/reverts, publish/toggle, and travel actions. Use it for client lifecycle or mutation behavior.
- [stationPrimitives.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/stationPrimitives.ts) provides shared loading/error mutation wrappers. Use it for cross-station action mechanics.

## Backend and Persistence

- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists Promotion children in the Package Station and migrates legacy Promotion meta. Use it for collection storage and projections.
- [AdminServicesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminServicesController.php) registers Promotion create, module save/revert, settle, publish, toggle, archive/trash/restore/delete routes. Use it for backend lifecycle behavior.
- [admin.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/endpoints/admin.ts) exposes typed Promotion REST calls. Use it for frontend/backend contract changes.

## Runtime Flow

The relation registry exposes the promotion provider to a service-scoped manager. Saves target the Package Station collection; focused drawer operations settle, publish, toggle, archive, trash, restore, or permanently delete an occupant.

## Related Code Maps

[Service Connections](service-connections.md), [Package Manager](package-manager.md), and [Lifecycle](lifecycle-system.md).
