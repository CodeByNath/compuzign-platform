import { useState } from 'preact/hooks';
import { defaultPriceLabel } from '../../rateSheetLabels';
import type { TierRateSheetLegAssignment, TierRateSheetSelection, TierResolvedRateSheetSelection } from '../../types';
import type { InclusionItem } from '@/api/types/pools';

// One inclusion row's Leg assignment — its own Default Leg (fixed, disabled
// Leg select — see TierRateSheetSelection.leg_index) or one of its
// leg_assignments[] (a real, admin-chosen Leg). Mirrors CommercialLegCard's
// own Leg Default + legs[] card shape (TierPricingRulesEditor.tsx) one level
// deeper: same .cz-ie-faq-item frame, same Remove-disabled-when-not-
// removable rule, same "+ Add …" precedent — "+ Add Assignment" below.
function InclusionAssignmentCard({
  row, label, removable, onRemove,
  priceOptionId, onPriceOptionChange, quantity, onQuantityChange,
  legIndex, legDisabled, legsCount, onLegIndexChange,
}: {
  row: TierResolvedRateSheetSelection;
  label: string;
  removable: boolean;
  onRemove: () => void;
  priceOptionId: string | null | undefined;
  onPriceOptionChange: (value: string | null) => void;
  quantity: number;
  onQuantityChange: (value: number) => void;
  legIndex: number | null;
  legDisabled: boolean;
  legsCount: number;
  onLegIndexChange: (value: number) => void;
}) {
  const priceOptions = row.price_options ?? [];
  const selectedOption = priceOptionId ? priceOptions.find((option) => option.option_id === priceOptionId) ?? null : null;
  const optionUnresolved = !!priceOptionId && !selectedOption;
  const effectiveUnitPrice = optionUnresolved ? null : (selectedOption ? selectedOption.unit_price : row.unit_price);

  return (
    <div class="cz-ie-faq-item">
      <div class="cz-ie-faq-item__header">
        <span class="cz-tf-label">{label}</span>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
          disabled={!removable} onClick={onRemove}>
          Remove
        </button>
      </div>
      <div class="cz-ie-row">
        {priceOptions.length > 0 ? (
          <select class="cz-tf-select" aria-label={`Price option for ${row.label}`} value={priceOptionId ?? ''}
            onChange={(event) => onPriceOptionChange(event.currentTarget.value || null)}>
            <option value="">{defaultPriceLabel(row.default_price_label)} · ${row.unit_price?.toFixed(2) ?? '—'}</option>
            {priceOptions.map((option) => <option value={option.option_id} key={option.option_id}>{option.label} · ${option.unit_price.toFixed(2)}</option>)}
          </select>
        ) : (
          <div class="cz-tf-input" aria-label="Price">
            {optionUnresolved ? 'Unresolved price option' : effectiveUnitPrice !== null ? `$${effectiveUnitPrice.toFixed(2)}${row.per ? ` ${row.per}` : ''}` : '—'}
          </div>
        )}
        <input class="cz-tf-input cz-ie-qty-input" type="number" min="1" step="1" aria-label={`Quantity for ${row.label}`} value={quantity}
          onInput={(event) => onQuantityChange(Math.max(1, Number(event.currentTarget.value) || 1))} />
        <select class="cz-tf-select" aria-label={`Commercial Leg for ${row.label}`} value={legDisabled ? '' : (legIndex ?? 0)} disabled={legDisabled}
          onChange={(event) => onLegIndexChange(Number(event.currentTarget.value))}>
          {legDisabled ? (
            <option value="">Leg Default</option>
          ) : (
            Array.from({ length: legsCount }, (_, i) => <option value={i} key={i}>{`Leg ${i + 1}`}</option>)
          )}
        </select>
      </div>
    </div>
  );
}

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
        const assignments = selection.leg_assignments ?? [];
        // A Bundle-backed row's own supplied content, read-only here — the
        // editor only ever mutates this row's OWN price option/qty, never
        // what it compiles (that's the Rate Sheet tool's job).
        const suppliedContent = (row.bundle_id ?? '') !== '' ? (row.includes ?? []) : null;
        const patchSelection = (patch: Partial<TierRateSheetSelection>) =>
          onChange(selections.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
        const patchAssignment = (assignmentIndex: number, patch: Partial<TierRateSheetLegAssignment>) =>
          patchSelection({ leg_assignments: assignments.map((a, ai) => ai === assignmentIndex ? { ...a, ...patch } : a) });
        return <div key={selection.item_id} class="cz-ie-entry">
          <div class="cz-ie-row">
            <div class="cz-tf-input" aria-label={row.label}>{row.label}{!row.resolved ? ' · Unresolved' : ''}</div>
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
              onClick={() => onChange(selections.filter((_, itemIndex) => itemIndex !== index))}>
              Remove
            </button>
          </div>
          <div class="cz-ie-divider" />
          <InclusionAssignmentCard
            row={row}
            label="Default Leg"
            removable={false}
            onRemove={() => undefined}
            priceOptionId={selection.price_option_id}
            onPriceOptionChange={(value) => patchSelection({ price_option_id: value })}
            quantity={selection.quantity}
            onQuantityChange={(value) => patchSelection({ quantity: value })}
            legIndex={null}
            legDisabled
            legsCount={legsCount ?? 0}
            onLegIndexChange={() => undefined}
          />
          {assignments.map((assignment, assignmentIndex) => (
            <InclusionAssignmentCard
              key={assignmentIndex}
              row={row}
              label={`Assignment ${assignmentIndex + 1}`}
              removable
              onRemove={() => patchSelection({ leg_assignments: assignments.filter((_, ai) => ai !== assignmentIndex) })}
              priceOptionId={assignment.price_option_id}
              onPriceOptionChange={(value) => patchAssignment(assignmentIndex, { price_option_id: value })}
              quantity={assignment.quantity}
              onQuantityChange={(value) => patchAssignment(assignmentIndex, { quantity: value })}
              legIndex={assignment.leg_index}
              legDisabled={false}
              legsCount={legsCount ?? 0}
              onLegIndexChange={(value) => patchAssignment(assignmentIndex, { leg_index: value })}
            />
          ))}
          {(legsCount ?? 0) > 0 && (
            <button type="button" class="cz-tf-add-btn"
              onClick={() => patchSelection({ leg_assignments: [...assignments, { price_option_id: null, quantity: 1, leg_index: 0 }] })}>
              + Add Assignment
            </button>
          )}
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
