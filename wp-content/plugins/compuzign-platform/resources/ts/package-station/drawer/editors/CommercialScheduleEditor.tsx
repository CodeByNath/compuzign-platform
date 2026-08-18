import { commercialLegLabel } from '../../rateSheetLabels';
import type { CommercialLeg } from '../../types';

// Commercial Schedule module editor (Phase 2). Authors a Tier/Edition's own
// commercial_legs — each a scheduled application of one of its OWN
// active_billing_cycles across an inclusive month range bounded by its OWN
// commitment. Both are read-only context here (already-saved Overview
// values, not this module's own draft) — Overview and Commercial Schedule
// save independently, in either order, and PackageSchema re-validates a
// leg's cycle/range against them again at settle time regardless. Emptying
// this list back to [] returns the Tier/Edition to Simple Mode. See
// docs/code-map/tier-edition.md.

function mintLegId(): string {
  return 'leg_' + Math.random().toString(16).slice(2, 10);
}

interface Props {
  draft:               CommercialLeg[];
  onChange:            (next: CommercialLeg[]) => void;
  activeBillingCycles: string[];
  commitmentMonths:    number | null;
}

export function CommercialScheduleEditor({ draft, onChange, activeBillingCycles, commitmentMonths }: Props) {
  const updateLeg = (id: string, patch: Partial<CommercialLeg>) => {
    onChange(draft.map((leg) => (leg.id === id ? { ...leg, ...patch } : leg)));
  };
  const addLeg = () => {
    if (activeBillingCycles.length === 0) return;
    const end = commitmentMonths ?? 1;
    onChange([...draft, { id: mintLegId(), billing_cycle: activeBillingCycles[0], start_month: 1, end_month: end }]);
  };

  return (
    <div class="cz-tf-form">
      <div class="cz-tf-field">
        <label class="cz-tf-label">Commercial Legs</label>

        {activeBillingCycles.length === 0 ? (
          <p class="cz-ie-sub-empty">Select at least one Active Billing Cycle in Tier Overview before adding commercial legs.</p>
        ) : (
          <>
            {draft.length > 0 && (
              <div class="cz-ie-list">
                {draft.map((leg) => (
                  <div key={leg.id} class="cz-ie-row">
                    <select
                      class="cz-tf-select"
                      aria-label={`Billing cycle for ${commercialLegLabel(leg)}`}
                      value={leg.billing_cycle}
                      onChange={(event) => updateLeg(leg.id, { billing_cycle: event.currentTarget.value })}
                    >
                      {activeBillingCycles.map((cycle) => (
                        <option value={cycle} key={cycle}>{cycle}</option>
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
                    <input
                      class="cz-tf-input" type="number" min="1" step="1"
                      max={commitmentMonths ?? undefined}
                      aria-label="End month"
                      value={leg.end_month}
                      onInput={(event) => updateLeg(leg.id, { end_month: Math.max(1, Number(event.currentTarget.value) || 1) })}
                    />
                    <button
                      type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                      aria-label="Remove leg"
                      onClick={() => onChange(draft.filter((item) => item.id !== leg.id))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" class="cz-tf-add-btn" onClick={addLeg}>
              + Add Leg
            </button>
          </>
        )}
      </div>
    </div>
  );
}
