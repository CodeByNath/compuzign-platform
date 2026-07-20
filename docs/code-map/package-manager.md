# Package Manager

## Purpose and authority

Owns Package Station persistence, Service supply configuration, Package Families, capability assignments, and customer-facing Tier/Promotion data. The live Package is the singleton `cz_package_station` option, not a standalone entity; retired `cz_surface_package` posts remain read-compatible only. `PackageRepository` is the persistence authority.

Service-scoped Package URLs use `{id}` as route/pool context, never Package ownership. Services remain Service-owned. Package Families are records in `package_manager.category_groups`; membership is stored on Package-owned source relationships as `category_group_id`. Service Category Group taxonomy is unrelated.

## Capability host

Package Manager is a composition host for registered real capability systems:

- [PackageCapabilityAssignments.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageCapabilityAssignments.php) validates capability keys and proven owners. The only current assignment owner is `{ package-manager, package-station }`.
- [PackageCapabilityController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageCapabilityController.php) reads/writes `package_manager.capability_assignments` at `/admin/package-station/capabilities`.
- [capabilityRegistry.ts](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/packageCapabilities/capabilityRegistry.ts) registers composition metadata. Definitions generate rows in the existing surface-binding system; registry order is section order.
- [usePackageCapabilities.ts](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/packageCapabilities/usePackageCapabilities.ts) and `PackageCapabilityDrawerHost.tsx` own assignment state/UI through the one Admin Station drawer.

Tier is the first registered capability. Enabling it writes one assignment row and never creates a Tier occupant. Disabling hides its Admin Station section without deleting Tier data. Promotion has domain authority but no complete Admin Station source/kit/drawer contract; Bundle and Campaign are also unregistered. Add a future capability only after its source, template kit, drawer composition, native identity, and mutation authority exist.

Package Family and Service are supported Tier collection filters, not assignment owners. Making either an owner requires an explicit persistence/authority design first.

## Tier collection boundary

[usePackageTierCollection.ts](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/tierSurface/usePackageTierCollection.ts) projects settled Package-owned occupants for the registered Tier kit. It accepts unscoped, `serviceId`, or `packageFamilyId` conditions. Family membership resolves through Package source relationships; occupant matching follows Rate Sheet selection → Manager item → supplying-Service provenance.

Cards and drawers use stable `occupant_id`. `slotId` and a valid Service route ID travel only as parent/mutation context. The enabled empty state opens the mature Tier drawer on the first authorable fixed slot; Tier authority creates the occupant only through its existing save/settle path.

## Existing manager and drawer paths

- [PackageManagerStation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/PackageManagerStation.tsx) and `DynamicStationManager.tsx` remain the Command Centre Package host.
- [package.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/providers/package.ts) adapts Manager drafts, validation, saves, summaries, and continuations.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageStation.ts) owns Tier reads and mutations.
- [usePackageFamilyStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageFamilyStation.ts) owns Package Family lifecycle mutations.
- Shared Package Family and Tier drawer compositions live under `resources/ts/entity-drawers/` and mount in both hosts.

## Backend files

[PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) owns Manager shape/reconciliation; [PackageCategoryGroups.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageCategoryGroups.php) owns Family rules; [PackageSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) owns Tier slots/occupants/bin; [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) owns Manager and Tier mutations. Promotions remain owned by `Modules/Promotions` while sharing Package persistence.

## Validation

- `tests/package-manager-schema.php`, `tests/package-category-groups.php`, `tests/package-capability-assignments.php`
- `scripts/package-capability-host-contract.ts`, `manager-coordinator-contract.ts`, `package-relation-provider-contract.ts`, `tier-occupant-admin-contract.ts`, `tier-pricing-parity.ts`

## Related Code Maps

[Service Connections](service-connections.md), [Rate Sheet](rate-sheet.md), [Tiers](tiers.md), and [Surface Binding](admin-station-surface-binding.md).
