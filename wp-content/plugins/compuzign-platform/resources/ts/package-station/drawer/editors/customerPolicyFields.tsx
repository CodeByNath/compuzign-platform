import type { ComponentChildren } from 'preact';
import type { CustomerPolicy, CustomerPolicyItem } from '@/api/types/cost-builder';

// Shared customer_policy per-item mutation/lookup + presentational controls
// — the ONE place this logic lives, reused by both CustomerPolicyEditor.tsx
// (the standalone Customer Selection Rules drawer, kept as rollback/parity
// surface — see docs/code-map/tier-composable-occupant-admin-customer-
// policy.md) and PoolInclusionsEditor.tsx's merged row (Phase 2 of
// project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md). Neither
// caller may duplicate this mutation logic.

const DEFAULT_PRICE_OPTION: CustomerPolicyItem['price_option'] = {
  mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null,
};

export function findCustomerPolicyItem(policy: CustomerPolicy | null | undefined, itemId: string): CustomerPolicyItem | null {
  return policy?.items.find((item) => item.item_id === itemId) ?? null;
}

// A `patch` of `null` means "Not offered" — removes the item's own entry
// entirely rather than persisting an explicit `excluded` record, matching
// the customer-side "absent === excluded" default
// (PackageSchema::sanitizeCustomerPolicy()) so the two representations never
// diverge. Pure — never mutates `policy`.
export function patchCustomerPolicyItem(policy: CustomerPolicy | null, itemId: string, patch: Partial<CustomerPolicyItem> | null): CustomerPolicy {
  const items = policy?.items ?? [];
  const others = items.filter((item) => item.item_id !== itemId);
  if (patch === null) return { items: others };
  const existing = items.find((item) => item.item_id === itemId);
  const next: CustomerPolicyItem = existing
    ? { ...existing, ...patch }
    : {
        item_id: itemId, mode: 'optional', default_selected: false, quantity: null,
        price_option: DEFAULT_PRICE_OPTION, featured: false,
        ...patch,
      };
  return { items: [...others, next] };
}

// Presentational controls for one item's own customer_policy entry — no
// row/item name of its own (the caller's own row already shows one; pass
// `leadingLabel` to add one beside the mode select, as the standalone drawer
// does for its flatter list). Price Option authoring is deliberately absent
// — see PackageRepository::resolveComposableOfferSelection(); every item's
// price_option stays permanently {mode:'fixed'} via patchCustomerPolicyItem's
// own default.
export function CustomerPolicyItemFields({
  rowLabel, item, onChange, leadingLabel,
}: {
  rowLabel: string;
  item: CustomerPolicyItem | null;
  onChange: (patch: Partial<CustomerPolicyItem> | null) => void;
  leadingLabel?: ComponentChildren;
}) {
  const mode = item?.mode ?? 'excluded';

  return (
    <>
      <div class="cz-ie-row">
        {leadingLabel ?? <span class="cz-tf-label">Customer Selection</span>}
        <select
          class="cz-tf-select"
          aria-label={`Customer access for ${rowLabel}`}
          value={mode}
          onChange={(event) => {
            const nextMode = event.currentTarget.value as 'required' | 'optional' | 'excluded';
            if (nextMode === 'excluded') { onChange(null); return; }
            onChange({ mode: nextMode });
          }}
        >
          <option value="excluded">Not offered</option>
          <option value="required">Always included</option>
          <option value="optional">Customer Add/Remove</option>
        </select>
      </div>

      {mode !== 'excluded' && (
        <>
          <div class="cz-ie-divider" />

          {mode === 'optional' && (
            <label class="cz-ie-row">
              <input
                type="checkbox" class="cz-tf-checkbox"
                checked={item?.default_selected ?? false}
                onChange={(event) => onChange({ default_selected: event.currentTarget.checked })}
              />
              <span class="cz-tf-label">Selected by default</span>
            </label>
          )}

          <label class="cz-ie-row">
            <input
              type="checkbox" class="cz-tf-checkbox"
              checked={item?.quantity !== null && item?.quantity !== undefined}
              onChange={(event) => onChange({
                quantity: event.currentTarget.checked
                  ? { default: 1, min: 1, max: 1, step: 1 }
                  : null,
              })}
            />
            <span class="cz-tf-label">Customer-configurable quantity</span>
          </label>
          {item?.quantity && (
            <div class="cz-ie-row">
              <input class="cz-tf-input cz-ie-qty-input" type="number" min="1" step="1"
                aria-label={`Default quantity for ${rowLabel}`}
                value={item.quantity.default}
                onInput={(event) => onChange({ quantity: { ...item.quantity!, default: Math.max(1, Number(event.currentTarget.value) || 1) } })}
              />
              <input class="cz-tf-input cz-ie-qty-input" type="number" min="1" step="1"
                aria-label={`Minimum quantity for ${rowLabel}`}
                value={item.quantity.min}
                onInput={(event) => onChange({ quantity: { ...item.quantity!, min: Math.max(1, Number(event.currentTarget.value) || 1) } })}
              />
              <input class="cz-tf-input cz-ie-qty-input" type="number" min="1" step="1"
                aria-label={`Maximum quantity for ${rowLabel}`}
                value={item.quantity.max}
                onInput={(event) => onChange({ quantity: { ...item.quantity!, max: Math.max(1, Number(event.currentTarget.value) || 1) } })}
              />
              <input class="cz-tf-input cz-ie-qty-input" type="number" min="1" step="1"
                aria-label={`Quantity step for ${rowLabel}`}
                value={item.quantity.step}
                onInput={(event) => onChange({ quantity: { ...item.quantity!, step: Math.max(1, Number(event.currentTarget.value) || 1) } })}
              />
            </div>
          )}

          <label class="cz-ie-row">
            <input
              type="checkbox" class="cz-tf-checkbox"
              checked={item?.featured ?? false}
              onChange={(event) => onChange({ featured: event.currentTarget.checked })}
            />
            <span class="cz-tf-label">Featured (Recommended Upgrades sort)</span>
          </label>
        </>
      )}
    </>
  );
}
