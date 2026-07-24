# Rate Sheet

## Purpose and ownership

Rate Sheets are Package Station supply and pricing configuration. Package Station owns their contracts, source relationships, grouping, validation, Tier selections, pricing derivation, API boundary, and persistence. Station Manager only coordinates registered surfaces; Admin Station only hosts registered presentation and authors placement policy. Neither owns Rate Sheet rules or data.

The Rate Sheet is part of the single `cz_package_station` record. Computed totals are derived results, not a second persisted authority. Services and their pool items remain Service-owned source facts.

## Current implementation

- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/types.ts) defines Rate Sheet rows, units, groups, and Tier selection contracts.
- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/evaluateTierPricing.ts) calculates line totals and reports unresolved, unavailable, invalid-option, invalid-quantity, and missing-price issues.
- [rateSheetLabels.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/rateSheetLabels.ts) derives labels for Package-owned relationship projections.
- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) resolves a Tier's selections against the Package read model and owns Tier module saves.
- [deck.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/deck.ts) groups a focused Tier's already-resolved selections into their Rate Sheet groups for the Tier workspace lower deck — a read-only view of existing rows, not a second projection, storage, or price.

### Rate Sheet authoring tool

The Command Centre editor was removed in `34c8175`; the Rate Sheet authoring capability is now rebuilt as a Package-owned drawer (the registered `rate-sheet` drawer template) mounted in the generic Admin drawer shell — not a body surface and not the Command Centre. It reuses the surviving Package Manager read/save contract, stored IDs, groups, and items — it adds no endpoint, storage, or station.

It follows the same mature view → edit flow as `package-family` and `tier`: `supportedModes: ['view', 'edit']`, opened at `view` by the `rate-sheet` intent. View renders through shared `ReadBlock` cards and publishes an `EntityActionFooter` (Close · Edit) via `setFooter`; Edit hands the controls to the shared `InlineEditorShell`, which owns Save/Cancel, the dirty-cancel confirm, and saving/error state — the record footer withdraws while editing, so there is one footer and one save at a time. The grid declares the generic `size: 'extra-wide'` key ([Admin Station Drawer](admin-station-drawer.md) owns the width); Package hard-codes no width.

- [rateSheetToolModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/rateSheetToolModel.ts) — pure `PackageManagerReadModel` ⇄ editor-value ⇄ `PackageManagerSavePayload` mapping, preserving each row's stored `item_id`/`source_item_id` and each group's `group_id`. Also the View-mode projections `summariseRateSheet` (counts, pricing/grouping coverage) and `rateSheetRowsInGroup` — presentation only, never a second price or store.
- [useRateSheetTool.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/useRateSheetTool.ts) — the Package-owned read/edit/save controller: reads through `fetchPackageStationManager`, saves through `savePackageStationManager`, addressed by the shared `useHostService` host id.
- [RateSheetTool.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetTool.tsx) — `RateSheetDrawerContent`: the read view (title, source Services, groups, priced rows, counts and coverage) and the edit authoring controls (source-Service picker, groups, priced grid). Calls no endpoint. Connecting a Service persists it, and the backend `commitConfiguration` onboards its inclusions as priced rows on reload. New source rows keep the backend-computed canonical IDs; the tool never mints IDs.

The Tier workspace lower deck reads connected Rate Sheet groups only and routes selection edits to the `tier` drawer; its Settings "Rate Sheets" and "Groups" cards dispatch the `rate-sheet` action intent, which opens the authoring drawer through the Admin drawer host (the intent names its own `drawerTemplateKey`, so no editor renders inline). Tier remains responsible only for selecting a Rate Sheet `item_id` and declaring its quantity; the price authority stays with the Rate Sheet.

## Backend and runtime flow

- [PackageManagerSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageManagerSchema.php) owns manager commits, source reconciliation, read projection, and Rate Sheet projection.
- [PackageStationSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageStationSchema.php) sanitizes Rate Sheet shape and derives Tier pricing/commercial projections.
- [PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php) persists the complete Package Station option.
- [PricingBuilder.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php) consumes active Service and Package pricing for public Cost Builder projection.

Persisted Package source relationships resolve to Rate Sheet rows; Tier selections reference those rows and pricing evaluation derives totals and readiness. Live provenance such as `source_service_id`, titles, and categories remains read-model data and is not copied into selection rows.

## Validation

Run `npm run contract:rate-sheet-tool` (covers the read/save mapping and the View-mode summary/grouping projections), `npx tsx scripts/tier-pricing-parity-contract.ts`, `php tests/tier-pricing-parity.php`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Package Station](package-station.md), [Package Manager](package-manager.md), [Tiers](tiers.md), and [Cost Builder](cost-builder.md).
