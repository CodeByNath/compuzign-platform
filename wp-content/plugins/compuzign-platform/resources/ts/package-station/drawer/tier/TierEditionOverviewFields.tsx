// Tier Edition overview-module form fields — split into two section
// components (Overview / Inclusions) sharing one `TierEditionOverviewDraft`,
// so the combined two-tab editor (TierEditionEditor.tsx, Phase 4) can present
// them as separate views of the SAME session without a second draft, save,
// or endpoint. `TierEditionOverviewFields` itself is kept as a thin
// concatenation of both sections — the pre-Phase-5 call site
// (TierEditionDeclarationSwitcher.tsx's own hand-rolled edit block) still
// renders through it unchanged until that call site is replaced.

import { useMemo } from 'preact/hooks';
import { AdminField, MultiSelectField } from '@/drawer-kit/fields';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { CommercialLeg, PackageManagerItem, PackageRateSheet, TierEditionOverviewDraft, TierRateSheetSelection } from '../../types';
import { PoolInclusionsEditor } from '../editors/PoolInclusionsEditor';
import { CommercialScheduleEditor } from '../editors/CommercialScheduleEditor';
import { buildRateSheetCatalogue } from './tierDetailModel';

const BILLING_CYCLES: AdminFieldOption[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
  { value: 'one-time', label: 'One-time' },
];

// Same vocabulary as BILLING_CYCLES above — the reusable cadence pool this
// Edition's own Commercial Schedule legs may draw from, a set rather than a
// single value.
const ACTIVE_BILLING_CYCLES: AdminFieldOption[] = BILLING_CYCLES;

const MINIMUM_TERM_UNITS: AdminFieldOption[] = [
  { value: 'month', label: 'Month(s)' },
  { value: 'year', label: 'Year(s)' },
];

interface Props {
  draft:    TierEditionOverviewDraft;
  onChange: (patch: Partial<TierEditionOverviewDraft>) => void;
  rateSheetOptions: AdminFieldOption[];
  svc: { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] };
}

// Overview tab — title, description, billing/commitment terms. No Rate
// Sheet/row fields here; those are Inclusions' own section below.
export function TierEditionOverviewSection({ draft, onChange }: Pick<Props, 'draft' | 'onChange'>) {
  return (
    <div class="cz-tf-form">
      <AdminField def={{ id: 'edt-title', type: 'text', label: 'Title' }} value={draft.title} onChange={(title: string) => onChange({ title })} />
      <AdminField def={{ id: 'edt-description', type: 'textarea', label: 'Admin description (optional)', rows: 2 }} value={draft.admin_description} onChange={(admin_description: string) => onChange({ admin_description })} />
      <AdminField def={{ id: 'edt-billing-cycle', type: 'select', label: 'Billing Cycle', options: BILLING_CYCLES }} value={draft.billing_cycle ?? ''} onChange={(billing_cycle: string) => onChange({ billing_cycle })} />
      {/* An explicit override, not a Rate Sheet resolution outcome — checking
          it always reports Contact Us for this Edition, regardless of what
          its own bound sheet's selected rows would otherwise total. */}
      <AdminField def={{ id: 'edt-contact', type: 'checkbox', label: 'Mark as Contact Us' }} value={draft.contact} onChange={(contact: boolean) => onChange({ contact })} />
      <AdminField def={{ id: 'edt-price', type: 'text', label: 'Price', readonly: true }} value={draft.contact ? 'Contact Us' : 'Derived from Rate Sheet selections'} onChange={() => undefined} />
      <AdminField def={{ id: 'edt-min-term-value', type: 'text', label: 'Minimum commitment' }} value={draft.minimum_term_value != null ? String(draft.minimum_term_value) : ''} onChange={(v: string) => onChange({ minimum_term_value: v === '' ? null : Number(v) })} />
      <AdminField def={{ id: 'edt-min-term-unit', type: 'select', label: 'Commitment unit', unsetLabel: 'None', options: MINIMUM_TERM_UNITS }} value={draft.minimum_term_unit ?? ''} onChange={(v: string) => onChange({ minimum_term_unit: v || null })} />
      {/* The cadence pool this Edition's own Commercial Schedule tab may draw
          from — optional; an Edition with none selected stays in Simple
          Mode, using Billing Cycle above exactly as before this capability
          existed. */}
      <MultiSelectField
        id="edt-active-billing-cycles"
        label="Active Billing Cycles"
        options={ACTIVE_BILLING_CYCLES}
        selected={draft.active_billing_cycles ?? []}
        onChange={(next) => onChange({ active_billing_cycles: next })}
      />
    </div>
  );
}

