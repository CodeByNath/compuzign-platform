import type { PromotionOverviewDraft, BasedOnTier } from '@/api/types/admin';

// Promotion Overview module editor (extracted from ServicePromotionStep in
// S3a — the promotion shells became bindings of the archetype shells and the
// editor is now referenced by the promotion binding's editor schema). Used
// both for New Promotion (create) and for editing an existing promotion's
// overview fields (persisted as a module draft). Travel status is
// engine-owned and deliberately not part of the draft.

const BASED_ON_TIERS = [
  { id: 'basic', label: 'Basic' },
  { id: 'standard', label: 'Standard' },
  { id: 'premium', label: 'Premium' },
  { id: 'enterprise', label: 'Enterprise' },
  { id: 'ultimate', label: 'Ultimate' },
];

interface Props {
  draft:    PromotionOverviewDraft;
  onChange: (patch: Partial<PromotionOverviewDraft>) => void;
  saveOk?:  boolean;
}

export function PromotionOverviewEditor({ draft, onChange, saveOk }: Props) {
  return (
    <div class="cz-tf-form">

      <div class="cz-tf-field">
        <label class="cz-tf-label">Name</label>
        <input type="text" class="cz-tf-input" value={draft.name}
          onInput={(e) => onChange({ name: (e.target as HTMLInputElement).value })} />
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label">Based on tier</label>
        <select class="cz-tf-select" value={draft.based_on ?? ''}
          onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            onChange({ based_on: (v as BasedOnTier) || null });
          }}>
          <option value="">None</option>
          {BASED_ON_TIERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label">Headline</label>
        <input type="text" class="cz-tf-input" value={draft.headline}
          onInput={(e) => onChange({ headline: (e.target as HTMLInputElement).value })} />
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label">Description</label>
        <textarea class="cz-tf-textarea" value={draft.description}
          onInput={(e) => onChange({ description: (e.target as HTMLTextAreaElement).value })} />
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label">Price</label>
        <input type="number" class="cz-tf-input" min="0" step="0.01" value={draft.price ?? ''}
          onInput={(e) => { const v = (e.target as HTMLInputElement).value; onChange({ price: v === '' ? null : parseFloat(v) }); }} />
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label">Billing label</label>
        <input type="text" class="cz-tf-input" value={draft.billing_label}
          onInput={(e) => onChange({ billing_label: (e.target as HTMLInputElement).value })} />
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label">Badge</label>
        <input type="text" class="cz-tf-input" value={draft.badge}
          onInput={(e) => onChange({ badge: (e.target as HTMLInputElement).value })} />
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label">Campaign label</label>
        <input type="text" class="cz-tf-input" value={draft.campaign_label}
          onInput={(e) => onChange({ campaign_label: (e.target as HTMLInputElement).value })} />
      </div>

      <div class="cz-tf-field" style="flex-direction: row; align-items: center; gap: var(--cz-space-3)">
        <input type="checkbox" id="promo-overview-featured" checked={draft.is_featured}
          onChange={(e) => onChange({ is_featured: (e.target as HTMLInputElement).checked })} />
        <label class="cz-tf-label" for="promo-overview-featured" style="margin: 0">Featured</label>
      </div>

      <div class="cz-tf-field">
        <label class="cz-tf-label">Priority</label>
        <input type="number" class="cz-tf-input" min="0" value={draft.priority}
          onInput={(e) => onChange({ priority: parseInt((e.target as HTMLInputElement).value, 10) || 0 })} />
      </div>

      {saveOk && <p class="cz-admin-ok-msg" style="margin-top: var(--cz-space-3)">Saved.</p>}
    </div>
  );
}
