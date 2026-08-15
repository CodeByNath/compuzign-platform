// Rate Sheet tool — the inline editor for ONE Bundle of the selected sheet.
//
// A Bundle is compiled supplied content offered as ONE Rate Sheet row, so this
// editor IS that row:
//
//   | Product Bundle | Supplied content | Unit Price | Per | Qty | Group |
//
// `Product Bundle` is the one field an ordinary row does not have — the
// combination's name. Everything else is the Rate Sheet row system the sheet's
// own rows already use: the same Price Options tab strip
// (`RateSheetPriceOptionEditor`, Default Price name included), the same
// `InlineCreateSelect` for Per and Group, the same quantity input, all riding
// the same controller and the same full-manager save.
//
// Supplied content is READ-ONLY. Each component was already declared on the
// Rate Sheet it came from — that is where its own name, price and unit live —
// so this cell lists what the combination compiles rather than re-declaring it.
// Removing a component from the combination stays available: read-only refers
// to a component's DEFINITION, not to whether the Bundle may drop it.
//
// It is deliberately NOT a second Rate Sheet editor and mounts no per-component
// grid. Presentation only: it calls no endpoint and mints no id — the Bundle's
// `bundle_id` and `CZPRCB`, and each component's `CZPRCBI`, are all backend-
// assigned on save.

import { useState } from 'preact/hooks';
import type { VNode } from 'preact';
import { bundleSuppliedContent, rowKey } from '../../surface/rateSheetTool/rateSheetToolModel';
import type { RateSheetEditorBundle, RateSheetEditorValue } from '../../surface/rateSheetTool/rateSheetToolModel';
import type { RateSheetToolController } from '../../surface/rateSheetTool/useRateSheetTool';
import { BUILT_IN_RATE_SHEET_UNITS } from '../../types';
import { InlineCreateSelect, RateSheetPriceOptionEditor } from './rateSheetParts';
import { RateSheetBundleImportPicker } from './RateSheetBundleImportPicker';

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
  const [importOpen, setImportOpen] = useState(false);
  const suppliedContent = bundleSuppliedContent(bundle);

  return (
    <div class="cz-rate-sheet-tool__bundle" aria-label={`Bundle ${bundle.title}`}>
      <div class="cz-rate-sheet-tool__focused-head">
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
          onClick={() => setImportOpen((open) => !open)}
        >
          {importOpen ? 'Close' : '+ Import supplied content'}
        </button>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
          aria-label={`Delete Bundle ${bundle.title || 'untitled'}`}
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

      {importOpen && (
        <RateSheetBundleImportPicker
          controller={controller}
          bundle={bundle}
          onDone={() => setImportOpen(false)}
        />
      )}

      {/* The combination as the ONE Rate Sheet row it is. Same grid shell, same
          cells, same header vocabulary as the sheet's own rows — plus the one
          field only a Bundle has. */}
      <div class="cz-rate-sheet-tool__grid-wrap">
        <table class="cz-rate-sheet-tool__grid">
          <thead>
            <tr>
              <th scope="col">Product Bundle</th>
              <th scope="col">Supplied content</th>
              <th scope="col">Unit Price</th>
              <th scope="col">Per</th>
              <th scope="col">Qty</th>
              <th scope="col">Group</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="cz-rate-sheet-tool__cell-name">
                <input
                  class="cz-tf-control cz-tf-input"
                  type="text"
                  value={bundle.title}
                  placeholder="Bundle name"
                  aria-label="Product Bundle name"
                  onInput={(event) => controller.setBundleTitle(bundleKey, (event.currentTarget as HTMLInputElement).value)}
                />
              </td>
              <td class="cz-rate-sheet-tool__cell-supplied">
                {suppliedContent.length === 0 ? (
                  <p class="cz-rate-sheet-tool__picker-note">
                    Nothing compiled yet. Use “+ Import supplied content”.
                  </p>
                ) : (
                  <ul class="cz-rate-sheet-tool__supplied-list">
                    {bundle.items.map((row, index) => (
                      <li key={rowKey(row)} class="cz-rate-sheet-tool__supplied-item">
                        <span>{suppliedContent[index]}</span>
                        <button
                          type="button"
                          class="cz-rate-sheet-tool__supplied-remove"
                          aria-label={`Remove ${suppliedContent[index]} from this Bundle`}
                          title="Remove from this Bundle"
                          onClick={() => controller.removeRow(rowKey(row))}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td>
                <RateSheetPriceOptionEditor
                  ariaLabel={`Price for ${bundle.title || 'this Bundle'}`}
                  unitPrice={bundle.unitPrice}
                  defaultLabel={bundle.defaultPriceLabel}
                  priceOptions={bundle.priceOptions}
                  disabled={false}
                  onUnitPrice={(next) => controller.setBundleUnitPrice(bundleKey, next)}
                  onDefaultLabel={(label) => controller.setBundleDefaultPriceLabel(bundleKey, label)}
                  onAddOption={() => controller.addBundlePriceOption(bundleKey)}
                  onRemoveOption={(optionKey) => controller.removeBundlePriceOption(bundleKey, optionKey)}
                  onOptionLabel={(optionKey, label) => controller.setBundlePriceOptionLabel(bundleKey, optionKey, label)}
                  onOptionUnitPrice={(optionKey, next) => controller.setBundlePriceOptionUnitPrice(bundleKey, optionKey, next)}
                />
              </td>
              <td>
                <InlineCreateSelect
                  value={bundle.per}
                  disabled={false}
                  ariaLabel="Unit for this Bundle"
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
              </td>
              <td>
                <input
                  class="cz-tf-control cz-tf-input"
                  type="number"
                  min="1"
                  step="1"
                  value={bundle.quantity}
                  aria-label="Quantity for this Bundle"
                  onInput={(event) => controller.setBundleQuantity(bundleKey, Number((event.currentTarget as HTMLInputElement).value))}
                />
              </td>
              <td>
                <InlineCreateSelect
                  value={bundle.groupId ?? ''}
                  disabled={false}
                  ariaLabel="Group for this Bundle"
                  addLabel="+ Add new group"
                  editLabel="Edit Group values"
                  editValues={sheet.groups.map((group) => ({ value: group.id, label: group.label }))}
                  placeholder="New group name"
                  onSelect={(next) => controller.setBundleGroup(bundleKey, next === '' ? null : next)}
                  onCreate={controller.createGroup}
                  onRename={controller.renameGroup}
                  onDelete={controller.deleteGroup}
                >
                  <option value="">Ungrouped</option>
                  {sheet.groups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
                </InlineCreateSelect>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
