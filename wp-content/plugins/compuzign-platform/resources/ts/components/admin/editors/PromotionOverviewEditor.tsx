import type { BasedOnTier, PromotionOverviewDraft } from '@/api/types/admin';
import { TIER_KEYS, TIER_LABELS } from '@/entity-drawers/shared/serviceDrawerShared';

export function PromotionOverviewEditor({ draft, onChange }: {
  draft: PromotionOverviewDraft;
  onChange: (patch: Partial<PromotionOverviewDraft>) => void;
}) {
  return <div class="cz-tf-form">
    <label class="cz-tf-field"><span class="cz-tf-label">Name</span><input class="cz-tf-input" value={draft.name} onInput={(event) => onChange({ name: event.currentTarget.value })} /></label>
    <label class="cz-tf-field"><span class="cz-tf-label">Based on Tier</span><select class="cz-tf-select" value={draft.based_on ?? ''} onChange={(event) => onChange({ based_on: (event.currentTarget.value || null) as BasedOnTier | null })}><option value="">Select Tier</option>{TIER_KEYS.map((tier) => <option value={tier} key={tier}>{TIER_LABELS[tier]}</option>)}</select></label>
    <label class="cz-tf-field"><span class="cz-tf-label">Headline</span><input class="cz-tf-input" value={draft.headline} onInput={(event) => onChange({ headline: event.currentTarget.value })} /></label>
    <label class="cz-tf-field"><span class="cz-tf-label">Description</span><textarea class="cz-tf-textarea" value={draft.description} onInput={(event) => onChange({ description: event.currentTarget.value })} /></label>
    <label class="cz-tf-field"><span class="cz-tf-label">Derived Price</span><input class="cz-tf-input" readOnly value={draft.price == null ? 'Not configured' : `$${draft.price.toFixed(2)}`} /></label>
    <label class="cz-tf-field"><span class="cz-tf-label">Billing Label</span><input class="cz-tf-input" value={draft.billing_label} onInput={(event) => onChange({ billing_label: event.currentTarget.value })} /></label>
    <label class="cz-tf-field"><span class="cz-tf-label">Badge</span><input class="cz-tf-input" value={draft.badge} onInput={(event) => onChange({ badge: event.currentTarget.value })} /></label>
    <label class="cz-tf-field"><span class="cz-tf-label">Campaign Label</span><input class="cz-tf-input" value={draft.campaign_label} onInput={(event) => onChange({ campaign_label: event.currentTarget.value })} /></label>
    <label class="cz-tf-field"><span class="cz-tf-label">Priority</span><input type="number" min="0" class="cz-tf-input" value={draft.priority} onInput={(event) => onChange({ priority: Number.parseInt(event.currentTarget.value, 10) || 0 })} /></label>
    <label class="cz-tf-field" style="flex-direction:row;align-items:center;gap:var(--cz-space-3)"><input type="checkbox" checked={draft.is_featured} onChange={(event) => onChange({ is_featured: event.currentTarget.checked })} /><span class="cz-tf-label" style="margin:0">Featured</span></label>
  </div>;
}
