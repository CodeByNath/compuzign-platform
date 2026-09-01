// Phase 1B — the admin surface for the subordinate composable occupant.
// Mounted as one additive, clearly-separated section in the package
// overview's Details screen (see TierDrawerContent.tsx), never inside the
// TIER_KEYS list, the "Current (N)" count, the Pricing Summary table, or
// individual-tier navigation (editingTierId) — it is not a sixth Tier.
//
// Reuses the exact same leaf editor components the five normal Tier
// occupants use (TierOverviewEditor, TierPricingRulesEditor,
// PoolInclusionsEditor, PoolFaqsEditor) and the exact same ReadBlock/
// ModuleStatusPill/getTierNotes presentation primitives — but with its own
// small, self-contained local edit state rather than the tierId-keyed
// useTierModuleEditing/useTierBinTravel machinery those five occupants
// share, since this occupant is never addressed by a slot key. This is a
// deliberately lighter integration than the full schema-driven
// InlineEditorShell module system the individual-tier screen uses — see
// docs/code-map/tier-composable-occupant.md for the design note.
//
// No archive/restore UI yet (the API exists — archiveComposableOccupant/
// restoreComposableOccupant in api.ts — but is not wired here). Edition
// management is intentionally minimal: create + one-click Publish, not the
// full TierEditionDeclarationSwitcher experience.

import { useState } from 'preact/hooks';
import { ReadBlock } from '@/drawer-kit/ReadBlock';
import { getTierNotes } from '@/drawer-kit/utils/moduleNotifications';
import { TierOverviewEditor } from '../editors/TierOverviewEditor';
import type { TierOverviewEditDraft } from '../editors/TierOverviewEditor';
import { TierPricingRulesEditor } from '../editors/TierPricingRulesEditor';
import { PoolInclusionsEditor } from '../editors/PoolInclusionsEditor';
import { PoolFaqsEditor } from '../editors/PoolFaqsEditor';
import { buildRateSheetCatalogue } from './tierDetailModel';
import { selectableRateSheets } from '../../surface/tierInstance/tierInstanceModel';
import { createComposableOccupantEdition, updateComposableOccupantEditionStatus } from '../../api';
import type { PackageStation } from '../../usePackageStation';
import type { TierOverviewDraft, TierPricingRulesDraft, TierRateSheetSelection } from '../../types';

type EditingModule = 'overview' | 'pricing_rules' | 'features' | 'faqs' | null;

const DEFAULT_OVERVIEW_DRAFT: TierOverviewEditDraft = {
  label: '', ideal_for: '', audience_groups: ['personal_business', 'enterprise'],
  price: null, contact: false, is_addon: false, popular: false, popular_label: '',
};

interface Props {
  pkg: PackageStation;
  serviceId: number;
  tierInstanceId: string;
}

