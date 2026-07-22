// Rate Sheet row — the host-neutral drawer composition.
//
// The mature Rate Sheet row editing behaviour (previously RateRowDrawerStep in
// the Command Centre's serviceManagerDrawers), recovered as a neutral entity
// composition: read-only provenance (source option, Service, Category), and the
// four editable commercial fields (unit price, per, quantity, group).
//
// It knows NO host: no Admin Station shell, no StepContext, no surface binding,
// no focused Family/Tier, no endpoint. It receives one resolved row model, an
// opening mode, the saving state, a save command, and the neutral
// EntityDrawerHostBridge — so the same composition can mount under any host
// that satisfies the bridge.
//
//   view  → read-only fields + a record footer (Close / Edit row)
//   edit  → InlineEditorShell over the four editable fields, dirty-tracked
//
// A successful save reports through bridge.onMutationComplete (the host
// refreshes the wall the drawer was opened from — and only that wall), shows
// the shared saved toast, and returns to view; the drawer stays open, matching
// the established shared drawer behaviour. Close is guarded while an edit is
// dirty (the same window.confirm guard the Tier composition keeps).

import { useEffect, useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { InlineEditorShell } from '@/drawer-kit/InlineEditorShell';
import { useAutoDismiss } from '../shared/drawerChrome';

/** The resolved Rate Sheet row as the host adapter supplies it. Identity and
 *  provenance fields are display-only here; the composition never mutates or
 *  re-derives them. `quantity` is the sheet row's own authoritative quantity. */
export interface RateSheetRowModel {
  itemId: string;
  sourceItemId: string;
  optionLabel: string;
  serviceTitle: string | null;
  categories: string[];
  unitPrice: number;
  per: string;
  quantity: number;
  groupId: string | null;
  groups: readonly { id: string; label: string }[];
  units: readonly string[];
}

/** The only fields an edit may change — mirrors the station command's patch. */
export interface RateSheetRowDraft {
  unit_price: number;
  per: string;
  quantity: number;
  group_id: string | null;
}

export type RateSheetRowSaveResult = { ok: true } | { ok: false; message: string };

export interface RateSheetRowDrawerContentProps {
  model: RateSheetRowModel;
  initialEdit: boolean;
  saving: boolean;
  onSave: (patch: RateSheetRowDraft) => Promise<RateSheetRowSaveResult>;
  bridge: EntityDrawerHostBridge;
}

function draftFromModel(model: RateSheetRowModel): RateSheetRowDraft {
  return {
    unit_price: model.unitPrice,
    per:        model.per,
    quantity:   model.quantity,
    group_id:   model.groupId,
  };
}

function isSameDraft(a: RateSheetRowDraft, b: RateSheetRowDraft): boolean {
  return a.unit_price === b.unit_price
    && a.per === b.per
    && a.quantity === b.quantity
    && a.group_id === b.group_id;
}

export function RateSheetRowDrawerContent({
  model,
  initialEdit,
  saving,
  onSave,
  bridge,
}: RateSheetRowDrawerContentProps): VNode {
  const [editing, setEditing] = useState(initialEdit);
  const [draft, setDraft] = useState<RateSheetRowDraft>(() => draftFromModel(model));
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  // The authoritative row (post-save, the host's advanced state flows back in
  // through `model`); the draft re-seeds whenever the record itself moves on.
  useEffect(() => { setDraft(draftFromModel(model)); }, [model]);

  const isDirty = useMemo(() => !isSameDraft(draft, draftFromModel(model)), [draft, model]);
  const draftValid = Number.isFinite(draft.unit_price) && draft.unit_price >= 0
    && Number.isInteger(draft.quantity) && draft.quantity >= 1;

  // Shell-chrome close (Escape / backdrop / header ×) is guarded while a dirty
  // edit is open — the same direct confirm guard the Tier composition keeps.
  useEffect(() => {
    bridge.setCloseGuard(() => {
      if (!editing || !isDirty) return true;
      return window.confirm('Discard unsaved changes to this Rate Sheet row?');
    });
    return () => bridge.setCloseGuard(null);
  }, [bridge, editing, isDirty]);

  useAutoDismiss(saveOk, () => setSaveOk(false), 4000);

  // Record footer in view mode only; InlineEditorShell owns the edit footer.
  useEffect(() => {
    if (editing) {
      bridge.setFooter(null);
      return () => bridge.setFooter(null);
    }
    bridge.setFooter(
      <div class="cz-tf-footer">
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => bridge.close()}>Close</button>
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={() => setEditing(true)}>Edit row</button>
      </div>,
    );
    return () => bridge.setFooter(null);
  }, [bridge, editing]);

  const handleSave = async () => {
    setSaveErr(null);
    const result = await onSave({
      unit_price: draft.unit_price,
      per:        draft.per,
      quantity:   draft.quantity,
      group_id:   draft.group_id,
    });
    if (!result.ok) {
      setSaveErr(result.message);
      return;
    }
    setSaveOk(true);
    setEditing(false);
    bridge.onMutationComplete?.();
  };

  const groupLabel = model.groupId !== null
    ? model.groups.find((group) => group.id === model.groupId)?.label ?? 'Unknown group'
    : 'Ungrouped';

  const provenance = (
    <>
      <div class="cz-tf-field">
        <label class="cz-tf-label">Source option</label>
        <input type="text" class="cz-tf-input" value={model.optionLabel} readOnly />
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label">Service</label>
        <input type="text" class="cz-tf-input" value={model.serviceTitle ?? '—'} readOnly />
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label">Category</label>
        <input type="text" class="cz-tf-input" value={model.categories.join(', ') || '—'} readOnly />
      </div>
    </>
  );

  if (editing) {
    return (
      <InlineEditorShell
        title="Rate Sheet Row"
        onSave={handleSave}
        onCancel={() => { setDraft(draftFromModel(model)); setSaveErr(null); setEditing(false); }}
        saving={saving}
        saveErr={saveErr}
        isDirty={isDirty}
        saveDisabled={!isDirty || !draftValid}
      >
        <div class="cz-tf-form">
          {provenance}
          <div class="cz-tf-field">
            <label class="cz-tf-label">Unit price</label>
            <input
              type="number" min="0" step="0.01" class="cz-tf-input"
              value={draft.unit_price}
              onInput={(e) => setDraft({ ...draft, unit_price: Number((e.target as HTMLInputElement).value) })}
            />
          </div>
          <div class="cz-tf-field">
            <label class="cz-tf-label">Per</label>
            <select
              class="cz-tf-select" value={draft.per}
              onChange={(e) => setDraft({ ...draft, per: (e.target as HTMLSelectElement).value })}
            >
              {model.units.map((unit) => <option value={unit} key={unit}>{unit}</option>)}
            </select>
          </div>
          <div class="cz-tf-field">
            <label class="cz-tf-label">Quantity</label>
            <input
              type="number" min="1" step="1" class="cz-tf-input"
              value={draft.quantity}
              onInput={(e) => setDraft({ ...draft, quantity: Number((e.target as HTMLInputElement).value) })}
            />
          </div>
          <div class="cz-tf-field">
            <label class="cz-tf-label">Group</label>
            <select
              class="cz-tf-select" value={draft.group_id ?? ''}
              onChange={(e) => setDraft({ ...draft, group_id: (e.target as HTMLSelectElement).value || null })}
            >
              <option value="">Ungrouped</option>
              {model.groups.map((group) => <option value={group.id} key={group.id}>{group.label}</option>)}
            </select>
          </div>
          <p class="cz-tf-hint">Source option and provenance are resolved live and cannot be edited here.</p>
        </div>
      </InlineEditorShell>
    );
  }

  return (
    <div class="cz-tf-form">
      {saveOk && <div class="cz-admin-ok-msg">Changes saved.</div>}
      {provenance}
      <div class="cz-tf-field">
        <label class="cz-tf-label">Unit price</label>
        <input type="text" class="cz-tf-input" value={`$${model.unitPrice.toFixed(2)}`} readOnly />
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label">Per</label>
        <input type="text" class="cz-tf-input" value={model.per} readOnly />
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label">Quantity</label>
        <input type="text" class="cz-tf-input" value={String(model.quantity)} readOnly />
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label">Group</label>
        <input type="text" class="cz-tf-input" value={groupLabel} readOnly />
      </div>
      <p class="cz-tf-hint">
        Row identity: <code>{model.itemId}</code> · source relationship: <code>{model.sourceItemId}</code>
      </p>
    </div>
  );
}
