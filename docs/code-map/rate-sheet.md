# Rate Sheet

## Purpose and ownership

Rate Sheets are Package Station supply/pricing configuration: contracts, relationships, grouping, validation, Tier selections, pricing, API, and persistence. Station Manager coordinates surfaces and Admin hosts presentation; neither owns the rules or the data.

The sibling collection is `package_manager.rate_sheets[]` inside `cz_package_station`. Each sheet has stable `rate_sheet_id`, title, status, groups, and explicit priced rows. A legacy singleton lifts to `rs_primary` on read; only the collection is written. Totals are derived; Services and pools remain Service-owned.

A row's `per` unit comes from a vocabulary that is **data**: `BUILT_IN_RATE_SHEET_UNITS` (seven constants, always offered, never removable) plus the curated `package_manager.rate_sheet_units[]`. Only the curated half is stored. Validation stays closed — `sanitizeRateSheet` drops a `per` the vocabulary does not know, so a row cannot introduce a unit by using one.

## Current implementation

- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/types.ts) defines Rate Sheet rows, units, groups, and Tier selection contracts.
- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/evaluateTierPricing.ts) calculates totals and reports unresolved, unavailable, invalid-option/quantity and missing-price issues.
- [rateSheetLabels.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/rateSheetLabels.ts) derives labels for Package-owned relationship projections.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) resolves selections against the Package read model and owns Tier-module saves.
- [deck.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/deck.ts) projects the focused Tier's bound sheet and its groups, keyed by stored ids, adding no storage or price.
- [tierInstanceModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts) projects available sheets and cross-instance users. Availability is non-exclusive; use comes from occupant bindings.

### Rate Sheet authoring tool

The Package-owned `rate-sheet` drawer mounts in Admin's generic shell and reuses the manager read/save contract, adding no endpoint or station. Edit uses `InlineEditorShell` for one save footer and dirty-cancel confirmation.

It is a **collection manager**, not a singleton: View lists sheets; Edit hosts create, open, duplicate, lifecycle actions, and row curation. Saves are **partial upserts plus explicit `rate_sheet_deletions`**; omission never deletes. `PackageRepository::rateSheetIdsInUse` scans every instance's binding, drafts, history, bin, and allow-list; delete returns `rate_sheet_in_use`, archive `rate_sheet_in_use_archive`.

- [rateSheetToolModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/rateSheetToolModel.ts) — pure read-model ⇄ editor ⇄ save-payload mapping and summaries, preserving sheet, row/source and group ids; the backend mints blank ids. `rateSheetRowsWithKeys` restricts a sheet to an allow-list of `rowKey`s.
- [useRateSheetTool.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/useRateSheetTool.ts) — local-edit collection controller; Save batches through `savePackageStationManager`, Cancel reverts, and shared `useHostService` supplies the host id.
- [rateSheetParts.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/rateSheetParts.tsx) — the one implementation of `cz-rate-sheet-tool__groups` and `cz-rate-sheet-tool__grid`, readable and editable. Grids render the rows they are handed, so a scope may pass a subset; `allowRemove` keeps row deletion in the whole-sheet view. Its `InlineCreateSelect` is the one implementation of pick-or-create, used by both row dropdowns: an `__add__` sentinel swaps the select for an input, and only the value the controller settled on is selected on the row that asked. Presentation mints nothing.
- [RateSheetTool.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetTool.tsx) — View list and Edit collection editor over those parts. It calls no endpoint and mints no IDs. Every launcher opens it readable, Settings' Create Rate Sheet included: an empty pool reads Pending with its own message through `rateSheetCollectionModule`, and Edit opens the editor. See the Module entry contract in [Drawer System](drawer-system.md).

### Focused-Tier connection drawers

The `tier-rate-sheet` and `tier-rate-sheet-group` keys scope this same tool to ONE focused Tier's connection, and have their own map: [Focused-Tier Rate Sheet Connections](tier-rate-sheet-connections.md).

## Backend and runtime flow

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) owns shape: `sanitizeRateSheets` (read migration, no minting), `commitConfiguration` (partial upsert, explicit deletion/stale-drop, write-time minting), `buildReadModel`, and sheet-strict `projectTierRateSheet`. `PRIMARY_RATE_SHEET_ID`/`deriveRateItemId` centralise ids. `sanitizeRateSheetUnits` resolves the vocabulary **before** the sheets validated against it; an omitted `rate_sheet_units` key leaves the stored list alone, and a unit a surviving row still carries is kept even when the submitted list omits it.
- [PackageStationSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageStationSchema.php) holds only `sanitizeSourceRelationships` and the pure `evaluateTierPricing`; it is **not** shape authority.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists the Package Station option; Cost Builder passes each Tier's `rate_sheet_id` into `projectTierRateSheet`.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) consumes active Service and Package pricing for public Cost Builder projection.

Tier selections resolve within their bound sheet and derive totals/readiness. Live provenance remains read-model data, never selection storage.

## Validation

Run `php tests/tier-capability-invariants.php`, `npm run contract:rate-sheet-tool` (read/save mapping, summary/grouping projections, scoped row allow-list), `npm run contract:package-tier-workspace` (connection projections, routing tokens, lane composition), `npm run contract:drawer-module-entry`, `npx tsx scripts/tier-pricing-parity-contract.ts`, `php tests/tier-pricing-parity.php`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Package Station](package-station.md), [Package Manager](package-manager.md), [Focused-Tier Rate Sheet Connections](tier-rate-sheet-connections.md), [Tiers](tiers.md), and [Cost Builder](cost-builder.md).
