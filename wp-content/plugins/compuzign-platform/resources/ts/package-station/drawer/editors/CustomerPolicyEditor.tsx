import type { CustomerPolicy, CustomerPolicyItem } from '@/api/types/cost-builder';
import type { TierResolvedRateSheetSelection } from '../../types';

// Admin authoring surface for the composable occupant's own customer_policy
// — Phase 2B1.1 (see docs/code-map/tier-composable-occupant-customer-ux.md
// for the customer-facing browse surface this feeds, and
// project-work/2026-09-03-composable-tier-admin-to-customer-validation.md
// for the locked architecture this implements).
//
// References the occupant's own already-published Rate Sheet rows
// (rateSheetCatalogue, the SAME resolved catalogue Tier Inclusions' own
// editor reads — see PoolInclusionsEditor.tsx) only. No second inclusion
// list, no independent pricing, no Price Option customer-selectability (the
// customer never picks one — see PackageRepository::
// resolveComposableOfferSelection()) — this drawer only authors WHICH
// option the policy allows/defaults to, same as it already authors
// quantity bounds.
//
// A row absent from the draft's own items[] displays as "Not offered"
// (mode: excluded) — the exact same safe default
// PackageSchema::sanitizeCustomerPolicy() and the resolver itself already
// apply to a missing entry, so this editor never needs to persist an
// explicit excluded entry for a row it can see live in the catalogue:
// switching a row back to "Not offered" simply removes its entry from the
// saved array entirely, keeping the payload as small as what is actually
// authorized.

interface Props {
  draft: CustomerPolicy | null;
  onChange: (next: CustomerPolicy | null) => void;
  rateSheetCatalogue: TierResolvedRateSheetSelection[];
}

const DEFAULT_PRICE_OPTION: CustomerPolicyItem['price_option'] = {
  mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null,
};

function findItem(policy: CustomerPolicy | null, itemId: string): CustomerPolicyItem | null {
  return policy?.items.find((item) => item.item_id === itemId) ?? null;
}

