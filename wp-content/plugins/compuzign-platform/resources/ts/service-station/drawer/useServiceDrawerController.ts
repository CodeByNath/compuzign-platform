// Service drawer controller — the Service drawer's coordination layer.
//
// A small coordinator composed from focused hooks, each owning one
// responsibility:
//
//   useServiceModuleEditing — the module-level edit state machine (one module
//     editing while others stay readable), drafts, dirty checks, saves, the
//     category-description side-channel, inline category creation.
//   useServiceLifecycle — toggle/settle/publish/archive/trash handlers that
//     advance the local record from station results.
//   useServiceExitFlow — the guarded-exit workflow: exit dialogs, stashed
//     continuations, the new-never-published prompt (built on the shared
//     useGuardedClose machinery in ../shared/drawerChrome).
//
// The coordinator itself owns record identity, tab/panel/dialog surface state,
// derived display values, and the shell bindings, and it coordinates the
// authoritative useServiceStation (the write boundary — never duplicated here)
// through the EntityDrawerHostBridge. It renders NOTHING: ServiceDrawerContent
// turns the returned state into the mature EntityDrawer presentation,
// ServiceDrawerFooter into the record footer, and ServiceDrawerDialogs into the
// confirm/exit modals. The returned shape is the drawer's public contract and
// is unchanged by the composition split.

import { useCallback, useRef, useState } from 'preact/hooks';
import type { ServiceItem } from '@/api/types/cost-builder';
import { useServiceStation } from '@/service-station';
import type {
  ServiceOverviewShellData,
  ServiceInclusionsShellData,
  ServiceFaqsShellData,
} from './schema/bindings/service';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import type { DrawerTabId } from '@/drawer-kit/DrawerTabs';
import { decodeHtml } from '@/utils/format';
import { useOutsideClickDismiss } from '@/entity-drawers/shared/drawerChrome';
import { useServiceModuleEditing } from './useServiceModuleEditing';
import { useServiceLifecycle } from './useServiceLifecycle';
import { useServiceExitFlow } from './useServiceExitFlow';
import type { ServiceDrawerContentProps } from './serviceDrawerTypes';

export type ServiceDrawerControllerArgs = ServiceDrawerContentProps;

