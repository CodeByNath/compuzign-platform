import type { PricingBoardItem, InclusionItem } from '@/api/types/admin';

// Package Pricing Board (declaration control centre) — package-level, immediate-
// write item editor. Rows are 1:1 with the service's inclusion pool: they are
// seeded/reconciled server-side (seedAndReconcilePricingBoard), never added or
// removed here — a row the admin doesn't want simply stays `enabled: false`.
// Mirrors ServiceFaqsEditor's per-row-card layout (cz-ie-faq-item), without the
// add/remove affordances since rows aren't user-created.

export interface PricingBoardDraft {
  items: PricingBoardItem[];
}

interface Props {
  draft:    PricingBoardDraft;
  pool:     InclusionItem[];
  onChange: (next: PricingBoardDraft) => void;
}

// Exported for TierPricingEditor (Phase E) — same pool → label resolution,
// board items and usage rows both key off inclusion_id.
export function inclusionLabel(pool: InclusionItem[], inclusionId: string): string {
  return pool.find((i) => i.id === inclusionId)?.label || inclusionId;
}

export function PricingBoardEditor({ draft, pool, onChange }: Props) {
  const updateItem = (index: number, patch: Partial<PricingBoardItem>) => {
    const items = draft.items.map((item, i) => i === index ? { ...item, ...patch } : item);
    onChange({ items });
  };

  if (draft.items.length === 0) {
    return (
      <p class="cz-tf-hint" style="margin-bottom:var(--cz-space-3)">
        This service has no inclusions in its pool yet — add features on the Service drawer first.
      </p>
    );
  }

  return (
    <div class="cz-tf-form">
      {draft.items.map((item, i) => (
        <div key={item.inclusion_id} class="cz-ie-faq-item">
          <div class="cz-ie-faq-item__header">
            <span class="cz-tf-label">{inclusionLabel(pool, item.inclusion_id)}</span>
            {item.missing && <span class="cz-tf-hint">Missing from pool</span>}
          </div>

          <div class="cz-tf-field" style="flex-direction: row; align-items: center; gap: var(--cz-space-3)">
            <input
              type="checkbox"
              id={`board-enabled-${item.inclusion_id}`}
              checked={item.enabled}
              onChange={(e) => updateItem(i, { enabled: (e.target as HTMLInputElement).checked })}
            />
            <label class="cz-tf-label" for={`board-enabled-${item.inclusion_id}`} style="margin: 0">Enabled</label>
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Base Price</label>
            <input
              type="number" class="cz-tf-input" min="0" step="0.01"
              value={item.base_price ?? ''}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                updateItem(i, { base_price: v === '' ? null : parseFloat(v) });
              }}
            />
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Unit (optional)</label>
            <input
              type="text" class="cz-tf-input" placeholder="e.g. per user, per GB"
              value={item.unit ?? ''}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                updateItem(i, { unit: v === '' ? null : v });
              }}
            />
          </div>

          <div class="cz-tf-field" style="flex-direction: row; align-items: center; gap: var(--cz-space-3)">
            <input
              type="checkbox"
              id={`board-qty-${item.inclusion_id}`}
              checked={item.quantity_enabled}
              onChange={(e) => updateItem(i, { quantity_enabled: (e.target as HTMLInputElement).checked })}
            />
            <label class="cz-tf-label" for={`board-qty-${item.inclusion_id}`} style="margin: 0">Quantity applies</label>
          </div>

          {item.quantity_enabled && (
            <>
              <div class="cz-tf-field">
                <label class="cz-tf-label">Default Quantity</label>
                <input
                  type="number" class="cz-tf-input" min="0" step="1"
                  value={item.default_quantity ?? ''}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    updateItem(i, { default_quantity: v === '' ? null : parseFloat(v) });
                  }}
                />
              </div>
              <div class="cz-tf-field">
                <label class="cz-tf-label">Min Quantity</label>
                <input
                  type="number" class="cz-tf-input" min="0" step="1"
                  value={item.min_quantity ?? ''}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    updateItem(i, { min_quantity: v === '' ? null : parseFloat(v) });
                  }}
                />
              </div>
              <div class="cz-tf-field">
                <label class="cz-tf-label">Max Quantity</label>
                <input
                  type="number" class="cz-tf-input" min="0" step="1"
                  value={item.max_quantity ?? ''}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    updateItem(i, { max_quantity: v === '' ? null : parseFloat(v) });
                  }}
                />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
