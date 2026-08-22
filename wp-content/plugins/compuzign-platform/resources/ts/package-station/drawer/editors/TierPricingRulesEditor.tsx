import { useState } from 'preact/hooks';
import { AdminField } from '@/drawer-kit/fields';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { TierCommercialLeg, TierPricingRulesDraft } from '../../types';
import { totalCommitmentMonths } from '../tier/tierDetailModel';

// Payment Category is the coarse choice; Billing Cycle's own options narrow
// to whichever cadence vocabulary that category admits — Fixed offers
// One-time/Upfront, Recurring offers Yearly/Monthly/Weekly/Daily. No
// separate stored field: it is derived from billing_cycle itself (below),
// the same presentation-only-choice pattern Tier Commitment already uses
// over minimum_term_value/unit.
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
// between the editors. Months-only: Day(s)/Week(s)/Year(s) are retired, but
// the field stays a real select (not a static label) — see toggleCommitment
// below, which seeds 'month' the moment commitment is enabled.
const MINIMUM_TERM_UNITS: AdminFieldOption[] = [
  { value: 'month', label: 'Month(s)' },
];

export interface RateSheetPickerOption {
  id:     string;
  title:  string;
  status: 'active' | 'archived';
}

// One Commercial Leg card — Payment Category/Billing Cycle/From-To month for
// either Leg Default (whose fields live flat on TierPricingRulesDraft, wired
// in through `leg`/`onChange` below just like any other leg's own object) or
// one of the additional legs array entries. Payment Category's own local
// toggle state is per-card, seeded from THIS leg's own billing_cycle, so
// switching one leg's category never affects a sibling's.
interface LegCardProps {
  leg:       Pick<TierCommercialLeg, 'billing_cycle' | 'from_month' | 'to_month'>;
  onChange:  (patch: Partial<TierCommercialLeg>) => void;
  label:     string;
  removable: boolean;
  onRemove?: () => void;
}

function CommercialLegCard({ leg, onChange, label, removable, onRemove }: LegCardProps) {
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>(
    paymentCategoryOf(leg.billing_cycle),
  );
  const billingCycleOptions = paymentCategory === 'fixed' ? FIXED_BILLING_CYCLES : RECURRING_BILLING_CYCLES;

  return (
    <div class="cz-ie-faq-item">
      <div class="cz-ie-faq-item__header">
        <span class="cz-tf-label">{label}</span>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
          disabled={!removable}
          onClick={onRemove}
        >
          Remove
        </button>
      </div>

      <div class="cz-tf-field-row">
        <AdminField
          def={{ id: 'leg-payment-category', type: 'select', label: 'Payment Category', options: PAYMENT_CATEGORIES }}
          value={paymentCategory}
          onChange={(category: string) => setPaymentCategory(category as PaymentCategory)}
        />
        <AdminField
          def={{ id: 'leg-billing-cycle', type: 'select', label: 'Billing Cycle', options: billingCycleOptions }}
          value={leg.billing_cycle}
          onChange={(billing_cycle: string) => onChange({ billing_cycle })}
        />
      </div>

      <div class="cz-tf-field-row">
        <AdminField
          def={{ id: 'leg-from-month', type: 'text', label: 'From month' }}
          value={leg.from_month != null ? String(leg.from_month) : ''}
          onChange={(v: string) => onChange({ from_month: v === '' ? null : Number(v) })}
        />
        <AdminField
          def={{ id: 'leg-to-month', type: 'text', label: 'To month', placeholder: 'Indefinite' }}
          value={leg.to_month != null ? String(leg.to_month) : ''}
          onChange={(v: string) => onChange({ to_month: v === '' ? null : Number(v) })}
        />
      </div>
    </div>
  );
}

