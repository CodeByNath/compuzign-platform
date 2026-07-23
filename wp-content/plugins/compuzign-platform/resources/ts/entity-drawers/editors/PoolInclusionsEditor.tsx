import { useState } from 'preact/hooks';
import type { TierRateSheetSelection, TierResolvedRateSheetSelection } from '@/package-station';
import type { InclusionItem } from '@/api/types/pools';

// Pool-referencing Included Features editor (extracted from ServiceTierStep /
// the shared station editors.
// The draft is an ordered list of canonical pool items; "+ Create new" is an
// immediate canonical pool creation (separate request from the module draft
// save) whose result is appended into the open draft, exactly as if it had
// been picked from "Add from pool…". The add-form state lives here; the
// draft and the create action stay with the owning step / station hook.

interface Props {
  draft:    InclusionItem[] | TierRateSheetSelection[];
  onChange: (next: InclusionItem[] | TierRateSheetSelection[]) => void;
  pool:     InclusionItem[];
  onCreate: (label: string) => Promise<InclusionItem | null>;
  rateSheetCatalogue?: TierResolvedRateSheetSelection[];
}

export function PoolInclusionsEditor({ draft, onChange, pool, onCreate, rateSheetCatalogue }: Props) {
  const [showAdd,  setShowAdd]  = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const handleCreate = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setCreateErr(null);
    setCreating(true);
    try {
      const item = await onCreate(label);
      if (!item) { setCreateErr('Failed to create feature.'); return; }
      const inclusions = draft as InclusionItem[];
      if (!inclusions.find(i => i.id === item.id)) onChange([...inclusions, item]);
      setNewLabel('');
      setShowAdd(false);
    } finally {
      setCreating(false);
    }
  };
  const cancelAdd = () => {
    setShowAdd(false);
    setNewLabel('');
    setCreateErr(null);
  };

  if (rateSheetCatalogue) {
    const selections = draft as TierRateSheetSelection[];
    const selectedRows = selections.map((selection) => rateSheetCatalogue.find((item) => item.item_id === selection.item_id)
      ?? { ...selection, resolved: false, label: '(unresolved Rate Sheet item)', unit_price: null, per: null, group_id: null, line_total: null });
    return <div class="cz-tf-form"><div class="cz-tf-field"><label class="cz-tf-label">Included Features</label>
      {selectedRows.length > 0 && <div class="cz-ie-list">{selectedRows.map((row, index) => {
        const selection = selections[index];
        return <div key={selection.item_id} class="cz-ie-row">
          <div class="cz-tf-input" aria-label={row.label}>{row.label}{!row.resolved ? ' · Unresolved' : ` · $${row.unit_price?.toFixed(2)} ${row.per ?? ''}`}</div>
          <input class="cz-tf-input" type="number" min="1" step="1" aria-label={`Quantity for ${row.label}`} value={selection.quantity}
            onInput={(event) => onChange(selections.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Math.max(1, Number(event.currentTarget.value) || 1) } : item))} />
          <span>{row.unit_price !== null ? `$${(row.unit_price * selection.quantity).toFixed(2)}` : '—'}</span>
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => onChange(selections.filter((_, itemIndex) => itemIndex !== index))}>✕</button>
        </div>;
      })}</div>}
      <select class="cz-tf-select" value="" onChange={(event) => {
        const id = event.currentTarget.value;
        if (id && !selections.some((item) => item.item_id === id)) onChange([...selections, { item_id: id, quantity: 1 }]);
        event.currentTarget.value = '';
      }}><option value="">Add from Rate Sheet…</option>{rateSheetCatalogue.filter((item) => item.resolved && !selections.some((selection) => selection.item_id === item.item_id)).map((item) => <option value={item.item_id} key={item.item_id}>{item.label}</option>)}</select>
    </div></div>;
  }

  const inclusionDraft = draft as InclusionItem[];

  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label">Inclusions</label>
        {inclusionDraft.length > 0 && (
          <div class="cz-ie-list">
            {inclusionDraft.map((inc) => (
              <div key={inc.id} class="cz-ie-row">
                <input type="text" class="cz-tf-input" value={inc.label} readOnly />
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                  aria-label="Remove"
                  onClick={() => onChange(inclusionDraft.filter(i => i.id !== inc.id))}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {pool.length > 0 && (
          <select class="cz-tf-select" value=""
            onChange={(e) => {
              const sel = e.target as HTMLSelectElement;
              const id = sel.value;
              if (!id) return;
              const inc = pool.find(i => i.id === id);
              if (inc && !inclusionDraft.find(i => i.id === id)) onChange([...inclusionDraft, inc]);
              sel.value = '';
            }}>
            <option value="">Add from pool…</option>
            {pool.filter(i => !inclusionDraft.find(s => s.id === i.id)).map(i => (
              <option key={i.id} value={i.id}>{i.label}</option>
            ))}
          </select>
        )}
        {showAdd ? (
          <div class="cz-tf-inline-add">
            <input type="text" class="cz-tf-input" placeholder="New feature label"
              value={newLabel}
              onInput={(e) => setNewLabel((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
              autoFocus />
            <div class="cz-tf-inline-add__actions">
              <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                onClick={handleCreate} disabled={creating}>
                {creating ? '…' : 'Create'}
              </button>
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                onClick={cancelAdd} disabled={creating}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" class="cz-tf-add-btn" onClick={() => setShowAdd(true)}>
            + Create new feature
          </button>
        )}
        {createErr && <p class="cz-admin-error-msg">{createErr}</p>}
      </div>
    </div>
  );
}
