# Tiers

## Purpose and ownership

Manages Package Station Tier occupants: overview/pricing, inclusions, FAQs, publish/enabled/popular state, and bin travel. The station owns fixed slots and occupant persistence. Service catalogue records supply inputs but do not own Tier configuration.

Stable UI/drawer identity is `occupant_id`; the resolved fixed `slotId` remains the mutation address. Never coerce or substitute one for the other.

Tier is also the first **Family-activated tool**: a Package Family / Group may enable Tier from its drawer Settings → Tools / Skills. Activation is a boolean on the Family's `category_groups` row ([Package Manager](package-manager.md)) and mints **no** occupant — Tier data stays station-global and is only projected per Family. This adapter owns none of that persistence; it continues to own occupant CRUD unchanged.

## Shared Tier drawer

- [TierDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/tier/TierDrawerContent.tsx) owns host-neutral Package overview, Tier modules, Connections, bin presentation, dialogs, and footer.
- [useTierDrawerController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/tier/useTierDrawerController.ts) coordinates state with `useTierModuleEditing`, `useTierBinTravel`, and `tierDetailModel.ts`; presentation stays separate.
- [tier.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/schema/entities/tier.ts), [tier.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/schema/bindings/tier.tsx), and [TierOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/editors/TierOverviewEditor.tsx) own the neutral manifest, shell bindings, and overview form.
- [ServiceTierStep.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/ServiceTierStep.tsx) is only the Command Centre `StepContext → EntityDrawerHostBridge` adapter.
- [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/tierSurface/TierDrawerHost.tsx) is the Admin Station adapter; it rejects non-string occupant ids.

## State and persistence

- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageStation.ts) owns Package/Tier reads, module drafts, saves, settle, enable, popular, pool operations, and bin mutations.
- [tierOccupants.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/shared/tierOccupants.ts) projects settled occupants and resolves occupant ids back to slots.
- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/modules/packages/evaluateTierPricing.ts) derives Rate Sheet totals/issues.
- [PackageSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) owns Tier shape, sanitization, compatibility, and `occupant_id` projection.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists `cz_package_station`.
- [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) owns module, status, popular, bin, and settle routes. New pool items write through Service-owned `ServicePools`.

Presentation calls no endpoints. Empty shells do not become cards. Fixed-slot ordering/restore consumers retain their slot keys.

## Validation

From the plugin root: `php tests/tier-occupant-compatibility.php`, `node scripts/tier-occupant-admin-contract.ts`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), [Drawer System](drawer-system.md), and [Lifecycle](lifecycle-system.md).
