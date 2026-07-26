// Tier-system Rate Sheet access editor. Atomic fields only; mutation, validation,
// Save/Cancel, and footer ownership stay with the drawer composition.

import { AdminField } from '@/drawer-kit/fields';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type {
  TierRateSheetAccessDraft,
  TierRateSheetAccessProjection,
} from '../../surface/tierInstance/tierRateSheetAccessModel';
import { tierRateSheetAccessIsValid } from '../../surface/tierInstance/tierRateSheetAccessModel';

const MODE_OPTIONS: AdminFieldOption[] = [
  { value: 'all-active', label: 'All active Rate Sheets' },
  { value: 'limited', label: 'Only selected Rate Sheets' },
];

export function TierRateSheetAccessEditor({ draft, projection, onChange }: {
  draft: TierRateSheetAccessDraft;
  projection: TierRateSheetAccessProjection;
  onChange: (next: TierRateSheetAccessDraft) => void;
}) {
  const limitedInvalid = draft.mode === 'limited'
    && !tierRateSheetAccessIsValid(draft, projection);
  const selectMode = (mode: string) => {
    if (mode === 'all-active') {
      onChange({ mode: 'all-active', allowedRateSheetIds: [] });
      return;
    }
    onChange({
      mode: 'limited',
      allowedRateSheetIds: projection.rows
        .filter((row) => row.status === 'active')
        .map((row) => row.rateSheetId),
    });
  };

  const toggle = (rateSheetId: string, checked: boolean) => {
    const next = new Set(draft.allowedRateSheetIds);
    if (checked) next.add(rateSheetId); else next.delete(rateSheetId);
    onChange({ ...draft, allowedRateSheetIds: [...next] });
  };

  return (
    <div class="cz-tf-form">
      <AdminField
        def={{
          id: 'tier-rate-sheet-access-mode',
          type: 'select',
          label: 'Rate Sheet Access',
          hint: 'Each Tier still chooses its own bound Rate Sheet in Tier Overview.',
          error: limitedInvalid ? 'Choose at least one active Rate Sheet.' : null,
          options: MODE_OPTIONS,
        }}
        value={draft.mode}
        onChange={selectMode}
      />

      {draft.mode === 'limited' && projection.rows.map((row) => (
        <AdminField
          key={row.rateSheetId}
          def={{
            id: `tier-rate-sheet-access-${row.rateSheetId}`,
            type: 'checkbox',
            label: `${row.title} · ${row.status === 'active' ? 'Active' : row.status === 'archived' ? 'Archived' : 'Unresolved'}`,
            hint: row.rateSheetId,
          }}
          value={draft.allowedRateSheetIds.includes(row.rateSheetId)}
          onChange={(checked: boolean) => toggle(row.rateSheetId, checked)}
        />
      ))}
    </div>
  );
}
