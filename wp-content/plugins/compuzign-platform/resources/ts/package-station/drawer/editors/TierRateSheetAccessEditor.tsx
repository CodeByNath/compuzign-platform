// Tier-system Rate Sheet access editor. Atomic field only; mutation,
// Save/Cancel, and footer ownership stay with the drawer composition.
//
// CANDIDATES are every active Rate Sheet (plus any stored id that no longer
// resolves, kept visible so it can be reviewed/removed) — always offered,
// regardless of how many are currently allowed. ALLOWED is exactly the ids
// selected below. An empty allow-list is a normal, valid state — nothing
// configured yet — never "every candidate is implicitly granted".

import { MultiSelectField } from '@/drawer-kit/fields';
import type {
  TierRateSheetAccessDraft,
  TierRateSheetAccessProjection,
} from '../../surface/tierInstance/tierRateSheetAccessModel';

export function TierRateSheetAccessEditor({ draft, projection, onChange }: {
  draft: TierRateSheetAccessDraft;
  projection: TierRateSheetAccessProjection;
  onChange: (next: TierRateSheetAccessDraft) => void;
}) {
  const options = projection.rows.map((row) => ({
    value: row.rateSheetId,
    label: row.status === 'active'
      ? row.title
      : `${row.title} (${row.status === 'archived' ? 'Archived' : 'Unresolved'})`,
  }));

  return (
    <div class="cz-tf-form">
      <MultiSelectField
        id="tier-rate-sheet-access"
        label="Rate Sheets"
        options={options}
        selected={draft.allowedRateSheetIds}
        onChange={(next) => onChange({ allowedRateSheetIds: next })}
        noOptionsMessage="No Rate Sheets exist yet to allow."
      />
    </div>
  );
}
