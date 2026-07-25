# Rate Sheet

## Purpose and ownership

Rate Sheets are Package Station supply/pricing configuration: contracts, relationships, grouping, validation, Tier selections, pricing, API, and persistence. Station Manager coordinates surfaces and Admin hosts presentation; neither owns Rate Sheet rules or data.

The identified sibling collection is `package_manager.rate_sheets[]` inside `cz_package_station`. Each sheet has stable `rate_sheet_id`, title, status, groups, and explicit priced rows. A legacy singleton lifts to deterministic `rs_primary` on read; only the collection is written. Totals are derived; Services and pools remain Service-owned.

## Current implementation

- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/types.ts) defines Rate Sheet rows, units, groups, and Tier selection contracts.
- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/evaluateTierPricing.ts) calculates totals and reports unresolved, unavailable, invalid-option/quantity, and missing-price issues.
- [rateSheetLabels.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/rateSheetLabels.ts) derives labels for Package-owned relationship projections.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) resolves selections against the Package read model and owns Tier-module saves.
- [deck.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/deck.ts) groups focused-Tier selections for the read-only lower deck without adding storage or price.
- [tierInstanceModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts) projects available sheets and cross-instance users. Availability is non-exclusive, use comes from occupant bindings, and Family labels require assignments.

### Rate Sheet authoring tool

The Package-owned `rate-sheet` drawer mounts in Admin's generic shell and reuses the manager read/save contract without adding an endpoint or station. Edit uses `InlineEditorShell` for one save footer and dirty-cancel confirmation.

It is a **collection manager**, not a singleton: View lists sheets; Edit hosts create, open, duplicate, lifecycle actions, and row curation. Saves are **partial upserts plus explicit `rate_sheet_deletions`**; omission never deletes. After legacy read lift, `PackageRepository::rateSheetIdsInUse` scans every canonical instance's binding, drafts, history, bin, and allow-list. Delete returns `rate_sheet_in_use`; archive returns `rate_sheet_in_use_archive` with using instance ids.

- [rateSheetToolModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/rateSheetToolModel.ts) — pure read-model ⇄ editor ⇄ save-payload mapping and summaries. It preserves sheet, row/source, and group ids; the backend mints blank new ids.
- [useRateSheetTool.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/useRateSheetTool.ts) — local-edit collection controller; Save batches through `savePackageStationManager`, Cancel reverts, and shared `useHostService` supplies the host id.
- [RateSheetTool.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetTool.tsx) — View list and Edit collection editor. It calls no endpoint and mints no IDs; rows are added explicitly.

A Tier occupant binds to **one** sheet and selects rows by `item_id` + quantity; switching sheets clears selections. Identity is `(rate_sheet_id, item_id)`, never a cross-sheet scan. The lower deck reads bound groups and routes Tier edits; Settings shows available sheets and instance/Family users. Price authority stays with the Rate Sheet.

## Backend and runtime flow

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) owns shape: `sanitizeRateSheets` (read migration, no minting), `commitConfiguration` (partial upsert, explicit deletion/stale-drop, write-time minting), `buildReadModel`, and sheet-strict `projectTierRateSheet`. `PRIMARY_RATE_SHEET_ID`/`deriveRateItemId` centralise ids.
- [PackageStationSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageStationSchema.php) holds only `sanitizeSourceRelationships` and the pure `evaluateTierPricing`; it is **not** shape authority.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists the complete Package Station option; Cost Builder projection passes each Tier's `rate_sheet_id` into `projectTierRateSheet`.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) consumes active Service and Package pricing for public Cost Builder projection.

Persisted Package source relationships resolve to Rate Sheet rows; Tier selections resolve within their bound sheet and derive totals/readiness. Live provenance remains read-model data, never selection storage.

## Validation

Run `php tests/tier-capability-invariants.php`, `npm run contract:rate-sheet-tool` (covers the read/save mapping and the View-mode summary/grouping projections), `npx tsx scripts/tier-pricing-parity-contract.ts`, `php tests/tier-pricing-parity.php`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Package Station](package-station.md), [Package Manager](package-manager.md), [Tiers](tiers.md), and [Cost Builder](cost-builder.md).
