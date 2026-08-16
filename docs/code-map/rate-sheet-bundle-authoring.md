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
  `itemId` — never synthesizes one), `ordinaryRows()` (the Details grid's own
  view: every row with no `bundleId`), and `bundleSuppliedContent()` (resolves
  each live reference to its current label, silently omitting one that no
  longer resolves). A Bundle-backed row lives in the SAME `items[]` list as
  every ordinary row — one list, one editor.
- [useRateSheetTool.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/useRateSheetTool.ts)
  — owns `groupTab`, `groupView`, `selectedBundleKey`, and `authoringBundle`;
  no refetch resets them. `activeRows` is the active GROUP's own view
  (Details: `ordinaryRows`; Options: the selected Bundle's one row), but every
  row COMMAND addresses the sheet's ONE flat `items[]` directly.
  `beginBundleAuthoring` sets `authoringBundle` true: local state only, mints
  nothing — never a precreated placeholder row. `importBundleContent` branches
  on it: while authoring, it is the Bundle's own first Import, minting the
  Bundle and its row together (seeded once from the summed price of what was
  selected) through the same full-manager save, clearing `authoringBundle`
  only on success — a failed attempt touches no local state, so a retry mints
  exactly once (`recoverBundleKey` recovers the saved Bundle by position past
  `persist()`'s own stale closure), then opens its freshly minted row for
  editing immediately against the fresh post-save sheets — the workspace
  stays open, never locked. A LATER Import only adds references, never
  re-touching the row's price. `beginRowEdit`/`cancelRowEdit`/`saveActiveRow`
  carry no Bundle-specific code. `removeRowImmediately`, given a real row id,
  still removes a Bundle-backed row's owning Bundle too (a Bundle IS that
  row); `removeBundleImmediately(key)`, addressed by the Bundle's own key
  instead, deletes one whose row can't be resolved.
- [RateSheetTool.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetTool.tsx)
  — `FocusedRateSheetGroups` over `DrawerGroupTabs`/`DrawerGroupAccordion`; the
  view toggle and `+ Bundle` (`Options` only) ride the nav's `trailing` slot.
  `+ Bundle` calls `beginBundleAuthoring()` AND `onEdit()` together, opening
  the inline editor DIRECTLY — no intermediate chip, no card.
  `RateSheetBundleSwitcher` is `Options`' content: while editing, it checks
  `authoringBundle` FIRST and renders `RateSheetBundleImportPicker` alone
  (`bundle={null}`) when true, otherwise the selected Bundle's own workspace or
  an empty message. Read mode: `ChildChipStrip` (every chip already names a
  fully-saved Bundle's linked row — no mid-authoring case to render), empty
  state, and the selected Bundle's LEAN readable card (`RateSheetBundleRead`)
  — the linked row's name (`Untitled Bundle` once real, never the
  authoring-only `New Bundle`), `CZPRCB`, and what it compiles; price/per/
  qty/group live in the row — Edit opens `InlineEditorShell`, Remove calls
  `removeBundleImmediately` by the Bundle's own key.
- [RateSheetBundleWorkspace.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetBundleWorkspace.tsx)
  — the ALREADY-CREATED Bundle's own inline editor, never rendered while
  authoring. It IS the Rate Sheet row editor: the SAME `RateSheetGridEditor`
  over `[controller.selectedBundleRow]` with `lockCommands={controller}`,
  the SAME Edit/Save/Cancel/Remove (Delete once saved) lock, Price Options
  tab strip, Per/Group dropdowns and quantity input. `commands` overrides only
  `removeRow` → `deleteBundle` (unreachable in practice — Remove always goes
  through `lockCommands`); `nameLabel="Product Bundle"` names the first
  column. When `selectedBundleRow` is null (a stale link, or a Bundle never
  linked at all), the grid is replaced by an explanation and its own
  `Remove Bundle` button, also calling `removeBundleImmediately` — never a
  dead end. A local toggle opens `RateSheetBundleImportPicker` (`bundle={bundle}`,
  rendering its own Close) for a LATER Import, plus a read-only Supplied
  content column whose only control is per-reference removal
  (`removeBundleSuppliedContentRef` — drops only this Bundle's own membership,
  never the referenced row).
- [RateSheetBundleImportPicker.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetBundleImportPicker.tsx)
  — the import engine, THREE SIMULTANEOUS columns: Rate Sheets (every saved
  sheet) | Rate Sheet Rows (the CLICKED sheet's own priced rows) | Selected
  Rows (an accumulating basket across sheet clicks, letting one Bundle
  compose across several). No raw-Service-inclusion browse. `bundle: null`
  addresses the Bundle's own
  first Import — nothing exists yet, so `onDone` is omitted (Cancel is the
  only way out) and `Import` mints the Bundle and its row together on success.
  `bundle` non-null is a LATER Import, rendering its own Close and only adding
  references. Either way a source row already referenced is never offered
  twice.

## Validation

`npm run regression:rate-sheet-bundle`, `npm run regression:rate-sheet-row-lock`,
`npm run contract:rate-sheet-tool`, `npm run contract:drawer-module-entry`.

## Related Code Maps

[Rate Sheet Bundle](rate-sheet-bundle.md), [Rate Sheet](rate-sheet.md), and
[Package Manager](package-manager.md).
