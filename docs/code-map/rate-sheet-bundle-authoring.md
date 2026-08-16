# Rate Sheet Bundle Authoring

The admin surface for a Bundle. Storage, identity, pricing and consumption are
[Rate Sheet Bundle](rate-sheet-bundle.md); the row system it reuses is
[Rate Sheet](rate-sheet.md).

One scope-aware controller and save engine — never a second editor — over a
**drawer group screen**: `Details` (the sheet), `Options` (its Bundles), no Bin.

- [rateSheetToolModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/rateSheetToolModel.ts)
  — `RateSheetEditorBundle`, Bundle CRUD, `bundleSuppliedContent()`, and
  `bundleAsEditorRow()` — the Bundle projected as the ONE `RateSheetEditorRow`
  it is, keyed exactly as `bundleKey()`, which is what lets the shared grid and
  the shared lock render it with no second editor.
- [useRateSheetTool.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/useRateSheetTool.ts)
  — owns `groupTab`, `groupView`, `selectedBundleKey`, `creatingBundle`; no
  refetch resets them. The active group decides row scope (`scopedBundleKey`),
  so the one `editRows`/`withScopedRows` seam reaches a Bundle only under
  `Options`. `selectedBundleRow` is that projection, and the ONE existing row
  lock covers an EXISTING Bundle's own edits: `beginRowEdit` resolves it
  first, `cancelRowEdit` reverts it through `patchEditorBundle`, `saveActiveRow`
  persists it through the same full-manager save, and `removeRowImmediately`
  removes the Bundle — a Bundle IS that row. A not-yet-existing Bundle never
  reaches this lock at all: `beginCreateBundle` only flips `creatingBundle`,
  minting nothing, and `commitNewBundle` is the one place a Bundle is actually
  created — it mints the Bundle AND lands its first supplied content in the
  SAME local update (`createEditorBundle` + `mapEditorBundleRows`/`addRowsIn`),
  then persists through the identical `persist()` full-manager save every other
  mutation here uses. One lock, one save either way; a Bundle row and a sheet
  row can never be open together.
- [RateSheetTool.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetTool.tsx)
  — `FocusedRateSheetGroups` over `DrawerGroupTabs`/`DrawerGroupAccordion`; the
  view toggle and `+ Bundle` (`Options` only) ride the nav's `trailing` slot.
  `+ Bundle` calls `beginCreateBundle()` and enters the sheet's own edit mode —
  it creates no record and no row, only the authoring state; the Bundle itself
  is minted later, by its own first Import. `RateSheetBundleSwitcher` is
  `Options`' content: `ChildChipStrip`, empty state, and the selected Bundle's
  readable card (`RateSheetBundleRead`), whose Edit alone opens
  `InlineEditorShell`; while `creatingBundle` is true it instead opens straight
  into `RateSheetBundleWorkspace` with `bundle={null}`. That card is LEAN —
  name, `CZPRCB`, and what it compiles. A Bundle is a composition, not a single
  declaration, so its price/per/qty/group are not restated there; they live in
  the row. `Remove` rides the card's own `ReadBlock` action footer — the
  existing drawer-module action system, never a button inside the editor.
- [RateSheetBundleWorkspace.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetBundleWorkspace.tsx)
  — the Bundle inline editor IS the Rate Sheet row editor: the SAME
  `RateSheetGridEditor` over `[selectedBundleRow]` with `lockCommands={controller}`,
  so it opens LOCKED and unlocks through the SAME Edit/Save/Cancel/Remove
  (Delete once saved) lock, with the same Price Options tab strip, Per/Group
  dropdowns and quantity input. `bundle`/`bundleKey` are nullable: while
  authoring a brand-new Bundle (`bundle === null`) the grid row, the row
  commands and the status dropdown are all withheld — the import triggers are
  the only content, and their picker's `onImport` routes to
  `controller.commitNewBundle` instead of `controller.publishRows`, so the
  engine's own first Import is what creates the row this component then
  renders. `commands` is a thin adapter routing each row command to the
  Bundle's own setter; `nameLabel="Product Bundle"` (additive, defaulted)
  names the first column, since for this row that cell is the combination's
  name. Structure mirrors `RateSheetSheetEditor` — head, toolbar, picker, grid
  — plus the read-only Supplied content block beneath, whose only control is
  per-entry removal.
- [RateSheetBundleImportPicker.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/RateSheetBundleImportPicker.tsx)
  — the import engine, opened by the caller's own trigger and showing THAT
  source only: `+ Add Service` browses Category → Service → Inclusions (3
  columns, the sheet's own browse), `+ Add Rate Sheet` browses Rate Sheet → its
  rows (2 columns). The basket is a full-width strip beneath, not a third
  column. `Import` adds through the caller-supplied `onImport` — `publishRows`
  for an existing Bundle, `commitNewBundle` for one still being authored —
  either way exactly one save. An import produces supplied CONTENT; the terms
  are the Bundle row's own. Composing copies.


## Validation

`npm run regression:rate-sheet-bundle`, `npm run regression:rate-sheet-row-lock`,
`npm run contract:rate-sheet-tool`, `npm run contract:drawer-module-entry`.

## Related Code Maps

[Rate Sheet Bundle](rate-sheet-bundle.md), [Rate Sheet](rate-sheet.md), and
[Package Manager](package-manager.md).
