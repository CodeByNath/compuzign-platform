# Rate Sheet

## Purpose

Maintains the Package Station’s source service selections and resolves their tier pricing into package totals and validation issues.

## Ownership

The rate sheet is part of the single Package Station persisted by `PackageRepository`. Package-manager drafts may edit source relationships, while the pricing evaluator derives results. It must not become a second service catalogue or persist computed totals as an independent authority.

## Main Entry Points

- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/modules/packages/evaluateTierPricing.ts) calculates Tier line totals and issues for missing, disabled, unresolved, or invalid-price selections. Use it when changing pricing validation or totals.
- [package.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/providers/package.ts) maps manager sources/groups into Rate Sheet drafts and persistence payloads. Use it when changing selection shape or save rules.
- [DynamicStationManager.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx) contains Rate Sheet cards, group editor, source picker, validation messages, and Save behavior. Use it when changing Rate Sheet UI.

## Backend and Persistence

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) constructs defaults and sanitizes source, group, and Rate Sheet arrays. Use it for persisted shape and backend readiness rules.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists the complete station option and resolves service/pool relationships. Use it for storage and compatibility migration.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) projects active catalogue and Package pricing for public consumption. Use it when Rate Sheet results reach the Cost Builder incorrectly.

## Runtime Flow

The manager selects source services, the provider normalizes those selections, and tier pricing evaluation resolves source prices for each fixed tier. Package tiers consume the result; the public pricing builder later projects active package and service pricing.

The read view filters rows by provenance via [PackageRateSheetFilters.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageRateSheetFilters.tsx): Package Category Group (supplying Service's `category_group_id` assignment), Service Category, Service, Inclusion Group, availability, and search. Provenance (`source_service_id`/title/categories) is resolved live by `PackageRepository::sourcePools` and carried on read-model items — never persisted on rows, never flattening the Service structure.

## Validation

- [tier-pricing-parity-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/tier-pricing-parity-contract.ts)
- [tier-pricing-parity.php](../../wp-content/plugins/compuzign-platform/tests/tier-pricing-parity.php)
- [tier-pricing-parity.json](../../wp-content/plugins/compuzign-platform/tests/fixtures/tier-pricing-parity.json)

## Related Code Maps

[Package Manager](package-manager.md), [Tiers](tiers.md), and [Cost Builder](cost-builder.md).

## Related History

[Package Category Groups v1](../project-history/PackageCategoryGroups-v1.md) — provenance-based Rate Sheet filtering and why group data stays out of the public pricing projection for now.
