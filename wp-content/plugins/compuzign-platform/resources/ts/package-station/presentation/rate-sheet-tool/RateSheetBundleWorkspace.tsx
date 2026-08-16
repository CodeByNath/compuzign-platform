// Rate Sheet tool — the inline editor for ONE Bundle of the selected sheet.
//
// A Bundle IS one Rate Sheet row, so this editor is the Rate Sheet row editor:
// the SAME `RateSheetGridEditor`, driven by the SAME one-row-at-a-time
// Edit/Save/Cancel/Remove lock (`lockCommands={controller}`) the sheet's own
// rows obey, with the SAME Price Options tab strip, Per and Group dropdowns and
// quantity input. It mounts no second grid, invents no cell, and opens LOCKED —
// exactly like Details.
//
// `commands` is the controller's own generic row commands, unchanged — a
// Bundle's row is a real member of the sheet's `items[]`, addressed by its own
// `rowId` like any other row, so there is no second "Bundle setter" for any
// commercial field. The one override is `removeRow`, routed to `deleteBundle`
// so a Bundle is removed as the single record it is (its row included) rather
// than leaving a dangling Bundle with no row — in practice unreachable here
// (the grid is always locked, so Remove goes through `lockCommands`'s own
// `removeRowImmediately`, which carries the identical rule), kept correct
// regardless for the same reason the interface still requires it.
//
// Whole-Bundle removal is NOT a button in here: the row's own Remove/Delete
// removes it (a Bundle is that row), and the module card's action footer
// carries the same Remove in read mode. Structure mirrors
// `RateSheetSheetEditor`: head, toolbar, picker, grid.
//
// Presentation only: it calls no endpoint and mints no id.

import { useState } from 'preact/hooks';
import type { VNode } from 'preact';
import { bundleSuppliedContent } from '../../surface/rateSheetTool/rateSheetToolModel';
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
  const suppliedContent = bundleSuppliedContent(bundle, controller.bundleSources);

  // The same rule the sheet's own editor keeps: only one row may be unlocked at
  // a time, so importing and removing stand down while the row is being edited.
  const rowLocked = controller.editingRowId !== null;

  const openSource = (source: BundleImportSource) =>
    setImportSource((current) => (current === source ? null : source));

  const commands: RateSheetRowCommands = { ...controller, removeRow: () => controller.deleteBundle(bundleKey) };

  return (
    <div class="cz-rate-sheet-tool__bundle" aria-label={`Bundle ${bundleRow?.label ?? ''}`}>
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

      {/* Composing needs a live reference to an EXISTING Rate Sheet row, so
          this is the only source — never a raw Service inclusion, which has
          no row yet for a Bundle to reference (see RateSheetBundleImportPicker). */}
      <div class="cz-rate-sheet-tool__toolbar">
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={rowLocked}
          onClick={() => openSource('rate-sheets')}>
          {importSource === 'rate-sheets' ? 'Close' : '+ Add Rate Sheet'}
        </button>
      </div>

      {importSource !== null && (
        <RateSheetBundleImportPicker
          controller={controller}
          bundle={bundle}
          bundleKey={bundleKey}
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
            // the name and before the price. Read-only apart from taking a
            // reference out, which only the unlocked row offers, exactly as a
            // locked Rate Sheet row shows no controls at all.
            render: (_row, editing) => (suppliedContent.length === 0 ? (
              <span class="cz-rate-sheet-tool__supplied-empty">None yet</span>
            ) : (
              <ul class="cz-rate-sheet-tool__supplied-list">
                {suppliedContent.map(({ reference, label }) => (
                  <li key={`${reference.sourceRateSheetId} ${reference.sourceItemId}`} class="cz-rate-sheet-tool__supplied-item">
                    <span>{label}</span>
                    {editing && (
                      <button
                        type="button"
                        class="cz-rate-sheet-tool__supplied-remove"
                        aria-label={`Remove ${label} from this Bundle`}
                        title="Remove from this Bundle"
                        onClick={() => controller.removeBundleSuppliedContentRef(bundleKey, reference)}
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
