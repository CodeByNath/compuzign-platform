# Tiers

## Purpose and ownership

Manages Package Station Tier occupants: overview/pricing, inclusions, FAQs, publish/enabled/popular state, and bin travel. The station owns fixed slots and occupant persistence. Service catalogue records supply inputs but do not own Tier configuration.

Stable UI/drawer identity is `occupant_id`; the resolved fixed `slotId` remains the mutation address. Never coerce or substitute one for the other.

## Shared Tier drawer

- [TierDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/tier/TierDrawerContent.tsx) owns host-neutral Package overview, Tier modules, Connections, bin presentation, dialogs, and footer.
- [useTierDrawerController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/tier/useTierDrawerController.ts) coordinates state with `useTierModuleEditing`, `useTierBinTravel`, and `tierDetailModel.ts`; presentation stays separate.
- [tier.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/schema/entities/tier.ts), [tier.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/schema/bindings/tier.tsx), and [TierOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/editors/TierOverviewEditor.tsx) own the neutral manifest, shell bindings, and overview form.
- [ServiceTierStep.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/ServiceTierStep.tsx) is only the Command Centre `StepContext → EntityDrawerHostBridge` adapter.
- [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/tierSurface/TierDrawerHost.tsx) is the Admin Station adapter. Existing records use string `occupant_id`; create-first receives Package owner identity plus a fixed slot and Service route as separate context.

## State and persistence

- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageStation.ts) owns Package/Tier reads, module drafts, saves, settle, enable, popular, pool operations, and bin mutations.
- [tierOccupants.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/shared/tierOccupants.ts) projects settled occupants and resolves occupant ids back to slots.
- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/modules/packages/evaluateTierPricing.ts) derives Rate Sheet totals/issues.
- [PackageSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) owns Tier shape, sanitization, compatibility, and `occupant_id` projection.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists `cz_package_station`.
- [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) owns module, status, popular, bin, and settle routes. New pool items write through Service-owned `ServicePools`.

Presentation calls no endpoints. Empty shells do not become cards. Fixed-slot ordering/restore consumers retain their slot keys.

## Package capability adapter

[usePackageTierCollection.ts](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/tierSurface/usePackageTierCollection.ts) is the reusable Package-owned collection source. It projects settled occupants unscoped or by proven Service/Package Family provenance, preserving each occupant object and resolved slot. [TierCollectionKit.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/tierSurface/TierCollectionKit.tsx) is endpoint-free presentation.

Tier capability activation is lazy: it stores only a Package Manager assignment. The five slots remain logical read projections over `tiers: []`; enabling does not persist five empty records. The enabled empty state opens the mature drawer on the first authorable slot, and only existing Tier save/settle authority may mint `occupant_id`. Disabling the section does not mutate or delete occupants.

## Validation

From the plugin root: `php tests/tier-occupant-compatibility.php`, `node scripts/tier-occupant-admin-contract.ts`, the bundled `scripts/package-capability-host-contract.ts`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), [Drawer System](drawer-system.md), and [Lifecycle](lifecycle-system.md).
