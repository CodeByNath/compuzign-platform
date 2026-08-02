# Package Station

**Lifecycle contract status:** Pending migration.

Package Family is the first conforming Package entity: complete Overview Save
creates its persisted unmasked Pending record, seeds the returned string native
identity into the same mounted drawer, and leaves Publish to settle/activate
that existing record. Explicit Disable/Enable uses the shared mask grammar and
Restore returns to unmasked Pending. Package Station remains pending overall:
Tier, Rate Sheet, Promotion, occupants, and other Package entities are unchanged.

Package Station is a top-level peer with full Package-domain authority. It owns Package Families, Rate Sheets, Sources, Relationships, Tiers, grouping, quantity, pricing, Package contracts/endpoints/hooks, surfaces, presentation, drawers/editors/schema, validation, saves, and persistence.

Frontend root: `wp-content/plugins/compuzign-platform/resources/ts/package-station/`
Backend root: `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/`

## Frontend boundary

- [index.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/index.ts) is the peer's public contract. External peer consumers use `@/package-station`; sibling modules use direct relative imports.
- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/types.ts) owns Package contracts; its type-only `PromotionTier` import does not transfer Promotion ownership.
- [api.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/api.ts) is the Package endpoint implementation. [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) owns one explicitly selected Tier instance at a time; its second positional argument is `tierInstanceId`, and `null` is unloaded. [usePackageFamilyStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageFamilyStation.ts) and [useSurfacePackages.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/useSurfacePackages.ts) own their separate client state and mutations.
- `surface/` owns Family/Tier/workspace reads, assignment resolution, fixed-slot projection, connection navigation, and Rate Sheet access. `presentation/package-tier-workspace/` owns the Tier workspace kit and read/launcher-only [Settings](package-settings.md) lane. `drawer/` owns Family/Tier/Inclusion composition, controllers, editors, and schema.
- `drawer/inclusion/` owns one Tier's Rate Sheet row use at `(tier_instance_id, slotId, item_id)`. Resolution stays within the slot's bound sheet; quantity writes through `saveTierFeatures`. Relationships remain read-only.
- [tierOccupants.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/tierOccupants.ts), [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/evaluateTierPricing.ts), [rateSheetLabels.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/rateSheetLabels.ts), and [vocabulary.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/vocabulary.ts) are Package-owned derivations and vocabulary.
- Package Family alone carries output-only `CZPG` Platform identity. Its
  Package-owned row stores `cz_platform_id`; native `group_id` remains the
  mutation address. `GET /admin/package-families/{platformId}` resolves a bound
  identifier and returns the existing authoritative Family projection.

## Registration and presentation

[register.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/register.ts) registers Package navigation, sources, the `tier-workspace` kit, and Package-owned drawers. Connections dispatch typed targets to owning drawers; Settings dispatches `tier-instance:{tier_instance_id}` to `tier`. This entry-only file is imported solely by `resources/ts/modules/admin-station.ts`.

Package does not choose screen placement. Admin authors string-key presentation policy through Station Manager: Package Families appear on Services Home using Admin's load-bearing `category-group-cards` kit, and the Tier workspace appears on Packages Home. Admin's generic drawer hosts the registered Package contract but never saves Package data.

Imports from Admin presentation/icons are legal capability consumption. Station Manager supplies only host-engine contracts. Service-scoped Package URLs use the Service id as navigation context; they do not transfer Package persistence authority.

## Backend authority

[PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) owns `cz_package_station`, Rate Sheet usage scans, and the assignment-resolved Service index. Mutations lift and remove legacy Tier keys before persisting canonical `tier_instances[]`; established load bridges remain separate. [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) owns mutations, [PackageStationReadController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationReadController.php) owns assigned-instance summaries, and [PackageFamiliesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageFamiliesController.php) owns Family reads/lifecycle. `Support/` owns schemas, lifecycle/guards, Tier instances, and assignments. See [Tier Capability](tier-capability.md).

The Package Manager is Package-internal supply configuration, not the platform Station Manager.

## Related Code Maps

[Station Manager](station-manager.md), [Package Manager](package-manager.md), [Tiers](tiers.md), [Rate Sheet](rate-sheet.md), [Service Connections](service-connections.md), and [Admin Surface Binding](admin-station-surface-binding.md).
