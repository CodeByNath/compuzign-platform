import { AdminField } from '@/drawer-kit/fields';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { TierOverviewDraft } from '../../types';

// The billing cycles a Tier can carry. A fixed vocabulary, so it is a constant
// rather than a value rebuilt on every render.
const BILLING_CYCLES: AdminFieldOption[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
  { value: 'one-time', label: 'One-time' },
];

// Tier Overview module editor (extracted from ServiceTierStep in S3a — the
// tier shells became bindings of the archetype shells and the editor is now
// referenced by the tier binding's editor schema).
//
// The form draft extends the tier-owned overview scalars with the
// station-level popular fields the editor surfaces; on save the owning step
// routes the scalars through saveTierOverview and popular through
// setPopularTier (station-level), exactly as before.

export type TierOverviewEditDraft = TierOverviewDraft & { popular: boolean; popular_label: string };

export interface RateSheetPickerOption {
  id:     string;
  title:  string;
  status: 'active' | 'archived';
}

interface Props {
  draft:         TierOverviewEditDraft;
  onChange:      (patch: Partial<TierOverviewEditDraft>) => void;
  rateSheets?:   RateSheetPickerOption[];
  hasSelections?: boolean;
}

export function TierOverviewEditor({ draft, onChange, rateSheets = [], hasSelections = false }: Props) {
  // Switching the bound sheet clears this Tier's row selections (enforced at
  // settle). Confirm first so the change is never silent.
  const changeRateSheet = (next: string | null) => {
    if (next === (draft.rate_sheet_id ?? null)) return;
    if (hasSelections && !window.confirm('Switching Rate Sheet clears this tier\'s selected rows. Continue?')) return;
    onChange({ rate_sheet_id: next });
  };
  const rateSheetOptions: AdminFieldOption[] = rateSheets.map((sheet) => ({
    value: sheet.id,
    label: `${sheet.title || '(untitled)'}${sheet.status === 'archived' ? ' (archived)' : ''}`,
  }));
  const isAddon: boolean = draft.is_addon ?? false;

  return (
    <div class="cz-tf-form">
      <AdminField
        def={{
          id: 'tier-rate-sheet',
          type: 'select',
          label: 'Rate Sheet',
          unsetLabel: 'Not bound',
          options: rateSheetOptions,
        }}
        value={draft.rate_sheet_id ?? ''}
        onChange={(next: string) => changeRateSheet(next || null)}
      />

      {/* Price is derived from the bound sheet's selected rows, so it reports
          rather than accepts. Readonly, not disabled: the value is still
          selectable and still submitted. */}
      <AdminField
        def={{ id: 'tier-price', type: 'text', label: 'Price', readonly: true }}
        value={draft.price != null ? `$${draft.price.toFixed(2)}` : 'Not configured'}
        onChange={() => undefined}
      />

      <AdminField
        def={{
          id: 'tier-billing-cycle',
          type: 'select',
          label: 'Billing Cycle',
          options: BILLING_CYCLES,
        }}
        value={draft.billing_cycle}
        onChange={(billing_cycle: string) => onChange({ billing_cycle })}
      />

      <AdminField
        def={{ id: 'tier-label', type: 'text', label: 'Display Label (optional)' }}
        value={draft.label}
        onChange={(label) => onChange({ label })}
      />

      <AdminField
        def={{ id: 'tier-ideal-for', type: 'textarea', label: 'Ideal For', rows: 3 }}
        value={draft.ideal_for}
        onChange={(ideal_for) => onChange({ ideal_for })}
      />

      <AdminField
        def={{ id: 'tier-is-addon', type: 'checkbox', label: 'Make this Tier an add-on' }}
        value={isAddon}
        onChange={(is_addon) => onChange({ is_addon })}
      />

      <AdminField
        def={{ id: 'tier-popular', type: 'checkbox', label: 'Mark as popular tier' }}
        value={draft.popular}
        onChange={(popular) => onChange({ popular })}
      />

      {draft.popular && (
        <AdminField
          def={{ id: 'tier-popular-label', type: 'text', label: 'Popular badge label' }}
          value={draft.popular_label}
          onChange={(popular_label) => onChange({ popular_label })}
        />
      )}
    </div>
  );
}
