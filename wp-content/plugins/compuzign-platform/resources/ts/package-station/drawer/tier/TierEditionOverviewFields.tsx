// Tier Edition overview-module form fields — split into three section
// components (Overview / Pricing Rules / Inclusions) sharing one
// `TierEditionOverviewDraft`, so the combined three-tab editor
// (TierEditionEditor.tsx) can present them as separate views of the SAME
// session without a second draft, save, or endpoint — mirroring the parent
// Tier occupant's own Overview/Tier Pricing Rules/Default Tier Inclusions
// split, even though an Edition still has only one consolidated backend
// module (see docs/code-map/tier-edition.md). `TierEditionOverviewFields`
// itself is kept as a thin concatenation of all three sections — the
// pre-Phase-5 call site (TierEditionDeclarationSwitcher.tsx's own hand-rolled
// edit block) still renders through it unchanged until that call site is
// replaced.

import { useMemo, useState } from 'preact/hooks';
import { AdminField } from '@/drawer-kit/fields';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { PackageManagerItem, PackageRateSheet, TierCommercialLeg, TierEditionOverviewDraft, TierRateSheetSelection } from '../../types';
import { PoolInclusionsEditor } from '../editors/PoolInclusionsEditor';
import { buildRateSheetCatalogue, isYearlyLegBillingCycle, totalCommitmentMonths, yearlyLegToMonthChoices } from './tierDetailModel';

// Payment Category is the coarse choice; Billing Cycle's own options narrow
// to whichever cadence vocabulary that category admits. No separate stored
// field: derived from billing_cycle itself, mirroring the occupant's own
// TierPricingRulesEditor.tsx.
type PaymentCategory = 'fixed' | 'recurring';

const PAYMENT_CATEGORIES: AdminFieldOption[] = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'recurring', label: 'Recurring' },
];

const FIXED_BILLING_CYCLES: AdminFieldOption[] = [
  { value: 'one-time', label: 'One-time' },
  { value: 'upfront', label: 'Upfront' },
];

const RECURRING_BILLING_CYCLES: AdminFieldOption[] = [
  { value: 'annually', label: 'Yearly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'daily', label: 'Daily' },
];

function paymentCategoryOf(billingCycle: string | null): PaymentCategory {
  return billingCycle === 'one-time' || billingCycle === 'upfront' ? 'fixed' : 'recurring';
}

// Months-only: Day(s)/Week(s)/Year(s) are retired, but the field stays a
// real select (not a static label) — see toggleCommitment below, which
// seeds 'month' the moment commitment is enabled.
const MINIMUM_TERM_UNITS: AdminFieldOption[] = [
  { value: 'month', label: 'Month(s)' },
];

interface Props {
  draft:    TierEditionOverviewDraft;
  onChange: (patch: Partial<TierEditionOverviewDraft>) => void;
  rateSheetOptions: AdminFieldOption[];
  svc: { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] };
}

// One Commercial Leg card — mirrors the occupant's own CommercialLegCard
// (TierPricingRulesEditor.tsx) exactly, duplicated locally rather than
// shared, the same precedent every other vocabulary constant in this file
// already sets between the two editors.
interface LegCardProps {
  leg:        Pick<TierCommercialLeg, 'billing_cycle' | 'from_month' | 'to_month'>;
  onChange:   (patch: Partial<TierCommercialLeg>) => void;
  label:      string;
  removable:  boolean;
  onRemove?:  () => void;
  // Finite-commitment authoring cap (the parent's own commitment length,
  // never anchored at any Leg's own from_month — see
  // PackageManagerSchema::checkFiniteCommitmentLegCap()). null/undefined
  // while commitment is off or indefinite: no cap, Indefinite stays
  // available either way — this only ever clamps an explicit numeric entry.
  maxToMonth?: number | null;
  // Customer-facing Headline pointer — mirrors the occupant's own
  // CommercialLegCard (TierPricingRulesEditor.tsx) exactly. This Edition's
  // own headline_leg_id, never shared with the occupant's.
  isHeadline:    boolean;
  onSetHeadline: () => void;
}