export function CustomerPolicyEditor({ draft, onChange, rateSheetCatalogue }: Props) {
  const rows = rateSheetCatalogue.filter((row) => row.resolved);

  const patchItem = (itemId: string, patch: Partial<CustomerPolicyItem> | null) => {
    const items = draft?.items ?? [];
    const others = items.filter((item) => item.item_id !== itemId);
    if (patch === null) {
      onChange({ items: others });
      return;
    }
    const existing = items.find((item) => item.item_id === itemId);
    const next: CustomerPolicyItem = existing
      ? { ...existing, ...patch }
      : {
          item_id: itemId, mode: 'optional', default_selected: false, quantity: null,
          price_option: DEFAULT_PRICE_OPTION, featured: false,
          ...patch,
        };
    onChange({ items: [...others, next] });
  };

  if (rows.length === 0) {
    return (
      <div class="cz-tf-form">
        <p class="cz-ie-sub-empty">Add Rate Sheet inclusions to this occupant first — there is nothing yet to author customer rules over.</p>
      </div>
    );
  }

  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label">Customer Selection Rules</label>
        <div class="cz-ie-list">
          {rows.map((row) => {
            const item = findItem(draft, row.item_id);
            const mode = item?.mode ?? 'excluded';
            const priceOptions = row.price_options ?? [];

            return (
              <div key={row.item_id} class="cz-ie-entry">
                <div class="cz-ie-row">
                  <div class="cz-tf-input" aria-label={row.label}>{row.label}</div>
                  <select
                    class="cz-tf-select"
                    aria-label={`Customer access for ${row.label}`}
                    value={mode}
                    onChange={(event) => {
                      const nextMode = event.currentTarget.value as 'required' | 'optional' | 'excluded';
                      if (nextMode === 'excluded') { patchItem(row.item_id, null); return; }
                      patchItem(row.item_id, { mode: nextMode });
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
                          onChange={(event) => patchItem(row.item_id, { default_selected: event.currentTarget.checked })}
                        />
                        <span class="cz-tf-label">Selected by default</span>
                      </label>
                    )}

                    <label class="cz-ie-row">
                      <input
                        type="checkbox" class="cz-tf-checkbox"
                        checked={item?.quantity !== null && item?.quantity !== undefined}
                        onChange={(event) => patchItem(row.item_id, {
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
                          aria-label={`Default quantity for ${row.label}`}
                          value={item.quantity.default}
                          onInput={(event) => patchItem(row.item_id, { quantity: { ...item.quantity!, default: Math.max(1, Number(event.currentTarget.value) || 1) } })}
                        />
                        <input class="cz-tf-input cz-ie-qty-input" type="number" min="1" step="1"
                          aria-label={`Minimum quantity for ${row.label}`}
                          value={item.quantity.min}
                          onInput={(event) => patchItem(row.item_id, { quantity: { ...item.quantity!, min: Math.max(1, Number(event.currentTarget.value) || 1) } })}
                        />
                        <input class="cz-tf-input cz-ie-qty-input" type="number" min="1" step="1"
                          aria-label={`Maximum quantity for ${row.label}`}
                          value={item.quantity.max}
                          onInput={(event) => patchItem(row.item_id, { quantity: { ...item.quantity!, max: Math.max(1, Number(event.currentTarget.value) || 1) } })}
                        />
                        <input class="cz-tf-input cz-ie-qty-input" type="number" min="1" step="1"
                          aria-label={`Quantity step for ${row.label}`}
                          value={item.quantity.step}
                          onInput={(event) => patchItem(row.item_id, { quantity: { ...item.quantity!, step: Math.max(1, Number(event.currentTarget.value) || 1) } })}
                        />
                      </div>
                    )}

                    {priceOptions.length > 0 && (
                      <div class="cz-ie-row">
                        <select
                          class="cz-tf-select"
                          aria-label={`Price Option policy for ${row.label}`}
                          value={item?.price_option.mode ?? 'fixed'}
                          onChange={(event) => {
                            const nextPriceMode = event.currentTarget.value as 'fixed' | 'choice';
                            patchItem(row.item_id, {
                              price_option: nextPriceMode === 'fixed'
                                ? DEFAULT_PRICE_OPTION
                                : { mode: 'choice', allowed_price_option_ids: [], default_price_option_id: null },
                            });
                          }}
                        >
                          <option value="fixed">Fixed price (published option only)</option>
                          <option value="choice">Admin-authorized alternatives</option>
                        </select>
                      </div>
                    )}
                    {priceOptions.length > 0 && item?.price_option.mode === 'choice' && (
                      <div class="cz-ie-list">
                        {priceOptions.map((option) => {
                          const allowed = item.price_option.allowed_price_option_ids ?? [];
                          const isAllowed = allowed.includes(option.option_id);
                          return (
                            <label key={option.option_id} class="cz-ie-row">
                              <input
                                type="checkbox" class="cz-tf-checkbox"
                                checked={isAllowed}
                                onChange={(event) => {
                                  const nextAllowed = event.currentTarget.checked
                                    ? [...allowed, option.option_id]
                                    : allowed.filter((id) => id !== option.option_id);
                                  const nextDefault = nextAllowed.includes(item.price_option.default_price_option_id ?? '')
                                    ? item.price_option.default_price_option_id
                                    : (nextAllowed[0] ?? null);
                                  patchItem(row.item_id, {
                                    price_option: { mode: 'choice', allowed_price_option_ids: nextAllowed, default_price_option_id: nextDefault },
                                  });
                                }}
                              />
                              <span class="cz-tf-label">{option.label} · ${option.unit_price.toFixed(2)}</span>
                            </label>
                          );
                        })}
                        {(item.price_option.allowed_price_option_ids?.length ?? 0) > 0 && (
                          <select
                            class="cz-tf-select"
                            aria-label={`Default Price Option for ${row.label}`}
                            value={item.price_option.default_price_option_id ?? ''}
                            onChange={(event) => patchItem(row.item_id, {
                              price_option: { ...item.price_option, default_price_option_id: event.currentTarget.value || null },
                            })}
                          >
                            {(item.price_option.allowed_price_option_ids ?? []).map((optionId) => {
                              const option = priceOptions.find((candidate) => candidate.option_id === optionId);
                              return <option value={optionId} key={optionId}>{option?.label ?? optionId}</option>;
                            })}
                          </select>
                        )}
                      </div>
                    )}

                    <label class="cz-ie-row">
                      <input
                        type="checkbox" class="cz-tf-checkbox"
                        checked={item?.featured ?? false}
                        onChange={(event) => patchItem(row.item_id, { featured: event.currentTarget.checked })}
                      />
                      <span class="cz-tf-label">Featured (Recommended Upgrades sort)</span>
                    </label>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
