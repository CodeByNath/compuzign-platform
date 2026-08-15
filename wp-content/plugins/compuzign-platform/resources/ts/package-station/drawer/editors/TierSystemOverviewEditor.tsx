// The Tier System Overview editor — the module's edit-mode content, shared by
// both a pending (not yet published) and a persisted Tier System.
//
// It renders inside the shared module edit shell that every other module
// editor renders inside, so it owns no Save, no Cancel and no chrome: only
// the fields the record itself carries.

import type { PackageFamilyListItem } from '../../types';
import type { PackageRateSheet } from '../../types';
import { CheckboxDropdown } from './CheckboxDropdown';

export interface TierSystemOverviewDraftFields {
  title:       string;
  description: string;
  familyId:    string | null;
  allowedRateSheetIds: string[];
}

interface Props {
  draft:      TierSystemOverviewDraftFields;
  onChange:   (patch: Partial<TierSystemOverviewDraftFields>) => void;
  selectable: readonly PackageFamilyListItem[];
  rateSheets: readonly PackageRateSheet[];
}

export function TierSystemOverviewEditor({ draft, onChange, selectable, rateSheets }: Props) {
  const selected = new Set(draft.allowedRateSheetIds);
  // The candidate pool is active sheets. Preserve any stored non-active id in
  // the menu so an admin can explicitly remove it; never expose that raw id.
  const candidates = rateSheets
    .filter((sheet) => sheet.status === 'active' || selected.has(sheet.rate_sheet_id))
    .map((sheet) => ({
      value: sheet.rate_sheet_id,
      label: `${sheet.title.trim() || 'Untitled Rate Sheet'}${sheet.status === 'active' ? '' : ' (unavailable)'}`,
    }));
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
      <CheckboxDropdown
        id="tier-system-rate-sheets"
        label="Rate Sheets"
        options={candidates}
        selected={draft.allowedRateSheetIds}
        emptyLabel="No Rate Sheet selected"
        onChange={(allowedRateSheetIds) => onChange({ allowedRateSheetIds })}
      />
    </div>
  );
}
