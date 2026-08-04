# Rate Sheet

**Lifecycle contract status:** Pending migration.

Platform identity is integrated without lifecycle migration. Rate Sheet uses
`package_rate_card/CZPRC` against `rate_sheet_id`; each stored Rate Sheet Group
uses `package_rate_card_group/CZPRCG` against qualified
`(rate_sheet_id, group_id)`; each inclusion row uses
`package_rate_card_item/CZPRCI` against `(rate_sheet_id, item_id)`. `group_id`
is deliberately excluded, so regrouping and group deletion preserve row identity.
New records bind at the existing Manager save
boundary, guarded deletion tombstones the removed identity, and durable CLI
selectors assign legacy records. Row removal tombstones only that row; sheet
deletion orchestrates group, row, and sheet tombstones. Existing authoring and
lifecycle remain unchanged.

## Purpose and ownership

Rate Sheets are Package Station supply/pricing configuration. Station Manager and Admin host presentation without owning rules or data.

The sibling collection is `package_manager.rate_sheets[]` inside `cz_package_station`. Each sheet has stable `rate_sheet_id`, title, status, groups, and explicit priced rows. A legacy singleton lifts to `rs_primary` on read; only the collection is written. Totals are derived; Services and pools remain Service-owned.

A row's `per` uses the built-in plus curated unit vocabulary. Only curated
units are stored, and unknown values fail closed.

## Current implementation

- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/types.ts) defines Rate Sheet rows, output-only Platform IDs, units, groups, and Tier selection contracts.
- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/evaluateTierPricing.ts) calculates totals and reports unresolved, unavailable, invalid-option/quantity and missing-price issues.
- [rateSheetLabels.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/rateSheetLabels.ts) derives labels for Package-owned relationship projections.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) resolves selections against the Package read model and owns Tier-module saves.
- [deck.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/deck.ts) projects the focused Tier's bound sheet and its groups, keyed by stored ids, adding no storage or price.
- [tierInstanceModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts) projects available sheets and cross-instance users. Availability is non-exclusive; use comes from occupant bindings.

### Rate Sheet authoring tool

The Package-owned `rate-sheet` drawer mounts in Admin's generic shell and reuses the manager read/save contract, adding no endpoint or station. Edit uses `InlineEditorShell` for one save footer and dirty-cancel confirmation.

It retains one collection controller and save engine, with distinct presentations. The legacy collection editor remains pool-only. A Settings row carries its already-loaded native key behind the visible `CZPRC`: View renders a compact summary without the row table or child identities, and Edit renders only the selected sheet's title/status, Service import, row table, and inline Group/Per dropdown management. `'new'` calls `createSheet()` once and mounts that same one-sheet editor. Curated Per rename updates every referencing row; built-in units stay immutable. Saves remain **partial upserts plus explicit `rate_sheet_deletions`**; omission never deletes.

- [rateSheetToolModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/rateSheetToolModel.ts) — pure read-model ⇄ editor ⇄ save-payload mapping and summaries, preserving sheet, row/source and group ids; the backend mints blank ids. `rateSheetRowsWithKeys` restricts a sheet to an allow-list of `rowKey`s.
- [useRateSheetTool.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/useRateSheetTool.ts) — local-edit collection controller; Save batches through `savePackageStationManager`, Cancel reverts, and shared `useHostService` supplies the host id.
- [rateSheetParts.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/rateSheetParts.tsx) — the shared readable/editable group and grid presentation. `allowRemove` keeps deletion in the whole-sheet view; presentation mints nothing.
- [RateSheetTool.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetTool.tsx) — collection presentation plus the focused read/create/edit boundary. Focused routes never mount the collection editor. It calls no endpoint and mints no IDs. See [Drawer System](drawer-system.md).

### Focused-Tier connection drawers

The `tier-rate-sheet` and `tier-rate-sheet-group` keys scope this same tool to ONE focused Tier's connection, and have their own map: [Focused-Tier Rate Sheet Connections](tier-rate-sheet-connections.md).

## Backend and runtime flow

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) owns shape: `sanitizeRateSheets` (read migration, no minting), `commitConfiguration` (partial upsert, explicit deletion/stale-drop, write-time minting), `buildReadModel`, and sheet-strict `projectTierRateSheet`. `PRIMARY_RATE_SHEET_ID`/`deriveRateItemId` centralise ids. `sanitizeRateSheetUnits` resolves the vocabulary **before** the sheets validated against it; an omitted `rate_sheet_units` key leaves the stored list alone, and a unit a surviving row still carries is kept even when the submitted list omits it.
- [PackageStationSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageStationSchema.php) holds only `sanitizeSourceRelationships` and the pure `evaluateTierPricing`; it is **not** shape authority.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists the Package Station option; Cost Builder passes each Tier's `rate_sheet_id` into `projectTierRateSheet`.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) consumes active Service and Package pricing for public Cost Builder projection.

Tier selections resolve within their bound sheet and derive totals/readiness. Live provenance remains read-model data, never selection storage.

## Related Code Maps

[Package Station](package-station.md), [Package Manager](package-manager.md), [Focused-Tier Rate Sheet Connections](tier-rate-sheet-connections.md), [Tiers](tiers.md), and [Cost Builder](cost-builder.md).
