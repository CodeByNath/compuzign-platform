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
import type { PackageManagerItem, PackageRateSheet, TierEditionOverviewDraft, TierRateSheetSelection } from '../../types';
import { PoolInclusionsEditor } from '../editors/PoolInclusionsEditor';
import { buildRateSheetCatalogue } from './tierDetailModel';

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

const MINIMUM_TERM_UNITS: AdminFieldOption[] = [
  { value: 'day', label: 'Day(s)' },
  { value: 'week', label: 'Week(s)' },
  { value: 'month', label: 'Month(s)' },
  { value: 'year', label: 'Year(s)' },
];

interface Props {
  draft:    TierEditionOverviewDraft;
  onChange: (patch: Partial<TierEditionOverviewDraft>) => void;
  rateSheetOptions: AdminFieldOption[];
  svc: { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] };
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
    }
  };

  // Payment Category only narrows which Billing Cycle options are offered —
  // no automatic relation beyond that, mirroring the occupant's own
  // TierPricingRulesEditor.tsx exactly.
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>(
    paymentCategoryOf(draft.billing_cycle),
  );
  const billingCycleOptions = paymentCategory === 'fixed' ? FIXED_BILLING_CYCLES : RECURRING_BILLING_CYCLES;

  // Switching the bound sheet clears this Edition's own row selections
  // (enforced server-side at settle, mirroring the occupant's own
  // Refinement 4 rule) — confirm first, the same convention
  // TierPricingRulesEditor.tsx already uses for the occupant's own binding.
  const changeRateSheet = (next: string | null) => {
    if (next === (draft.rate_sheet_id ?? null)) return;
    if (draft.rate_sheet_items.length > 0 && !window.confirm('Switching Rate Sheet clears this Edition\'s selected rows. Continue?')) return;
    onChange({ rate_sheet_id: next, rate_sheet_items: [] });
  };

  return (
    <div class="cz-tf-form">
      <AdminField def={{ id: 'edt-rate-sheet', type: 'select', label: 'Rate Sheet', unsetLabel: 'Inherit the Tier’s own binding', options: rateSheetOptions }} value={draft.rate_sheet_id ?? ''} onChange={(v: string) => changeRateSheet(v || null)} />

      <AdminField def={{ id: 'edt-commitment-enabled', type: 'checkbox', label: 'Tier Commitment' }} value={commitmentEnabled} onChange={toggleCommitment} />

      {commitmentEnabled && (
        <div class="cz-tf-field-row">
          <AdminField def={{ id: 'edt-min-term-value', type: 'text', label: 'Minimum commitment' }} value={draft.minimum_term_value != null ? String(draft.minimum_term_value) : ''} onChange={(v: string) => onChange({ minimum_term_value: v === '' ? null : Number(v) })} />
          <AdminField def={{ id: 'edt-min-term-unit', type: 'select', label: 'Commitment unit', unsetLabel: 'None', options: MINIMUM_TERM_UNITS }} value={draft.minimum_term_unit ?? ''} onChange={(v: string) => onChange({ minimum_term_unit: v || null })} />
        </div>
      )}

      <div class="cz-tf-field-row">
        <AdminField
          def={{ id: 'edt-payment-category', type: 'select', label: 'Payment Category', options: PAYMENT_CATEGORIES }}
          value={paymentCategory}
          onChange={(category: string) => setPaymentCategory(category as PaymentCategory)}
        />
        <AdminField def={{ id: 'edt-billing-cycle', type: 'select', label: 'Billing Cycle', options: billingCycleOptions }} value={draft.billing_cycle ?? ''} onChange={(billing_cycle: string) => onChange({ billing_cycle })} />
      </div>

      {/* Coverage window — mirrors the occupant's own TierPricingRulesEditor.tsx.
          draft is seeded with 1/12 when the editor opens (draftFromTierEdition,
          tierEditionModel.ts). */}
      <div class="cz-tf-field-row">
        <AdminField def={{ id: 'edt-from-month', type: 'text', label: 'From month' }} value={draft.from_month != null ? String(draft.from_month) : ''} onChange={(v: string) => onChange({ from_month: v === '' ? null : Number(v) })} />
        <AdminField def={{ id: 'edt-to-month', type: 'text', label: 'To month' }} value={draft.to_month != null ? String(draft.to_month) : ''} onChange={(v: string) => onChange({ to_month: v === '' ? null : Number(v) })} />
      </div>
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
