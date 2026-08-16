// Tier module editing — the individual tier's section edit state machine.
//
// One section edits at a time (tier-overview / tier-inclusions / tier-faqs);
// each holds a local draft seeded from the draft-preferred tier view, saves
// through the authoritative usePackageStation callbacks (overview saves also
// reconcile the station-level popular-tier selection), and clears back to the
// readable state. Save feedback (saveErr/saveOk) is coordinator-owned so
// lifecycle and bin-travel actions report through the same channel.

import { useEffect, useRef, useState } from 'preact/hooks';
import type { TierRateSheetSelection } from '../../types';
import type { PackageStation } from '../../usePackageStation';
import type { TierOverviewEditDraft } from '../editors/TierOverviewEditor';
import type { TierEditingSection } from './tierDrawerTypes';

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
  const [featuresDraft, setFeaturesDraft] = useState<TierRateSheetSelection[] | null>(null);
  const [faqsDraft,     setFaqsDraft]     = useState<string[] | null>(null);

  const openSection = (section: 'tier-overview' | 'tier-inclusions' | 'tier-faqs') => {
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
        billing_cycle: d.billing_cycle ?? 'monthly',
        rate_sheet_id: d.rate_sheet_id,
        rate_sheet_ids: d.rate_sheet_ids ?? (d.rate_sheet_id ? [d.rate_sheet_id] : []),
        rate_sheet_bundles: d.rate_sheet_bundles ?? [],
        is_addon:      d.is_addon,
        popular:       pkg.popularTier === editingTierId,
        popular_label: pkg.popularTier === editingTierId ? pkg.popularLabel : '',
      });
    } else if (section === 'tier-inclusions') {
      setFeaturesDraft(d.rate_sheet_items.map((item) => ({ ...item })));
    } else {
      setFaqsDraft([...d.faq_refs]);
    }
    setEditingSection(section);
    setSaveErr(null);
    setSaveOk(false);
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
          billing_cycle: overviewDraft.billing_cycle,
          rate_sheet_id: overviewDraft.rate_sheet_id,
          rate_sheet_ids: overviewDraft.rate_sheet_ids,
          rate_sheet_bundles: overviewDraft.rate_sheet_bundles,
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
      } else if (editingSection === 'tier-inclusions' && featuresDraft) {
        const r = await pkg.saveTierFeatures(editingTierId, featuresDraft);
        ok = !!r?.success;
      } else if (editingSection === 'tier-faqs' && faqsDraft) {
        const r = await pkg.saveTierFaqs(editingTierId, faqsDraft);
        ok = !!r?.success;
      }
      if (!ok) { setSaveErr('Save failed.'); return; }
      setSaveOk(true);
      setEditingSection(null);
      setOverviewDraft(null);
      setFeaturesDraft(null);
      setFaqsDraft(null);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed.');
    }
  };

  // Return every section to the readable state and clear transient feedback.
  const cancelSection = () => {
    setEditingSection(null);
    setOverviewDraft(null);
    setFeaturesDraft(null);
    setFaqsDraft(null);
    setSaveErr(null);
    setSaveOk(false);
  };

  return {
    editingSection,
    overviewDraft, setOverviewDraft,
    featuresDraft, setFeaturesDraft,
    faqsDraft, setFaqsDraft,
    openSection, saveSection, cancelSection,
  };
}

export type TierModuleEditing = ReturnType<typeof useTierModuleEditing>;
