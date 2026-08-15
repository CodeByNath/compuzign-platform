// Rate Sheet tool — the inline editor for ONE Bundle of the selected sheet.
//
// A Bundle IS one Rate Sheet row, so this editor is the Rate Sheet row editor:
// the SAME `RateSheetGridEditor`, driven by the SAME one-row-at-a-time
// Edit/Save/Cancel/Remove lock (`lockCommands={controller}`) the sheet's own
// rows obey, with the SAME Price Options tab strip, Per and Group dropdowns and
// quantity input. It mounts no second grid, invents no cell, and opens LOCKED —
// exactly like Details.
//
// `commands` is a thin adapter: every row command the grid reports is the
// Bundle's own setter, because the row the grid renders IS the Bundle
// (`controller.selectedBundleRow`). The row's editable-name cell is therefore
// the `Product Bundle` name, and the supplied content it compiles reads
// beneath it — both already part of the shared cell, neither new.
//
// Whole-Bundle removal is NOT a button in here: the row's own Remove/Delete
// removes it (a Bundle is that row), and the module card's action footer
// carries the same Remove in read mode. Structure mirrors
// `RateSheetSheetEditor`: head, toolbar, picker, grid.
//
// Presentation only: it calls no endpoint and mints no id.

import { useState } from 'preact/hooks';
import type { VNode } from 'preact';
import { bundleSuppliedContent, rowKey } from '../../surface/rateSheetTool/rateSheetToolModel';
import type { RateSheetEditorBundle, RateSheetEditorValue } from '../../surface/rateSheetTool/rateSheetToolModel';
import type { RateSheetToolController } from '../../surface/rateSheetTool/useRateSheetTool';
import { RateSheetGridEditor } from './rateSheetParts';
import type { RateSheetRowCommands } from './rateSheetParts';
import { RateSheetBundleImportPicker } from './RateSheetBundleImportPicker';
import type { BundleImportSource } from './RateSheetBundleImportPicker';

export function RateSheetBundleWorkspace({
  controller, bundle, bundleKey, sheet,
}: {
  controller: RateSheetToolController;
  bundle:     RateSheetEditorBundle;
  bundleKey:  string;
  /** The owning sheet — a Bundle's Group dropdown works against the sheet's own
   *  groups, because a Bundle stores none of its own. */
  sheet:      RateSheetEditorValue;
}): VNode {
  const [importSource, setImportSource] = useState<BundleImportSource | null>(null);
  const bundleRow = controller.selectedBundleRow;
  const suppliedContent = bundleSuppliedContent(bundle);

  // The same rule the sheet's own editor keeps: only one row may be unlocked at
  // a time, so importing and removing stand down while the row is being edited.
  const rowLocked = controller.editingRowId !== null;

  const openSource = (source: BundleImportSource) =>
    setImportSource((current) => (current === source ? null : source));

  // Every row command the shared grid reports, routed to the Bundle the row
  // projects. Vocabulary edits (units, groups) stay the controller's own —
  // they belong to the Manager and the sheet, not to this row.
  const commands: RateSheetRowCommands = {
    setRowUnitPrice:         (_rowId, unitPrice) => controller.setBundleUnitPrice(bundleKey, unitPrice),
    setRowDefaultPriceLabel: (_rowId, label)     => controller.setBundleDefaultPriceLabel(bundleKey, label),
    setRowPer:               (_rowId, per)       => controller.setBundlePer(bundleKey, per),
    setRowQuantity:          (_rowId, quantity)  => controller.setBundleQuantity(bundleKey, quantity),
    setRowGroup:             (_rowId, groupId)   => controller.setBundleGroup(bundleKey, groupId),
    // The row's own editable name IS the Product Bundle name.
    setRowLabel:             (_rowId, title)     => controller.setBundleTitle(bundleKey, title),
    removeRow:               ()                  => controller.deleteBundle(bundleKey),
    createGroup:             controller.createGroup,
    createUnit:              controller.createUnit,
    renameUnit:              controller.renameUnit,
    renameGroup:             controller.renameGroup,
    deleteGroup:             controller.deleteGroup,
    addPriceOption:          ()                            => controller.addBundlePriceOption(bundleKey),
    removePriceOption:       (_rowId, optionKey)           => controller.removeBundlePriceOption(bundleKey, optionKey),
    setPriceOptionLabel:     (_rowId, optionKey, label)    => controller.setBundlePriceOptionLabel(bundleKey, optionKey, label),
    setPriceOptionUnitPrice: (_rowId, optionKey, unitPrice) => controller.setBundlePriceOptionUnitPrice(bundleKey, optionKey, unitPrice),
  };

  return (
    <div class="cz-rate-sheet-tool__bundle" aria-label={`Bundle ${bundle.title}`}>
      <div class="cz-rate-sheet-tool__focused-head">
        <select
          class="cz-tf-control cz-tf-select"
          value={bundle.status}
          disabled={rowLocked}
          aria-label="Bundle status"
          onChange={(event) => controller.setBundleStatus(bundleKey, (event.currentTarget as HTMLSelectElement).value as 'active' | 'archived')}
        >
          <option value="active">Active</option>
          <option value="archived">Disabled</option>
        </select>
      </div>

      {/* Two triggers, one per source — the engine then shows THAT source's
          browse only, rather than stacking every catalogue into one panel. The
          Service trigger reads exactly as the sheet's own does. */}
      <div class="cz-rate-sheet-tool__toolbar">
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={rowLocked}
          onClick={() => openSource('services')}>
          {importSource === 'services' ? 'Close' : '+ Add Service'}
        </button>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={rowLocked}
          onClick={() => openSource('rate-sheets')}>
          {importSource === 'rate-sheets' ? 'Close' : '+ Add Rate Sheet'}
        </button>
      </div>

      {importSource !== null && (
        <RateSheetBundleImportPicker
          controller={controller}
          bundle={bundle}
          source={importSource}
          onDone={() => setImportSource(null)}
        />
      )}

      {/* The Bundle's own row, through the shared grid and the shared lock. */}
      {bundleRow !== null && (
        <RateSheetGridEditor
          rows={[bundleRow]}
          groups={sheet.groups}
          units={controller.units}
          commands={commands}
          lockCommands={controller}
          nameLabel="Product Bundle"
          extraColumn={{
            label: 'Supplied content',
            // What this Bundle compiles — its own column, immediately after
            // the name and before the price. Read-only apart from taking an
            // entry out, which only the unlocked row offers, exactly as a
            // locked Rate Sheet row shows no controls at all.
            render: (_row, editing) => (bundle.items.length === 0 ? (
              <span class="cz-rate-sheet-tool__supplied-empty">None yet</span>
            ) : (
              <ul class="cz-rate-sheet-tool__supplied-list">
                {bundle.items.map((component, index) => (
                  <li key={rowKey(component)} class="cz-rate-sheet-tool__supplied-item">
                    <span>{suppliedContent[index]}</span>
                    {editing && (
                      <button
                        type="button"
                        class="cz-rate-sheet-tool__supplied-remove"
                        aria-label={`Remove ${suppliedContent[index]} from this Bundle`}
                        title="Remove from this Bundle"
                        onClick={() => controller.removeRow(rowKey(component))}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )),
          }}
        />
      )}

    </div>
  );
}