export function ComposableOccupantCard({ pkg, serviceId, tierInstanceId }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EditingModule>(null);
  const [overviewDraft, setOverviewDraft] = useState<TierOverviewEditDraft>(DEFAULT_OVERVIEW_DRAFT);
  const [pricingRulesDraft, setPricingRulesDraft] = useState<TierPricingRulesDraft | null>(null);
  const [featuresDraft, setFeaturesDraft] = useState<TierRateSheetSelection[] | null>(null);
  const [faqsDraft, setFaqsDraft] = useState<string[] | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [addingEdition, setAddingEdition] = useState(false);

  const svc = pkg.service;
  const station = pkg.station;
  if (!svc || !station) return null;

  const view = pkg.composableView();
  const detail = view?.detail ?? null;

  const tierLike = detail ? { enabled: detail.enabled, is_explicitly_disabled: detail.is_explicitly_disabled ?? false, price: detail.price, billing_cycle: detail.billing_cycle, contact: detail.contact } : undefined;
  const notes = getTierNotes(tierLike, {
    platformStatus: detail?.enabled ? 'active' : 'disabled',
    disabled:       detail?.is_explicitly_disabled ?? false,
  });

  const openOverview = () => {
    setSaveErr(null);
    setOverviewDraft(detail ? {
      label: detail.label, ideal_for: detail.ideal_for, audience_groups: detail.audience_groups,
      price: detail.price, contact: detail.contact, is_addon: false, popular: false, popular_label: '',
    } : DEFAULT_OVERVIEW_DRAFT);
    setEditing('overview');
    setOpen(true);
  };
  const saveOverview = async () => {
    const res = await pkg.saveComposableOverview({
      label: overviewDraft.label, ideal_for: overviewDraft.ideal_for, audience_groups: overviewDraft.audience_groups,
      price: overviewDraft.price, contact: overviewDraft.contact,
    } as TierOverviewDraft);
    if (res?.success) setEditing(null); else setSaveErr('Save failed.');
  };

  const openPricingRules = () => {
    if (!detail) return;
    setSaveErr(null);
    setPricingRulesDraft({
      rate_sheet_id: detail.rate_sheet_id, billing_cycle: detail.billing_cycle ?? 'monthly',
      minimum_term_value: detail.minimum_term_value, minimum_term_unit: detail.minimum_term_unit,
      from_month: detail.from_month, to_month: detail.to_month, legs: detail.legs,
    });
    setEditing('pricing_rules');
  };
  const savePricingRules = async () => {
    if (!pricingRulesDraft) return;
    const res = await pkg.saveComposablePricingRules(pricingRulesDraft);
    if (res?.success) setEditing(null); else setSaveErr('Save failed.');
  };

  const openFeatures = () => {
    if (!detail) return;
    setSaveErr(null);
    setFeaturesDraft(detail.rate_sheet_items);
    setEditing('features');
  };
  const saveFeatures = async () => {
    if (!featuresDraft) return;
    const res = await pkg.saveComposableFeatures(featuresDraft);
    if (res?.success) setEditing(null); else setSaveErr('Save failed.');
  };

  const openFaqs = () => {
    if (!detail) return;
    setSaveErr(null);
    setFaqsDraft(detail.faq_refs);
    setEditing('faqs');
  };
  const saveFaqs = async () => {
    if (!faqsDraft) return;
    const res = await pkg.saveComposableFaqs(faqsDraft);
    if (res?.success) setEditing(null); else setSaveErr('Save failed.');
  };

  const handlePublish = async () => {
    setSaveErr(null);
    const res = await pkg.settleComposable();
    if (!res?.success) setSaveErr('Publish failed.');
  };
  const handleToggleEnabled = async () => {
    if (!detail) return;
    setSaveErr(null);
    const ok = await pkg.toggleComposableEnabled(detail.is_explicitly_disabled === true);
    if (!ok) setSaveErr('Update failed.');
  };
  const handleAddEdition = async () => {
    if (addingEdition) return;
    setAddingEdition(true);
    try {
      const existingCount = detail?.tier_editions?.length ?? 0;
      await createComposableOccupantEdition(serviceId, tierInstanceId, { title: `Edition ${existingCount + 2}` });
      pkg.refetch();
    } finally {
      setAddingEdition(false);
    }
  };
  const handlePublishEdition = async (editionId: string) => {
    await updateComposableOccupantEditionStatus(serviceId, tierInstanceId, editionId, { platform_status: 'active' });
    pkg.refetch();
  };

  const rateSheetCatalogue = detail ? buildRateSheetCatalogue(svc, detail.rate_sheet_id, detail.rate_sheet_selections) : [];
  const rateSheetOptions = detail ? selectableRateSheets(svc.rate_sheets, station.allowed_rate_sheet_ids ?? [], detail.rate_sheet_id)
    .map((sheet) => ({ id: sheet.rate_sheet_id, title: sheet.title, status: sheet.status })) : [];

  return (
    <div class="cz-shell-section">
      <ReadBlock
        title="Build Your Own (composable occupant)"
        subtitle="A subordinate, customer-configurable occupant on this same Tier System — never a sixth Tier."
        scopeClass="drawerOverview tier"
        status={view ? view.status : 'not-configured'}
        notes={notes}
        actions={[{ id: 'manage', label: open ? 'Hide' : 'Manage', onSelect: () => setOpen((o) => !o) }]}
      >
        <div class="drawerModule__fields">
          <div class="drawerModule__field">
            <p class="drawerModule__label">Status</p>
            <p class="drawerModule__value">
              {detail ? (detail.contact ? 'Contact Us' : detail.price != null ? `$${detail.price.toFixed(2)}` : 'Not configured') : 'Not yet created'}
            </p>
          </div>
        </div>
      </ReadBlock>

      {open && (
        <div class="cz-shell-section" style="padding-left: var(--cz-space-4); border-left: 2px solid var(--cz-border-subtle, #e2e2e2);">
          {saveErr && <p class="drawerModule__error">{saveErr}</p>}

          {!detail && editing !== 'overview' && (
            <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" onClick={openOverview}>
              Create
            </button>
          )}

          {editing === 'overview' ? (
            <div class="cz-shell-section">
              <TierOverviewEditor draft={overviewDraft} onChange={(patch) => setOverviewDraft((d) => ({ ...d, ...patch }))} hideAddonAndPopular />
              <div style="display:flex; gap: var(--cz-space-2); margin-top: var(--cz-space-2);">
                <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" disabled={pkg.saving} onClick={saveOverview}>Save</button>
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </div>
          ) : detail && (
            <ReadBlock title="Overview" status={view!.modules.overview.status} notes={view!.modules.overview.notes} actions={[{ id: 'edit', label: 'Edit', onSelect: openOverview }]}>
              <p class="drawerModule__value">{detail.label || '(no label)'}</p>
            </ReadBlock>
          )}

          {detail && (editing === 'pricing_rules' ? (
            <div class="cz-shell-section">
              {pricingRulesDraft && (
                <TierPricingRulesEditor
                  draft={pricingRulesDraft}
                  onChange={(patch) => setPricingRulesDraft((d) => d ? { ...d, ...patch } : d)}
                  rateSheets={rateSheetOptions}
                  hasSelections={detail.rate_sheet_items.length > 0}
                />
              )}
              <div style="display:flex; gap: var(--cz-space-2); margin-top: var(--cz-space-2);">
                <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" disabled={pkg.saving} onClick={savePricingRules}>Save</button>
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <ReadBlock title="Pricing Rules" status={view!.modules.pricing_rules.status} notes={view!.modules.pricing_rules.notes} actions={[{ id: 'edit', label: 'Edit', onSelect: openPricingRules }]}>
              <p class="drawerModule__value">{detail.rate_sheet_id ?? 'No Rate Sheet bound'} · {detail.billing_cycle ?? '—'}</p>
            </ReadBlock>
          ))}

          {detail && (editing === 'features' ? (
            <div class="cz-shell-section">
              {featuresDraft && (
                <PoolInclusionsEditor
                  draft={featuresDraft}
                  onChange={(next) => setFeaturesDraft(next as TierRateSheetSelection[])}
                  pool={[]}
                  onCreate={async () => null}
                  rateSheetCatalogue={rateSheetCatalogue.filter((item) => item.resolved)}
                  legs={detail.legs}
                />
              )}
              <div style="display:flex; gap: var(--cz-space-2); margin-top: var(--cz-space-2);">
                <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" disabled={pkg.saving} onClick={saveFeatures}>Save</button>
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <ReadBlock title="Features" status={view!.modules.features.status} notes={view!.modules.features.notes} actions={[{ id: 'edit', label: 'Edit', onSelect: openFeatures }]}>
              <p class="drawerModule__value">{detail.inclusions_override.length} inclusion(s)</p>
            </ReadBlock>
          ))}

          {detail && (editing === 'faqs' ? (
            <div class="cz-shell-section">
              {faqsDraft && (
                <PoolFaqsEditor
                  draft={faqsDraft}
                  onChange={setFaqsDraft}
                  pool={svc.faqs}
                  onCreate={(question, answer) => pkg.createFaq(question, answer)}
                />
              )}
              <div style="display:flex; gap: var(--cz-space-2); margin-top: var(--cz-space-2);">
                <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" disabled={pkg.saving} onClick={saveFaqs}>Save</button>
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <ReadBlock title="FAQs" status={view!.modules.faqs.status} notes={view!.modules.faqs.notes} actions={[{ id: 'edit', label: 'Edit', onSelect: openFaqs }]}>
              <p class="drawerModule__value">{detail.faq_refs.length} question(s)</p>
            </ReadBlock>
          ))}

          {detail && (
            <div style="display:flex; gap: var(--cz-space-2); margin-top: var(--cz-space-3);">
              <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" disabled={pkg.saving} onClick={handlePublish}>Publish</button>
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={pkg.saving} onClick={handleToggleEnabled}>
                {detail.is_explicitly_disabled ? 'Enable' : 'Disable'}
              </button>
            </div>
          )}

          {detail && (
            <div class="cz-shell-section">
              <p class="cz-shell-section__title">Editions</p>
              {(detail.tier_editions ?? []).map((edition) => (
                <div key={edition.id} style="display:flex; align-items:center; gap: var(--cz-space-2); margin-bottom: var(--cz-space-1);">
                  <span>{edition.title || '(untitled)'}</span>
                  <span class="cz-tf-hint">{edition.platform_status}</span>
                  {edition.platform_status !== 'active' && (
                    <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => handlePublishEdition(edition.id)}>
                      Publish
                    </button>
                  )}
                </div>
              ))}
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={addingEdition} onClick={handleAddEdition}>
                + Edition
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
