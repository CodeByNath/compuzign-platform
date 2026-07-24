# Rate Sheet

## Purpose and ownership

Rate Sheets are Package Station supply and pricing configuration. Package Station owns their contracts, source relationships, grouping, validation, Tier selections, pricing derivation, API boundary, and persistence. Station Manager only coordinates registered surfaces; Admin Station only hosts registered presentation and authors placement policy. Neither owns Rate Sheet rules or data.

Rate Sheets are an identified sibling collection — `package_manager.rate_sheets[]` — inside the single `cz_package_station` record. Each sheet has a stable `rate_sheet_id` (`rs_…`), `title`, `status` (`active`|`archived`), catalogue `groups[]`, and priced `items[]`. A legacy singleton `rate_sheet` lifts once to the deterministic `rs_primary` at read time (`PackageManagerSchema::PRIMARY_RATE_SHEET_ID`); the collection is the only shape written thereafter. Independent curation: each sheet holds only the rows an admin added — there is no blanket auto-onboard. Computed totals are derived results, not a second persisted authority. Services and their pool items remain Service-owned source facts.

## Current implementation

- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/types.ts) defines Rate Sheet rows, units, groups, and Tier selection contracts.
- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/evaluateTierPricing.ts) calculates line totals and reports unresolved, unavailable, invalid-option, invalid-quantity, and missing-price issues.
- [rateSheetLabels.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/rateSheetLabels.ts) derives labels for Package-owned relationship projections.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) resolves a Tier's selections against the Package read model and owns Tier module saves.
- [deck.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/deck.ts) groups a focused Tier's already-resolved selections into their Rate Sheet groups for the Tier workspace lower deck — a read-only view of existing rows, not a second projection, storage, or price.

### Rate Sheet authoring tool

The authoring capability is a Package-owned drawer (the registered `rate-sheet` template, `supportedModes: ['view','edit']`, `size: 'extra-wide'`) mounted in the generic Admin drawer shell — not the retired Command Centre. It reuses the surviving Package Manager read/save contract and adds no endpoint or station. Edit hands its controls to the shared `InlineEditorShell` (one footer, one save; dirty-cancel confirm).

It is a **collection manager**, not a singleton editor: View lists the sheets; Edit hosts create, open, edit, duplicate, archive, delete, and per-sheet row curation. A save is a **partial upsert set plus an explicit `rate_sheet_deletions` list** — omitting a sheet never deletes it; deleting a sheet a Tier still binds is rejected server-side (`rate_sheet_in_use`).

- [rateSheetToolModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/rateSheetToolModel.ts) — pure `PackageManagerReadModel` ⇄ per-sheet editor values ⇄ `PackageManagerSavePayload` mapping (`toRateSheetEditorList`, `createEditorSheet`/`duplicateEditorSheet`, `addEditorRow`/`removeEditorRow`, `summariseRateSheet`). Preserves each sheet's `rate_sheet_id`, each row's `item_id`/`source_item_id`, and each group's `group_id`; new sheets/rows carry a blank id the backend mints.
- [useRateSheetTool.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/useRateSheetTool.ts) — the collection controller. Edits are local; one Save commits the batch via `savePackageStationManager`; Cancel reverts. Addressed by the shared `useHostService` host id.
- [RateSheetTool.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetTool.tsx) — `RateSheetDrawerContent`: the View list and the Edit collection editor. Calls no endpoint; mints no IDs. Connecting a Service only makes its inclusions selectable — rows are added explicitly.

A Tier occupant binds to **one** sheet via `rate_sheet_id` and selects that sheet's rows by `item_id` + quantity; switching sheets clears the selections. Row identity is always `(rate_sheet_id, item_id)` — never a cross-sheet scan. The lower deck reads the bound sheet's groups and routes edits to the `tier` drawer; price authority stays with the Rate Sheet.

## Backend and runtime flow

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) is the authoritative Rate Sheet shape owner: `sanitizeRateSheets` (read-time migration, no minting), `commitConfiguration` (partial upsert by id + `rate_sheet_deletions` + per-sheet stale-drop, write-path minting), `buildReadModel`, and `projectTierRateSheet(…, $rateSheetId)` (resolves strictly within the named sheet). `PRIMARY_RATE_SHEET_ID` and `deriveRateItemId` centralise the ids.
- [PackageStationSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageStationSchema.php) holds only the two shared helpers `sanitizeSourceRelationships` and `evaluateTierPricing` (the pure pricing evaluator). It is **not** the aggregate/shape authority.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists the complete Package Station option; Cost Builder projection passes each Tier's `rate_sheet_id` into `projectTierRateSheet`.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) consumes active Service and Package pricing for public Cost Builder projection.

Persisted Package source relationships resolve to Rate Sheet rows; a Tier's selections resolve within its bound sheet and pricing evaluation derives totals and readiness. Live provenance such as `source_service_id`, titles, and categories remains read-model data and is not copied into selection rows.

## Validation

Run `npm run contract:rate-sheet-tool` (covers the read/save mapping and the View-mode summary/grouping projections), `npx tsx scripts/tier-pricing-parity-contract.ts`, `php tests/tier-pricing-parity.php`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Package Station](package-station.md), [Package Manager](package-manager.md), [Tiers](tiers.md), and [Cost Builder](cost-builder.md).
