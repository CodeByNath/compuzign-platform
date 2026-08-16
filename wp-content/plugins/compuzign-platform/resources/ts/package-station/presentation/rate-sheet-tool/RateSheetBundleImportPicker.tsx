// Rate Sheet tool — the Bundle import engine.
//
// Composing a Bundle means referencing EXISTING Rate Sheet rows — never a raw
// Service inclusion, which (until it is itself priced as a row somewhere) has
// no Rate Sheet row for a Bundle to hold a live reference to. Three columns,
// always simultaneously visible:
//
//   Rate Sheets       every sheet in the collection
//   Rate Sheet Rows   the CLICKED sheet's own priced rows
//   Selected Rows     the accumulated basket, across as many sheets as picked
//
// Clicking a different Rate Sheet replaces column 2 with THAT sheet's rows —
// it never clears column 3, which is what lets one Bundle compose across
// several sheets in one Import.
//
// `bundle === null` means this is the Bundle's own FIRST Import: nothing
// exists yet, so `Import` calls `controller.importBundleContent` with no
// existing Bundle to add onto, and the controller mints the Bundle and its
// row TOGETHER, seeded once from the sum of what was selected. `bundle`
// non-null means a LATER Import on an already-created Bundle, which only
// adds references — the row's price is never re-touched either way.
//
// There is deliberately no staging/pricing table here: what an import
// produces is supplied CONTENT — live references — and the price, unit,
// quantity and group belong to the Bundle's own row, edited in the shared row
// editor. A referenced row's own definition stays exactly where it was
// declared, on the Rate Sheet it came from; composing never touches it.

import { useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import { bundleSourceRowRef, rowDisplayLabel } from '../../surface/rateSheetTool/rateSheetToolModel';
import type { RateSheetEditorBundle } from '../../surface/rateSheetTool/rateSheetToolModel';
import type { RateSheetToolController } from '../../surface/rateSheetTool/useRateSheetTool';
import { formatUnitPrice } from './rateSheetParts';

/** One row picked to add to the Bundle's supplied content. */
interface SelectedEntry {
  ref:               string;
  sourceRateSheetId: string;
  sourceItemId:      string;
  label:             string;
  origin:            string;
  unitPrice:         number;
}

export function RateSheetBundleImportPicker({
  controller, bundle, onDone,
}: {
  controller: RateSheetToolController;
  /** `null` while this is the Bundle's own first Import — nothing exists yet. */
  bundle:     RateSheetEditorBundle | null;
  /** Closes this picker without importing. Omitted while authoring a brand
   *  new Bundle: there is nothing else to show yet, so the only way out is
   *  the drawer's own Cancel. */
  onDone?:    () => void;
}): VNode {
  const [rowQuery, setRowQuery]     = useState('');
  const [selectedSheetKey, setSelectedSheetKey] = useState<string | null>(null);
  const [selected, setSelected]     = useState<SelectedEntry[]>([]);
  const [importing, setImporting]   = useState(false);

  const matchesRow = (label: string) =>
    rowQuery.trim() === '' || label.toLowerCase().includes(rowQuery.trim().toLowerCase());

  // A row this Bundle already references is never offered again — the same
  // one-reference-per-row discipline the sheet's own rows keep for their
  // Manager sources, checked here so the engine never shows a choice Import
  // would silently drop. `bundle === null` (authoring) has nothing yet to
  // exclude beyond this session's own picks.
  const usedRowKeys = useMemo(() => new Set([
    ...(bundle?.suppliedContent.map((reference) => `${reference.sourceRateSheetId} ${reference.sourceItemId}`) ?? []),
    ...selected.map((entry) => entry.ref),
  ]), [bundle, selected]);

  // Composing needs a STABLE reference, so only an already-saved sheet (a
  // real rate_sheet_id) is offered — a not-yet-saved sheet has none yet, and
  // the backend would silently drop a reference naming a blank one.
  const savedSheets = useMemo(
    () => controller.bundleSources.filter((sheet) => sheet.id !== ''),
    [controller.bundleSources],
  );
  const selectedSheet = useMemo(
    () => savedSheets.find((sheet) => sheet.key === selectedSheetKey) ?? null,
    [savedSheets, selectedSheetKey],
  );
  const sheetRows = useMemo(() => {
    if (selectedSheet === null) return [];
    return selectedSheet.rows
      .filter((row) => !usedRowKeys.has(bundleSourceRowRef(selectedSheet.id, row)) && matchesRow(rowDisplayLabel(row)))
      .map((row): SelectedEntry => ({
        ref:               bundleSourceRowRef(selectedSheet.id, row),
        sourceRateSheetId: selectedSheet.id,
        sourceItemId:      row.id,
        label:             rowDisplayLabel(row),
        origin:            selectedSheet.title || 'Untitled Rate Sheet',
        // What the source row is currently worth — read once here only to
        // seed the Bundle's OWN price on its first Import. The source row
        // itself is never touched, and this value is never re-read after
        // this moment.
        unitPrice: row.unitPrice,
      }));
  }, [selectedSheet, usedRowKeys, rowQuery]);

  const chooseEntry = (entry: SelectedEntry) =>
    setSelected((current) => (current.some((chosen) => chosen.ref === entry.ref) ? current : [...current, entry]));

  const dropEntry = (ref: string) =>
    setSelected((current) => current.filter((entry) => entry.ref !== ref));

  const requestClose = () => {
    if (onDone === undefined) return;
    if (selected.length > 0) {
      const noun = selected.length === 1 ? 'entry' : 'entries';
      if (!window.confirm(`Discard ${selected.length} selected ${noun} that ${selected.length === 1 ? "hasn't" : "haven't"} been imported?`)) return;
    }
    onDone();
  };

  const handleImport = async () => {
    setImporting(true);
    const initialUnitPrice = selected.reduce((sum, entry) => sum + entry.unitPrice, 0);
    const references = selected.map((entry) => ({ sourceRateSheetId: entry.sourceRateSheetId, sourceItemId: entry.sourceItemId }));
    const ok = await controller.importBundleContent(references, initialUnitPrice);
    setImporting(false);
    if (ok) { setSelected([]); onDone?.(); }
  };

  const busy = importing || controller.saving;

  return (
    <div class="cz-rate-sheet-tool__import" aria-label="Compose this Bundle from Rate Sheet rows">
      <div class="cz-rate-sheet-tool__import-head">
        <strong>{bundle === null ? 'Add Rate Sheet content to compose this Bundle' : 'Add Rate Sheet content'}</strong>
        {onDone !== undefined && (
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={requestClose}>Close</button>
        )}
      </div>

      <div class="cz-rate-sheet-tool__import-columns">
        <div class="cz-rate-sheet-tool__import-column">
          <p class="cz-rate-sheet-tool__import-column-label">Rate Sheets</p>
          <div class="cz-rate-sheet-tool__import-chip-list">
            {savedSheets.length === 0 ? (
              <p class="cz-rate-sheet-tool__picker-note">No Rate Sheets found.</p>
            ) : savedSheets.map((sheet) => {
              const active = sheet.key === selectedSheetKey;
              return (
                <button type="button" key={sheet.key}
                  class={`cz-rate-sheet-tool__import-chip${active ? ' cz-rate-sheet-tool__import-chip--active' : ''}`}
                  aria-pressed={active}
                  onClick={() => setSelectedSheetKey(sheet.key)}>
                  {sheet.title || 'Untitled Rate Sheet'}{sheet.status === 'archived' ? ' · Disabled' : ''}
                </button>
              );
            })}
          </div>
        </div>

        <div class="cz-rate-sheet-tool__import-column">
          <p class="cz-rate-sheet-tool__import-column-label">Rate Sheet Rows</p>
          <input class="cz-tf-control cz-tf-input" type="search" placeholder="Search rows" value={rowQuery}
            aria-label="Search rows" onInput={(event) => setRowQuery((event.currentTarget as HTMLInputElement).value)} />
          <div class="cz-rate-sheet-tool__import-chip-list">
            {selectedSheet === null ? (
              <p class="cz-rate-sheet-tool__picker-note">Select a Rate Sheet to see its rows.</p>
            ) : sheetRows.length === 0 ? (
              <p class="cz-rate-sheet-tool__picker-note">Every row here is already selected.</p>
            ) : sheetRows.map((entry) => (
              <button type="button" key={entry.ref}
                class="cz-rate-sheet-tool__import-chip"
                onClick={() => chooseEntry(entry)}>
                {entry.label}
                <span class="cz-rate-sheet-tool__import-chip-note"> · {formatUnitPrice(entry.unitPrice)}</span>
              </button>
            ))}
          </div>
        </div>

        <div class="cz-rate-sheet-tool__import-column">
          <p class="cz-rate-sheet-tool__import-column-label">Selected Rows ({selected.length})</p>
          <div class="cz-rate-sheet-tool__import-chip-list">
            {selected.length === 0 ? (
              <p class="cz-rate-sheet-tool__picker-note">
                Nothing selected yet. Pick Rate Sheet rows on the left.
              </p>
            ) : selected.map((entry) => (
              <button type="button" key={entry.ref}
                class="cz-rate-sheet-tool__import-chip cz-rate-sheet-tool__import-chip--active"
                aria-label={`Remove ${entry.label} from the selection`}
                title={`From ${entry.origin}`}
                onClick={() => dropEntry(entry.ref)}>
                {entry.label}
                <span aria-hidden="true"> ×</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {controller.saveError && <p class="cz-admin-error-msg" role="alert">{controller.saveError}</p>}
      <div class="cz-rate-sheet-tool__import-actions">
        <button type="button" class="cz-admin-btn cz-admin-btn--primary"
          disabled={selected.length === 0 || busy}
          onClick={() => { void handleImport(); }}>
          {busy ? 'Importing…' : `Import${selected.length > 0 ? ` (${selected.length})` : ''}`}
        </button>
      </div>
    </div>
  );
}
