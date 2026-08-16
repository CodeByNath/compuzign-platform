// Rate Sheet tool — the Bundle import engine.
//
// Composing a Bundle means referencing EXISTING Rate Sheet rows — never a raw
// Service inclusion, which (until it is itself priced as a row somewhere) has
// no Rate Sheet row for a Bundle to hold a live reference to. So this engine
// browses Rate Sheets → their own priced rows only, two columns:
//
//   Browse by Rate Sheet   every sheet in the collection
//   Browse by row          the picked sheet's own priced rows
//
// The running basket is a full-width strip BELOW those columns, so it has room
// to read and the browse keeps its own. Moving to another Rate Sheet does not
// clear the basket — it accumulates across sheets, which is what lets one
// Bundle compose from several.
//
// `Import` calls `controller.importBundleContent`: the Bundle's OWN first
// Import mints its row together with the Bundle itself, seeded once from the
// sum of what was selected; a LATER Import on an already-created Bundle only
// adds references, never re-touching the row's price. One local update, one
// full-manager save either way — no second endpoint, no second save path.
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

/** Reserved for a future additional source. Only Rate Sheets today — see the
 *  file header for why a raw Service inclusion cannot be composed directly. */
export type BundleImportSource = 'rate-sheets';

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
  controller, bundle, bundleKey, onDone,
}: {
  controller: RateSheetToolController;
  bundle:     RateSheetEditorBundle;
  bundleKey:  string;
  onDone:     () => void;
}): VNode {
  const [sheetQuery, setSheetQuery]         = useState('');
  const [rowQuery, setRowQuery]             = useState('');
  const [selectedSheetKeys, setSelectedSheetKeys] = useState<Set<string>>(new Set());
  const [selected, setSelected]             = useState<SelectedEntry[]>([]);
  const [importing, setImporting]           = useState(false);

  const toggleIn = <T,>(current: Set<T>, value: T): Set<T> => {
    const next = new Set(current);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  };

  const matchesRow = (label: string) =>
    rowQuery.trim() === '' || label.toLowerCase().includes(rowQuery.trim().toLowerCase());

  // A row this Bundle already references is never offered again — the same
  // one-reference-per-row discipline the sheet's own rows keep for their
  // Manager sources, checked here so the engine never shows a choice Import
  // would silently drop.
  const usedRowKeys = useMemo(() => new Set([
    ...bundle.suppliedContent.map((reference) => `${reference.sourceRateSheetId} ${reference.sourceItemId}`),
    ...selected.map((entry) => entry.ref),
  ]), [bundle.suppliedContent, selected]);

  // Composing needs a STABLE reference, so only an already-saved sheet (a real
  // rate_sheet_id) is offered — a not-yet-saved sheet has none yet, and the
  // backend would silently drop a reference naming a blank one.
  const filteredSheets = useMemo(() => {
    const query = sheetQuery.trim().toLowerCase();
    return controller.bundleSources.filter((sheet) =>
      sheet.id !== '' && (query === '' || (sheet.title || 'Untitled Rate Sheet').toLowerCase().includes(query)));
  }, [controller.bundleSources, sheetQuery]);

  /** The picked sheets' rows, grouped by the sheet they belong to. */
  const availableSheetRows = useMemo(() => controller.bundleSources
    .filter((sheet) => selectedSheetKeys.has(sheet.key))
    .map((sheet) => ({
      key:   sheet.key,
      title: sheet.title || 'Untitled Rate Sheet',
      entries: sheet.rows
        .filter((row) => !usedRowKeys.has(bundleSourceRowRef(sheet.id, row)) && matchesRow(rowDisplayLabel(row)))
        .map((row): SelectedEntry => ({
          ref:               bundleSourceRowRef(sheet.id, row),
          sourceRateSheetId: sheet.id,
          sourceItemId:      row.id,
          label:             rowDisplayLabel(row),
          origin:            sheet.title || 'Untitled Rate Sheet',
          // What the source row is currently worth — read once here only to
          // seed the Bundle's OWN price on its first Import (see
          // `handleImport`). The source row itself is never touched, and this
          // value is never written back to it or re-read after this moment.
          unitPrice: row.unitPrice,
        })),
    })),
  [controller.bundleSources, selectedSheetKeys, usedRowKeys, rowQuery]);

  // ── Basket ────────────────────────────────────────────────────────────────

  const chooseEntry = (entry: SelectedEntry) =>
    setSelected((current) => (current.some((chosen) => chosen.ref === entry.ref) ? current : [...current, entry]));

  const dropEntry = (ref: string) =>
    setSelected((current) => current.filter((entry) => entry.ref !== ref));

  const requestClose = () => {
    if (selected.length > 0) {
      const noun = selected.length === 1 ? 'entry' : 'entries';
      if (!window.confirm(`Discard ${selected.length} selected ${noun} that ${selected.length === 1 ? "hasn't" : "haven't"} been imported?`)) return;
    }
    onDone();
  };

  const handleImport = async () => {
    setImporting(true);
    const initialUnitPrice = selected.reduce((sum, entry) => sum + entry.unitPrice, 0);
    const ok = await controller.importBundleContent(
      bundleKey,
      selected.map((entry) => ({ sourceRateSheetId: entry.sourceRateSheetId, sourceItemId: entry.sourceItemId })),
      initialUnitPrice,
    );
    setImporting(false);
    if (ok) { setSelected([]); onDone(); }
  };

  const busy = importing || controller.saving;

  return (
    <div class="cz-rate-sheet-tool__import" aria-label="Add Rate Sheet content to this Bundle">
      <div class="cz-rate-sheet-tool__import-head">
        <strong>Add Rate Sheet content</strong>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={requestClose}>Close</button>
      </div>

      <div class="cz-rate-sheet-tool__import-columns cz-rate-sheet-tool__import-columns--pair">
        <div class="cz-rate-sheet-tool__import-column">
          <input class="cz-tf-control cz-tf-input" type="search" placeholder="Search Rate Sheets" value={sheetQuery}
            aria-label="Search Rate Sheets" onInput={(event) => setSheetQuery((event.currentTarget as HTMLInputElement).value)} />
          <p class="cz-rate-sheet-tool__import-column-label">Browse by Rate Sheet</p>
          <div class="cz-rate-sheet-tool__import-chip-list">
            {filteredSheets.length === 0 ? (
              <p class="cz-rate-sheet-tool__picker-note">No Rate Sheets found.</p>
            ) : filteredSheets.map((sheet) => {
              const active = selectedSheetKeys.has(sheet.key);
              return (
                <button type="button" key={sheet.key}
                  class={`cz-rate-sheet-tool__import-chip${active ? ' cz-rate-sheet-tool__import-chip--active' : ''}`}
                  aria-pressed={active}
                  onClick={() => setSelectedSheetKeys((current) => toggleIn(current, sheet.key))}>
                  {sheet.title || 'Untitled Rate Sheet'}{sheet.status === 'archived' ? ' · Disabled' : ''}
                  {active && <span aria-hidden="true"> ×</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div class="cz-rate-sheet-tool__import-column">
          <input class="cz-tf-control cz-tf-input" type="search" placeholder="Search rows" value={rowQuery}
            aria-label="Search rows" onInput={(event) => setRowQuery((event.currentTarget as HTMLInputElement).value)} />
          <p class="cz-rate-sheet-tool__import-column-label">Browse by row</p>
          <div class="cz-rate-sheet-tool__import-chip-list">
            {availableSheetRows.length === 0 ? (
              <p class="cz-rate-sheet-tool__picker-note">Select a Rate Sheet to see its rows.</p>
            ) : availableSheetRows.map((group) => (
              <div key={group.key} class="cz-rate-sheet-tool__import-group">
                <p class="cz-rate-sheet-tool__import-group-title">{group.title}</p>
                {group.entries.length === 0 ? (
                  <p class="cz-rate-sheet-tool__picker-note">Every row here is already in this Bundle.</p>
                ) : (
                  <div class="cz-rate-sheet-tool__import-group-chips">
                    {group.entries.map((entry) => (
                      <button type="button" key={entry.ref}
                        class="cz-rate-sheet-tool__import-chip"
                        onClick={() => chooseEntry(entry)}>
                        {entry.label}
                        <span class="cz-rate-sheet-tool__import-chip-note"> · {formatUnitPrice(entry.unitPrice)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The basket, full width beneath the browse — its own room to read. */}
      <div class="cz-rate-sheet-tool__import-basket">
        <p class="cz-rate-sheet-tool__import-column-label">Selected ({selected.length})</p>
        {selected.length === 0 ? (
          <p class="cz-rate-sheet-tool__picker-note">
            Nothing selected yet. Pick Rate Sheet rows above.
          </p>
        ) : (
          <div class="cz-rate-sheet-tool__import-group-chips">
            {selected.map((entry) => (
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
        )}
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
