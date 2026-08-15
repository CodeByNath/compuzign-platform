# Rate Sheet

**Lifecycle contract status:** Pending migration.

Platform identity is integrated without lifecycle migration: `CZPRC` against
`rate_sheet_id`, `CZPRCG` against `(rate_sheet_id, group_id)`, `CZPRCI` against
`(rate_sheet_id, item_id)`, and an optional child price option's `CZPRCIO`
against `(rate_sheet_id, item_id, option_id)` — never the row's own
`unit_price`. Row identity deliberately excludes `group_id`, so regrouping and
group deletion preserve it. New records bind at the existing Manager save
boundary, guarded deletion tombstones the removed identity, and durable CLI
selectors assign legacy records. Row removal tombstones only that row; sheet
deletion orchestrates group, row, and sheet tombstones. Authoring and lifecycle
are unchanged.

## Purpose and ownership

Rate Sheets are Package Station supply/pricing configuration; Station Manager and Admin only host presentation.

The sibling collection is `package_manager.rate_sheets[]` inside `cz_package_station`. Each sheet has a `rate_sheet_id`, title, status, groups, and priced rows. A legacy singleton lifts to `rs_primary` on read; only the collection is written. Bundle outputs use the same `CZPRCI` reference, persisted beside `CZPRCB`; see [Rate Sheet Bundle](rate-sheet-bundle.md).

A row's `per` uses the built-in plus curated unit vocabulary; only curated units
are stored, and unknown values fail closed.

A row — and a Bundle, for its own price — may carry `default_price_label`: the
display-only name of its existing `unit_price`, blank inheriting "Default Price"
through `defaultPriceLabel()`
([rateSheetLabels.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/rateSheetLabels.ts)).
No identity, no `price_options[]` entry; selection stays the absence of a
`price_option_id`.

## Current implementation

- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/types.ts) defines Rate Sheet rows, output-only Platform IDs, units, groups, and Tier selection contracts.
- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/evaluateTierPricing.ts) calculates totals and reports unresolved, unavailable, invalid-option/quantity and missing-price issues.
- [rateSheetLabels.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/rateSheetLabels.ts) derives labels for Package-owned relationship projections.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) resolves selections against the Package read model and owns Tier-module saves.
- [deck.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/deck.ts) projects the focused Tier's bound sheet and its groups, adding no storage or price.
- [tierInstanceModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts) projects available sheets and cross-instance users; non-exclusive, from occupant bindings.

### Rate Sheet authoring tool

The Package-owned `rate-sheet` drawer mounts in Admin's generic shell and reuses the manager read/save contract, adding no endpoint or station. Edit uses `InlineEditorShell`: one save footer, dirty-cancel confirmation.

One collection controller and save engine serve distinct presentations; the legacy collection editor stays pool-only. A Settings row carries its already-loaded native key behind the visible `CZPRC`: View is a compact summary without the row table or child identities; Edit renders title/status, "+ Add Service", the row table, and inline Group/Per dropdowns. `'new'` calls `createSheet()` once into that same editor. Curated Per rename updates every referencing row; built-in units stay immutable. Saves remain **partial upserts plus explicit `rate_sheet_deletions`**; omission never deletes.

"+ Add Service" (`RateSheetServiceImportPicker.tsx`) browses category/Service/inclusion and stages picks locally; Publish appends them as curated rows through `publishRows` — the same full-manager save.

- [rateSheetToolModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/rateSheetToolModel.ts) — pure read-model ⇄ editor ⇄ save-payload mapping; the backend mints blank ids. `addEditorRows` batch-appends staged rows.
- [useRateSheetTool.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/useRateSheetTool.ts) — local-edit collection controller; Save batches through `savePackageStationManager`, Cancel reverts, `useHostService` supplies the host id, and the drawer's lock (`editingRowId`) governs Save/Remove/Delete.
- [rateSheetParts.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/rateSheetParts.tsx) — the shared readable/editable group and grid presentation; mints nothing.
- [RateSheetTool.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetTool.tsx) / [RateSheetServiceImportPicker.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetServiceImportPicker.tsx) — collection/focused presentation and the picker above; no endpoint, no minting. See [Drawer System](drawer-system.md).

A sheet may also hold `bundles[]`, reusing this controller, save engine, and
grid through a scope seam: [Rate Sheet Bundle](rate-sheet-bundle.md).

### Focused-Tier connection drawers

The `tier-rate-sheet` and `tier-rate-sheet-group` keys scope this same tool to ONE focused Tier's connection; own map: [Focused-Tier Rate Sheet Connections](tier-rate-sheet-connections.md).

## Backend and runtime flow

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) owns shape: `sanitizeRateSheets` (read migration, no minting), `commitConfiguration` (partial upsert, explicit deletion/stale-drop, write-time minting), `buildReadModel`, and sheet-strict `projectTierRateSheet`. `PRIMARY_RATE_SHEET_ID`/`deriveRateItemId` centralise ids. `sanitizeRateSheetUnits` resolves the vocabulary **before** the sheets validated against it; an omitted `rate_sheet_units` key leaves the stored list alone, and a unit a surviving row still carries survives an omitting submission.
- [PackageStationSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageStationSchema.php) holds only `sanitizeSourceRelationships` and the pure `evaluateTierPricing`; it is **not** shape authority.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists the Package Station option; Cost Builder passes each Tier's `rate_sheet_id` into `projectTierRateSheet`.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) consumes active Service and Package pricing for public Cost Builder projection.

Tier selections resolve within their bound sheet and derive totals/readiness. Live provenance stays read-model data, never selection storage.

## Related Code Maps

[Package Station](package-station.md), [Package Manager](package-manager.md), [Focused-Tier Rate Sheet Connections](tier-rate-sheet-connections.md), [Tiers](tiers.md), and [Cost Builder](cost-builder.md).
