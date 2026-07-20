# Tiers

## Purpose and ownership

Manages Package Station Tier occupants: overview/pricing, inclusions, FAQs, publish/enabled/popular state, and bin travel. The station owns fixed slots and occupant persistence. Service catalogue records supply inputs but do not own Tier configuration.

Stable UI/drawer identity is `occupant_id`; the resolved fixed `slotId` remains the mutation address. Never coerce or substitute one for the other.

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

## Station-level Tier tool

The **Package Station** hosts Tier as its first Station-level tool — activated once by a surface-binding row, never per-Family and never persisted (see [Surface Binding](admin-station-surface-binding.md)). Files under `resources/ts/admin-station/stations/packageTierWorkspace/`:

- [projection.ts](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/packageTierWorkspace/projection.ts) — the pure Family-scope join. A Tier occupant projects under a Package Family iff one of its Rate Sheet selections resolves (via `source_service_id`) to one of the Family's authoritative `related_service_ids` — the same provenance the backend uses for `dependents.tier_selections`. Guarded by [package-tier-workspace-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/package-tier-workspace-contract.ts).
- [usePackageTierWorkspace.ts](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/packageTierWorkspace/usePackageTierWorkspace.ts) — the data source composing `fetchPackageFamilies`, `useHostService`, and `usePackageStation`. Adds no persistence.
- [tierOccupantCard.ts](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/tierSurface/tierOccupantCard.ts) — the one Tier-occupant card projection, shared with `useServiceTierCards`.
- Kit: [PackageTierWorkspace.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx) owns the selected Package Family as **transient working scope** (mutates nothing) and dispatches `occupant_id` into the shared `tier` drawer.

The Family is filter/scope only: it never owns Tier records, never gains a per-Family store, and `occupant_id` stays the identity (`slotId` stays the mutation address). Tier persistence and lifecycle remain the single Package Station authority above.

## Validation

From the plugin root: `php tests/tier-occupant-compatibility.php`, `node scripts/tier-occupant-admin-contract.ts`, `node scripts/package-tier-workspace-contract.ts`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), [Drawer System](drawer-system.md), and [Lifecycle](lifecycle-system.md).
