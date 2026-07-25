# Rate Sheet

## Purpose and ownership

Rate Sheets are Package Station supply and pricing configuration. Package Station owns their contracts, source relationships, grouping, validation, Tier selections, pricing, API, and persistence. Station Manager coordinates surfaces; Admin Station hosts presentation. Neither owns Rate Sheet rules or data.

Rate Sheets are an identified sibling collection — `package_manager.rate_sheets[]` — inside `cz_package_station`. Each has stable `rate_sheet_id`, title, active/archived status, groups, and priced items. A legacy singleton lifts to deterministic `rs_primary` at read time; only the collection is written. Each sheet holds explicitly added rows. Totals are derived; Services and pool items remain Service-owned facts.

## Current implementation

- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/types.ts) defines Rate Sheet rows, units, groups, and Tier selection contracts.
- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/evaluateTierPricing.ts) calculates line totals and reports unresolved, unavailable, invalid-option, invalid-quantity, and missing-price issues.
- [rateSheetLabels.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/rateSheetLabels.ts) derives labels for Package-owned relationship projections.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) resolves a Tier's selections against the Package read model and owns Tier module saves.
- [deck.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/deck.ts) groups a focused Tier's resolved selections for the read-only lower deck; it adds no storage or price.
- [tierInstanceModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts) projects the Settings inventory of available sheets and current Tier users across instances. Availability is non-exclusive; current use comes from occupant bindings, and Family labels join only through explicit Tier assignments.

### Rate Sheet authoring tool

The Package-owned `rate-sheet` drawer mounts in the generic Admin shell and reuses the Package Manager read/save contract. It adds no endpoint or station. Edit uses `InlineEditorShell` for one footer/save and dirty-cancel confirmation.

It is a **collection manager**, not a singleton editor: View lists the sheets; Edit hosts create, open, edit, duplicate, archive, delete, and per-sheet row curation. A save is a **partial upsert set plus an explicit `rate_sheet_deletions` list** — omitting a sheet never deletes it. `PackageRepository::rateSheetIdsInUse` scans every instance's settled binding, overview/features drafts, history, bin, and allow-list plus the temporary legacy projection. Delete returns `rate_sheet_in_use`; archive returns `rate_sheet_in_use_archive` with the using instance ids.

- [rateSheetToolModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/rateSheetToolModel.ts) — pure `PackageManagerReadModel` ⇄ per-sheet editor values ⇄ `PackageManagerSavePayload` mapping (`toRateSheetEditorList`, `createEditorSheet`/`duplicateEditorSheet`, `addEditorRow`/`removeEditorRow`, `summariseRateSheet`). Preserves each sheet's `rate_sheet_id`, each row's `item_id`/`source_item_id`, and each group's `group_id`; new sheets/rows carry a blank id the backend mints.
- [useRateSheetTool.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/useRateSheetTool.ts) — the collection controller. Edits are local; one Save commits the batch via `savePackageStationManager`; Cancel reverts. Addressed by the shared `useHostService` host id.
- [RateSheetTool.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetTool.tsx) — View list and Edit collection editor. It calls no endpoint and mints no IDs; rows are added explicitly.

A Tier occupant binds to **one** sheet via `rate_sheet_id` and selects that sheet's rows by `item_id` + quantity; switching sheets clears the selections. Row identity is always `(rate_sheet_id, item_id)` — never a cross-sheet scan. The lower deck reads the bound sheet's groups and routes edits to the `tier` drawer; its Settings lane also shows all available sheets and their current instance/Family users. Price authority stays with the Rate Sheet.

## Backend and runtime flow

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) is the authoritative Rate Sheet shape owner: `sanitizeRateSheets` (read-time migration, no minting), `commitConfiguration` (partial upsert by id + `rate_sheet_deletions` + per-sheet stale-drop, write-path minting), `buildReadModel`, and `projectTierRateSheet(…, $rateSheetId)` (resolves strictly within the named sheet). `PRIMARY_RATE_SHEET_ID` and `deriveRateItemId` centralise the ids.
- [PackageStationSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageStationSchema.php) holds only the two shared helpers `sanitizeSourceRelationships` and `evaluateTierPricing` (the pure pricing evaluator). It is **not** the aggregate/shape authority.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists the complete Package Station option; Cost Builder projection passes each Tier's `rate_sheet_id` into `projectTierRateSheet`.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) consumes active Service and Package pricing for public Cost Builder projection.

Persisted Package source relationships resolve to Rate Sheet rows; Tier selections resolve within their bound sheet and derive totals/readiness. Live provenance remains read-model data, never selection storage.

## Validation

Run `npm run contract:rate-sheet-tool` (covers the read/save mapping and the View-mode summary/grouping projections), `npx tsx scripts/tier-pricing-parity-contract.ts`, `php tests/tier-pricing-parity.php`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Package Station](package-station.md), [Package Manager](package-manager.md), [Tiers](tiers.md), and [Cost Builder](cost-builder.md).
