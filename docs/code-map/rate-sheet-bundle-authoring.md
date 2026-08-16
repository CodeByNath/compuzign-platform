# Rate Sheet Bundle Authoring

The admin surface for a Bundle. Storage, identity, pricing and consumption are
[Rate Sheet Bundle](rate-sheet-bundle.md); the row system it reuses is
[Rate Sheet](rate-sheet.md).

One scope-aware controller and save engine — never a second editor — over a
**drawer group screen**: `Details` (the sheet), `Options` (its Bundles), no Bin.

- [rateSheetToolModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/rateSheetToolModel.ts)
  — `RateSheetEditorBundle` (`id`/`localKey`/`platformId`/`status`/`itemId`/
  `suppliedContent[]` — no commercial fields), `RateSheetEditorRow`'s additive
  `bundleId`, Bundle CRUD, `findBundleRow()` (looks up a Bundle's row by
  `itemId` in the sheet's own flat `items[]` — never synthesizes one),
  `ordinaryRows()` (the Details grid's view: every row with no `bundleId`),
  and `bundleSuppliedContent()` (resolves each live reference to its current
  label, silently omitting one that no longer resolves). A Bundle-backed row
  lives in the SAME `items[]` list as every ordinary row — no second,
  Bundle-scoped list to keep in sync, which lets the shared grid and lock
  render it with no second editor.
- [useRateSheetTool.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/useRateSheetTool.ts)
  — owns `groupTab`, `groupView`, `selectedBundleKey`; no refetch resets them.
  `activeRows` is the active GROUP's own view (Details: `ordinaryRows`;
  Options: the selected Bundle's one row), but every row COMMAND addresses the
  sheet's ONE flat `items[]` directly, unconditionally — a row's own key
  already says which one, so no scope-routed dual list remains. `createBundle`
  begins authoring with **no row and no chargeable identity yet** — never a
  precreated placeholder row; `importBundleContent` is the Bundle's own first
  Import, minting the Bundle and its row TOGETHER (the row seeded once from
  the summed price of what was selected) through the same full-manager save; a
  LATER Import only adds references, never re-touching the row's price.
  `beginRowEdit`/`cancelRowEdit`/`saveActiveRow`/`removeRowImmediately` need
  one Bundle-specific branch: removing a Bundle-backed row removes its owning
  Bundle too (a Bundle IS that row) — otherwise identical to an ordinary row's
  lock.
- [RateSheetTool.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetTool.tsx)
  — `FocusedRateSheetGroups` over `DrawerGroupTabs`/`DrawerGroupAccordion`; the
  view toggle and `+ Bundle` (`Options` only) ride the nav's `trailing` slot.
  `RateSheetBundleSwitcher` is `Options`' content: `ChildChipStrip` (each
  chip's label is its Bundle's linked row's `label`, or "Untitled Bundle" for
  one still mid-authoring), empty state, and the selected Bundle's readable
  card (`RateSheetBundleRead`), whose Edit opens `InlineEditorShell`. That
  card is LEAN — the linked row's name, `CZPRCB`, and what it compiles;
  price/per/qty/group live in the row. `Remove` rides the card's own
  `ReadBlock` action footer.
- [RateSheetBundleWorkspace.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetBundleWorkspace.tsx)
  — the Bundle inline editor IS the Rate Sheet row editor: the SAME
  `RateSheetGridEditor` over `[controller.selectedBundleRow]` (via
  `findBundleRow`, `null` for a Bundle still mid-authoring) with
  `lockCommands={controller}`, opening LOCKED and unlocking through the SAME
  Edit/Save/Cancel/Remove (Delete once saved) lock, Price Options tab strip,
  Per/Group dropdowns and quantity input. `commands` is the controller's own
  generic row commands, with one override (`removeRow` → `deleteBundle`, in
  practice unreachable since the grid is always locked and Remove goes through
  `lockCommands` instead); `nameLabel="Product Bundle"` names the first
  column. Structure mirrors `RateSheetSheetEditor`, plus a read-only Supplied
  content column whose only control is per-reference removal
  (`removeBundleSuppliedContentRef` — drops only this Bundle's own membership,
  never the referenced row).
- [RateSheetBundleImportPicker.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetBundleImportPicker.tsx)
  — the import engine. Composing needs a LIVE REFERENCE to an existing row, so
  this browses Rate Sheets → their own priced rows only, two columns (a
  not-yet-saved sheet is excluded — no stable id yet to reference), with the
  accumulating basket a full-width strip beneath. No raw-Service-inclusion
  browse here any longer: an inclusion never priced as a row has none to
  reference (the sheet's own top-level "+ Add Service" for ordinary rows is
  unrelated). `Import` calls `importBundleContent`; a source row already
  referenced is never offered twice; moving sheets does not clear the basket,
  so one Bundle composes across several.

**Pending further revision.** The picker above is Phase 2/3's interim shape —
a toggled single-source panel inside an already-open Bundle workspace. The
target is three simultaneous columns (`Rate Sheets | Rate Sheet Rows |
Selected Rows`); this map updates again once that lands.

## Validation

`npm run regression:rate-sheet-bundle`, `npm run regression:rate-sheet-row-lock`,
`npm run contract:rate-sheet-tool`, `npm run contract:drawer-module-entry`.

## Related Code Maps

[Rate Sheet Bundle](rate-sheet-bundle.md), [Rate Sheet](rate-sheet.md), and
[Package Manager](package-manager.md).
