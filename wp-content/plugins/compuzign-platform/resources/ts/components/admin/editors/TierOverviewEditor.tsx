import type { TierOverviewDraft } from '@/api/types/admin';

// Tier Overview module editor (extracted from ServiceTierStep in S3a — the
// tier shells became bindings of the archetype shells and the editor is now
// referenced by the tier binding's editor schema).
//
// The form draft extends the tier-owned overview scalars with the
// station-level popular fields the editor surfaces; on save the owning step
// routes the scalars through saveTierOverview and popular through
// setPopularTier (station-level), exactly as before.

export type TierOverviewEditDraft = TierOverviewDraft & { popular: boolean; popular_label: string };

interface Props {
  draft:    TierOverviewEditDraft;
  onChange: (patch: Partial<TierOverviewEditDraft>) => void;
}

export function TierOverviewEditor({ draft, onChange }: Props) {
  return (
    <div class="cz-tf-form">
      {/* Contact toggle */}
      <div class="cz-tf-field" style="flex-direction: row; align-items: center; gap: var(--cz-space-3)">
        <input type="checkbox" id="tier-contact" checked={draft.contact}
          onChange={(e) => onChange({ contact: (e.target as HTMLInputElement).checked, price: null })} />
        <label class="cz-tf-label" for="tier-contact" style="margin: 0">Contact Us (no fixed price)</label>
      </div>
      {!draft.contact && (
        <div class="cz-tf-field">
          <label class="cz-tf-label">Price</label>
          <input type="number" class="cz-tf-input" min="0" step="0.01"
            value={draft.price ?? ''}
            onInput={(e) => {
              const v = (e.target as HTMLInputElement).value;
              onChange({ price: v === '' ? null : parseFloat(v) });
            }} />
        </div>
      )}
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
