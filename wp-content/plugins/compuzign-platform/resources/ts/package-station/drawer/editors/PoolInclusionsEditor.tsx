import { useState } from 'preact/hooks';
import { defaultPriceLabel } from '../../rateSheetLabels';
import type { TierRateSheetSelection, TierResolvedRateSheetSelection } from '../../types';
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
  // Count of Commercial Legs configured beyond Leg Default (Tier Pricing
  // Rules owns that array and its own billing_cycle/from_month/to_month
  // calculation — this editor only needs the count to offer "Leg 1"…"Leg N"
  // alongside the always-present Leg Default option). Absent/0 renders just
  // Leg Default.
  legsCount?: number;
}

export function PoolInclusionsEditor({ draft, onChange, pool, onCreate, rateSheetCatalogue, legsCount }: Props) {
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
      ?? { ...selection, resolved: false, label: '(unresolved Rate Sheet item)', unit_price: null, per: null, group_id: null, line_total: null, price_options: [] });
    return <div class="cz-tf-form"><div class="cz-tf-field"><label class="cz-tf-label">Included Features</label>
      {selectedRows.length > 0 && <div class="cz-ie-list">{selectedRows.map((row, index) => {
        const selection = selections[index];
        // Effective price mirrors PackageManagerSchema::projectTierRateSheetWith:
        // Default Price unless price_option_id resolves against this row's own
        // price_options[]; a present-but-unresolved id never falls back.
        const priceOptions = row.price_options ?? [];
        const selectedOption = selection.price_option_id
          ? priceOptions.find((option) => option.option_id === selection.price_option_id) ?? null
          : null;
        const optionUnresolved = !!selection.price_option_id && !selectedOption;
        const effectiveUnitPrice = optionUnresolved ? null : (selectedOption ? selectedOption.unit_price : row.unit_price);
        // A Bundle-backed row's own supplied content, read-only here — the
        // editor only ever mutates this row's OWN price option/qty, never
        // what it compiles (that's the Rate Sheet tool's job).
        const suppliedContent = (row.bundle_id ?? '') !== '' ? (row.includes ?? []) : null;
        return <div key={selection.item_id} class="cz-ie-entry">
          <div class="cz-ie-row">
            <div class="cz-tf-input" aria-label={row.label}>{row.label}{!row.resolved ? ' · Unresolved' : ''}</div>
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
              onClick={() => onChange(selections.filter((_, itemIndex) => itemIndex !== index))}>
              Remove
            </button>
          </div>
          <div class="cz-ie-divider" />
          <div class="cz-ie-row">
            {priceOptions.length > 0 ? (
              <select class="cz-tf-select" aria-label={`Price option for ${row.label}`} value={selection.price_option_id ?? ''}
                onChange={(event) => {
                  const value = event.currentTarget.value || null;
                  onChange(selections.map((item, itemIndex) => itemIndex === index ? { ...item, price_option_id: value } : item));
                }}>
                <option value="">{defaultPriceLabel(row.default_price_label)} · ${row.unit_price?.toFixed(2) ?? '—'}</option>
                {priceOptions.map((option) => <option value={option.option_id} key={option.option_id}>{option.label} · ${option.unit_price.toFixed(2)}</option>)}
              </select>
            ) : (
              <div class="cz-tf-input" aria-label="Price">
                {optionUnresolved ? 'Unresolved price option' : effectiveUnitPrice !== null ? `$${effectiveUnitPrice.toFixed(2)}${row.per ? ` ${row.per}` : ''}` : '—'}
              </div>
            )}
            <input class="cz-tf-input cz-ie-qty-input" type="number" min="1" step="1" aria-label={`Quantity for ${row.label}`} value={selection.quantity}
              onInput={(event) => onChange(selections.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Math.max(1, Number(event.currentTarget.value) || 1) } : item))} />
            <select class="cz-tf-select" aria-label={`Commercial Leg for ${row.label}`} value={selection.leg_index ?? ''}
              onChange={(event) => {
                const raw = event.currentTarget.value;
                const value = raw === '' ? null : Number(raw);
                onChange(selections.map((item, itemIndex) => itemIndex === index ? { ...item, leg_index: value } : item));
              }}>
              <option value="">Leg Default</option>
              {Array.from({ length: legsCount ?? 0 }, (_, legIndex) => (
                <option value={legIndex} key={legIndex}>{`Leg ${legIndex + 1}`}</option>
              ))}
            </select>
          </div>
          {suppliedContent && (
            suppliedContent.length > 0 ? (
              <ul class="cz-ie-sub-list">
                {suppliedContent.map((entry) => <li key={entry.item_id} class="cz-ie-sub-item">{entry.label}</li>)}
              </ul>
            ) : (
              <p class="cz-ie-sub-empty">No supplied content yet.</p>
            )
          )}
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
