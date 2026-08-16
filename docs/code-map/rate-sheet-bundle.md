# Rate Sheet Bundle

## Purpose and ownership

A **Bundle** is a Rate Sheet-owned authoring record. Commercially it **IS** a
real Rate Sheet row: every Bundle owns exactly one member of the owning
sheet's own `items[]`, linked by `item_id`, carrying that row's own `CZPRCI`
and, on its Price Options, `CZPRCIO` — the identical identity an ordinary
Manager-sourced row gets, through the identical reservation loop, no
special-casing. `CZPRCB` never replaces `CZPRCI`; the two are separate,
coexisting identities linked by `item_id`. Not a second Rate Sheet — a Bundle
stores no groups, no unit vocabulary, and none of
`unit_price`/`per`/`quantity`/`group_id`/`price_options[]`/name; all live on
the linked row.

```text
Rate Sheet            CZPRC     rate_sheet_id
 ├─ Item               CZPRCI    (rate_sheet_id, item_id)
 │   └─ Price Option   CZPRCIO   (rate_sheet_id, item_id, option_id)
 ├─ Item (Bundle-backed, same shape, carries bundle_id)
 │   └─ Price Option   CZPRCIO
 └─ Bundle             CZPRCB    (rate_sheet_id, bundle_id)
     ↕ item_id                   links to its own row above
     └─ Supplied-content reference
                        CZPRCBI  (rate_sheet_id, bundle_id, source_rate_sheet_id, source_item_id)
```

Supplied content is the Bundle's **live references** to the Rate Sheet rows
it compiles — never copies. Each reference names
`(source_rate_sheet_id, source_item_id)` and carries its own identity, the
"Bundle-inclusion Platform ID" (`CZPRCBI`, a child of the Bundle). The
referenced row keeps its own `CZPRCI` completely untouched. A Bundle may
reference rows on sheets **other than its own** — composing across sheets is
the point.

## Storage

`rate_sheets[].items[]` holds every row, ordinary and Bundle-backed alike, in
ONE flat list: a Bundle-backed row carries `bundle_id` (its Bundle's native
id) instead of a Manager `source_item_id`, plus an optional own `label` (the
Bundle Name; blank inherits nothing). Every other field is the row's own
complete, ordinary field set.

`rate_sheets[].bundles[]` holds `bundle_id`, `cz_platform_id` (CZPRCB),
`status`, `sort_order`, `item_id` (reconciled from whichever row carries a
matching `bundle_id` — `linkBundleRows()`, never trusted from input), and
`supplied_content[]` (`{source_rate_sheet_id, source_item_id,
cz_platform_id}`). `bundle_id` mints write-path-only; `sanitize()` never
mints. A stored Bundle from the retired copy-based shape (no `item_id`/
`supplied_content` — see History) reads back a blank `item_id`, and is
dropped on the next save touching its sheet.

## Identity

`PlatformIdentifierPolicy` carries `PACKAGE_RATE_CARD_BUNDLE` (`CZPRCB`) and
reuses `PACKAGE_RATE_CARD_BUNDLE_ITEM` (`CZPRCBI`) for the supplied-content
reference — the entity type Bundle rows always used, now addressing a
reference instead of a copied row.
`PackagePlatformNativeReference::rateSheetBundle()`/`rateSheetBundleInclusion()`
supply the references through the same `rateSheetAdapter()` factory
(`PackagePlatformIdentifierAdapters`) and `PackageRepository`
locate/claim/assignment-page scopes (`'bundle'`/`'bundle-inclusion'`).
`PackageStationController::savePackageStationManager` reserves/binds/
tombstones them in the sheet's own old-vs-new diff — the Bundle's own row
needs **no separate reservation**, already covered by the ordinary per-item
loop as just another item.

## Write path

A Bundle the Tool just created arrives with a blank `bundle_id`; its ONE row
carries the reserved sentinel `bundle_id: 'new'` instead (no id was derivable
at sanitize time). `commitConfiguration` mints every blank-id Bundle, then
resolves each `'new'`-sentinel row by **encounter order** against the
newly-minted Bundles (Kth Bundle ↔ Kth sentinel row) — positional, so
duplicating a sheet with several Bundles still resolves correctly. The row's
`item_id`, once resolved, derives from `deriveBundleRowId($bundleId)`;
`linkBundleRows()` then reconciles every Bundle's `item_id` from its row's
`bundle_id`, on both read and write paths.

## Bundle pricing and consumption

A Bundle's **own commercial price** is independent of what its supplied
content sums to: Chef's Soup is $75 even if carrot + potato + chicken is $90.
Because the Bundle's row is REAL and physically persisted, there is **nothing
left to synthesize** — `consumableRateSheetRows()` is a pass-through of the
sheet's `items[]`, filtering out only a row backed by an **archived** Bundle
(mirroring an archived sheet, the one capability preserved from the retired
projection). `self_priced`/`includes[]` are projected onto a Bundle-backed row
at `buildReadModel()` time only, `includes[]` resolved **live** per read
against a cross-sheet row index. A dangling reference (its source row gone) is
silently absent from `includes[]`, never a placeholder — the Bundle SURVIVES
with `item_id`/`CZPRCI`/`CZPRCB` unchanged and nothing else deleted. The
dependency is one-way: a Bundle depends on the rows it references, never the
reverse, and editing or removing a Bundle never mutates a referenced row.

**No consumer learns that Bundles exist.** Tier storage/selection stay
`{ item_id, quantity, price_option_id? }`. A Bundle-backed row resolves
through `projectTierRateSheetWith()` and the one `evaluateTierPricing` engine
like any row; `self_priced` is read only inside the Rate Sheet projector.

## History

Before this correction a Bundle stored no `item_id`/`supplied_content`: its
commercial fields lived on the Bundle record, its "rows" were independent
copies ("two records, two identities" for the same content), and its upstream
row was synthesized at every read rather than persisted.

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
