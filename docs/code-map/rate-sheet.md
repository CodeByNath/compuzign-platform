# Rate Sheet

## Purpose

Maintains the Package Station’s source service selections and resolves their tier pricing into package totals and validation issues.

## Ownership

The rate sheet is part of the single Package Station persisted by `PackageRepository`. The pricing evaluator derives results from the persisted selections. It must not become a second service catalogue or persist computed totals as an independent authority.

## Main Entry Points

- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/evaluateTierPricing.ts) calculates Tier line totals and issues for missing, disabled, unresolved, or invalid-price selections. Use it when changing pricing validation or totals.

The manager Rate Sheet editing surface — source selection and onboarding, row editing, provenance filters, and the provider draft — was hosted in the retired Command Centre and has been removed. The Rate Sheet remains part of the Package Station; its editing surface is to be rebuilt in the Admin Station. Backend persistence/validation and pricing evaluation below are unchanged.

## Backend and Persistence

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) constructs defaults and sanitizes source, group, and Rate Sheet arrays. Use it for persisted shape and backend readiness rules.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists the complete station option and resolves service/pool relationships. Use it for storage and compatibility migration.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) projects active catalogue and Package pricing for public consumption. Use it when Rate Sheet results reach the Cost Builder incorrectly.

## Runtime Flow

The persisted source selections resolve through tier pricing evaluation into source prices for each fixed tier. Package tiers consume the result; the public pricing builder later projects active package and service pricing. Provenance (`source_service_id`/title/categories) remains live read-model data and is never persisted on rows.

## Internal File Navigation

| Concern | Marker | Contains | Read when... |
| --- | --- | --- | --- |
| Legacy schema | `SECTION: RATE_SHEET_SCHEMA` | Sanitization and validation | Tracing legacy data |
| Tier pricing | `SECTION: TIER_PRICING` | Selections, totals, readiness | Changing evaluation |

## Validation

- [tier-pricing-parity-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/tier-pricing-parity-contract.ts)
- [tier-pricing-parity.php](../../wp-content/plugins/compuzign-platform/tests/tier-pricing-parity.php)
- [tier-pricing-parity.json](../../wp-content/plugins/compuzign-platform/tests/fixtures/tier-pricing-parity.json)

## Related Code Maps

[Package Manager](package-manager.md), [Tiers](tiers.md), and [Cost Builder](cost-builder.md).

## Related History

[Package Category Groups v1](../project-history/PackageCategoryGroups-v1.md) — provenance-based Rate Sheet filtering and why group data stays out of the public pricing projection for now.