function CommercialLegCard({ leg, onChange, label, removable, onRemove, maxToMonth, isHeadline, onSetHeadline }: LegCardProps) {
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>(
    paymentCategoryOf(leg.billing_cycle),
  );
  const billingCycleOptions = paymentCategory === 'fixed' ? FIXED_BILLING_CYCLES : RECURRING_BILLING_CYCLES;

  // Yearly alone gets a cycle-constrained to_month choice list, anchored at
  // THIS leg's own from_month — never at commitment. Mirrors the occupant's
  // own CommercialLegCard (TierPricingRulesEditor.tsx) exactly. See
  // yearlyLegToMonthChoices()'s own doc comment (tierDetailModel.ts).
  const isYearly = isYearlyLegBillingCycle(leg.billing_cycle);
  const yearlyChoices = isYearly && leg.from_month != null
    ? yearlyLegToMonthChoices(leg.from_month, maxToMonth ?? null)
    : [];

  // Changing Billing Cycle or From month recomputes the valid Yearly
  // to_month choices; if the leg's current to_month no longer appears among
  // them, it is explicitly reset to Indefinite rather than silently snapped
  // to a different specific commercial range.
  const handleBillingCycleChange = (billing_cycle: string) => {
    setPaymentCategory(paymentCategoryOf(billing_cycle));
    const patch: Partial<TierCommercialLeg> = { billing_cycle };
    if (isYearlyLegBillingCycle(billing_cycle) && leg.from_month != null && leg.to_month != null) {
      const choices = yearlyLegToMonthChoices(leg.from_month, maxToMonth ?? null);
      if (!choices.some((c) => c.value === leg.to_month)) {
        patch.to_month = null;
      }
    }
    onChange(patch);
  };
  const handleFromMonthChange = (v: string) => {
    const from_month = v === '' ? null : Number(v);
    const patch: Partial<TierCommercialLeg> = { from_month };
    if (isYearly && from_month != null && leg.to_month != null) {
      const choices = yearlyLegToMonthChoices(from_month, maxToMonth ?? null);
      if (!choices.some((c) => c.value === leg.to_month)) {
        patch.to_month = null;
      }
    }
    onChange(patch);
  };

  return (
    <div class="cz-ie-faq-item">
      <div class="cz-ie-faq-item__header">
        <span class="cz-tf-label">{label}</span>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
          disabled={!removable}
          onClick={onRemove}
        >
          Remove
        </button>
      </div>

      <div class="cz-tf-field-row">
        <AdminField
          def={{ id: 'edt-leg-payment-category', type: 'select', label: 'Payment Category', options: PAYMENT_CATEGORIES }}
          value={paymentCategory}
          onChange={(category: string) => setPaymentCategory(category as PaymentCategory)}
        />
        <AdminField
          def={{ id: 'edt-leg-billing-cycle', type: 'select', label: 'Billing Cycle', options: billingCycleOptions }}
          value={leg.billing_cycle}
          onChange={handleBillingCycleChange}
        />
      </div>

      <div class="cz-tf-field-row">
        <AdminField
          def={{
            id: 'edt-leg-from-month', type: 'text', label: 'From month',
            hint: leg.from_month === 0 ? 'Plan start' : undefined,
          }}
          value={leg.from_month != null ? String(leg.from_month) : ''}
          onChange={handleFromMonthChange}
        />
        {isYearly && leg.from_month != null ? (
          <AdminField
            def={{
              id: 'edt-leg-to-month', type: 'select', label: 'To month', unsetLabel: 'Indefinite',
              options: yearlyChoices.map((c) => ({ value: String(c.value), label: c.label })),
            }}
            value={leg.to_month != null ? String(leg.to_month) : ''}
            onChange={(v: string) => onChange({ to_month: v === '' ? null : Number(v) })}
          />
        ) : (
          <AdminField
            def={{ id: 'edt-leg-to-month', type: 'text', label: 'To month', placeholder: 'Indefinite' }}
            value={leg.to_month != null ? String(leg.to_month) : ''}
            onChange={(v: string) => {
              if (v === '') { onChange({ to_month: null }); return; }
              const n = Number(v);
              onChange({ to_month: maxToMonth != null ? Math.min(n, maxToMonth) : n });
            }}
          />
        )}
      </div>

      <AdminField
        def={{ id: 'edt-leg-headline', type: 'checkbox', label: 'Headline' }}
        value={isHeadline}
        onChange={(checked: boolean) => { if (checked) onSetHeadline(); }}
      />
    </div>
  );
}

