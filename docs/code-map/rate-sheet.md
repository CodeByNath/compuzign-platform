# Rate Sheet

## Purpose and ownership

Rate Sheets are Package Station supply and pricing configuration. Package Station owns their contracts, source relationships, grouping, validation, Tier selections, pricing derivation, API boundary, and persistence. Station Manager only coordinates registered surfaces; Admin Station only hosts registered presentation and authors placement policy. Neither owns Rate Sheet rules or data.

The Rate Sheet is part of the single `cz_package_station` record. Computed totals are derived results, not a second persisted authority. Services and their pool items remain Service-owned source facts.

## Current implementation

- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/types.ts) defines Rate Sheet rows, units, groups, and Tier selection contracts.
- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/evaluateTierPricing.ts) calculates line totals and reports unresolved, unavailable, invalid-option, invalid-quantity, and missing-price issues.
- [rateSheetLabels.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/rateSheetLabels.ts) derives labels for Package-owned relationship projections.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) resolves a Tier's selections against the Package read model and owns Tier module saves.

The former Command Centre Rate Sheet editor has been removed. This consolidation does not add or rebuild Rate Sheet feature UI. Any future editor belongs inside Package Station and must use the same contracts and persistence boundary.

## Backend and runtime flow

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) owns manager commits, source reconciliation, read projection, and Rate Sheet projection.
- [PackageStationSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageStationSchema.php) sanitizes Rate Sheet shape and derives Tier pricing/commercial projections.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists the complete Package Station option.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) consumes active Service and Package pricing for public Cost Builder projection.

Persisted Package source relationships resolve to Rate Sheet rows; Tier selections reference those rows and pricing evaluation derives totals and readiness. Live provenance such as `source_service_id`, titles, and categories remains read-model data and is not copied into selection rows.

## Validation

Run `npx tsx scripts/tier-pricing-parity-contract.ts`, `php tests/tier-pricing-parity.php`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Package Station](package-station.md), [Package Manager](package-manager.md), [Tiers](tiers.md), and [Cost Builder](cost-builder.md).
