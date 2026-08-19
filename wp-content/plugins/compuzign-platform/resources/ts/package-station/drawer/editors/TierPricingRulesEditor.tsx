import { AdminField } from '@/drawer-kit/fields';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { TierCommercialScheduleDraft } from '../../types';
import { CommercialScheduleEditor } from './CommercialScheduleEditor';

// Tier Pricing Rules module editor — Rate Sheet binding, Commitment
// (independent of Legs), and the mandatory Commercial Legs repeater. See
// docs/code-map/tier-pricing-rules-plan.md. Module key/shell name stay
// `commercial_schedule`/`tierCommercialScheduleShell` internally — only the
// visible card title and its fields changed from the earlier Commercial
// Schedule module.

const MINIMUM_TERM_UNITS: AdminFieldOption[] = [
  { value: 'month', label: 'Month(s)' },
  { value: 'year', label: 'Year(s)' },
];

export type TierPricingRulesEditDraft = Required<Pick<TierCommercialScheduleDraft,
  'rate_sheet_id' | 'minimum_term_value' | 'minimum_term_unit' | 'commitment_enabled' | 'commercial_legs'
>>;

export interface RateSheetPickerOption {
  id:     string;
  title:  string;
  status: 'active' | 'archived';
}

interface Props {
  draft:         TierPricingRulesEditDraft;
  onChange:      (patch: Partial<TierPricingRulesEditDraft>) => void;
  rateSheets?:   RateSheetPickerOption[];
  hasSelections?: boolean;
}

export function TierPricingRulesEditor({ draft, onChange, rateSheets = [], hasSelections = false }: Props) {
  // Switching the bound sheet clears this Tier's row selections (enforced at
  // settle). Confirm first so the change is never silent — same convention
  // TierEditionOverviewFields.tsx's own Rate Sheet switch already uses.
  const changeRateSheet = (next: string | null) => {
    if (next === (draft.rate_sheet_id ?? null)) return;
    if (hasSelections && !window.confirm('Switching Rate Sheet clears this tier\'s selected rows. Continue?')) return;
    onChange({ rate_sheet_id: next });
  };
  const rateSheetOptions: AdminFieldOption[] = rateSheets.map((sheet) => ({
    value: sheet.id,
    label: `${sheet.title || '(untitled)'}${sheet.status === 'archived' ? ' (archived)' : ''}`,
  }));

  const commitmentMonths = draft.commitment_enabled && draft.minimum_term_value != null
    ? (draft.minimum_term_unit === 'year' ? draft.minimum_term_value * 12 : draft.minimum_term_value)
    : null;

  return (
    <div class="cz-tf-form">
      <AdminField
        def={{ id: 'tier-rate-sheet', type: 'select', label: 'Rate Sheet', unsetLabel: 'Not bound', options: rateSheetOptions }}
        value={draft.rate_sheet_id ?? ''}
        onChange={(next: string) => changeRateSheet(next || null)}
      />

      {/* Tier Commitment and the two fields it conditionally reveals read as
          one grouped block (.cz-tf-field-group) — Independent of Commercial
          Legs below, which gates only Commitment Unit/Minimum Commitment.
          Legs are never nested under, disabled by, or cleared because this
          is No. */}
      <div class="cz-tf-field-group">
        <AdminField
          def={{ id: 'tier-commitment-enabled', type: 'checkbox', label: 'Tier Commitment' }}
          value={draft.commitment_enabled}
          onChange={(commitment_enabled: boolean) => onChange({ commitment_enabled })}
        />

        {draft.commitment_enabled && (
          <>
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
          </>
        )}
      </div>

      <CommercialScheduleEditor
        draft={draft.commercial_legs}
        onChange={(commercial_legs) => onChange({ commercial_legs })}
        commitmentMonths={commitmentMonths}
      />
    </div>
  );
}
