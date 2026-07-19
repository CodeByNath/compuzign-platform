// Tier drawer controller — the Tier drawer's coordination layer.
//
// Owns the Package Station identity, the two-level navigation (package overview
// ↔ individual tier), the module-level edit state machine, the occupant/bin
// travel lifecycle (archive / restore with swap·retarget·pending-drafts conflict
// resolution / trash / delete), popular-tier selection, enable-disable, and the
// guarded exit. It coordinates the authoritative usePackageStation (the write
// boundary — never duplicated here) and reports host concerns through the
// EntityDrawerHostBridge. It renders NOTHING — TierDrawerContent turns this into
// the mature EntityDrawer presentation, the tier cards, the bin list, the footer,
// and the dialogs. Extracted verbatim from the former ServiceTierStep god file;
// the only change is that StepContext coupling moved onto the bridge.

import { useState, useEffect, useRef } from 'preact/hooks';
import { usePackageStation } from '@/hooks/usePackageStation';
import { useInlineConfirm } from '@/hooks/useInlineConfirm';
import type { TierRateSheetSelection, TierResolvedRateSheetSelection } from '@/api/types/admin';
import type {
  TierOverviewShellData,
  TierFeaturesShellData,
  TierFaqsShellData,
} from '../schema/bindings/tier';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import type { TierOverviewEditDraft } from '../editors/TierOverviewEditor';
import type { DrawerBaseTabId } from '@/drawer-kit/DrawerTabs';
import { serviceConnectionBinding, TIER_LABELS } from '../shared/serviceDrawerShared';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import type { TierDrawerContentProps, TierEditingSection, TierBinPrompt } from './tierDrawerTypes';

// Whether a shell holds SETTLED content (an occupant). Client-side heuristic over
// the settled fields — the backend is authoritative and rejects with
// target_occupied / no_occupant when this misjudges an all-empty occupant.
export function slotOccupied(slot: { label: string; price: number | null; contact: boolean; billing_cycle: string | null; inclusions_override: unknown[]; faq_refs: unknown[] } | undefined | null): boolean {
  return !!slot && (
    slot.price !== null
    || slot.contact
    || !!slot.billing_cycle
    || !!slot.label.trim()
    || slot.inclusions_override.length > 0
    || slot.faq_refs.length > 0
  );
}

export type TierControllerArgs = TierDrawerContentProps;

