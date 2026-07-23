// Tier drawer controller — the Tier drawer's coordination layer.
//
// A small coordinator composed from focused pieces, each owning one
// responsibility:
//
//   useTierModuleEditing — the section edit state machine (overview /
//     features / FAQs drafts, open/save/cancel, popular-tier reconciliation).
//   useTierBinTravel — the occupant bin lifecycle (archive / restore with
//     swap·retarget·pending-drafts conflict resolution / trash / delete).
//   tierDetailModel — pure builders for the individual-tier presentation
//     model and the record-footer model (slotOccupied lives there too).
//
// The coordinator itself owns the Package Station identity, the two-level
// navigation (package overview ↔ individual tier), tab state, the guarded
// exit (deliberately window.confirm — unchanged), shared save feedback, the
// tier lifecycle actions (settle / enable-disable / revert), and the return
// assembly. It coordinates the authoritative usePackageStation (the write
// boundary — never duplicated here) and reports host concerns through the
// EntityDrawerHostBridge. It renders NOTHING — TierDrawerContent turns this
// into the mature EntityDrawer presentation, the tier cards, the bin list, the
// footer, and the dialogs. The returned shape is the drawer's public contract
// and is unchanged by the composition split.

import { useState, useEffect, useRef } from 'preact/hooks';
import { usePackageStation } from '@/package-station';
import type { DrawerBaseTabId } from '@/drawer-kit/DrawerTabs';
import { serviceConnectionBinding } from '../shared/serviceDrawerShared';
import { useAutoDismiss, useOutsideClickDismiss } from '../shared/drawerChrome';
import { useTierModuleEditing } from './useTierModuleEditing';
import { useTierBinTravel } from './useTierBinTravel';
import { buildTierDetail, buildTierFooterModel } from './tierDetailModel';
import type { TierDrawerContentProps } from './tierDrawerTypes';

// Re-exported from the derived-model module so TierBinList (and any other
// consumer) keeps its established import path.
export { slotOccupied } from './tierDetailModel';

export type TierControllerArgs = TierDrawerContentProps;

export function useTierDrawerController({
  serviceId, service: serviceItem, serviceBack, tierBack,
  initialTierId, initialOccupantId, initialTierSection, bridge,
}: TierControllerArgs) {
  const pkg     = usePackageStation(serviceId, bridge.onMutationComplete);
  const station = pkg.station;
  const svc     = pkg.service;

  const [editingTierId, setEditingTierId] = useState<string | null>(initialTierId ?? null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk,  setSaveOk]  = useState(false);
  const [openTierPanel, setOpenTierPanel] = useState<string | null>(null);
  const [openSummaryTier, setOpenSummaryTier] = useState<string | null>(null);
  const [overviewTab, setOverviewTab] = useState<DrawerBaseTabId>('details');
  const [tierTab, setTierTab] = useState<DrawerBaseTabId>('details');
  const [listView, setListView] = useState<'current' | 'bin'>('current');
  const [splitOpen,    setSplitOpen]    = useState(false);
  const [confirmModal, setConfirmModal] = useState<'publish' | 'archive-discard' | null>(null);

  useAutoDismiss(saveOk, () => setSaveOk(false), 2500);
  useOutsideClickDismiss(splitOpen, () => setSplitOpen(false));

  const editing = useTierModuleEditing({ pkg, editingTierId, initialTierSection, setSaveErr, setSaveOk });
  const { editingSection, openSection, cancelSection } = editing;

  const travel = useTierBinTravel({ pkg, editingTierId, setSplitOpen, setConfirmModal, setSaveErr, setSaveOk });

  // Re-resolve the stable occupant id after loading so stale card content can
  // never address lifecycle mutations to the wrong shell.
  useEffect(() => {
    if (!initialOccupantId || !pkg.detailLoaded) return;
    const resolvedSlotId = pkg.resolveOccupantSlot(initialOccupantId);
    if (resolvedSlotId) setEditingTierId(resolvedSlotId);
  }, [initialOccupantId, pkg.detailLoaded, pkg.resolveOccupantSlot]);

  // Section editors own transient state — keep every shell exit on the guarded
  // close path; the editor's Cancel has its own confirmation UI. The Tier
  // drawer deliberately keeps its window.confirm guard (not useGuardedClose).
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

  const selectTierTab = (nextTab: DrawerBaseTabId) => {
    if (editingSection !== null) {
      if (!window.confirm('Discard unsaved Package changes?')) return;
      cancelSection();
    }
    setTierTab(nextTab);
  };

  const openTierEdit = (tierId: string) => {
    setEditingTierId(tierId);
    cancelSection();
    setOpenTierPanel(null);
    setSplitOpen(false);
    setConfirmModal(null);
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

  // Returns to the tier list — drafts are already persisted by the hook.
  const handleBack = () => {
    setEditingTierId(null);
    cancelSection();
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

  // ── Derived models (pure builders) ──────────────────────────────────────────
  const { footerMode, footerEnabled, footerHasContent, footerOccupied } =
    buildTierFooterModel(pkg, editingTierId, editingSection);

  const tierDetail = buildTierDetail(pkg, editingTierId, {
    onEditSection:  openSection,
    onRevertModule: handleRevertModule,
  });

  return {
    // stores
    pkg, station, svc, serviceItem, serviceBack,
    // navigation
    editingTierId, editingSection, overviewTab, selectOverviewTab, tierTab, selectTierTab, listView, setListView,
    initialOccupantId,
    // package overview
    openSummaryTier, setOpenSummaryTier, openTierEdit,
    // individual tier
    tierDetail, openTierPanel, setOpenTierPanel,
    // editors
    overviewDraft: editing.overviewDraft, setOverviewDraft: editing.setOverviewDraft,
    featuresDraft: editing.featuresDraft, setFeaturesDraft: editing.setFeaturesDraft,
    faqsDraft: editing.faqsDraft, setFaqsDraft: editing.setFaqsDraft,
    saveErr, saveOk, openSection, saveSection: editing.saveSection, cancelSection,
    // lifecycle
    handleSettle, handleConfirmPublish, handleToggleEnabled, handleRevertModule,
    handleArchive: travel.handleArchive,
    handleRestoreBin: travel.handleRestoreBin,
    handleTrashBin: travel.handleTrashBin,
    handleDeleteBin: travel.handleDeleteBin,
    binDeleteConfirm: travel.binDeleteConfirm,
    binPrompt: travel.binPrompt, setBinPrompt: travel.setBinPrompt,
    // footer + dialogs
    requestClose, splitOpen, setSplitOpen, confirmModal, setConfirmModal,
    footerMode, footerEnabled, footerHasContent, footerOccupied,
    // connections binding factory
    serviceConnectionBinding: () => serviceConnectionBinding(serviceItem, svc!, serviceBack),
  };
}

export type TierDrawerController = ReturnType<typeof useTierDrawerController>;
