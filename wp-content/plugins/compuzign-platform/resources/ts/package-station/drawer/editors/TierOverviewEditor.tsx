import { AdminField, MultiSelectField } from '@/drawer-kit/fields';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { TierOverviewDraft } from '../../types';

// The billing cycles a Tier can carry. A fixed vocabulary, so it is a constant
// rather than a value rebuilt on every render.
const BILLING_CYCLES: AdminFieldOption[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
  { value: 'one-time', label: 'One-time' },
];

const AUDIENCE_GROUPS: AdminFieldOption[] = [
  { value: 'personal_business', label: 'Personal & Business' },
  { value: 'enterprise', label: 'Enterprise' },
];

// The reusable cadence pool the Commercial Schedule module's own legs may
// draw from — same vocabulary as BILLING_CYCLES above (the legacy scalar),
// deliberately a separate constant: one is a single value, this is a set.
const ACTIVE_BILLING_CYCLES: AdminFieldOption[] = BILLING_CYCLES;

// Same vocabulary as Tier Edition's own commitment unit (TierEditionOverviewFields.tsx)
// — duplicated locally rather than shared, the same precedent BILLING_CYCLES
// above already sets between the two editors.
const MINIMUM_TERM_UNITS: AdminFieldOption[] = [
  { value: 'month', label: 'Month(s)' },
  { value: 'year', label: 'Year(s)' },
];

// Tier Overview module editor (extracted from ServiceTierStep in S3a — the
// tier shells became bindings of the archetype shells and the editor is now
// referenced by the tier binding's editor schema).
//
// The form draft extends the tier-owned overview scalars with the
// station-level popular fields the editor surfaces; on save the owning step
// routes the scalars through saveTierOverview and popular through
// setPopularTier (station-level), exactly as before.

export type TierOverviewEditDraft = TierOverviewDraft & {
  // See SurfaceTierDetail.audience_groups.
  audience_groups: ('personal_business' | 'enterprise')[];
  popular: boolean;
  popular_label: string;
};

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
  // An occupant belongs to its Tier Group, not one customer audience. Unset
  // defaults to every group.
  const audienceGroups: ('personal_business' | 'enterprise')[] = draft.audience_groups ?? [];

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

      {/* An explicit override, not a Rate Sheet resolution outcome — checking
          it always reports Contact Us below, regardless of what the bound
          sheet's selected rows would otherwise total. */}
      <AdminField
        def={{ id: 'tier-contact', type: 'checkbox', label: 'Mark as Contact Us' }}
        value={draft.contact}
        onChange={(contact) => onChange({ contact })}
      />

      {/* Price is derived from the bound sheet's selected rows, so it reports
          rather than accepts. Readonly, not disabled: the value is still
          selectable and still submitted. */}
      <AdminField
        def={{ id: 'tier-price', type: 'text', label: 'Price', readonly: true }}
        value={draft.contact ? 'Contact Us' : draft.price != null ? `$${draft.price.toFixed(2)}` : 'Not configured'}
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
        def={{ id: 'tier-min-term-value', type: 'text', label: 'Minimum commitment' }}
        value={draft.minimum_term_value != null ? String(draft.minimum_term_value) : ''}
        onChange={(v: string) => onChange({ minimum_term_value: v === '' ? null : Number(v) })}
      />

      <AdminField
        def={{ id: 'tier-min-term-unit', type: 'select', label: 'Commitment unit', unsetLabel: 'None', options: MINIMUM_TERM_UNITS }}
        value={draft.minimum_term_unit ?? ''}
        onChange={(v: string) => onChange({ minimum_term_unit: v || null })}
      />

      {/* The cadence pool Commercial Schedule's own legs may draw from —
          optional; a Tier with none selected stays in Simple Mode, using
          Billing Cycle above exactly as before this capability existed. */}
      <MultiSelectField
        id="tier-active-billing-cycles"
        label="Active Billing Cycles"
        options={ACTIVE_BILLING_CYCLES}
        selected={draft.active_billing_cycles ?? []}
        onChange={(next) => onChange({ active_billing_cycles: next })}
      />

      <AdminField
        def={{ id: 'tier-label', type: 'text', label: 'Display Label (optional)' }}
        value={draft.label}
        onChange={(label) => onChange({ label })}
      />

      <MultiSelectField
        id="tier-audience-groups"
        label="Customer Groups"
        options={AUDIENCE_GROUPS}
        selected={audienceGroups}
        onChange={(next) => onChange({ audience_groups: next as ('personal_business' | 'enterprise')[] })}
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
