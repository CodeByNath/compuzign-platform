// Rate Sheet tool — the Package Station's Rate Sheet authoring surface.
//
// A first-class Package Station surface (registered beside the Tier Workspace),
// NOT a drawer and NOT the retired Command Centre. It is the faithful rebuild of
// the removed `PackageRateSheetEditor`: pick source Services, price the supplied
// rows their inclusions onboard into, organise them into Rate Sheet groups, and
// commit through the surviving Package Manager save contract.
//
// Presentation only. Every read, edit, and save lives on the controller the data
// source (useRateSheetTool) supplies; this file calls no endpoint. Saved priced
// rows become selectable by Tier occupants automatically — a Tier chooses a Rate
// Sheet `item_id` and declares its quantity; the price authority stays here.

import { useEffect, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { TemplateKitProps } from '@/station-manager/registry/templateKits';
import { RateSheetIcon } from '@/admin-station/shell/icons';
import type { PackageRateSheetUnit } from '../../types';
import type { RateSheetToolController } from '../../surface/rateSheetTool/useRateSheetTool';

// The stable anchor the lower-deck Settings "Rate Sheets" card routes to.
export const RATE_SHEET_TOOL_ANCHOR = 'cz-rate-sheet-tool';

// ── SECTION: kit ──────────────────────────────────────────────────────────────

/** Registered template kit. The data source yields the controller as its single
 *  item; this narrows it and renders the editor, honouring the shell's own
 *  loading/error chrome. */
export function RateSheetToolKit({ items, loading, error }: TemplateKitProps): VNode {
  const controller = items[0] as RateSheetToolController | undefined;

  return (
    <div id={RATE_SHEET_TOOL_ANCHOR} class="cz-rate-sheet-tool" aria-label="Rate Sheet authoring">
      {/* The wall supplies the "Rate Sheet" heading; this is the concise intro. */}
      <p class="cz-rate-sheet-tool__note">
        <span class="cz-rate-sheet-tool__note-icon" aria-hidden="true"><RateSheetIcon /></span>
        Price the supplied rows Package Tiers select from. Connect source Services, set unit prices, and group the rows.
      </p>

      {loading ? (
        <p class="cz-station-empty" aria-busy="true">Loading the Rate Sheet…</p>
      ) : error ? (
        <p class="cz-station-empty" role="alert">{error}</p>
      ) : !controller ? (
        <p class="cz-station-empty">The Package Station needs a host Service before its Rate Sheet can be authored.</p>
      ) : (
        <RateSheetEditor controller={controller} />
      )}
    </div>
  );
}

// ── SECTION: editor ───────────────────────────────────────────────────────────

function RateSheetEditor({ controller }: { controller: RateSheetToolController }): VNode {
  const { value, units, dirty, saving, saveError } = controller;
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupLabel, setGroupLabel] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const submitGroup = () => {
    if (!groupLabel.trim()) return;
    controller.createGroup(groupLabel);
    setGroupLabel('');
    setCreatingGroup(false);
  };

  return (
    <div class="cz-rate-sheet-tool__editor">
      <label class="cz-rate-sheet-tool__field">
        <span class="cz-rate-sheet-tool__field-label">Title</span>
        <input
          class="cz-tf-input"
          value={value.title}
          placeholder="e.g. Standard Supply Rate Sheet"
          onInput={(event) => controller.setTitle((event.currentTarget as HTMLInputElement).value)}
        />
      </label>

      <div class="cz-rate-sheet-tool__toolbar">
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary"
          onClick={() => { setCreatingGroup(true); }}
        >
          Create Group
        </button>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary"
          onClick={() => setPickerOpen((open) => !open)}
        >
          {pickerOpen ? 'Close Services' : 'Add Source Service'}
        </button>
      </div>

      {creatingGroup && (
        <div class="cz-rate-sheet-tool__group-create">
          <input
            class="cz-tf-input"
            value={groupLabel}
            placeholder="New group name"
            autoFocus
            aria-label="New group name"
            onInput={(event) => setGroupLabel((event.currentTarget as HTMLInputElement).value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') { event.preventDefault(); submitGroup(); }
              if (event.key === 'Escape') { setCreatingGroup(false); setGroupLabel(''); }
            }}
          />
          <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" onClick={submitGroup} disabled={!groupLabel.trim()}>Add Group</button>
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => { setCreatingGroup(false); setGroupLabel(''); }}>Cancel</button>
        </div>
      )}

      {pickerOpen && <SourcePicker controller={controller} onDone={() => setPickerOpen(false)} />}

      {value.groups.length > 0 && (
        <div class="cz-rate-sheet-tool__groups" aria-label="Rate Sheet groups">
          {value.groups.map((group) => (
            <div key={group.id} class="cz-rate-sheet-tool__group-row">
              <input
                class="cz-tf-input"
                value={group.label}
                aria-label={`Group name for ${group.label}`}
                onInput={(event) => controller.renameGroup(group.id, (event.currentTarget as HTMLInputElement).value)}
              />
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                aria-label={`Delete group ${group.label}`}
                onClick={() => controller.deleteGroup(group.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {value.items.length === 0 ? (
        <p class="cz-station-empty">
          No priced rows yet. Give the Rate Sheet a title, then add a source Service to load its inclusions as priceable rows.
        </p>
      ) : (
        <div class="cz-rate-sheet-tool__grid-wrap">
          <table class="cz-rate-sheet-tool__grid">
            <thead>
              <tr>
                <th scope="col">Supplied content</th>
                <th scope="col">Unit Price</th>
                <th scope="col">Per</th>
                <th scope="col">Qty</th>
                <th scope="col">Group</th>
              </tr>
            </thead>
            <tbody>
              {value.items.map((row) => {
                const disabled = !row.sourceAvailable;
                return (
                  <tr key={row.id}>
                    <td class="cz-rate-sheet-tool__cell-name">
                      {row.optionLabel}{disabled ? ' — Unavailable' : ''}
                    </td>
                    <td>
                      <input
                        class="cz-tf-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.unitPrice}
                        disabled={disabled}
                        aria-label={`Unit price for ${row.optionLabel}`}
                        onInput={(event) => controller.setRowUnitPrice(row.id, Number((event.currentTarget as HTMLInputElement).value))}
                      />
                    </td>
                    <td>
                      <select
                        class="cz-tf-select"
                        value={row.per}
                        disabled={disabled}
                        aria-label={`Unit for ${row.optionLabel}`}
                        onChange={(event) => controller.setRowPer(row.id, (event.currentTarget as HTMLSelectElement).value as PackageRateSheetUnit)}
                      >
                        {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        class="cz-tf-input"
                        type="number"
                        min="1"
                        step="1"
                        value={row.quantity}
                        disabled={disabled}
                        aria-label={`Quantity for ${row.optionLabel}`}
                        onInput={(event) => controller.setRowQuantity(row.id, Number((event.currentTarget as HTMLInputElement).value))}
                      />
                    </td>
                    <td>
                      <select
                        class="cz-tf-select"
                        value={row.groupId ?? ''}
                        disabled={disabled}
                        aria-label={`Group for ${row.optionLabel}`}
                        onChange={(event) => {
                          const next = (event.currentTarget as HTMLSelectElement).value;
                          controller.setRowGroup(row.id, next === '' ? null : next);
                        }}
                      >
                        <option value="">Ungrouped</option>
                        {value.groups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {saveError && <p class="cz-admin-error-msg" role="alert">{saveError}</p>}

      <div class="cz-rate-sheet-tool__footer">
        <div class="cz-rate-sheet-tool__footer-spacer" />
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary"
          onClick={controller.discard}
          disabled={!dirty || saving}
        >
          Discard changes
        </button>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--primary"
          onClick={controller.save}
          disabled={!dirty || saving}
        >
          {saving ? 'Saving…' : 'Save Rate Sheet'}
        </button>
      </div>
    </div>
  );
}

// ── SECTION: source picker ────────────────────────────────────────────────────

function SourcePicker({ controller, onDone }: { controller: RateSheetToolController; onDone: () => void }): VNode {
  const { catalog, catalogLoading, catalogError, connectedServiceIds } = controller;
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => { controller.loadCatalog(); }, []);

  const connected = new Set(connectedServiceIds);

  const toggle = (id: number, checked: boolean) =>
    setSelected((current) => (checked ? [...current, id] : current.filter((value) => value !== id)));

  return (
    <div class="cz-rate-sheet-tool__picker">
      <div class="cz-rate-sheet-tool__picker-head">
        <strong>Browse Services</strong>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={onDone}>Cancel</button>
      </div>
      <p class="cz-rate-sheet-tool__picker-note">
        Select Services to establish supply. Their inclusions load as priceable rows after the Rate Sheet is saved.
      </p>
      {catalogLoading && <p class="cz-station-empty" aria-busy="true">Loading Services…</p>}
      {catalogError && <p class="cz-admin-error-msg" role="alert">{catalogError}</p>}
      {!catalogLoading && !catalogError && (
        <>
          <div class="cz-rate-sheet-tool__picker-list">
            {catalog.map((service) => {
              const already = connected.has(service.id);
              return (
                <label key={service.id} class="cz-rate-sheet-tool__candidate">
                  <input
                    type="checkbox"
                    checked={already || selected.includes(service.id)}
                    disabled={already || controller.saving}
                    onChange={(event) => toggle(service.id, (event.currentTarget as HTMLInputElement).checked)}
                  />
                  <span>{service.title}</span>
                  {already && <span class="cz-rate-sheet-tool__candidate-tag">Connected</span>}
                </label>
              );
            })}
          </div>
          <div class="cz-rate-sheet-tool__picker-actions">
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--primary"
              disabled={selected.length === 0 || controller.saving}
              onClick={async () => {
                await controller.connectServices(selected);
                setSelected([]);
                onDone();
              }}
            >
              {controller.saving ? 'Adding…' : 'Add Selected Services'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
