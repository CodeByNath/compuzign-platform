import { AdminField } from '@/drawer-kit/fields';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { TierPricingRulesDraft } from '../../types';

// The billing cycles a Tier can carry. A fixed vocabulary, so it is a constant
// rather than a value rebuilt on every render.
const BILLING_CYCLES: AdminFieldOption[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
  { value: 'one-time', label: 'One-time' },
];

// Same vocabulary as Tier Edition's own commitment unit
// (TierEditionOverviewFields.tsx) — duplicated locally rather than shared,
// the same precedent BILLING_CYCLES above already sets between the editors.
const MINIMUM_TERM_UNITS: AdminFieldOption[] = [
  { value: 'month', label: 'Month(s)' },
  { value: 'year', label: 'Year(s)' },
];

export interface RateSheetPickerOption {
  id:     string;
  title:  string;
  status: 'active' | 'archived';
}

// Tier Pricing Rules module editor — the occupant's own Rate Sheet binding,
// billing cadence, and minimum commitment. Split out of Tier Overview
// (TierOverviewEditor.tsx) into its own TIER_MODULES entry so it can be
// edited/settled/status-tracked independently.
interface Props {
  draft:          TierPricingRulesDraft;
  onChange:       (patch: Partial<TierPricingRulesDraft>) => void;
  rateSheets?:    RateSheetPickerOption[];
  hasSelections?: boolean;
}

export function TierPricingRulesEditor({ draft, onChange, rateSheets = [], hasSelections = false }: Props) {
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
        def={{ id: 'tier-min-term-value', type: 'text', label: 'Minimum commitment' }}
        value={draft.minimum_term_value != null ? String(draft.minimum_term_value) : ''}
        onChange={(v: string) => onChange({ minimum_term_value: v === '' ? null : Number(v) })}
      />

      <AdminField
        def={{ id: 'tier-min-term-unit', type: 'select', label: 'Commitment unit', unsetLabel: 'None', options: MINIMUM_TERM_UNITS }}
        value={draft.minimum_term_unit ?? ''}
        onChange={(v: string) => onChange({ minimum_term_unit: v || null })}
      />
    </div>
  );
}
