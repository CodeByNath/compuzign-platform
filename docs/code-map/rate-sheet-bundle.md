# Rate Sheet Bundle

## Purpose and ownership

A **Bundle** is a Rate Sheet-owned composition space: a named set of complete
Rate Sheet rows, offered upstream as one commercial item at its own price. Not a
second Rate Sheet — it stores no groups and no unit vocabulary, and each of its
rows is a separate record with its own identity, price, and Price Options.

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

Pricing the same supplied content on a sheet row and inside a Bundle produces
**two records with two identities and two prices**.

## Storage

`rate_sheets[].bundles[]` holds `bundle_id`, `cz_platform_id`, `title`, `status`
(the sheet's own `active|archived` vocabulary), `sort_order`, its own
`unit_price`/`per`/`price_options[]`, and `items[]`. A Bundle row carries the
full sheet-row shape — `item_id`, `unit_price`, `per`, `quantity`, `group_id`,
`sort_order`, `price_options[]` — plus its own editable `label`, blank inheriting
the resolved supplied-content label. `per` and `group_id` validate against the
**owning sheet's** vocabulary and groups.

`bundle_id` is minted write-path-only (`commitConfiguration`); `sanitize()` never
mints. Sheets stored before Bundles read back empty. A source priced only inside a
Bundle auto-settles on the same rule sheet rows use.

## Identity

`PlatformIdentifierPolicy` gains the four prefixes above (unambiguous: the suffix
alphabet excludes I/L/O/U and every suffix is exactly five characters).
`PackagePlatformNativeReference::rateSheetBundle*()` supplies the references;
`PackagePlatformIdentifierAdapters` adds the matching scopes to the same
`rateSheetAdapter()` factory, and `PackageRepository`'s
locate/claim/exists/assignment-page carry them.
`PackageStationController::savePackageStationManager` reserves, binds, and
tombstones them in the same old-vs-new diff the sheet's own records use, through
one shared `$resolveIdentity` resolver. No `/admin/...` read route yet, as with
Price Option.

## Authoring

One controller and one save engine, made scope-aware — never a second editor.
- [rateSheetToolModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/rateSheetToolModel.ts)
  — `RateSheetEditorBundle`, Bundle CRUD, and the row transforms (`patchRowIn`,
  `removeRowIn`, `addRowsIn`, price-option `*In`) written once against a row list.
- [useRateSheetTool.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/useRateSheetTool.ts)
  — `selectedBundleKey` plus the `editRows`/`withScopedRows` seam every row
  command routes through, so the same commands address the selected Bundle's
  rows. Selection survives a save by position.
- [RateSheetTool.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetTool.tsx)
  — the `[Rate Sheet][Bundle …]` `ChildChipStrip` with `+ Bundle` on its
  `trailing` seam. No Bin: Rate Sheets have no bin lifecycle.
- [RateSheetBundleWorkspace.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetBundleWorkspace.tsx)
  — the Bundle head, its own price through the shared
  `RateSheetPriceOptionEditor`, and the SAME grid, row lock, and `+ Add Service`
  picker the sheet's own rows use.
- [RateSheetBundleImportPicker.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetBundleImportPicker.tsx)
  — the Bundle engine: browses **Rate Sheets** (not Services), multi-selects rows
  across them, stages name/price/unit/quantity/group locally, names the
  combination, and Publishes through `controller.publishRows` — the one existing
  save. Composing copies; the source sheet is never modified.

## Bundle pricing and consumption

A Bundle's **own commercial price** is independent of what its rows sum to:
Chef's Soup is $75 whether or not carrot + potato + chicken is $90. Same fields
and Price Option shape as any priced row.

Upstream, the Bundle **is** one Rate Sheet row:

```text
Service Inclusion → Rate Sheet → Rate Sheet Row
                              ↘ Bundle combines existing rows
                                → offered back as ONE priced Rate Sheet row
                                → consumed through the same pipeline
```

`consumableRateSheetRows()` is what the sheet offers: its own priced rows plus
one row per active Bundle (`bundleConsumableRow()`) — id
`deriveBundleRowId($bundleId)` in the ordinary `rate_` grammar, the Bundle's price
and Price Options in the ordinary row positions, `includes[]` for presentation
only. `buildReadModel` puts it straight into the sheet's **`items`** — the rows
every consumer already reads — so there is no new field and no consumer changes.
The authoring tool cannot round-trip it: the row carries no `source_item_id`, and
`toEditorRows()` and `sanitizeRateRows()` both already drop a row without one.

Component rows are **ingredients, not separately chargeable rows**: absent from
that offer, so selecting the Bundle charges $75 once and can never also charge its
parts. The sheet's own rows stay individually sellable.

**No consumer learns that Bundles exist.** Tier storage and selection stay
`{ item_id, quantity, price_option_id? }` — no Bundle-shaped storage, addressing,
dedup, or pricing path, and no Tier file changed. A Bundle row resolves through
`projectTierRateSheetWith()` and the one `evaluateTierPricing` engine like any
row; the single difference, `self_priced`, is read inside the Rate Sheet projector
and says only that a combination stands behind itself.

A component row is identified by `deriveBundleRateItemId($bundleId,
$sourceItemId)`, unique within its sheet. A stored row's id is never recomputed;
only a Tool-curated blank one is derived, and a Bundle minted in the same request
has its rows derived on the write path.

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
