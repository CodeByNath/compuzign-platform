# Package Station

Package Station is a top-level peer with full Package-domain authority. It owns Package Families, Rate Sheets, Sources, Relationships, Tiers, grouping, quantity, pricing, Package contracts/endpoints/hooks, surfaces, presentation, drawers/editors/schema, validation, saves, and persistence.

Frontend root: `wp-content/plugins/compuzign-platform/resources/ts/package-station/`
Backend root: `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/`

## Frontend boundary

- [index.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/index.ts) is the peer's public contract. External peer consumers use `@/package-station`; sibling modules use direct relative imports.
- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/types.ts) owns Package contracts. Its type-only `PromotionTier` import preserves `SurfacePackageSummary.promotion_tiers`; Promotion ownership remains unchanged.
- [api.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/api.ts) is the Package endpoint implementation. [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) owns one explicitly selected Tier instance at a time; its second positional argument is `tierInstanceId`, and `null` is unloaded. [usePackageFamilyStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageFamilyStation.ts) and [useSurfacePackages.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/useSurfacePackages.ts) own their separate client state and mutations.
- `surface/` owns Family/Tier/workspace reads and adapters, including Family creation/capability state and the pure `packageTierWorkspace/deck` projection; `presentation/package-tier-workspace/` owns the Tier workspace kit and its lower deck; `drawer/` owns Package Family/Tier composition, controllers, editors, and schema. Family creation saves independently before its optional Tier-capability stage.
- [tierOccupants.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/tierOccupants.ts), [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/evaluateTierPricing.ts), [rateSheetLabels.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/rateSheetLabels.ts), and [vocabulary.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/vocabulary.ts) are Package-owned derivations and vocabulary.

## Registration and presentation

[register.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/register.ts) registers `packages` navigation/destination; `package-families`, `service-tiers`, and `package-tier-workspace` sources; the `tier-workspace` kit; and `package-family`, `package-family-create`, `tier`, and `rate-sheet` drawers. Creation uses the existing per-intent drawer override and stable `new` sentinel; Station Manager contains no Package creation rule. `service-tiers` is registered but currently unbound. This entry-only file is imported solely by `resources/ts/modules/admin-station.ts` and is never re-exported from the public barrel.

Package does not choose screen placement. Admin authors string-key presentation policy through Station Manager: Package Families appear on Services Home using Admin's load-bearing `category-group-cards` kit, and the Tier workspace appears on Packages Home. Admin's generic drawer hosts the registered Package contract but never saves Package data.

Imports from Admin presentation/icons are legal capability consumption. Station Manager supplies only host-engine contracts. Service-scoped Package URLs use the Service id as navigation context; they do not transfer Package persistence authority.

## Backend authority

[PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) owns `cz_package_station` persistence and the all-instance Rate Sheet usage scan. [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php), [PackageStationReadController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationReadController.php), and [PackageFamiliesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageFamiliesController.php) own Package reads/mutations. The scoped Tier route family resolves `tier_instances/{instance}` before slot/bin work; temporary unscoped aliases address only `ti_primary`. `Support/` owns Package schemas, Family lifecycle/guards, manager shape, Tier instances, and the separate Tier assignment ledger. See [Tier Capability](tier-capability.md).

The Package Manager is Package-internal supply configuration, not the platform Station Manager.

## Related Code Maps

[Station Manager](station-manager.md), [Package Manager](package-manager.md), [Tiers](tiers.md), [Rate Sheet](rate-sheet.md), [Service Connections](service-connections.md), and [Admin Surface Binding](admin-station-surface-binding.md).