// Overview tab — title, description, Contact Us/Price. No billing/commitment
// or Rate Sheet/row fields here; those are Pricing Rules' and Inclusions'
// own sections below.
export function TierEditionOverviewSection({ draft, onChange }: Pick<Props, 'draft' | 'onChange'>) {
  return (
    <div class="cz-tf-form">
      <AdminField def={{ id: 'edt-title', type: 'text', label: 'Title' }} value={draft.title} onChange={(title: string) => onChange({ title })} />
      <AdminField def={{ id: 'edt-description', type: 'textarea', label: 'Admin description (optional)', rows: 2 }} value={draft.admin_description} onChange={(admin_description: string) => onChange({ admin_description })} />
      {/* An explicit override, not a Rate Sheet resolution outcome — checking
          it always reports Contact Us for this Edition, regardless of what
          its own bound sheet's selected rows would otherwise total. */}
      <AdminField def={{ id: 'edt-contact', type: 'checkbox', label: 'Mark as Contact Us' }} value={draft.contact} onChange={(contact: boolean) => onChange({ contact })} />
      <AdminField def={{ id: 'edt-price', type: 'text', label: 'Price', readonly: true }} value={draft.contact ? 'Contact Us' : 'Derived from Rate Sheet selections'} onChange={() => undefined} />
    </div>
  );
}

