// Tier module editing — the individual tier's section edit state machine.
//
// One section edits at a time (tier-overview / tier-inclusions / tier-faqs);
// each holds a local draft seeded from the draft-preferred tier view, saves
// through the authoritative usePackageStation callbacks (overview saves also
// reconcile the station-level popular-tier selection), and clears back to the
// readable state. Save feedback (saveErr/saveOk) is coordinator-owned so
// lifecycle and bin-travel actions report through the same channel.

import { useEffect, useRef, useState } from 'preact/hooks';
import type { TierPricingRulesDraft, TierRateSheetSelection } from '../../types';
import type { CustomerPolicy } from '@/api/types/cost-builder';
import type { PackageStation } from '../../usePackageStation';
import type { TierOverviewEditDraft } from '../editors/TierOverviewEditor';
import type { TierEditingSection } from './tierDrawerTypes';
import { resolveLegsCoverageCorrection, totalCommitmentMonths } from './tierDetailModel';

export interface TierModuleEditingArgs {
  pkg:                 PackageStation;
  editingTierId:       string | null;
  initialTierSection?: 'tier-overview';
  setSaveErr: (err: string | null) => void;
  setSaveOk:  (ok: boolean) => void;
}

export function useTierModuleEditing({
  pkg, editingTierId, initialTierSection, setSaveErr, setSaveOk,
}: TierModuleEditingArgs) {
  const [editingSection, setEditingSection] = useState<TierEditingSection>(null);
  const [overviewDraft, setOverviewDraft] = useState<TierOverviewEditDraft | null>(null);
  const [pricingRulesDraft, setPricingRulesDraft] = useState<TierPricingRulesDraft | null>(null);
  const [featuresDraft, setFeaturesDraft] = useState<TierRateSheetSelection[] | null>(null);
  const [faqsDraft,     setFaqsDraft]     = useState<string[] | null>(null);
  // Composable occupant only. null distinguishes "no policy configured" as
  // the actual, valid draft VALUE, same as the module-level draft-open flow
  // for every other section — the section is only open while
  // editingSection === 'tier-customer-policy'; this itself is never used to
  // decide that.
  const [customerPolicyDraft, setCustomerPolicyDraft] = useState<CustomerPolicy | null>(null);
  // Set only by the Pricing Rules save-time coverage correction below — see
  // resolveLegsCoverageCorrection's own doc comment.
  const [pricingRulesNotice, setPricingRulesNotice] = useState<string | null>(null);

  const openSection = (section: 'tier-overview' | 'tier-pricing-rules' | 'tier-inclusions' | 'tier-faqs' | 'tier-customer-policy') => {
    if (!editingTierId) return;
    const view = pkg.tierView(editingTierId);
    if (!view) return;
    const d = view.detail;
    if (section === 'tier-overview') {
      setOverviewDraft({
        label:         d.label,
        ideal_for:     d.ideal_for,
        audience_groups: d.audience_groups,
        price:         d.price,
        contact:       d.contact,
        is_addon:      d.is_addon,
        popular:       pkg.popularTier === editingTierId,
        popular_label: pkg.popularTier === editingTierId ? pkg.popularLabel : '',
      });
    } else if (section === 'tier-pricing-rules') {
      // Coverage window default for an occupant that has never configured
      // one: 0 through Indefinite (null) with no commitment yet, or 0
      // through the full commitment when one is already configured.
      const totalMonths = totalCommitmentMonths(d.minimum_term_value, d.minimum_term_unit);
      setPricingRulesDraft({
        rate_sheet_id: d.rate_sheet_id,
        billing_cycle: d.billing_cycle ?? 'monthly',
        minimum_term_value: d.minimum_term_value,
        minimum_term_unit:  d.minimum_term_unit,
        from_month: d.from_month ?? 0,
        to_month:   d.to_month ?? totalMonths,
        // Was missing entirely before this fix — draft.legs read as
        // undefined until the admin touched "+ Add Leg" at least once,
        // which silently dropped any already-settled legs from the save.
        legs: d.legs ?? [],
        // Customer-facing Headline pointer — must be seeded here too, or
        // the editor's own onChange({ headline_leg_id }) would start from
        // undefined and the save's own array_key_exists('headline_leg_id')
        // check (PackageStationController::savePackageStationTierModule)
        // would never see it change.
        headline_leg_id: d.headline_leg_id ?? '',
      });
    } else if (section === 'tier-inclusions') {
      setFeaturesDraft(d.rate_sheet_items.map((item) => ({ ...item })));
    } else if (section === 'tier-customer-policy') {
      setCustomerPolicyDraft(d.customer_policy ?? null);
    } else {
      setFaqsDraft([...d.faq_refs]);
    }
    setEditingSection(section);
    setSaveErr(null);
    setSaveOk(false);
    setPricingRulesNotice(null);
  };

  const openedInitialSection = useRef(false);
  // Gated on the RESOLVED tier, not on `initialTierId`. A host may address the
  // opening tier either way — by slot id (the old host, which sets editingTierId
  // synchronously) or by stable occupant id (the Admin Station, where the
  // controller resolves the slot once the station loads). Keying on
  // editingTierId covers both, and openSection reads it anyway.
  useEffect(() => {
    if (openedInitialSection.current || !editingTierId || !initialTierSection || !pkg.detailLoaded) return;
    openedInitialSection.current = true;
    openSection(initialTierSection);
  }, [editingTierId, initialTierSection, pkg.detailLoaded]);

  const saveSection = async () => {
    if (!editingTierId) return;
    setSaveErr(null);
    try {
      let ok = true;
      if (editingSection === 'tier-overview' && overviewDraft) {
        const r = await pkg.saveTierOverview(editingTierId, {
          label:         overviewDraft.label,
          ideal_for:     overviewDraft.ideal_for,
          audience_groups: overviewDraft.audience_groups,
          price:         null,
          contact:       overviewDraft.contact,
          is_addon:      overviewDraft.is_addon,
        });
        ok = !!r?.success;
        if (ok) {
          if (overviewDraft.popular) {
            ok = await pkg.setPopularTier(editingTierId, overviewDraft.popular_label);
          } else if (pkg.popularTier === editingTierId) {
            ok = await pkg.setPopularTier(null, '');
          }
        }
      } else if (editingSection === 'tier-pricing-rules' && pricingRulesDraft) {
        // Save-time coverage guard: if a commitment is active, no additional
        // leg has been drafted, and Leg Default's own to_month falls short
        // of the full commitment, snap it back up and surface why — the
        // confirmed "auto-revert + notice" rule (never a blocking error, and
        // never touched while merely editing — only right before this save).
        const correction = resolveLegsCoverageCorrection(
          pricingRulesDraft.minimum_term_value,
          pricingRulesDraft.minimum_term_unit,
          pricingRulesDraft.to_month,
          pricingRulesDraft.legs,
        );
        const toSave = correction ? { ...pricingRulesDraft, to_month: correction.to_month } : pricingRulesDraft;
        setPricingRulesNotice(correction?.notice ?? null);
        const r = await pkg.saveTierPricingRules(editingTierId, toSave);
        ok = !!r?.success;
      } else if (editingSection === 'tier-inclusions' && featuresDraft) {
        const r = await pkg.saveTierFeatures(editingTierId, featuresDraft);
        ok = !!r?.success;
      } else if (editingSection === 'tier-faqs' && faqsDraft) {
        const r = await pkg.saveTierFaqs(editingTierId, faqsDraft);
        ok = !!r?.success;
      } else if (editingSection === 'tier-customer-policy') {
        // No `&& customerPolicyDraft` guard, unlike every branch above —
        // null is this draft's own legitimate VALUE (explicitly clearing
        // the policy back to none), not "nothing to save." The session is
        // open iff editingSection matches; the draft's own nullability is
        // orthogonal, same as every other module's session/value split.
        const r = await pkg.saveTierCustomerPolicy(editingTierId, customerPolicyDraft);
        ok = !!r?.success;
      }
      if (!ok) { setSaveErr('Save failed.'); return; }
      setSaveOk(true);
      setEditingSection(null);
      setOverviewDraft(null);
      setPricingRulesDraft(null);
      setFeaturesDraft(null);
      setFaqsDraft(null);
      setCustomerPolicyDraft(null);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed.');
    }
  };

  // Return every section to the readable state and clear transient feedback.
  const cancelSection = () => {
    setEditingSection(null);
    setOverviewDraft(null);
    setPricingRulesDraft(null);
    setFeaturesDraft(null);
    setFaqsDraft(null);
    setCustomerPolicyDraft(null);
    setSaveErr(null);
    setSaveOk(false);
    setPricingRulesNotice(null);
  };

  return {
    editingSection,
    overviewDraft, setOverviewDraft,
    pricingRulesDraft, setPricingRulesDraft,
    pricingRulesNotice,
    featuresDraft, setFeaturesDraft,
    faqsDraft, setFaqsDraft,
    customerPolicyDraft, setCustomerPolicyDraft,
    openSection, saveSection, cancelSection,
  };
}

export type TierModuleEditing = ReturnType<typeof useTierModuleEditing>;
