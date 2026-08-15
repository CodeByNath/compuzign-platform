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
import { tierRateSheetGroupAccessKey } from '../../surface/tierInstance/tierRateSheetAccessModel';

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
    children: row.groups.map((group) => ({
      value: group.accessKey,
      label: group.resolved ? group.title : `${group.title} (${group.groupId})`,
    })),
  }));
  const selected = [
    ...draft.allowedRateSheetIds,
    ...draft.allowedRateSheetGroups.map((group) => tierRateSheetGroupAccessKey(group.rate_sheet_id, group.group_id)),
  ];

  return (
    <div class="cz-tf-form cz-tier-rate-sheet-access-form">
      <MultiSelectField
        id="tier-rate-sheet-access"
        label="Rate Sheets"
        options={options}
        selected={selected}
        onChange={(next) => {
          const selectedKeys = new Set(next);
          onChange({
            allowedRateSheetIds: projection.rows.filter((row) => selectedKeys.has(row.rateSheetId)).map((row) => row.rateSheetId),
            allowedRateSheetGroups: projection.rows.flatMap((row) => row.groups)
              .filter((group) => selectedKeys.has(group.accessKey))
              .map((group) => ({ rate_sheet_id: group.rateSheetId, group_id: group.groupId })),
          });
        }}
        noOptionsMessage="No Rate Sheets exist yet to allow."
      />
    </div>
  );
}