// Pricing Rules tab — Rate Sheet binding, billing cadence, and minimum
// commitment. Mirrors the parent Tier occupant's own Tier Pricing Rules
// module split out of its Overview (TierPricingRulesEditor.tsx) — same
// fields, same vocabulary, one level deeper.
export function TierEditionPricingRulesSection({ draft, onChange, rateSheetOptions }: Pick<Props, 'draft' | 'onChange' | 'rateSheetOptions'>) {
  // "Tier Commitment" is a presentation-only choice over the two stored
  // fields below it, mirroring the occupant's own TierPricingRulesEditor.tsx
  // — no separate stored enabled flag. Seeded once from whichever field
  // already carries a value; unchecking clears both immediately.
  const [commitmentEnabled, setCommitmentEnabled] = useState(
    draft.minimum_term_value != null || draft.minimum_term_unit != null,
  );
  const toggleCommitment = (enabled: boolean) => {
    setCommitmentEnabled(enabled);
    if (!enabled) {
      onChange({ minimum_term_value: null, minimum_term_unit: null });
    } else if (draft.minimum_term_unit == null) {
      onChange({ minimum_term_unit: 'month' });
    }
  };

  const legs = draft.legs ?? [];

  // Once a commitment's value AND unit are both known, Leg Default's own
  // range auto-fills to the FULL commitment — mirrors the occupant's own
  // TierPricingRulesEditor.tsx exactly, including the "only while no
  // additional leg exists yet" guard.
  const changeMinTermValue = (v: string) => {
    const value = v === '' ? null : Number(v);
    const patch: Partial<TierEditionOverviewDraft> = { minimum_term_value: value };
    const totalMonths = totalCommitmentMonths(value, draft.minimum_term_unit ?? null);
    if (totalMonths !== null && legs.length === 0) {
      patch.from_month = draft.from_month ?? 0;
      patch.to_month = totalMonths;
    }
    onChange(patch);
  };
  const changeMinTermUnit = (v: string) => {
    const unit = v || null;
    const patch: Partial<TierEditionOverviewDraft> = { minimum_term_unit: unit };
    const totalMonths = totalCommitmentMonths(draft.minimum_term_value ?? null, unit);
    if (totalMonths !== null && legs.length === 0) {
      patch.from_month = draft.from_month ?? 0;
      patch.to_month = totalMonths;
    }
    onChange(patch);
  };

  // Leg Default's own field changes — mirrors the occupant's own
  // changeDefaultLeg exactly, including the single-adjacent-leg carry-
  // forward scope limit.
  const changeDefaultLeg = (patch: Partial<TierCommercialLeg>) => {
    const fullPatch: Partial<TierEditionOverviewDraft> = { ...patch };
    if ('to_month' in patch && patch.to_month != null && legs.length > 0) {
      const nextLegs = [...legs];
      nextLegs[0] = { ...nextLegs[0], from_month: patch.to_month + 1 };
      fullPatch.legs = nextLegs;
    }
    onChange(fullPatch);
  };

  const updateLeg = (index: number, patch: Partial<TierCommercialLeg>) => {
    onChange({ legs: legs.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)) });
  };
  // Mirrors the occupant's own removeLeg (TierPricingRulesEditor.tsx):
  // removing the Leg currently selected as this Edition's own Headline
  // resets the pointer back to Leg Default.
  const removeLeg = (index: number) => {
    const removed = legs[index];
    const removedId = removed.platform_id || removed.id;
    const patch: Partial<TierEditionOverviewDraft> = { legs: legs.filter((_, i) => i !== index) };
    if (removedId && removedId === (draft.headline_leg_id ?? '')) {
      patch.headline_leg_id = '';
    }
    onChange(patch);
  };
  const addLeg = () => {
    const lastToMonth = legs.length > 0 ? legs[legs.length - 1].to_month : draft.to_month;
    const totalMonths = totalCommitmentMonths(draft.minimum_term_value ?? null, draft.minimum_term_unit ?? null);
    const newLeg: TierCommercialLeg = {
      billing_cycle: 'monthly',
      from_month: lastToMonth != null ? lastToMonth + 1 : null,
      to_month: totalMonths,
    };
    onChange({ legs: [...legs, newLeg] });
  };

  // Switching the bound sheet clears this Edition's own row selections
  // (enforced server-side at settle, mirroring the occupant's own
  // Refinement 4 rule) — confirm first, the same convention
  // TierPricingRulesEditor.tsx already uses for the occupant's own binding.
  const changeRateSheet = (next: string | null) => {
    if (next === (draft.rate_sheet_id ?? null)) return;
    if (draft.rate_sheet_items.length > 0 && !window.confirm('Switching Rate Sheet clears this Edition\'s selected rows. Continue?')) return;
    onChange({ rate_sheet_id: next, rate_sheet_items: [] });
  };

  // Finite-commitment authoring cap, applied to every Leg card below
  // (Default included) — mirrors the occupant's own TierPricingRulesEditor.tsx.
  const commitmentCap = totalCommitmentMonths(draft.minimum_term_value ?? null, draft.minimum_term_unit ?? null);

  return (
    <div class="cz-tf-form">
      <AdminField def={{ id: 'edt-rate-sheet', type: 'select', label: 'Rate Sheet', unsetLabel: 'Inherit the Tier’s own binding', options: rateSheetOptions }} value={draft.rate_sheet_id ?? ''} onChange={(v: string) => changeRateSheet(v || null)} />

      <AdminField def={{ id: 'edt-commitment-enabled', type: 'checkbox', label: 'Tier Commitment' }} value={commitmentEnabled} onChange={toggleCommitment} />

      {commitmentEnabled && (
        <div class="cz-tf-field-row">
          <AdminField def={{ id: 'edt-min-term-value', type: 'text', label: 'Minimum commitment' }} value={draft.minimum_term_value != null ? String(draft.minimum_term_value) : ''} onChange={changeMinTermValue} />
          <AdminField def={{ id: 'edt-min-term-unit', type: 'select', label: 'Commitment unit', unsetLabel: 'None', options: MINIMUM_TERM_UNITS }} value={draft.minimum_term_unit ?? ''} onChange={changeMinTermUnit} />
        </div>
      )}

      <div class="cz-ie-faq-item__header">
        <div>
          <span class="cz-tf-label">Commercial Legs</span>
          <p class="cz-tf-hint">Payment behaviour over time.</p>
        </div>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={addLeg}>
          + Add Leg
        </button>
      </div>

      {/* Leg Default — this Edition's own permanent declaration, presented
          as the first, unremovable leg. draft is seeded with from_month 0
          and to_month Indefinite (null) — or the full commitment, when one
          is already configured — when the editor opens
          (draftFromTierEdition, tierEditionModel.ts). */}
      <CommercialLegCard
        leg={{ billing_cycle: draft.billing_cycle ?? 'monthly', from_month: draft.from_month ?? null, to_month: draft.to_month ?? null }}
        onChange={changeDefaultLeg}
        label="Leg Default"
        removable={false}
        maxToMonth={commitmentCap}
        isHeadline={!draft.headline_leg_id}
        onSetHeadline={() => onChange({ headline_leg_id: '' })}
      />

      {legs.map((leg, index) => {
        const legId = leg.platform_id || leg.id || '';
        return (
          <CommercialLegCard
            key={leg.id ?? index}
            leg={leg}
            onChange={(patch) => updateLeg(index, patch)}
            maxToMonth={commitmentCap}
            label={`Leg ${index + 1}`}
            removable
            onRemove={() => removeLeg(index)}
            isHeadline={legId !== '' && legId === draft.headline_leg_id}
            onSetHeadline={() => onChange({ headline_leg_id: legId })}
          />
        );
      })}
    </div>
  );
}

