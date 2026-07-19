import { useState } from 'preact/hooks';
import { InlineEditorShell } from '@/drawer-kit/InlineEditorShell';
import { fetchAdminCatalog } from '@/admin-station/stations/service';
import type { ServiceCatalogResponse } from '@/admin-station/stations/service';

// Rate Sheet inline editor (Phase 3 structural extraction).
//
// The exact editor previously inlined in DynamicStationManager's rate-sheet
// section: title, group create (toolbar and per-row), source-Service picker,
// and the pricing grid. Behaviour, state semantics, save path, and validation
// are unchanged — the manager still owns the editing value (dirty/exit-guard
// input), the provider draft, save/validation, and the source-preview draft;
// this component owns only editor-local UI state (group-create inputs and the
// picker). `onConnectSources` throws on failure so the picker can surface the
// message without duplicating the manager's draft logic.

export interface RateSheetEditorValue {
  title: string;
  groups: { id: string; label: string }[];
  items: { id: string; optionId: string; unitPrice: number; per: string; quantity: number; groupId: string | null; sourceAvailable?: boolean }[];
}

export function PackageRateSheetEditor({ value, onChange, configured, options, units, sourcePicker, saving, saveError, onSave, onCancel, onConnectSources, embedded = false }: {
  value: RateSheetEditorValue;
  onChange: (next: RateSheetEditorValue) => void;
  configured: boolean;
  options: readonly { id: string; label: string }[];
  units: readonly string[];
  sourcePicker: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onConnectSources?: (serviceIds: number[]) => Promise<void>;
  embedded?: boolean;
}) {
  const [newRateGroupLabel, setNewRateGroupLabel] = useState('');
  const [creatingRateGroup, setCreatingRateGroup] = useState(false);
  const [rateGroupTargetIndex, setRateGroupTargetIndex] = useState<number | null>(null);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [sourceCatalog, setSourceCatalog] = useState<ServiceCatalogResponse | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([]);

  const createRateGroup = () => {
    const label = newRateGroupLabel.trim();
    if (!label) return;
    const groupId = `rate_group_${Date.now()}_${value.groups.length}`;
    onChange({
      ...value,
      groups: [...value.groups, { id: groupId, label }],
      items: value.items.map((item, index) => index === rateGroupTargetIndex
        ? { ...item, groupId }
        : item),
    });
    setNewRateGroupLabel('');
    setCreatingRateGroup(false);
    setRateGroupTargetIndex(null);
  };

  const openSourcePicker = async () => {
    setSourcePickerOpen(true); setSourceError(null); setSourceLoading(true);
    try { setSourceCatalog(await fetchAdminCatalog()); }
    catch (error) { setSourceError(error instanceof Error ? error.message : 'Could not load source Services.'); }
    finally { setSourceLoading(false); }
  };

  const editor = (
      <div class={`cz-rate-sheet-editor${embedded ? ' cz-rate-sheet-editor--drawer' : ''}`}>
        <label class="cz-tf-field"><span>Title</span><input class="cz-tf-input" value={value.title}
          onInput={(event) => onChange({ ...value, title: event.currentTarget.value })} /></label>
        <div class="cz-rate-sheet-editor__toolbar">
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => { setCreatingRateGroup(true); setRateGroupTargetIndex(null); }}>Create Group</button>
          {sourcePicker && <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={openSourcePicker}>Add Source Service</button>}
        </div>
        {sourcePickerOpen && <div class="cz-manager-source-picker">
          <div class="cz-manager-section__actions"><strong>Browse Services</strong><button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => { setSourcePickerOpen(false); setSelectedSourceIds([]); }}>Cancel</button></div>
          <p>Select Services to establish supply. Their exposed Inclusions and FAQs will be loaded automatically after this Rate Sheet is saved.</p>
          {sourceLoading && <p class="cz-sp-tier-table__muted">Loading Services…</p>}
          {sourceError && <div class="cz-admin-error-msg" role="alert">{sourceError}</div>}
          {sourceCatalog && <div>{sourceCatalog.stations.map((service) => <label class="cz-manager-source-picker__candidate" key={service.id}><input type="checkbox" checked={selectedSourceIds.includes(service.id)} onChange={(event) => setSelectedSourceIds((current) => event.currentTarget.checked ? [...current, service.id] : current.filter((id) => id !== service.id))} /> {service.title}</label>)}
            <div><button type="button" class="cz-admin-btn cz-admin-btn--primary" disabled={selectedSourceIds.length === 0 || sourceLoading} onClick={async () => {
              if (!onConnectSources) return;
              setSourceLoading(true); setSourceError(null);
              try {
                await onConnectSources(selectedSourceIds);
                setSourcePickerOpen(false); setSelectedSourceIds([]);
              } catch (error) {
                setSourceError(error instanceof Error ? error.message : 'Could not resolve selected Services.');
              } finally { setSourceLoading(false); }
            }}>Add Selected Services</button></div></div>}
        </div>}
        {creatingRateGroup && rateGroupTargetIndex === null && <div class="cz-rate-sheet-editor__group-create">
          <label class="cz-tf-field"><span>Group name</span><input class="cz-tf-input" value={newRateGroupLabel} autoFocus
            onInput={(event) => setNewRateGroupLabel(event.currentTarget.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); createRateGroup(); } }} /></label>
          <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={createRateGroup} disabled={!newRateGroupLabel.trim()}>Add Group</button>
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => { setCreatingRateGroup(false); setNewRateGroupLabel(''); setRateGroupTargetIndex(null); }}>Cancel</button>
        </div>}
        <div class="cz-rate-sheet-editor__grid-wrap"><table class="cz-rate-sheet-editor__grid">
          <thead><tr><th>Supplied content</th><th>Unit Price</th><th>Per</th><th>Qty</th><th>Commercial Group</th></tr></thead>
          <tbody>{value.items.map((item, index) => (
            <tr key={item.id}>
              <td class="cz-sp-tier-table__name">{options.find((option) => option.id === item.optionId)?.label ?? '(unresolved supplied content)'}{item.sourceAvailable === false ? ' — Unavailable' : ''}</td>
              <td><input class="cz-tf-input" disabled={item.sourceAvailable === false} aria-label={`Unit Price row ${index + 1}`} type="number" min="0" step="0.01" value={item.unitPrice}
                onInput={(event) => onChange({ ...value, items: value.items.map((row, rowIndex) => rowIndex === index ? { ...row, unitPrice: Number(event.currentTarget.value) } : row) })} /></td>
              <td><select class="cz-tf-select" disabled={item.sourceAvailable === false} aria-label={`Per row ${index + 1}`} value={item.per}
                onChange={(event) => onChange({ ...value, items: value.items.map((row, rowIndex) => rowIndex === index ? { ...row, per: event.currentTarget.value } : row) })}>
                {units.map((unit) => <option value={unit} key={unit}>{unit}</option>)}
              </select></td>
              <td><input class="cz-tf-input" disabled={item.sourceAvailable === false} aria-label={`Quantity row ${index + 1}`} type="number" min="1" step="1" value={item.quantity}
                onInput={(event) => onChange({ ...value, items: value.items.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Number(event.currentTarget.value) } : row) })} /></td>
              <td>{creatingRateGroup && rateGroupTargetIndex === index ? <div class="cz-rate-sheet-editor__inline-group">
                <input class="cz-tf-input" value={newRateGroupLabel} autoFocus placeholder="New group name" aria-label={`New group name row ${index + 1}`}
                  onInput={(event) => setNewRateGroupLabel(event.currentTarget.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); createRateGroup(); } if (event.key === 'Escape') { setCreatingRateGroup(false); setNewRateGroupLabel(''); setRateGroupTargetIndex(null); } }} />
                <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" onClick={createRateGroup} disabled={!newRateGroupLabel.trim()}>Add</button>
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => { setCreatingRateGroup(false); setNewRateGroupLabel(''); setRateGroupTargetIndex(null); }}>Cancel</button>
              </div> : <select class="cz-tf-select" disabled={item.sourceAvailable === false} aria-label={`Group row ${index + 1}`} value={item.groupId ?? ''}
                onChange={(event) => {
                  if (event.currentTarget.value === '__add_new__') { setNewRateGroupLabel(''); setCreatingRateGroup(true); setRateGroupTargetIndex(index); return; }
                  onChange({ ...value, items: value.items.map((row, rowIndex) => rowIndex === index ? { ...row, groupId: event.currentTarget.value || null } : row) });
                }}>
                <option value="">Ungrouped</option>{value.groups.map((group) => <option value={group.id} key={group.id}>{group.label}</option>)}<option value="__add_new__">+ Add New</option>
              </select>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
  );
  if (embedded) return editor;
  return (
    <InlineEditorShell title={configured ? 'Edit Rate Sheet' : 'Create Rate Sheet'}
      onSave={onSave}
      onCancel={onCancel}
      saving={saving} saveErr={saveError} isDirty>
      {editor}
    </InlineEditorShell>
  );
}
