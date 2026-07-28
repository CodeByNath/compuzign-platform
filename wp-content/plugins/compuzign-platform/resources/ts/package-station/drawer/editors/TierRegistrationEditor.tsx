// The Tier system registration editor — the module's edit-mode content.
//
// It renders inside the shared module edit shell that every other module editor
// renders inside, so it owns no Save, no Cancel and no chrome: only the fields
// the record itself carries.

import type { PackageFamilyListItem } from '../../types';

export interface TierRegistrationDraftFields {
  title:       string;
  description: string;
  familyId:    string | null;
}

interface Props {
  draft:      TierRegistrationDraftFields;
  onChange:   (patch: Partial<TierRegistrationDraftFields>) => void;
  selectable: readonly PackageFamilyListItem[];
}

export function TierRegistrationEditor({ draft, onChange, selectable }: Props) {
  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label">Tier system title</label>
        <input
          type="text"
          class="cz-tf-input"
          value={draft.title}
          onInput={(e) => onChange({ title: (e.target as HTMLInputElement).value })}
        />
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label">Description</label>
        <textarea
          class="cz-tf-textarea"
          rows={3}
          value={draft.description}
          onInput={(e) => onChange({ description: (e.target as HTMLTextAreaElement).value })}
        />
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label">Package Family (optional)</label>
        <select
          class="cz-tf-select"
          value={draft.familyId ?? ''}
          onChange={(e) => onChange({ familyId: (e.target as HTMLSelectElement).value || null })}
        >
          <option value="">No Package Family — register standalone</option>
          {selectable.map((family) => (
            <option key={family.group_id} value={family.group_id}>{family.label}</option>
          ))}
        </select>
        <p class="cz-tf-hint">
          A Family holds one Tier system, so only Families holding none are offered. This is a
          separate assignment, not a field on the Tier system.
        </p>
      </div>
    </div>
  );
}
