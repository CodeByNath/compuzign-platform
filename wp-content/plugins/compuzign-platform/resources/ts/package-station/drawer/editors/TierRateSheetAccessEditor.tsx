// Tier-system Rate Sheet access editor. Atomic fields only; mutation,
// Save/Cancel, and footer ownership stay with the drawer composition.
//
// Two distinct concepts, never conflated: CANDIDATES are every active Rate
// Sheet (plus any stored id that no longer resolves, kept visible so it can
// be reviewed/removed) — always shown, regardless of how many are currently
// allowed. ALLOWED is exactly the ids explicitly checked. An empty allow-list
// is a normal, valid state — nothing configured yet — never "every candidate
// is implicitly granted", so there is no mode toggle: only the checklist.

import { AdminField } from '@/drawer-kit/fields';
import type {
  TierRateSheetAccessDraft,
  TierRateSheetAccessProjection,
} from '../../surface/tierInstance/tierRateSheetAccessModel';

export function TierRateSheetAccessEditor({ draft, projection, onChange }: {
  draft: TierRateSheetAccessDraft;
  projection: TierRateSheetAccessProjection;
  onChange: (next: TierRateSheetAccessDraft) => void;
}) {
  const toggle = (rateSheetId: string, checked: boolean) => {
    const next = new Set(draft.allowedRateSheetIds);
    if (checked) next.add(rateSheetId); else next.delete(rateSheetId);
    onChange({ allowedRateSheetIds: [...next] });
  };

  return (
    <div class="cz-tf-form">
      {projection.rows.length === 0 ? (
        <p class="cz-tf-hint">No Rate Sheets exist yet to allow.</p>
      ) : (
        <>
          <p class="cz-tf-hint">
            Choose which Rate Sheets this Tier system may make available to its Tier
            slots. Each Tier still chooses its own bound Rate Sheet in Tier Overview.
          </p>
          {projection.rows.map((row) => (
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
        </>
      )}
    </div>
  );
}
