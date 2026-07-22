// Rate Sheet row commercial editor — the module editor the Commercial Terms
// shell mounts inside InlineEditorShell. Exactly the four editable fields the
// station command patches (unit price / per / quantity / group); identity,
// provenance and ordering are not present here at all.

import type { RateSheetRowDraft } from '@/entity-drawers/rate-sheet-row/RateSheetRowDrawerContent';

interface Props {
  draft: RateSheetRowDraft;
  onChange: (patch: Partial<RateSheetRowDraft>) => void;
  groups: readonly { id: string; label: string }[];
  units: readonly string[];
}

export function RateSheetRowEditor({ draft, onChange, groups, units }: Props) {
  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label" for="cz-rate-row-unit-price">Unit price</label>
        <input
          id="cz-rate-row-unit-price"
          type="number" min="0" step="0.01"
          class="cz-tf-input"
          value={draft.unit_price}
          onInput={(event) => onChange({ unit_price: Number(event.currentTarget.value) })}
        />
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label" for="cz-rate-row-per">Per</label>
        <select
          id="cz-rate-row-per"
          class="cz-tf-select"
          value={draft.per}
          onChange={(event) => onChange({ per: event.currentTarget.value })}
        >
          {units.map((unit) => <option value={unit} key={unit}>{unit}</option>)}
        </select>
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label" for="cz-rate-row-quantity">Quantity</label>
        <input
          id="cz-rate-row-quantity"
          type="number" min="1" step="1"
          class="cz-tf-input"
          value={draft.quantity}
          onInput={(event) => onChange({ quantity: Number(event.currentTarget.value) })}
        />
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label" for="cz-rate-row-group">Group</label>
        <select
          id="cz-rate-row-group"
          class="cz-tf-select"
          value={draft.group_id ?? ''}
          onChange={(event) => onChange({ group_id: event.currentTarget.value || null })}
        >
          <option value="">Ungrouped</option>
          {groups.map((group) => <option value={group.id} key={group.id}>{group.label}</option>)}
        </select>
      </div>
      <p class="cz-tf-hint">Source option and provenance are resolved live and cannot be edited here.</p>
    </div>
  );
}
