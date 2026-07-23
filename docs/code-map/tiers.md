# Tiers

## Purpose and ownership

Manages Package Station Tier occupants: overview/pricing, inclusions, FAQs, publish/enabled/popular state, and bin travel. The station owns fixed slots and occupant persistence. Service catalogue records supply inputs but do not own Tier configuration.

Stable UI/drawer identity is `occupant_id`; the resolved fixed `slotId` remains the mutation address. Never coerce or substitute one for the other.

## Shared Tier drawer

- [TierDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/tier/TierDrawerContent.tsx) owns host-neutral Package overview, Tier modules, Connections, bin presentation, dialogs, and footer.
- [useTierDrawerController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/tier/useTierDrawerController.ts) coordinates state with `useTierModuleEditing`, `useTierBinTravel`, and `tierDetailModel.ts`; presentation stays separate.
- [tier.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/schema/entities/tier.ts), [tier.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/schema/bindings/tier.tsx), and [TierOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/editors/TierOverviewEditor.tsx) own the neutral manifest, shell bindings, and overview form.
- [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/tierSurface/TierDrawerHost.tsx) is the Admin Station adapter; it rejects non-string occupant ids and mounts the shared composition inside the one drawer shell.

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
- [familySummary.ts](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/packageTierWorkspace/familySummary.ts) — the pure summary model: a Family scope → its name, description-as-positioning, authoritative status, and exactly the three authoritative `dependents` counts. Fixes the read-only summary's shape so no fabricated figure (estimated margin, demand score, "last updated") can enter it. Guarded by the same contract.
- [usePackageTierWorkspace.ts](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/packageTierWorkspace/usePackageTierWorkspace.ts) — the data source composing `fetchPackageFamilies`, `useHostService`, and `usePackageStation`. Adds no persistence.
- [tierOccupantCard.ts](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/tierSurface/tierOccupantCard.ts) — the one Tier-occupant card projection, shared with `useServiceTierCards`.
- Kit: [`presentation/package-tier-workspace/`](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/presentation/package-tier-workspace/) composes the **Tier Workspace Engine** as small owned pieces — `PackageTierWorkspace.tsx` (orchestrator holding the transient selected-Family, selected-Tier, and Focus/Grid view-mode state), `TierNavigation.tsx` (the Focus view's left Tier `tablist`), `TierDetailPanel.tsx` (the one focused Tier, with the View/Edit action), and the right-side Family group formed by `PackageFamilyScope.tsx` (native Family `<select>`) plus `PackageFamilySummary.tsx` (name, description, status, and exactly three authoritative dependency counts; read-only, **no Edit action**). The large Package Families card wall is no longer bound to the Packages station; Family is scope inside the engine. Focus is the default and reads **Tier Tabs → Focused Tier → Family Group**; Grid reuses the shared card grid while keeping the same Family group available. The first authoritative Family is the initial transient scope. A later Family choice remains transient, Tier selection falls back to the first projected Tier unless the prior occupant still projects, and actions dispatch `occupant_id` into the shared `tier` drawer.

The Family is filter/scope only: it never owns Tier records, never gains a per-Family store, and `occupant_id` stays the identity (`slotId` stays the mutation address). Tier persistence and lifecycle remain the single Package Station authority above.

## Validation

From the plugin root: `php tests/tier-occupant-compatibility.php`, `npm run contract:tier-occupant-admin`, `npm run contract:package-tier-workspace`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), [Drawer System](drawer-system.md), and [Lifecycle](lifecycle-system.md).