// Inclusions tab — row/quantity selection against the Rate Sheet bound in
// Pricing Rules above. Reuses the SAME PoolInclusionsEditor and
// buildRateSheetCatalogue resolver the parent occupant's own Default Tier
// Inclusions editor uses (tierDetailModel.ts) — not a bespoke picker.
export function TierEditionInclusionsSection({ draft, onChange, svc }: Pick<Props, 'draft' | 'onChange' | 'svc'>) {
  // Rows selectable for whichever Rate Sheet this draft is currently bound
  // to — recomputed whenever that binding changes, exactly like the
  // occupant's own Overview/Features editor recomputes rateSheetCatalogue
  // from its own draft's rate_sheet_id (tierDetailModel.buildTierDetail).
  const catalogue = useMemo(
    () => buildRateSheetCatalogue(svc, draft.rate_sheet_id, []),
    [svc, draft.rate_sheet_id],
  );

  return (
    <div class="cz-tf-form">
      {draft.rate_sheet_id ? (
        <div class="cz-tf-field">
          <PoolInclusionsEditor
            draft={draft.rate_sheet_items}
            onChange={(next) => onChange({ rate_sheet_items: next as TierRateSheetSelection[] })}
            pool={[]}
            onCreate={async () => null}
            rateSheetCatalogue={catalogue}
            legs={draft.legs ?? []}
          />
        </div>
      ) : (
        <p class="cz-admin-empty">Bind a Rate Sheet in Pricing Rules to select rows here.</p>
      )}
    </div>
  );
}

export function TierEditionOverviewFields({ draft, onChange, rateSheetOptions, svc }: Props) {
  return (
    <>
      <TierEditionOverviewSection draft={draft} onChange={onChange} />
      <TierEditionPricingRulesSection draft={draft} onChange={onChange} rateSheetOptions={rateSheetOptions} />
      <TierEditionInclusionsSection draft={draft} onChange={onChange} svc={svc} />
    </>
  );
}
