// Rate Sheet tool — the focused workspace for ONE Bundle of the selected sheet.
//
// A Bundle is a Rate Sheet-owned composition space: a named set of complete
// Rate Sheet rows that a Tier can later select as one commercial item. This
// file is the Bundle's own head (title, status, its `CZPRCB`, delete) and the
// host for its rows.
//
// It is deliberately NOT a second Rate Sheet editor. Everything below the head
// is the SAME row tooling the sheet's own rows use — the shared
// `RateSheetGridEditor` driven by the same `RateSheetToolController`, which is
// scope-aware: while a Bundle is selected, every row command it exposes
// addresses that Bundle's rows. No second controller, no second save path, no
// endpoint of its own.
//
// Presentation only: it calls no endpoint and mints no id. The Bundle's own
// `bundle_id` and `CZPRCB` are both backend-assigned on save.

import { useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { RateSheetEditorBundle, RateSheetEditorValue } from '../../surface/rateSheetTool/rateSheetToolModel';
import type { RateSheetToolController } from '../../surface/rateSheetTool/useRateSheetTool';
import { BUILT_IN_RATE_SHEET_UNITS } from '../../types';
import { InlineCreateSelect, RateSheetGridEditor, RateSheetPriceOptionEditor } from './rateSheetParts';
import { RateSheetBundleImportPicker } from './RateSheetBundleImportPicker';
import { RateSheetServiceImportPicker } from './RateSheetServiceImportPicker';

export function RateSheetBundleWorkspace({
  controller, bundle, bundleKey, sheet,
}: {
  controller: RateSheetToolController;
  bundle:     RateSheetEditorBundle;
  bundleKey:  string;
  /** The owning sheet — a Bundle row's Group dropdown and its Service import
   *  both work against the sheet's own groups, because a Bundle stores none. */
  sheet:      RateSheetEditorValue;
}): VNode {
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // A row being edited holds the same one-mutation-at-a-time lock the sheet's
  // own rows obey, so Bundle-level actions stand down while it is open.
  const rowLocked = controller.editingRowId !== null;

  return (
    <div class="cz-rate-sheet-tool__bundle" aria-label={`Bundle ${bundle.title}`}>
      <div class="cz-rate-sheet-tool__focused-head">
        <input
          class="cz-tf-control cz-tf-input"
          value={bundle.title}
          placeholder="Bundle name"
          aria-label="Bundle name"
          onInput={(event) => controller.setBundleTitle(bundleKey, (event.currentTarget as HTMLInputElement).value)}
        />
        <select
          class="cz-tf-control cz-tf-select"
          value={bundle.status}
          aria-label="Bundle status"
          onChange={(event) => controller.setBundleStatus(bundleKey, (event.currentTarget as HTMLSelectElement).value as 'active' | 'archived')}
        >
          <option value="active">Active</option>
          <option value="archived">Disabled</option>
        </select>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
          aria-label={`Delete Bundle ${bundle.title || 'untitled'}`}
          disabled={rowLocked}
          onClick={() => {
            if (window.confirm('Delete this Bundle and its rows? The Rate Sheet’s own rows are not affected.')) {
              controller.deleteBundle(bundleKey);
            }
          }}
        >
          Delete Bundle
        </button>
      </div>

      <p class="cz-rate-sheet-tool__picker-note">
        Platform ID: {bundle.platformId || (bundle.id ? 'Not assigned' : 'Assigned after Save')}
      </p>

      {/* The Bundle's own commercial price — what a consumer pays for this
          combination, independent of what the rows below sum to. It rides the
          same Price Options tab strip a row's Unit Price cell uses. */}
      <div class="cz-rate-sheet-tool__bundle-price">
        <p class="cz-rate-sheet-tool__import-column-label">Bundle price</p>
        <div class="cz-rate-sheet-tool__focused-head">
          <RateSheetPriceOptionEditor
            ariaLabel={`Bundle price for ${bundle.title || 'this Bundle'}`}
            unitPrice={bundle.unitPrice}
            defaultLabel={bundle.defaultPriceLabel}
            priceOptions={bundle.priceOptions}
            disabled={rowLocked}
            onUnitPrice={(next) => controller.setBundleUnitPrice(bundleKey, next)}
            onDefaultLabel={(label) => controller.setBundleDefaultPriceLabel(bundleKey, label)}
            onAddOption={() => controller.addBundlePriceOption(bundleKey)}
            onRemoveOption={(optionKey) => controller.removeBundlePriceOption(bundleKey, optionKey)}
            onOptionLabel={(optionKey, label) => controller.setBundlePriceOptionLabel(bundleKey, optionKey, label)}
            onOptionUnitPrice={(optionKey, next) => controller.setBundlePriceOptionUnitPrice(bundleKey, optionKey, next)}
          />
          <InlineCreateSelect
            value={bundle.per}
            disabled={rowLocked}
            ariaLabel="Bundle unit"
            addLabel="+ Add new unit"
            editLabel="Edit Per values"
            editValues={controller.units
              .filter((unit) => !(BUILT_IN_RATE_SHEET_UNITS as readonly string[]).includes(unit))
              .map((unit) => ({ value: unit, label: unit }))}
            placeholder="New unit name"
            onSelect={(next) => controller.setBundlePer(bundleKey, next)}
            onCreate={controller.createUnit}
            onRename={(unit, label) => { controller.renameUnit(unit, label); }}
          >
            {controller.units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </InlineCreateSelect>
        </div>
      </div>

      <div class="cz-rate-sheet-tool__toolbar">
        {/* The Bundle engine sits first — composing from already-priced Rate
            Sheet rows is what a Bundle is for. "+ Add Service" stays available
            underneath it for supply this Bundle wants to price directly. */}
        <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" disabled={rowLocked}
          onClick={() => { setImportOpen((open) => !open); setAddOpen(false); }}>
          {importOpen ? 'Close' : 'Import from Rate Sheets'}
        </button>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={rowLocked}
          onClick={() => { setAddOpen((open) => !open); setImportOpen(false); }}>{addOpen ? 'Close' : '+ Add Service'}</button>
      </div>

      {importOpen && (
        <RateSheetBundleImportPicker
          controller={controller}
          bundle={bundle}
          bundleKey={bundleKey}
          sheet={sheet}
          onDone={() => setImportOpen(false)}
        />
      )}

      {addOpen && (
        // The same import engine the sheet's own rows use. `rows` scopes its
        // already-used check to THIS Bundle: a source the sheet prices is still
        // offered here, because a Bundle row is a separate record.
        <RateSheetServiceImportPicker
          controller={controller}
          value={sheet}
          rows={bundle.items}
          onDone={() => setAddOpen(false)}
        />
      )}

      {bundle.items.length === 0 ? (
        <p class="cz-station-empty">
          No Bundle rows yet. Use + Add Service to price supplied content directly, or the Bundle engine to bring in rows from other Rate Sheets.
        </p>
      ) : (
        // The SAME grid, the same one-row-at-a-time lock, the same Price Option
        // editor the sheet's own rows get. The controller is scope-aware, so
        // every command here addresses this Bundle's rows.
        <RateSheetGridEditor
          rows={bundle.items}
          groups={sheet.groups}
          units={controller.units}
          commands={controller}
          lockCommands={controller}
        />
      )}
    </div>
  );
}
