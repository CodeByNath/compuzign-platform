import { useRef } from 'preact/hooks';
import { PAYMENT_CATEGORY_LABELS, COMMERCIAL_LEG_CYCLE_LABELS } from '../../rateSheetLabels';
import type { CommercialLeg } from '../../types';

// Commercial Legs editor (Tier Pricing Rules) — the mandatory leg repeater.
// Every Tier/Edition has at least one leg once configured; Simple Mode is
// retired, so this never renders an empty state or a "Multi-Cycle Mode"
// gate. Commitment (commitmentMonths) is an independent concern owned by
// TierPricingRulesEditor — it only ever bounds a leg's End month here, never
// gates whether legs are usable. See docs/code-map/tier-pricing-rules-plan.md.

function mintLegId(): string {
  return 'leg_' + Math.random().toString(16).slice(2, 10);
}

function blankLeg(): CommercialLeg {
  return { id: mintLegId(), payment_category: '', billing_cycle: '', start_month: 1, end_month: null };
}

interface Props {
  draft:            CommercialLeg[];
  onChange:         (next: CommercialLeg[]) => void;
  // Null = no commitment applies (a leg's own End may be Indefinite); a
  // number bounds every leg's End to that ceiling and rules out Indefinite.
  commitmentMonths: number | null;
}

export function CommercialScheduleEditor({ draft, onChange, commitmentMonths }: Props) {
  // A genuinely empty draft (nothing configured yet) still shows exactly one
  // row — required, but with nothing pre-selected for the admin to fill in
  // themselves, never fabricated. Kept in a ref so its id stays stable
  // across re-renders until it's actually edited into the real draft.
  const placeholderRef = useRef<CommercialLeg | null>(null);
  if (draft.length === 0 && !placeholderRef.current) placeholderRef.current = blankLeg();
  if (draft.length > 0) placeholderRef.current = null;
  const rows = draft.length > 0 ? draft : [placeholderRef.current!];

  const updateLeg = (id: string, patch: Partial<CommercialLeg>) => {
    if (draft.some((leg) => leg.id === id)) {
      onChange(draft.map((leg) => (leg.id === id ? { ...leg, ...patch } : leg)));
      return;
    }
    // The placeholder row becomes real the moment it's first edited.
    const placeholder = rows.find((leg) => leg.id === id);
    if (placeholder) onChange([{ ...placeholder, ...patch }]);
  };

  const lastLeg = draft[draft.length - 1];
  // Nothing to continue after an unbounded leg until it's given a real End.
  const addDisabled = !!lastLeg && lastLeg.end_month === null;

  const addLeg = () => {
    if (addDisabled) return;
    const maxEnd = draft.reduce((max, leg) => (leg.end_month !== null ? Math.max(max, leg.end_month) : max), 0);
    const start = maxEnd + 1;
    onChange([...draft, {
      id: mintLegId(),
      payment_category: 'one-time',
      billing_cycle: 'upfront',
      start_month: start,
      // Under a real commitment, Indefinite is invalid — default new legs to
      // its own ceiling so they start out valid; no commitment means
      // Indefinite by default, the admin narrows it down if they want a
      // stated end.
      end_month: commitmentMonths !== null ? Math.max(start, Math.round(commitmentMonths)) : null,
    }]);
  };

  const removeLeg = (id: string) => onChange(draft.filter((leg) => leg.id !== id));

  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label">Commercial Legs</label>
        <div class="cz-ie-list">
          {rows.map((leg) => (
            <div key={leg.id} class="cz-ie-row">
              <select
                class="cz-tf-select"
                aria-label="Payment Category"
                value={leg.payment_category}
                onChange={(event) => updateLeg(leg.id, { payment_category: event.currentTarget.value })}
              >
                <option value="" disabled>Payment Category…</option>
                {Object.entries(PAYMENT_CATEGORY_LABELS).map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
              <select
                class="cz-tf-select"
                aria-label="Billing Cycle"
                value={leg.billing_cycle}
                onChange={(event) => updateLeg(leg.id, { billing_cycle: event.currentTarget.value })}
              >
                <option value="" disabled>Billing Cycle…</option>
                {Object.entries(COMMERCIAL_LEG_CYCLE_LABELS).map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
              <span>Month</span>
              <input
                class="cz-tf-input" type="number" min="1" step="1"
                max={commitmentMonths ?? undefined}
                aria-label="Start month"
                value={leg.start_month}
                onInput={(event) => updateLeg(leg.id, { start_month: Math.max(1, Number(event.currentTarget.value) || 1) })}
              />
              <span>through</span>
              {commitmentMonths === null ? (
                <>
                  <input
                    class="cz-tf-input" type="number" min="1" step="1"
                    aria-label="End month"
                    disabled={leg.end_month === null}
                    value={leg.end_month ?? ''}
                    placeholder="Indefinite"
                    onInput={(event) => updateLeg(leg.id, { end_month: Math.max(1, Number(event.currentTarget.value) || 1) })}
                  />
                  <label class="cz-ie-leg-toggle">
                    <input
                      type="checkbox"
                      checked={leg.end_month === null}
                      onChange={(event) => updateLeg(leg.id, { end_month: event.currentTarget.checked ? null : (leg.start_month) })}
                    />
                    Indefinite
                  </label>
                </>
              ) : (
                <input
                  class="cz-tf-input" type="number" min="1" step="1"
                  max={commitmentMonths}
                  aria-label="End month"
                  value={leg.end_month ?? ''}
                  onInput={(event) => updateLeg(leg.id, { end_month: Math.max(1, Number(event.currentTarget.value) || 1) })}
                />
              )}
              {draft.length > 1 && (
                <button
                  type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                  aria-label="Remove leg"
                  onClick={() => removeLeg(leg.id)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button" class="cz-tf-add-btn" onClick={addLeg} disabled={addDisabled}
          title={addDisabled ? 'The last leg has no end month (Indefinite) — give it one before adding another.' : undefined}
        >
          + Add Leg
        </button>
      </div>
    </div>
  );
}
