import { useState } from 'preact/hooks';
import { AdminField } from '@/drawer-kit/fields';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { TierPricingRulesDraft } from '../../types';

// Payment Category is the coarse choice; Billing Cycle's own options narrow
// to whichever cadence vocabulary that category admits — Fixed offers
// One-time/Upfront, Recurring offers Yearly/Monthly. No separate stored
// field: it is derived from billing_cycle itself (below), the same
// presentation-only-choice pattern Tier Commitment already uses over
// minimum_term_value/unit.
type PaymentCategory = 'fixed' | 'recurring';

const PAYMENT_CATEGORIES: AdminFieldOption[] = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'recurring', label: 'Recurring' },
];

const FIXED_BILLING_CYCLES: AdminFieldOption[] = [
  { value: 'one-time', label: 'One-time' },
  { value: 'upfront', label: 'Upfront' },
];

const RECURRING_BILLING_CYCLES: AdminFieldOption[] = [
  { value: 'annually', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'daily', label: 'Daily' },
];

function paymentCategoryOf(billingCycle: string): PaymentCategory {
  return billingCycle === 'one-time' || billingCycle === 'upfront' ? 'fixed' : 'recurring';
}

// Same vocabulary as Tier Edition's own commitment unit
// (TierEditionOverviewFields.tsx) — duplicated locally rather than shared,
// the same precedent the billing-cycle vocabulary above already sets
// between the editors.
const MINIMUM_TERM_UNITS: AdminFieldOption[] = [
  { value: 'day', label: 'Day(s)' },
  { value: 'week', label: 'Week(s)' },
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
  // "Tier Commitment" is a presentation-only choice over the two stored
  // fields below it — there is no separate stored enabled flag. Seeded once
  // from whichever field already carries a value when the editor opens
  // (this component remounts fresh per edit session, so a stale toggle from
  // a previous session never leaks in); unchecking clears both fields
  // immediately, the same explicit-null-clears rule they already followed.
  const [commitmentEnabled, setCommitmentEnabled] = useState(
    draft.minimum_term_value != null || draft.minimum_term_unit != null,
  );
  const toggleCommitment = (enabled: boolean) => {
    setCommitmentEnabled(enabled);
    if (!enabled) {
      onChange({ minimum_term_value: null, minimum_term_unit: null });
    }
  };

  // Payment Category only narrows which Billing Cycle options are offered —
  // no automatic relation beyond that: switching category never writes
  // billing_cycle itself, only the picker's own onChange below does.
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>(
    paymentCategoryOf(draft.billing_cycle),
  );
  const billingCycleOptions = paymentCategory === 'fixed' ? FIXED_BILLING_CYCLES : RECURRING_BILLING_CYCLES;

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
        def={{ id: 'tier-commitment-enabled', type: 'checkbox', label: 'Tier Commitment' }}
        value={commitmentEnabled}
        onChange={toggleCommitment}
      />

      {commitmentEnabled && (
        <div class="cz-tf-field-row">
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
      )}

      <div class="cz-tf-field-row">
        <AdminField
          def={{
            id: 'tier-payment-category',
            type: 'select',
            label: 'Payment Category',
            options: PAYMENT_CATEGORIES,
          }}
          value={paymentCategory}
          onChange={(category: string) => setPaymentCategory(category as PaymentCategory)}
        />

        <AdminField
          def={{
            id: 'tier-billing-cycle',
            type: 'select',
            label: 'Billing Cycle',
            options: billingCycleOptions,
          }}
          value={draft.billing_cycle}
          onChange={(billing_cycle: string) => onChange({ billing_cycle })}
        />
      </div>

      {/* Coverage window this declaration applies to — plain month numbers,
          not calendar-bound to 1-12: e.g. a recurring cycle covering only
          months 3-12, or extending past 12 into a later year. draft is
          seeded with 1/12 when the editor opens (useTierModuleEditing.ts),
          so what's shown here already matches what a Save with no further
          edits would persist. */}
      <div class="cz-tf-field-row">
        <AdminField
          def={{ id: 'tier-from-month', type: 'text', label: 'From month' }}
          value={draft.from_month != null ? String(draft.from_month) : ''}
          onChange={(v: string) => onChange({ from_month: v === '' ? null : Number(v) })}
        />

        <AdminField
          def={{ id: 'tier-to-month', type: 'text', label: 'To month' }}
          value={draft.to_month != null ? String(draft.to_month) : ''}
          onChange={(v: string) => onChange({ to_month: v === '' ? null : Number(v) })}
        />
      </div>
    </div>
  );
}
