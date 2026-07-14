# Rate Sheet

## Purpose

Maintains the Package Station’s source service selections and resolves their tier pricing into package totals and validation issues.

## Ownership

The rate sheet is part of the single Package Station persisted by `PackageRepository`. Package-manager drafts may edit source relationships, while the pricing evaluator derives results. It must not become a second service catalogue or persist computed totals as an independent authority.

## Main Entry Points

- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/modules/packages/evaluateTierPricing.ts) calculates Tier line totals and issues for missing, disabled, unresolved, or invalid-price selections. Use it when changing pricing validation or totals.
- [package.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/providers/package.ts) maps manager sources/groups into Rate Sheet drafts and persistence payloads. Use it when changing selection shape or save rules.
- [DynamicStationManager.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx) hosts the primary Rate Sheet under Your Service Manager → Settings (below Commercial Groups): read view, filters, save/validation, and the source-preview draft. The legacy Package Manager composition remains temporarily available. The inline editor and source picker live in [PackageRateSheetEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageRateSheetEditor.tsx).

## Backend and Persistence

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) constructs defaults and sanitizes source, group, and Rate Sheet arrays. Use it for persisted shape and backend readiness rules.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists the complete station option and resolves service/pool relationships. Use it for storage and compatibility migration.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) projects active catalogue and Package pricing for public consumption. Use it when Rate Sheet results reach the Cost Builder incorrectly.

## Runtime Flow

The manager selects source services, the provider normalizes those selections, and tier pricing evaluation resolves source prices for each fixed tier. Package tiers consume the result; the public pricing builder later projects active package and service pricing.

Under Your Service Manager → Settings, the read view filters rows by provenance via [PackageRateSheetFilters.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageRateSheetFilters.tsx). Its exported `assignmentByServiceId` map also scopes connection rows, and the Family Card scope seeds the Category Group filter. Provenance (`source_service_id`/title/categories) remains live read-model data and is never persisted on rows.

## Internal File Navigation

| Concern | Marker | Contains | Read when... |
| --- | --- | --- | --- |
| Editor | `SECTION: RATE_SHEET_EDITOR` | Sources, Groups, selections, filters | Changing manager UI |
| Provider draft | `SECTION: RATE_SHEET_DRAFT` | Replacement and onboarding | Changing frontend shape |
| Manager projection | `SECTION: RATE_SHEET_PROJECTION` | Tier reference projection | Changing Package read models |
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
