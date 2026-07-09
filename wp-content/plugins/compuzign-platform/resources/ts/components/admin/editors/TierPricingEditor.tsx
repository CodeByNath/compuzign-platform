import type {
  TierPricingUsage,
  TierPricingUsageItem,
  TierPricingMode,
  PricingBoardItem,
  InclusionItem,
} from '@/api/types/admin';
import { inclusionLabel } from './PricingBoardEditor';

// Tier Pricing Usage (first consumer control centre) — draft/settle-gated tier
// module, same lifecycle machinery as Tier Overview/Features/FAQs. Rows
// reference Package Pricing Board items read-only (base price/unit/quantity
// rules shown as reference data, never edited here); the only tier-owned
// fields per row are `enabled`/`quantity`. Manual tier price remains the
// default fallback — this module never touches it.

// There is no backend seed for usage against the board yet (Phase C deferred
// it), so rows are seeded client-side, 1:1 with the current board, on open.
// A row whose inclusion_id no longer resolves on the board is preserved and
// flagged (never dropped), mirroring the board's own missing-ref handling.
export function seedTierPricingUsage(
  boardItems: PricingBoardItem[],
  existingUsage: TierPricingUsageItem[],
): TierPricingUsageItem[] {
  const seen = new Set<string>();
  const seeded = boardItems.map((b) => {
    seen.add(b.inclusion_id);
    return existingUsage.find((u) => u.inclusion_id === b.inclusion_id)
      ?? { inclusion_id: b.inclusion_id, quantity: null, enabled: false };
  });
  const orphaned = existingUsage.filter((u) => !seen.has(u.inclusion_id));
  return [...seeded, ...orphaned];
}

interface Props {
  draft:      TierPricingUsage;
  boardItems: PricingBoardItem[];
  pool:       InclusionItem[];
  onChange:   (next: TierPricingUsage) => void;
}

export function TierPricingEditor({ draft, boardItems, pool, onChange }: Props) {
  const setMode = (pricing_mode: TierPricingMode) => onChange({ ...draft, pricing_mode });

  const updateRow = (index: number, patch: Partial<TierPricingUsageItem>) => {
    const usage = draft.usage.map((row, i) => i === index ? { ...row, ...patch } : row);
    onChange({ ...draft, usage });
  };

  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label">Pricing Mode</label>
        <select
          class="cz-tf-select"
          value={draft.pricing_mode}
          onChange={(e) => setMode((e.target as HTMLSelectElement).value as TierPricingMode)}
        >
          <option value="manual">Manual (use Tier Overview price)</option>
          <option value="calculated">Calculated (from Pricing Board usage)</option>
        </select>
      </div>

      {draft.usage.length === 0 && (
        <p class="cz-tf-hint" style="margin-bottom:var(--cz-space-3)">
          No Pricing Board items to reference yet — configure the Pricing Board first.
        </p>
      )}

      {draft.usage.map((row, i) => {
        const board = boardItems.find((b) => b.inclusion_id === row.inclusion_id);
        const showQuantity = !board || board.quantity_enabled;
        return (
          <div key={row.inclusion_id} class="cz-ie-faq-item">
            <div class="cz-ie-faq-item__header">
              <span class="cz-tf-label">{board ? inclusionLabel(pool, row.inclusion_id) : row.inclusion_id}</span>
              {!board && <span class="cz-tf-hint">Not on Pricing Board</span>}
            </div>

            {board && (
              <p class="cz-tf-hint" style="margin-bottom:var(--cz-space-2)">
                Base price: {board.base_price !== null ? `$${board.base_price}` : '—'}
                {board.unit ? ` per ${board.unit}` : ''}
                {board.quantity_enabled ? ` · Qty ${board.min_quantity ?? '—'}–${board.max_quantity ?? '—'}` : ''}
              </p>
            )}

            <div class="cz-tf-field" style="flex-direction: row; align-items: center; gap: var(--cz-space-3)">
              <input
                type="checkbox"
                id={`usage-enabled-${row.inclusion_id}`}
                checked={row.enabled}
                onChange={(e) => updateRow(i, { enabled: (e.target as HTMLInputElement).checked })}
              />
              <label class="cz-tf-label" for={`usage-enabled-${row.inclusion_id}`} style="margin: 0">Enabled</label>
            </div>

            {showQuantity && (
              <div class="cz-tf-field">
                <label class="cz-tf-label">Quantity</label>
                <input
                  type="number" class="cz-tf-input" min="0" step="1"
                  value={row.quantity ?? ''}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    updateRow(i, { quantity: v === '' ? null : parseFloat(v) });
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