// Inclusions tab — Rate Sheet binding + row/quantity selection. Reuses the
// SAME PoolInclusionsEditor and buildRateSheetCatalogue resolver the parent
// occupant's own Default Tier Inclusions editor uses (tierDetailModel.ts) —
// not a bespoke picker.
export function TierEditionInclusionsSection({ draft, onChange, rateSheetOptions, svc }: Props) {
  // Rows selectable for whichever Rate Sheet this draft is currently bound
  // to — recomputed whenever that binding changes, exactly like the
  // occupant's own Overview/Features editor recomputes rateSheetCatalogue
  // from its own draft's rate_sheet_id (tierDetailModel.buildTierDetail).
  const catalogue = useMemo(
    () => buildRateSheetCatalogue(svc, draft.rate_sheet_id, []),
    [svc, draft.rate_sheet_id],
  );

  // Switching the bound sheet clears this Edition's own row selections
  // (enforced server-side at settle, mirroring the occupant's own
  // Refinement 4 rule) — confirm first, the same convention
  // TierOverviewEditor.tsx already uses for the occupant's own binding.
  const changeRateSheet = (next: string | null) => {
    if (next === (draft.rate_sheet_id ?? null)) return;
    if (draft.rate_sheet_items.length > 0 && !window.confirm('Switching Rate Sheet clears this Edition\'s selected rows. Continue?')) return;
    onChange({ rate_sheet_id: next, rate_sheet_items: [] });
  };

  return (
    <div class="cz-tf-form">
      <AdminField def={{ id: 'edt-rate-sheet', type: 'select', label: 'Rate Sheet', unsetLabel: 'Inherit the Tier’s own binding', options: rateSheetOptions }} value={draft.rate_sheet_id ?? ''} onChange={(v: string) => changeRateSheet(v || null)} />
      {draft.rate_sheet_id && (
        <div class="cz-tf-field">
          <PoolInclusionsEditor
            draft={draft.rate_sheet_items}
            onChange={(next) => onChange({ rate_sheet_items: next as TierRateSheetSelection[] })}
            pool={[]}
            onCreate={async () => null}
            rateSheetCatalogue={catalogue}
            commercialLegs={draft.commercial_legs}
          />
        </div>
      )}
    </div>
  );
}

// Commercial Schedule tab — this Edition's own legs, independent of the
// parent occupant's (never inherited, same rule price/billing_cycle/
// commitment above already follow). Reuses the SAME CommercialScheduleEditor
// the parent occupant's own Commercial Schedule module uses.
export function TierEditionCommercialScheduleSection({ draft, onChange }: Pick<Props, 'draft' | 'onChange'>) {
  const commitmentMonths = draft.minimum_term_value != null
    ? (draft.minimum_term_unit === 'year' ? draft.minimum_term_value * 12 : draft.minimum_term_value)
    : null;
  return (
    <CommercialScheduleEditor
      draft={draft.commercial_legs}
      onChange={(next: CommercialLeg[]) => onChange({ commercial_legs: next })}
      activeBillingCycles={draft.active_billing_cycles ?? []}
      commitmentMonths={commitmentMonths}
    />
  );
}

export function TierEditionOverviewFields({ draft, onChange, rateSheetOptions, svc }: Props) {
  return (
    <>
      <TierEditionOverviewSection draft={draft} onChange={onChange} />
      <TierEditionInclusionsSection draft={draft} onChange={onChange} rateSheetOptions={rateSheetOptions} svc={svc} />
      <TierEditionCommercialScheduleSection draft={draft} onChange={onChange} />
    </>
  );
}
