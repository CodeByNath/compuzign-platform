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
import { ApiTimeoutError } from '@/api/client';
import { usePackageStation } from '../../usePackageStation';
import type { DrawerBaseTabId } from '@/drawer-kit/DrawerTabs';
import { serviceConnectionBinding } from '@/service-station';
import { useAutoDismiss, useOutsideClickDismiss } from '@/entity-drawers/shared/drawerChrome';
import { createTierEdition } from '../../api';
import { useTierModuleEditing } from './useTierModuleEditing';
import { useTierBinTravel } from './useTierBinTravel';
import { buildTierDetail, buildTierFooterModel } from './tierDetailModel';
import type { TierDrawerContentProps, TierDrawerGroupId } from './tierDrawerTypes';

// Re-exported from the derived-model module so TierBinList (and any other
// consumer) keeps its established import path.
export { slotOccupied } from './tierDetailModel';

export type TierControllerArgs = TierDrawerContentProps;

export function useTierDrawerController({
  serviceId, tierInstanceId, service: serviceItem, serviceBack, tierBack,
  initialTierId, initialOccupantId, initialTierSection, bridge,
}: TierControllerArgs) {
  const pkg     = usePackageStation(serviceId, tierInstanceId, bridge.onMutationComplete);
  const station = pkg.station;
  const svc     = pkg.service;

  const [editingTierId, setEditingTierId] = useState<string | null>(initialTierId ?? null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk,  setSaveOk]  = useState(false);
  const [openTierPanel, setOpenTierPanel] = useState<string | null>(null);
  const [openSummaryTier, setOpenSummaryTier] = useState<string | null>(null);
  const [overviewTab, setOverviewTab] = useState<DrawerBaseTabId>('details');
  // The individual-tier screen's four groups (Details/Options/Connections/
  // Support) — this screen composes directly through PlacedShell rather than
  // EntityDrawer's fixed Details/Connections bar (drawer refinement
  // blueprint, Phase 3).
  const [tierTab, setTierTab] = useState<TierDrawerGroupId>('details');
  const [listView, setListView] = useState<'current' | 'bin'>('current');
  const [splitOpen,    setSplitOpen]    = useState(false);
  const [confirmModal, setConfirmModal] = useState<'publish' | 'archive-discard' | null>(null);
  // Inclusions & Editions' own [Default] [Edition …] tab strip selection.
  // Lifted here — not local state inside TierEditionDeclarationSwitcher —
  // because every Edition lifecycle mutation refetches through pkg, and
  // TierDrawerContent unmounts its whole child tree (returns <AsyncLoading/>)
  // while `!pkg.detailLoaded`; local state inside that child tree would be
  // silently wiped back to "Default" after every Publish/Disable/Archive/…
  // click. This hook's own state survives that remount, the same reason
  // editingSection/openTierPanel already live here rather than in a child.
  const [selectedDeclarationId, setSelectedDeclarationId] = useState<string | null>(null);

  useAutoDismiss(saveOk, () => setSaveOk(false), 2500);
  useOutsideClickDismiss(splitOpen, () => setSplitOpen(false));

  const editing = useTierModuleEditing({ pkg, editingTierId, initialTierSection, setSaveErr, setSaveOk });
  const { editingSection, openSection, cancelSection } = editing;

  const travel = useTierBinTravel({ pkg, editingTierId, setSplitOpen, setConfirmModal, setSaveErr, setSaveOk });

  // Leaving one Tier for another starts back on that Tier's own Default —
  // a stale Edition selection must never silently carry across occupants.
  useEffect(() => { setSelectedDeclarationId(null); }, [editingTierId]);

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

  const selectTierTab = (nextTab: TierDrawerGroupId) => {
    // Guard applies to every group switch alike — Details/Options/
    // Connections/Support — not just the old Details↔Connections pair.
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
    try {
      const r = await pkg.settleTier(editingTierId);
      if (r?.success) setSaveOk(true); else setSaveErr('Publish failed.');
    } catch (e) {
      // A timed-out request's outcome is uncertain, not a definite failure —
      // show its own message rather than the generic one above.
      setSaveErr(e instanceof ApiTimeoutError ? e.message : 'Publish failed.');
    }
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
    // The toggle reverses the explicit Disable mask, not the published/active
    // flag — a Pending, never-yet-published occupant is still offered Disable
    // (see TierDrawerFooter's enabled prop, sourced from the same marker).
    const nextEnabled = view.detail.is_explicitly_disabled === true;
    const ok = await pkg.toggleTierEnabled(editingTierId, nextEnabled);
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

  // Overview's small "Editions" structural control (see
  // docs/code-map/tier-edition.md): registers one additional Edition
  // position by minting the child record immediately, the same
  // born-disabled/unconfigured creation addTierEdition already performs for
  // "+ Add Edition" — Overview itself collects no title, form, or pricing;
  // configuring the new Edition happens in the Inclusions & Editions module.
  const [addingEdition, setAddingEdition] = useState(false);
  const handleAddEdition = async () => {
    if (!editingTierId || addingEdition) return;
    const existingCount = pkg.tierView(editingTierId)?.detail.tier_editions?.length ?? 0;
    setAddingEdition(true);
    try {
      await createTierEdition(serviceId, tierInstanceId, editingTierId, { title: `Edition ${existingCount + 2}` });
      pkg.refetch();
    } finally {
      setAddingEdition(false);
    }
  };

  // ── Derived models (pure builders) ──────────────────────────────────────────
  const { footerMode, footerEnabled, footerHasContent, footerHasBeenPublished } =
    buildTierFooterModel(pkg, editingTierId, editingSection);

  const tierDetail = buildTierDetail(pkg, editingTierId, {
    onEditSection:  openSection,
    onRevertModule: handleRevertModule,
    onAddEdition:   addingEdition ? undefined : handleAddEdition,
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
    selectedDeclarationId, setSelectedDeclarationId,
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
    footerMode, footerEnabled, footerHasContent, footerHasBeenPublished,
    // connections binding factory
    serviceConnectionBinding: () => serviceConnectionBinding(serviceItem, svc!, serviceBack),
  };
}

export type TierDrawerController = ReturnType<typeof useTierDrawerController>;
