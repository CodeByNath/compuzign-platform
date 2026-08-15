# Rate Sheet Bundle

## Purpose and ownership

A **Bundle** is a Rate Sheet-owned composition space: named supplied content
compiled from Services and other Rate Sheets, offered upstream as one commercial
item at its own price. Not a second Rate Sheet — it stores no groups and no unit
vocabulary, and each component is its own record, so the same supplied content
priced on a sheet row and inside a Bundle is **two records, two identities**.

```text
Rate Sheet            CZPRC     rate_sheet_id
 ├─ Group             CZPRCG    (rate_sheet_id, group_id)
 ├─ Item              CZPRCI    (rate_sheet_id, item_id)
 │   └─ Price Option  CZPRCIO   (rate_sheet_id, item_id, option_id)
 └─ Bundle            CZPRCB    (rate_sheet_id, bundle_id)
     ├─ Price Option  CZPRCBO   (rate_sheet_id, bundle_id, option_id)
     └─ Bundle Item   CZPRCBI   (rate_sheet_id, bundle_id, item_id)
         └─ Option    CZPRCBIO  (rate_sheet_id, bundle_id, item_id, option_id)
```

## Storage

`rate_sheets[].bundles[]` holds `bundle_id`, `cz_platform_id`, `title`, `status`
(`active|archived`), `sort_order`, `items[]`, and its own complete Rate Sheet
row field set —
`unit_price`/`per`/`quantity`/`group_id`/`price_options[]`/`default_price_label`.
A component carries that same shape plus its own `label` (blank inherits the
resolved supplied-content label). Everywhere `per`/`group_id` validate and
`quantity` clamps against the **owning sheet's** vocabulary and groups, by
`sanitizeRateRows`' rules; a Bundle stored before it carried `quantity`/
`group_id` reads back on `1`/`null`, the defaults `bundleConsumableRow()` used
to hardcode. `bundle_id` is minted write-path-only (`commitConfiguration`);
`sanitize()` never mints. Sheets stored before Bundles read back empty.

## Identity

`PlatformIdentifierPolicy` carries the four prefixes above
([Platform Identifier Station](platform-identifier-station.md)).
`PackagePlatformNativeReference::rateSheetBundle*()` supplies the references;
`PackagePlatformIdentifierAdapters` adds the scopes to the same
`rateSheetAdapter()` factory, and `PackageRepository`'s
locate/claim/exists/assignment-page carry them.
`PackageStationController::savePackageStationManager` reserves, binds, and
tombstones them in the sheet's own old-vs-new diff. No `/admin/...` read route
yet, as with Price Option.

## Authoring

One scope-aware controller and save engine — never a second editor — over a
**drawer group screen**: `Details` (the sheet), `Options` (its Bundles), no Bin.

- [rateSheetToolModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/rateSheetToolModel.ts)
  — `RateSheetEditorBundle`, Bundle CRUD, `bundleSuppliedContent()`, and the row
  transforms written once against a row list.
- [useRateSheetTool.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/useRateSheetTool.ts)
  — owns `groupTab`, `groupView`, `selectedBundleKey`; no refetch resets them.
  The active group decides row scope (`scopedBundleKey`), so the one
  `editRows`/`withScopedRows` seam reaches a Bundle only under `Options`.
- [RateSheetTool.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetTool.tsx)
  — `FocusedRateSheetGroups` over `DrawerGroupTabs`/`DrawerGroupAccordion`; the
  view toggle and `+ Bundle` (`Options` only) ride the nav's `trailing` slot.
  `RateSheetBundleSwitcher` is `Options`' content: `ChildChipStrip`, empty
  state, the selected Bundle's readable card (`RateSheetBundleRead`, the same
  field set the editor edits), whose Edit alone opens `InlineEditorShell`.
- [RateSheetBundleWorkspace.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetBundleWorkspace.tsx)
  — the Bundle inline editor: **ONE Rate Sheet row**, same grid shell as the
  sheet's own — `| Product Bundle | Supplied content | Unit Price | Per | Qty |
  Group |`. `Product Bundle` (the name) is the one cell an ordinary row lacks.
  `Supplied content` is READ-ONLY: each component was declared on the Rate Sheet
  it came from, so it is listed, never re-declared — removal stays available,
  read-only being about a component's DEFINITION. The rest is the ordinary row
  system. No per-component grid, no row lock; the editor's Save is the one
  persistence path.
- [RateSheetBundleImportPicker.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetBundleImportPicker.tsx)
  — the ONE import engine, 3 columns: **Source** (`Services` | `Rate Sheets`
  toggle plus that source's browse tree — Category → Service, or the sheet
  list), **Available rows** (grouped by origin), **Selected rows** (the basket
  across BOTH sources). `Import` adds through `controller.publishRows`, the one
  existing save. It replaced the Bundle's separate `+ Add Service` /
  `Import from Rate Sheets` buttons and their staging table: an import produces
  supplied CONTENT; the terms are the Bundle row's own. Composing copies.

## Bundle pricing and consumption

A Bundle's **own commercial price** is independent of what its components sum
to: Chef's Soup is $75 even if carrot + potato + chicken is $90. Upstream, the
Bundle **is** one row:

```text
Service Inclusion → Rate Sheet → Rate Sheet Row
                              ↘ Bundle compiles existing content
                                → offered back as ONE priced Rate Sheet row
                                → consumed through the same pipeline
```

`consumableRateSheetRows()` is what the sheet offers: its own priced rows plus
one row per active Bundle (`bundleConsumableRow()`) — id
`deriveBundleRowId($bundleId)` in the ordinary `rate_` grammar, the Bundle's
price, Price Options, quantity and group in the ordinary positions,
`includes[]` for presentation only. `buildReadModel` puts it straight into the
sheet's own **`items`**, so no consumer changes. The Tool cannot round-trip it:
it carries no `source_item_id`, which `toEditorRows()`/`sanitizeRateRows()`
already drop a row for.

Components are **ingredients, not separately chargeable rows**: absent from that
offer, so selecting the Bundle charges $75 once, never its parts too.

**No consumer learns that Bundles exist.** Tier storage and selection stay
`{ item_id, quantity, price_option_id? }` — no Bundle-shaped storage, addressing,
dedup, or pricing path. A Bundle row resolves through
`projectTierRateSheetWith()` and the one `evaluateTierPricing` engine like any
row; its one difference, `self_priced`, is read inside the Rate Sheet projector
and means only that a combination stands behind it.

A component's id is `deriveBundleRateItemId($bundleId, $sourceItemId)`, unique
within its sheet. A stored id is never recomputed — only a Tool-curated blank
one.

## Validation

`php tests/rate-sheet-bundle.php`, `npm run regression:rate-sheet-bundle`,
`php tests/package-manager-schema.php`,
`php tests/rate-sheet-platform-identity-reconciliation.php`,
`php tests/platform-identifier-station.php`,
`npm run contract:platform-identity-schema`.

## Related Code Maps

[Rate Sheet](rate-sheet.md), [Package Manager](package-manager.md),
[Platform Identifier Station](platform-identifier-station.md), and
[Tiers](tiers.md).
