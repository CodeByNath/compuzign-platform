// Tier Edition overview-module form fields — split into three section
// components (Overview / Pricing Rules / Inclusions) sharing one
// `TierEditionOverviewDraft`, so the combined tabbed editor
// (TierEditionEditor.tsx) can present them as separate views of the SAME
// session without a second draft, save, or endpoint. `TierEditionOverviewFields`
// itself is kept as a thin concatenation of all three sections — the
// pre-Phase-5 call site (TierEditionDeclarationSwitcher.tsx's own hand-rolled
// edit block) still renders through it unchanged until that call site is
// replaced.

import { useMemo } from 'preact/hooks';
import { AdminField } from '@/drawer-kit/fields';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { PackageManagerItem, PackageRateSheet, TierEditionOverviewDraft, TierRateSheetSelection } from '../../types';
import { PoolInclusionsEditor } from '../editors/PoolInclusionsEditor';
import { CommercialScheduleEditor } from '../editors/CommercialScheduleEditor';
import { buildRateSheetCatalogue } from './tierDetailModel';

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

// Overview tab — title, description, price (read-only). Rate Sheet/
// Commitment/Commercial Legs all moved to Pricing Rules below; Billing Cycle
// is retired from every editing surface entirely. See
// docs/code-map/tier-pricing-rules-plan.md.
export function TierEditionOverviewSection({ draft, onChange }: Pick<Props, 'draft' | 'onChange'>) {
  return (
    <div class="cz-tf-form">
      <AdminField def={{ id: 'edt-title', type: 'text', label: 'Title' }} value={draft.title} onChange={(title: string) => onChange({ title })} />
      <AdminField def={{ id: 'edt-description', type: 'textarea', label: 'Admin description (optional)', rows: 2 }} value={draft.admin_description} onChange={(admin_description: string) => onChange({ admin_description })} />
      {/* Contact-mode and its derived read-only Price sit together, same
          grouped rhythm as the occupant's own TierOverviewEditor — checking
          it always reports Contact Us for this Edition, regardless of what
          its own bound sheet's selected rows would otherwise total. */}
      <div class="cz-tf-field-group">
        <AdminField def={{ id: 'edt-contact', type: 'checkbox', label: 'Mark as Contact Us' }} value={draft.contact} onChange={(contact: boolean) => onChange({ contact })} />
        <AdminField def={{ id: 'edt-price', type: 'text', label: 'Price', readonly: true }} value={draft.contact ? 'Contact Us' : 'Derived from Rate Sheet selections'} onChange={() => undefined} />
      </div>
    </div>
  );
}

// Pricing Rules tab — Rate Sheet binding, Commitment (independent of Legs),
// and the mandatory Commercial Legs themselves. Same card name/field layout
// as the parent occupant's own Tier Pricing Rules (TierPricingRulesEditor.tsx) —
// not "Edition Pricing Rules"; an earlier draft of this plan invented a
// per-surface prefix and was corrected. See docs/code-map/tier-pricing-rules-plan.md.
export function TierEditionPricingRulesSection({ draft, onChange, rateSheetOptions }: Pick<Props, 'draft' | 'onChange' | 'rateSheetOptions'>) {
  // Switching the bound sheet clears this Edition's own row selections
  // (enforced server-side at settle, mirroring the occupant's own
  // Refinement 4 rule) — confirm first, the same convention
  // TierPricingRulesEditor.tsx already uses for the occupant's own binding.
  const changeRateSheet = (next: string | null) => {
    if (next === (draft.rate_sheet_id ?? null)) return;
    if (draft.rate_sheet_items.length > 0 && !window.confirm('Switching Rate Sheet clears this Edition\'s selected rows. Continue?')) return;
    onChange({ rate_sheet_id: next, rate_sheet_items: [] });
  };
  const commitmentMonths = draft.commitment_enabled && draft.minimum_term_value != null
    ? (draft.minimum_term_unit === 'year' ? draft.minimum_term_value * 12 : draft.minimum_term_value)
    : null;

  return (
    <div class="cz-tf-form">
      <AdminField def={{ id: 'edt-rate-sheet', type: 'select', label: 'Rate Sheet', unsetLabel: 'Inherit the Tier’s own binding', options: rateSheetOptions }} value={draft.rate_sheet_id ?? ''} onChange={(v: string) => changeRateSheet(v || null)} />

      {/* Tier Commitment and the two fields it conditionally reveals read as
          one grouped block, same rhythm as the occupant's own
          TierPricingRulesEditor — independent of Commercial Legs below,
          which gates only Commitment Unit/Minimum Commitment. Legs are never
          nested under, disabled by, or cleared because this is No. */}
      <div class="cz-tf-field-group">
        <AdminField def={{ id: 'edt-commitment-enabled', type: 'checkbox', label: 'Tier Commitment' }} value={draft.commitment_enabled} onChange={(commitment_enabled: boolean) => onChange({ commitment_enabled })} />

        {draft.commitment_enabled && (
          <>
            <AdminField def={{ id: 'edt-min-term-value', type: 'text', label: 'Minimum commitment' }} value={draft.minimum_term_value != null ? String(draft.minimum_term_value) : ''} onChange={(v: string) => onChange({ minimum_term_value: v === '' ? null : Number(v) })} />
            <AdminField def={{ id: 'edt-min-term-unit', type: 'select', label: 'Commitment unit', unsetLabel: 'None', options: MINIMUM_TERM_UNITS }} value={draft.minimum_term_unit ?? ''} onChange={(v: string) => onChange({ minimum_term_unit: v || null })} />
          </>
        )}
      </div>

      <CommercialScheduleEditor
        draft={draft.commercial_legs}
        onChange={(commercial_legs) => onChange({ commercial_legs })}
        commitmentMonths={commitmentMonths}
      />
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
            commercialLegs={draft.commercial_legs}
          />
        </div>
      ) : (
        <p class="cz-ie-sub-empty">Bind a Rate Sheet in Tier Pricing Rules before adding inclusions.</p>
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
