# Rate Sheet

## Purpose and ownership

Rate Sheets are Package Station supply/pricing configuration: contracts, relationships, grouping, validation, Tier selections, pricing, API, and persistence. Station Manager coordinates surfaces and Admin hosts presentation; neither owns Rate Sheet rules or data.

The sibling collection is `package_manager.rate_sheets[]` inside `cz_package_station`. Each sheet has stable `rate_sheet_id`, title, status, groups, and explicit priced rows. A legacy singleton lifts to `rs_primary` on read; only the collection is written. Totals are derived; Services and pools remain Service-owned.

## Current implementation

- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/types.ts) defines Rate Sheet rows, units, groups, and Tier selection contracts.
- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/evaluateTierPricing.ts) calculates totals and reports unresolved, unavailable, invalid-option/quantity, and missing-price issues.
- [rateSheetLabels.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/rateSheetLabels.ts) derives labels for Package-owned relationship projections.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) resolves selections against the Package read model and owns Tier-module saves.
- [deck.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/deck.ts) projects the focused Tier's bound sheet and the groups it draws rows from, keyed by stored ids, without adding storage or price.
- [tierInstanceModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts) projects available sheets and cross-instance users. Availability is non-exclusive, use comes from occupant bindings, Family labels require assignments.

### Rate Sheet authoring tool

The Package-owned `rate-sheet` drawer mounts in Admin's generic shell and reuses the manager read/save contract without adding an endpoint or station. Edit uses `InlineEditorShell` for one save footer and dirty-cancel confirmation.

It is a **collection manager**, not a singleton: View lists sheets; Edit hosts create, open, duplicate, lifecycle actions, and row curation. Saves are **partial upserts plus explicit `rate_sheet_deletions`**; omission never deletes. After legacy read lift, `PackageRepository::rateSheetIdsInUse` scans every canonical instance's binding, drafts, history, bin, and allow-list. Delete returns `rate_sheet_in_use`; archive returns `rate_sheet_in_use_archive`.

- [rateSheetToolModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/rateSheetToolModel.ts) — pure read-model ⇄ editor ⇄ save-payload mapping and summaries, preserving sheet, row/source, and group ids; the backend mints blank ids. `rateSheetRowsWithKeys` restricts a sheet to an allow-list of `rowKey`s, the address every editor mutation uses.
- [useRateSheetTool.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/useRateSheetTool.ts) — local-edit collection controller; Save batches through `savePackageStationManager`, Cancel reverts, and shared `useHostService` supplies the host id.
- [rateSheetParts.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/rateSheetParts.tsx) — the one implementation of `cz-rate-sheet-tool__groups` and `cz-rate-sheet-tool__grid`, readable and editable. Grids render the rows they are handed, so a scope may pass a subset; `allowRemove` keeps row deletion in the whole-sheet view.
- [RateSheetTool.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetTool.tsx) — View list and Edit collection editor over those parts. It calls no endpoint and mints no IDs.

### Focused-Tier connection drawers

`tier-rate-sheet:{ti}:{slot}:{rate_sheet_id}` and `tier-rate-sheet-group:{…}:{group_id}` are registered siblings of `rate-sheet`, opened from the focused-Tier Connections lane. The sheet scope shows only the grid filtered to that Tier's connected rows — never the Groups section; the group scope shows the groups block for the addressed group. One Edit action moves either from view to edit, and `InlineEditorShell` owns the single save footer.

[useTierRateSheetDrawer.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/useTierRateSheetDrawer.ts) composes `useRateSheetTool` and `usePackageStation`, adding no third reader, editor, or endpoint: sheet by stored id, group by stored `group_id`, grid scoped by the slot's own selected `item_id`s. A slot no longer bound to the addressed sheet reports the connection as gone. [TierRateSheetDrawer.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/TierRateSheetDrawer.tsx) is the shared content for both keys.

A Tier occupant binds to **one** sheet and selects rows by `item_id` + quantity; switching sheets clears selections. Identity is `(rate_sheet_id, item_id)`, never a cross-sheet scan. Price authority stays with the Rate Sheet, so an edit made inside a Tier scope applies to every Tier using the row.

## Backend and runtime flow

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) owns shape: `sanitizeRateSheets` (read migration, no minting), `commitConfiguration` (partial upsert, explicit deletion/stale-drop, write-time minting), `buildReadModel`, and sheet-strict `projectTierRateSheet`. `PRIMARY_RATE_SHEET_ID`/`deriveRateItemId` centralise ids.
- [PackageStationSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageStationSchema.php) holds only `sanitizeSourceRelationships` and the pure `evaluateTierPricing`; it is **not** shape authority.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists the complete Package Station option; Cost Builder projection passes each Tier's `rate_sheet_id` into `projectTierRateSheet`.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) consumes active Service and Package pricing for public Cost Builder projection.

Persisted Package source relationships resolve to Rate Sheet rows; Tier selections resolve within their bound sheet and derive totals/readiness. Live provenance remains read-model data, never selection storage.

## Validation

Run `php tests/tier-capability-invariants.php`, `npm run contract:rate-sheet-tool` (read/save mapping, summary/grouping projections, scoped row allow-list), `npm run contract:package-tier-workspace` (connection projections, routing tokens, lane composition), `npx tsx scripts/tier-pricing-parity-contract.ts`, `php tests/tier-pricing-parity.php`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Package Station](package-station.md), [Package Manager](package-manager.md), [Tiers](tiers.md), and [Cost Builder](cost-builder.md).