// Tier Pricing Rules module editor — the occupant's own Rate Sheet binding,
// billing cadence, minimum commitment, and Commercial Legs schedule. Split
// out of Tier Overview (TierOverviewEditor.tsx) into its own TIER_MODULES
// entry so it can be edited/settled/status-tracked independently.
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
    } else if (draft.minimum_term_unit == null) {
      onChange({ minimum_term_unit: 'month' });
    }
  };

  const legs = draft.legs ?? [];

  // Once a commitment's value AND unit are both known, Leg Default's own
  // range auto-fills to the FULL commitment (1 through the total) — only
  // while no additional leg exists yet, so a schedule the admin has already
  // started customizing is never silently overwritten. Recomputed on every
  // keystroke against the value the OTHER field will hold after this patch
  // (not the stale `draft` one, which hasn't re-rendered yet).
  const changeMinTermValue = (v: string) => {
    const value = v === '' ? null : Number(v);
    const patch: Partial<TierPricingRulesDraft> = { minimum_term_value: value };
    const totalMonths = totalCommitmentMonths(value, draft.minimum_term_unit ?? null);
    if (totalMonths !== null && legs.length === 0) {
      patch.from_month = draft.from_month ?? 0;
      patch.to_month = totalMonths;
    }
    onChange(patch);
  };
  const changeMinTermUnit = (v: string) => {
    const unit = v || null;
    const patch: Partial<TierPricingRulesDraft> = { minimum_term_unit: unit };
    const totalMonths = totalCommitmentMonths(draft.minimum_term_value ?? null, unit);
    if (totalMonths !== null && legs.length === 0) {
      patch.from_month = draft.from_month ?? 0;
      patch.to_month = totalMonths;
    }
    onChange(patch);
  };

  // Leg Default's own field changes. Shrinking its own to_month while an
  // additional leg already exists carries the boundary forward onto that
  // NEXT leg's own from_month, so the two never leave a gap between them —
  // only the immediately-adjacent leg follows; a longer chain of legs past
  // it is left for the admin to adjust by hand.
  const changeDefaultLeg = (patch: Partial<TierCommercialLeg>) => {
    const fullPatch: Partial<TierPricingRulesDraft> = { ...patch };
    if ('to_month' in patch && patch.to_month != null && legs.length > 0) {
      const nextLegs = [...legs];
      nextLegs[0] = { ...nextLegs[0], from_month: patch.to_month + 1 };
      fullPatch.legs = nextLegs;
    }
    onChange(fullPatch);
  };

  const updateLeg = (index: number, patch: Partial<TierCommercialLeg>) => {
    onChange({ legs: legs.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)) });
  };
  const removeLeg = (index: number) => {
    onChange({ legs: legs.filter((_, i) => i !== index) });
  };
  // Continuity: a new leg starts the day after whatever came before it
  // (the previous leg's own to_month, or Leg Default's when there are no
  // additional legs yet). Recurring/Monthly by default, matching the
  // "many legs without commitments" default cadence; its own to_month
  // fills with the REMAINING commitment when one is active, else stays
  // Indefinite (null) — the same "fill automatically with remaining, edit
  // capability" rule Leg Default's own activation follows above.
  const addLeg = () => {
    const lastToMonth = legs.length > 0 ? legs[legs.length - 1].to_month : draft.to_month;
    const totalMonths = totalCommitmentMonths(draft.minimum_term_value ?? null, draft.minimum_term_unit ?? null);
    const newLeg: TierCommercialLeg = {
      billing_cycle: 'monthly',
      from_month: lastToMonth != null ? lastToMonth + 1 : null,
      to_month: totalMonths,
    };
    onChange({ legs: [...legs, newLeg] });
  };

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
            onChange={changeMinTermValue}
          />

          <AdminField
            def={{ id: 'tier-min-term-unit', type: 'select', label: 'Commitment unit', unsetLabel: 'None', options: MINIMUM_TERM_UNITS }}
            value={draft.minimum_term_unit ?? ''}
            onChange={changeMinTermUnit}
          />
        </div>
      )}

      <div class="cz-ie-faq-item__header">
        <div>
          <span class="cz-tf-label">Commercial Legs</span>
          <p class="cz-tf-hint">Payment behaviour over time.</p>
        </div>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={addLeg}>
          + Add Leg
        </button>
      </div>

      {/* Leg Default — the occupant's own permanent declaration
          (billing_cycle/from_month/to_month above), presented as the first,
          unremovable leg. draft is seeded with from_month 0 and to_month
          Indefinite (null) — or the full commitment, when one is already
          configured — when the editor opens (useTierModuleEditing.ts), so
          what's shown here already matches what a Save with no further
          edits would persist. */}
      <CommercialLegCard
        leg={{ billing_cycle: draft.billing_cycle, from_month: draft.from_month ?? null, to_month: draft.to_month ?? null }}
        onChange={changeDefaultLeg}
        label="Leg Default"
        removable={false}
      />

      {legs.map((leg, index) => (
        <CommercialLegCard
          key={leg.id ?? index}
          leg={leg}
          onChange={(patch) => updateLeg(index, patch)}
          label={`Leg ${index + 1}`}
          removable
          onRemove={() => removeLeg(index)}
        />
      ))}
    </div>
  );
}
