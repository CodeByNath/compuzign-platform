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
import { tierRateSheetBundleAccessKey } from '../../surface/tierInstance/tierRateSheetAccessModel';

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
    children: row.bundles.map((bundle) => ({
      value: bundle.accessKey,
      label: bundle.status === 'active'
        ? bundle.title
        : `${bundle.title} (${bundle.status === 'archived' ? 'Archived' : 'Unresolved'})`,
    })),
  }));
  const selected = [
    ...draft.allowedRateSheetIds,
    ...draft.allowedRateSheetBundles.map((entry) => tierRateSheetBundleAccessKey(entry.rate_sheet_id, entry.bundle_id)),
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
            allowedRateSheetBundles: projection.rows.flatMap((row) => row.bundles)
              .filter((bundle) => selectedKeys.has(bundle.accessKey))
              .map((bundle) => ({ rate_sheet_id: bundle.rateSheetId, bundle_id: bundle.bundleId })),
          });
        }}
        noOptionsMessage="No Rate Sheets exist yet to allow."
      />
    </div>
  );
}