export function useTierDrawerController({
  serviceId, service: serviceItem, serviceBack, tierBack,
  initialTierId, initialOccupantId, initialTierSection, bridge,
}: TierControllerArgs) {
  const pkg     = usePackageStation(serviceId, bridge.onMutationComplete);
  const station = pkg.station;
  const svc     = pkg.service;

  const [editingTierId, setEditingTierId] = useState<string | null>(initialTierId ?? null);
  const [editingSection, setEditingSection] = useState<TierEditingSection>(null);
  const [overviewDraft, setOverviewDraft] = useState<TierOverviewEditDraft | null>(null);
  const [featuresDraft, setFeaturesDraft] = useState<TierRateSheetSelection[] | null>(null);
  const [faqsDraft,     setFaqsDraft]     = useState<string[] | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk,  setSaveOk]  = useState(false);
  const [openTierPanel, setOpenTierPanel] = useState<string | null>(null);
  const [openSummaryTier, setOpenSummaryTier] = useState<string | null>(null);
  const [overviewTab, setOverviewTab] = useState<DrawerBaseTabId>('details');
  const [listView, setListView] = useState<'current' | 'bin'>('current');
  const [splitOpen,    setSplitOpen]    = useState(false);
  const [confirmModal, setConfirmModal] = useState<'publish' | 'archive-discard' | null>(null);
  const [binPrompt, setBinPrompt] = useState<TierBinPrompt | null>(null);
  const binDeleteConfirm = useInlineConfirm<string>();

  // Re-resolve the stable occupant id after loading so stale card content can
  // never address lifecycle mutations to the wrong shell.
  useEffect(() => {
    if (!initialOccupantId || !pkg.detailLoaded) return;
    const resolvedSlotId = pkg.resolveOccupantSlot(initialOccupantId);
    if (resolvedSlotId) setEditingTierId(resolvedSlotId);
  }, [initialOccupantId, pkg.detailLoaded, pkg.resolveOccupantSlot]);

  // Section editors own transient state — keep every shell exit on the guarded
  // close path; the editor's Cancel has its own confirmation UI.
  useEffect(() => {
    const protectNavigation = (event: BeforeUnloadEvent) => {
      if (editingSection === null) return;
      event.preventDefault();
      event.returnValue = '';
    };
    bridge.setCloseGuard(editingSection !== null
      ? () => window.confirm('Discard unsaved Package changes?')
      : null);
    window.addEventListener('beforeunload', protectNavigation);
    return () => {
      bridge.setCloseGuard(null);
      window.removeEventListener('beforeunload', protectNavigation);
    };
  }, [bridge, editingSection]);

  const selectOverviewTab = (nextTab: DrawerBaseTabId) => {
    // Switching tabs while a module edits raises the same guard confirm.
    if (editingSection !== null && !window.confirm('Discard unsaved Package changes?')) return;
    setOverviewTab(nextTab);
  };

  useEffect(() => {
    if (!saveOk) return;
    const t = setTimeout(() => setSaveOk(false), 2500);
    return () => clearTimeout(t);
  }, [saveOk]);

  useEffect(() => {
    if (!splitOpen) return;
    const handle = () => setSplitOpen(false);
    const t = setTimeout(() => document.addEventListener('click', handle), 0);
    return () => { clearTimeout(t); document.removeEventListener('click', handle); };
  }, [splitOpen]);

  const openTierEdit = (tierId: string) => {
    setEditingTierId(tierId);
    setEditingSection(null);
    setOverviewDraft(null);
    setFeaturesDraft(null);
    setFaqsDraft(null);
    setSaveErr(null);
    setSaveOk(false);
    setOpenTierPanel(null);
    setSplitOpen(false);
    setConfirmModal(null);
  };

  // ── Module editors ──────────────────────────────────────────────────────────
  const openSection = (section: 'tier-overview' | 'tier-inclusions' | 'tier-faqs') => {
    if (!editingTierId) return;
    const view = pkg.tierView(editingTierId);
    if (!view) return;
    const d = view.detail;
    if (section === 'tier-overview') {
      setOverviewDraft({
        label:         d.label,
        ideal_for:     d.ideal_for,
        price:         d.price,
        contact:       d.contact,
        billing_cycle: d.billing_cycle ?? 'monthly',
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
  useEffect(() => {
    if (openedInitialSection.current || !initialTierId || !initialTierSection || !pkg.detailLoaded) return;
    openedInitialSection.current = true;
    openSection(initialTierSection);
  }, [initialTierId, initialTierSection, pkg.detailLoaded]);

  const saveSection = async () => {
    if (!editingTierId) return;
    setSaveErr(null);
    try {
      let ok = true;
      if (editingSection === 'tier-overview' && overviewDraft) {
        const r = await pkg.saveTierOverview(editingTierId, {
          label:         overviewDraft.label,
          ideal_for:     overviewDraft.ideal_for,
          price:         null,
          contact:       false,
          billing_cycle: overviewDraft.billing_cycle,
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
  const cancelSection = () => {
    setEditingSection(null);
    setOverviewDraft(null);
    setFeaturesDraft(null);
    setFaqsDraft(null);
    setSaveErr(null);
    setSaveOk(false);
  };

  // ── Lifecycle (occupant-owned; the shell never travels) ─────────────────────
  const handleSettle = async () => {
    if (!editingTierId) return;
    setSaveErr(null);
    const r = await pkg.settleTier(editingTierId);
    if (r?.success) setSaveOk(true); else setSaveErr('Publish failed.');
  };
  const handleConfirmPublish = async () => {
    setConfirmModal(null);
    await handleSettle();
  };
  const handleToggleEnabled = async () => {
    if (!editingTierId) return;
    const view = pkg.tierView(editingTierId);
    if (!view) return;
    setSaveErr(null);
    const ok = await pkg.toggleTierEnabled(editingTierId, !view.detail.enabled);
    if (ok) setSaveOk(true); else setSaveErr('Update failed.');
  };
  const handleRevertModule = async (module: 'overview' | 'features' | 'faqs') => {
    if (!editingTierId) return;
    setSaveErr(null);
    const res = await pkg.revertTierModule(editingTierId, module);
    if (!res?.success) setSaveErr('Failed to discard changes.');
  };

  // ── Occupant bin travel (engine D4) ─────────────────────────────────────────
  const handleArchive = async (discardDrafts = false) => {
    if (!editingTierId) return;
    setSplitOpen(false);
    setConfirmModal(null);
    setSaveErr(null);
    const res = await pkg.archiveTier(editingTierId, discardDrafts);
    if (res?.success) { setSaveOk(true); return; }
    if (res?.code === 'pending_drafts') setConfirmModal('archive-discard');
    else setSaveErr(res?.message ?? 'Archive failed.');
  };

  const handleRestoreBin = async (binId: string, mode?: 'swap' | 'retarget', targetTier?: string, discardDrafts = false) => {
    setSaveErr(null);
    const res = await pkg.restoreOccupant(binId, { mode, targetTier, discardDrafts });
    if (res?.success) { setBinPrompt(null); return; }
    const code = res?.code;
    if (code === 'target_occupied' || code === 'origin_unknown' || code === 'pending_drafts') {
      setBinPrompt({ binId, code, mode, targetTier });
    } else {
      setBinPrompt(null);
      setSaveErr(res?.message ?? 'Restore failed.');
    }
  };

  const handleTrashBin = async (binId: string) => {
    setSaveErr(null);
    const res = await pkg.trashBinEntry(binId);
    if (res && !res.success) setSaveErr(res.message ?? 'Move to Trash failed.');
  };

  const handleDeleteBin = async (binId: string) => {
    binDeleteConfirm.cancel();
    setSaveErr(null);
    const res = await pkg.deleteBinEntry(binId);
    if (res && !res.success) setSaveErr(res.message ?? 'Delete failed.');
  };

  // Returns to the tier list — drafts are already persisted by the hook.
  const handleBack = () => {
    setEditingTierId(null);
    setEditingSection(null);
    setOverviewDraft(null);
    setFeaturesDraft(null);
    setFaqsDraft(null);
    setSaveErr(null);
    setSaveOk(false);
    setSplitOpen(false);
    setConfirmModal(null);
  };

  // Context-aware header Back: while a tier is open, the host's single header Back
  // returns to the package overview; at the overview it falls through to the
  // Service drawer (the old host's onBack delegate).
  const handleBackRef = useRef(handleBack);
  handleBackRef.current = handleBack;
  useEffect(() => {
    if (!tierBack) return;
    tierBack.current = editingTierId ? () => handleBackRef.current() : null;
    return () => { tierBack.current = null; };
  }, [editingTierId, tierBack]);

  const requestClose = () => bridge.close();

  // ── Footer model ────────────────────────────────────────────────────────────
  const footerView = editingTierId ? pkg.tierView(editingTierId) : null;
  const footerEnabled = footerView?.detail.enabled ?? false;
  const footerHasContent = !!footerView && Object.values(footerView.moduleStatus).some((s) => s !== 'not-configured');
  const footerOccupied = !!(editingTierId && station) && slotOccupied(station.tiers[editingTierId]);
  const footerMode: 'close-only' | 'none' | 'tier-actions' =
    (!pkg.detailLoaded || !station || !svc) ? 'close-only'
    : editingSection != null ? 'none'
    : !editingTierId ? 'close-only'
    : 'tier-actions';

  // ── Individual-tier derived model (null unless a tier is open) ──────────────
  const tierDetail = (() => {
    if (!editingTierId || !svc) return null;
    const view = pkg.tierView(editingTierId);
    if (!view) return null;
    const detail = view.detail;

    const relationshipLabels = new Map(svc.package_relationships.map((item) => [item.item_id,
      item.decorated_label ?? (item.resolved && 'label' in item.resolved ? item.resolved.label : item.resolved && 'question' in item.resolved ? item.resolved.question : '(missing source)')]));
    const relationshipsById = new Map(svc.package_relationships.map((item) => [item.item_id, item]));
    const rateSheetCatalogue: TierResolvedRateSheetSelection[] = (svc.rate_sheet?.items ?? []).map((item) => ({
      item_id: item.item_id,
      source_type: relationshipsById.get(item.source_item_id)?.source_type ?? null,
      source_id: relationshipsById.get(item.source_item_id)?.source_id ?? null,
      quantity: 1,
      resolved: relationshipLabels.has(item.source_item_id),
      label: relationshipLabels.get(item.source_item_id) ?? '(unresolved Rate Sheet item)',
      unit_price: item.unit_price,
      per: item.per,
      group_id: item.group_id,
      line_total: item.unit_price,
    }));
    for (const selected of detail.rate_sheet_selections) {
      if (!rateSheetCatalogue.some((item) => item.item_id === selected.item_id)) rateSheetCatalogue.push(selected);
    }
    const isPopular = pkg.popularTier === editingTierId;
    const tierBusy = pkg.saving ? 'discard-draft' : null;

    const overviewBinding: ShellBinding<TierOverviewShellData> = {
      data: {
        label:        detail.label,
        idealFor:     detail.ideal_for,
        tierName:     TIER_LABELS[editingTierId],
        contact:      detail.contact,
        price:        detail.price,
        billingCycle: detail.billing_cycle,
        popular:      isPopular,
        popularLabel: pkg.popularLabel,
      },
      state:    view.modules.overview,
      hasDraft: view.drafts.overview !== null,
      handlers: { edit: () => openSection('tier-overview'), 'discard-draft': () => handleRevertModule('overview') },
      busy: tierBusy,
    };
    const featuresBinding: ShellBinding<TierFeaturesShellData> = {
      data:     { items: detail.inclusions_override },
      state:    view.modules.features,
      hasDraft: view.drafts.features !== null,
      handlers: { edit: () => openSection('tier-inclusions'), 'discard-draft': () => handleRevertModule('features') },
      busy: tierBusy,
    };
    const faqsBinding: ShellBinding<TierFaqsShellData> = {
      data:     { refs: detail.faq_refs, pool: svc.faqs },
      state:    view.modules.faqs,
      hasDraft: view.drafts.faqs !== null,
      handlers: { edit: () => openSection('tier-inclusions'), 'discard-draft': () => handleRevertModule('faqs') },
      busy: tierBusy,
    };

    return { view, detail, rateSheetCatalogue, isPopular, overviewBinding, featuresBinding, faqsBinding };
  })();

  return {
    // stores
    pkg, station, svc, serviceItem, serviceBack,
    // navigation
    editingTierId, editingSection, overviewTab, selectOverviewTab, listView, setListView,
    initialOccupantId,
    // package overview
    openSummaryTier, setOpenSummaryTier, openTierEdit,
    // individual tier
    tierDetail, openTierPanel, setOpenTierPanel,
    // editors
    overviewDraft, setOverviewDraft, featuresDraft, setFeaturesDraft, faqsDraft, setFaqsDraft,
    saveErr, saveOk, openSection, saveSection, cancelSection,
    // lifecycle
    handleSettle, handleConfirmPublish, handleToggleEnabled, handleRevertModule,
    handleArchive, handleRestoreBin, handleTrashBin, handleDeleteBin, binDeleteConfirm,
    binPrompt, setBinPrompt,
    // footer + dialogs
    requestClose, splitOpen, setSplitOpen, confirmModal, setConfirmModal,
    footerMode, footerEnabled, footerHasContent, footerOccupied,
    // connections binding factory
    serviceConnectionBinding: () => serviceConnectionBinding(serviceItem, svc!, serviceBack),
  };
}

export type TierDrawerController = ReturnType<typeof useTierDrawerController>;
