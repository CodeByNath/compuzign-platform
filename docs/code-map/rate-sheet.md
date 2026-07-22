# Rate Sheet

## Purpose

Maintains the Package Station’s source service selections and resolves their tier pricing into package totals and validation issues.

## Ownership

The rate sheet is part of the single Package Station persisted by `PackageRepository`. Package-manager drafts may edit source relationships, while the pricing evaluator derives results. It must not become a second service catalogue or persist computed totals as an independent authority.

## Main Entry Points

- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/modules/packages/evaluateTierPricing.ts) calculates Tier line totals and issues for missing, disabled, unresolved, or invalid-price selections. Use it when changing pricing validation or totals.
- [package.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/providers/package.ts) maps manager sources/groups into Rate Sheet drafts and persistence payloads. Use it when changing selection shape or save rules.
- [DynamicStationManager.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx) hosts the Rate Sheet only under Your Service Manager → Settings: read view, filters, save/validation, and source-preview draft. Packages consumes its results through Tiers but does not configure it. Setup and source onboarding remain in [PackageRateSheetEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageRateSheetEditor.tsx).
- [serviceManagerDrawers.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/serviceManagerDrawers.tsx) edits one Rate Sheet row inside the Command Centre. Source option and provenance are read-only; price, unit, quantity, and group patch the complete current Rate Sheet draft. Price Settings is explicitly audit-only.
- [packageRateSheetRow.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/packageRateSheetRow.ts) is the pure half of the station-owned Rate Sheet commands: patch exactly one row by its own `item_id` (approved fields only, provider-parity validation), initialise the singleton sheet, append a sheet group, and project persisted item decisions for the atomic manager save. [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageStation.ts) composes these into `updateRateSheetRow` / `initialiseRateSheet` / `createRateSheetGroup` over the existing `fetchPackageStationManager` → `savePackageStationManager` round-trip and advances its read model from the authoritative response. Setup submits a titled empty sheet deliberately: `PackageManagerSchema::commitConfiguration` itself materialises a row per live relationship item ($0.00, "Per item", ×1), so the configured sheet returns with its connected rows; the setup drawer previews and reports that (see [Admin Station Drawer](admin-station-drawer.md)). The Admin Station edits one row through the registered `rate-sheet-row` drawer ([RateSheetRowDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/packageTierWorkspace/RateSheetRowDrawerHost.tsx) → [RateSheetRowDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/rate-sheet-row/RateSheetRowDrawerContent.tsx)); the Tier Workspace lower deck projects rows via [rateSheetProjection.ts](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/packageTierWorkspace/rateSheetProjection.ts). There is no separate Rate Sheet-row endpoint and no standalone sheet identity.

## Backend and Persistence

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) constructs defaults and sanitizes source, group, and Rate Sheet arrays. Use it for persisted shape and backend readiness rules.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists the complete station option and resolves service/pool relationships. Use it for storage and compatibility migration.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) projects active catalogue and Package pricing for public consumption. Use it when Rate Sheet results reach the Cost Builder incorrectly.

## Runtime Flow

The manager selects source services, the provider normalizes those selections, and tier pricing evaluation resolves source prices for each fixed tier. Package tiers consume the result; the public pricing builder later projects active package and service pricing.

Under Your Service Manager → Settings, the read view filters rows by provenance via [PackageRateSheetFilters.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageRateSheetFilters.tsx). Its exported `assignmentByServiceId` map also scopes connection rows, and the Family Card scope seeds the Package Family filter. Provenance (`source_service_id`/title/categories) remains live read-model data and is never persisted on rows.

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
- [rate-sheet-row-command-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/rate-sheet-row-command-contract.ts)
- [rate-sheet-row-drawer-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/rate-sheet-row-drawer-contract.ts)

## Related Code Maps

[Package Manager](package-manager.md), [Tiers](tiers.md), and [Cost Builder](cost-builder.md).

## Related History

[Package Category Groups v1](../project-history/PackageCategoryGroups-v1.md) — provenance-based Rate Sheet filtering and why group data stays out of the public pricing projection for now.
