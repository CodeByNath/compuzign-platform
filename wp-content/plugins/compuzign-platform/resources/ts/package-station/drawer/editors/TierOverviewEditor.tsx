import type { TierOverviewDraft } from '../../types';

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
  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label">Rate Sheet</label>
        <select class="cz-tf-select" value={draft.rate_sheet_id ?? ''}
          onChange={(e) => changeRateSheet((e.target as HTMLSelectElement).value || null)}>
          <option value="">Not bound</option>
          {rateSheets.map((sheet) => (
            <option key={sheet.id} value={sheet.id}>
              {sheet.title || '(untitled)'}{sheet.status === 'archived' ? ' (archived)' : ''}
            </option>
          ))}
        </select>
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label">Price</label>
        <input type="text" class="cz-tf-input" value={draft.price != null ? `$${draft.price.toFixed(2)}` : 'Not configured'} readOnly />
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label">Billing Cycle</label>
        <select class="cz-tf-select" value={draft.billing_cycle}
          onChange={(e) => onChange({ billing_cycle: (e.target as HTMLSelectElement).value })}>
          <option value="monthly">Monthly</option>
          <option value="annually">Annually</option>
          <option value="one-time">One-time</option>
        </select>
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label">Display Label (optional)</label>
        <input type="text" class="cz-tf-input" value={draft.label}
          onInput={(e) => onChange({ label: (e.target as HTMLInputElement).value })} />
      </div>
      <div class="cz-tf-field">
        <label class="cz-tf-label">Ideal For</label>
        <textarea class="cz-tf-input" rows={3} value={draft.ideal_for}
          onInput={(e) => onChange({ ideal_for: (e.target as HTMLTextAreaElement).value })} />
      </div>
      <div class="cz-tf-field" style="flex-direction: row; align-items: center; gap: var(--cz-space-3)">
        <input type="checkbox" id="tier-popular" checked={draft.popular}
          onChange={(e) => onChange({ popular: (e.target as HTMLInputElement).checked })} />
        <label class="cz-tf-label" for="tier-popular" style="margin: 0">Mark as popular tier</label>
      </div>
      {draft.popular && (
        <div class="cz-tf-field">
          <label class="cz-tf-label">Popular badge label</label>
          <input type="text" class="cz-tf-input" value={draft.popular_label}
            onInput={(e) => onChange({ popular_label: (e.target as HTMLInputElement).value })} />
        </div>
      )}
    </div>
  );
}