export function useServiceDrawerController({
  service: seedService, packages, allCategories, initialTab, initialEdit, bridge,
}: ServiceDrawerControllerArgs) {
  // Local record identity, seeded from the opening handoff and advanced by
  // lifecycle actions. Replaces the old host's ctx.setStepData('service', …):
  // the same numeric id keeps useServiceStation from refetching, while the
  // derived platform_status/module_status stay live for the footer and pills.
  const [service, setService] = useState<ServiceItem>(seedService);

  const [tab, setTab] = useState<DrawerTabId>(initialTab ?? 'details');
  const [openPanel, setOpenPanel] = useState<string | null>(null);

  const station = useServiceStation(service, packages, bridge.onMutationComplete);
  const {
    platformStatus, isActive, detailLoaded, canPublish, pendingModuleNames, moduleStatus,
    hasInclusionsDraft, hasFaqsDraft,
    modules,
    relatedPkg, inclusions, faqs, overviewDraft: stationOverviewDraft, settledOverview,
    inclSummary, faqsSummary,
    revertOverview, revertInclusions, revertFaqs,
  } = station;

  const isNewNeverPublished = platformStatus === 'disabled' && moduleStatus?.overview !== 'settled';

  // ── Module editing ──────────────────────────────────────────────────────────
  const closePanel = useCallback(() => setOpenPanel(null), []);
  const editing = useServiceModuleEditing({ service, station, allCategories, initialEdit, closePanel });

  // ── Exit flow ⇄ lifecycle wiring ────────────────────────────────────────────
  // The exit flow's Settle continuation is the lifecycle's settle handler, and
  // the lifecycle's terminal actions close through the exit flow's guard bypass.
  // The ref late-binds the settle side so both hooks compose without a cycle.
  const settleRef = useRef<() => Promise<void>>(async () => {});
  const exitFlow = useServiceExitFlow({
    bridge, station, editing, isNewNeverPublished,
    settleModules: () => settleRef.current(),
  });

  const [splitOpen, setSplitOpen] = useState(false);
  useOutsideClickDismiss(splitOpen, () => setSplitOpen(false));

  const lifecycle = useServiceLifecycle({
    station, setService,
    closeBypassingGuard: exitFlow.closeBypassingGuard,
    closeSplit: () => setSplitOpen(false),
  });
  settleRef.current = lifecycle.handleSettleModules;

  // ── Confirm dialogs (publish/settle, discard-draft) ─────────────────────────
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [discardConfirm,   setDiscardConfirm]   = useState<'overview' | 'inclusions' | 'faqs' | null>(null);

  const handleConfirmPublish = useCallback(async () => {
    setShowPublishModal(false);
    await (isActive ? lifecycle.handleSettleModules() : lifecycle.handlePublishService());
  }, [isActive, lifecycle.handleSettleModules, lifecycle.handlePublishService]);

  const handleConfirmDiscard = useCallback(async () => {
    const module = discardConfirm;
    setDiscardConfirm(null);
    if (module === 'overview')   await revertOverview();
    if (module === 'inclusions') await revertInclusions();
    if (module === 'faqs')       await revertFaqs();
  }, [discardConfirm, revertOverview, revertInclusions, revertFaqs]);

  // Tab switch is guarded too: while a dirty module is open, switching raises the
  // unsaved dialog and defers the switch (parity with the old requestExit tab intent).
  const selectServiceTab = useCallback((next: DrawerTabId) => {
    exitFlow.guard(() => setTab(next));
  }, [exitFlow.guard]);

  // Footer Close routes through the host (and thus the registered guard).
  const requestClose = useCallback(() => bridge.close(), [bridge]);

  // ── Derived display values ──────────────────────────────────────────────────
  const rawDisplayTitle = stationOverviewDraft?.title.trim() || settledOverview?.title.trim() || service.title.trim() || '';
  const displayTitle    = rawDisplayTitle ? decodeHtml(rawDisplayTitle) : '';
  const displayContent  = stationOverviewDraft?.content.trim() || settledOverview?.content?.trim() || service.content?.trim() || '';
  const displayCategory = stationOverviewDraft
    ? decodeHtml(editing.localCategories.find(c => stationOverviewDraft.category_ids.includes(c.id ?? -1))?.name ?? 'Not selected')
    : decodeHtml(settledOverview?.categories[0]?.name ?? service.categories[0]?.name ?? 'Not selected');
  const decodedServiceTitle = decodeHtml(service.title);

  // ── Shell bindings — Station DNA delivered to the archetype shells ──────────
  const overviewShellBinding: ShellBinding<ServiceOverviewShellData> = {
    data:  { title: displayTitle, category: displayCategory, content: displayContent },
    state: detailLoaded ? modules.overview : { status: 'loading', notes: [] },
    hasDraft: moduleStatus?.overview === 'pending' && stationOverviewDraft !== null,
    handlers: { edit: editing.openOverviewEditor, 'discard-draft': () => setDiscardConfirm('overview') },
  };
  const inclusionsShellBinding: ShellBinding<ServiceInclusionsShellData> = {
    data:  { items: inclusions, serviceTitle: decodedServiceTitle },
    state: detailLoaded ? modules.inclusions : { status: 'loading', notes: [] },
    hasDraft: moduleStatus?.inclusions === 'pending' && hasInclusionsDraft,
    handlers: { edit: editing.openInclusionsEditor, 'discard-draft': () => setDiscardConfirm('inclusions') },
  };
  const faqsShellBinding: ShellBinding<ServiceFaqsShellData> = {
    data:  { items: faqs, serviceTitle: decodedServiceTitle },
    state: detailLoaded ? modules.faqs : { status: 'loading', notes: [] },
    hasDraft: moduleStatus?.faqs === 'pending' && hasFaqsDraft,
    handlers: { edit: editing.openFaqsEditor, 'discard-draft': () => setDiscardConfirm('faqs') },
  };

  // Footer gate: Enable/Disable is meaningful once published at least once.
  const hasBeenPublished = modules.overview.status === 'active' || moduleStatus?.overview === 'settled';

  return {
    // record + station
    service, station, platformStatus, isActive, canPublish, isNewNeverPublished, hasBeenPublished,
    relatedPkg, inclSummary, faqsSummary, pendingModuleNames,
    // tabs
    tab, selectServiceTab,
    // panels + bindings
    openPanel, togglePanel: (m: string) => setOpenPanel((p) => (p === m ? null : m)),
    overviewShellBinding, inclusionsShellBinding, faqsShellBinding,
    // editing
    editingSection: editing.editingSection,
    editingSectionLabel: editing.editingSectionLabel,
    isEditorDirty: editing.isEditorDirty,
    saving: editing.saving, saveErr: editing.saveErr, saveOk: editing.saveOk,
    overviewDraft: editing.overviewDraft, setOverviewDraft: editing.setOverviewDraft,
    inclusionsDraft: editing.inclusionsDraft, setInclusionsDraft: editing.setInclusionsDraft,
    faqsDraft: editing.faqsDraft, setFaqsDraft: editing.setFaqsDraft,
    localCategories: editing.localCategories,
    catDesc: editing.catDesc, setCatDesc: editing.setCatDesc,
    createInlineCategory: editing.createInlineCategory,
    handleSaveOverview: editing.handleSaveOverview,
    handleSaveInclusions: editing.handleSaveInclusions,
    handleSaveFaqs: editing.handleSaveFaqs,
    handleCancelEdit: editing.handleCancelEdit,
    // footer
    splitOpen, setSplitOpen, requestClose,
    handleToggleActive: lifecycle.handleToggleActive,
    handleArchive: lifecycle.handleArchive,
    handleTrash: lifecycle.handleTrash,
    openPublishModal: () => setShowPublishModal(true),
    // dialogs
    showPublishModal, setShowPublishModal, handleConfirmPublish,
    discardConfirm, setDiscardConfirm, handleConfirmDiscard,
    exitDialog: exitFlow.exitDialog, setExitDialog: exitFlow.setExitDialog,
    exitSaving: exitFlow.exitSaving, displayCategory, stationOverviewDraft,
    newSvcFields: exitFlow.newSvcFields, setNewSvcFields: exitFlow.setNewSvcFields,
    handleExitSaveAndProceed: exitFlow.handleExitSaveAndProceed,
    handleExitDiscard: exitFlow.handleExitDiscard,
    handleExitSettle: exitFlow.handleExitSettle,
    handleExitCloseWithoutSettling: exitFlow.handleExitCloseWithoutSettling,
    handleNewSvcSaveDraft: exitFlow.handleNewSvcSaveDraft,
    handleNewSvcTrash: exitFlow.handleNewSvcTrash,
  };
}

export type ServiceDrawerController = ReturnType<typeof useServiceDrawerController>;
