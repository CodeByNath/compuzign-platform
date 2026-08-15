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
  //
  // `null` — the Settings lane's Create Service launcher — addresses no
  // backing post yet. A complete Overview Save asks Service Station to create
  // the persisted Pending Service record with its Overview draft, then calls
  // `setService` with its returned identity;
  // this mounted composition continues without a replacement or loading mask.
  const [service, setService] = useState<ServiceItem | null>(seedService);

  const [tab, setTab] = useState<DrawerTabId>(initialTab ?? 'details');
  const [openPanel, setOpenPanel] = useState<string | null>(null);

  const station = useServiceStation(service, packages, bridge.onMutationComplete, setService);
  const {
    platformStatus, isActive, isDisabledMasked, detailLoaded, canPublish, pendingModuleNames, moduleStatus,
    hasInclusionsDraft, hasFaqsDraft,
    modules,
    relatedPkg, inclusions, faqs, overviewDraft: stationOverviewDraft, settledOverview,
    inclSummary, faqsSummary,
    revertOverview, revertInclusions, revertFaqs,
  } = station;

  // "Has this record ever been settled/published" must survive an ordinary
  // post-Enable edit that moves module_status.overview back to 'pending' —
  // checking the transition label alone regresses the moment a fresh draft is
  // saved: ServiceSchema::defaultModuleStatus() seeds a BRAND-NEW record's
  // overview to 'pending' too (a draft exists from creation), so 'pending'
  // never distinguished "genuinely new" from "previously published, mid-edit"
  // in the first place. The canonical settled fields (settledOverview, always
  // distinct from any newer in-flight draft) do: they stay complete once a
  // record has ever been settled, regardless of what a newer unsettled draft
  // holds, so a post-Enable edit no longer misroutes an already-published
  // Service to "Move to Trash" / disables Archive.
  const hasSettledOverview = !!settledOverview?.title.trim() && (settledOverview?.categories.length ?? 0) > 0 && !!settledOverview?.content.trim();
  const isNewNeverPublished = platformStatus === 'disabled' && !hasSettledOverview;

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
    // Publish never establishes a record identity: the footer is unavailable
    // while Overview Save has not created the persisted Pending Service record.
    if (!service) return;
    await (isActive ? lifecycle.handleSettleModules() : lifecycle.handlePublishService());
  }, [service, station, isActive, lifecycle.handleSettleModules, lifecycle.handlePublishService]);

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
  // service?. — a pending Service (Create Service, before Publish) has no
  // ServiceItem to fall back to; the draft/settled chain already covers it
  // (overviewDraft is never null while pending), so the final fallback here
  // simply resolves to empty rather than needing a fabricated record.
  const rawDisplayTitle = stationOverviewDraft?.title.trim() || settledOverview?.title.trim() || service?.title.trim() || '';
  const displayTitle    = rawDisplayTitle ? decodeHtml(rawDisplayTitle) : '';
  const displayContent  = stationOverviewDraft?.content.trim() || settledOverview?.content?.trim() || service?.content?.trim() || '';
  const displayCategory = stationOverviewDraft
    ? decodeHtml(editing.localCategories.find(c => stationOverviewDraft.category_ids.includes(c.id ?? -1))?.name ?? 'Not selected')
    : decodeHtml(settledOverview?.categories[0]?.name ?? service?.categories[0]?.name ?? 'Not selected');
  const decodedServiceTitle = service ? decodeHtml(service.title) : displayTitle;

  // ── Shell bindings — Station DNA delivered to the archetype shells ──────────
  const overviewShellBinding: ShellBinding<ServiceOverviewShellData> = {
    data:  { title: displayTitle, platformId: service?.platformId ?? '', category: displayCategory, content: displayContent },
    state: detailLoaded ? modules.overview : { status: 'loading', notes: [] },
    hasDraft: moduleStatus?.overview === 'pending' && stationOverviewDraft !== null,
    handlers: { edit: editing.openOverviewEditor, 'discard-draft': () => setDiscardConfirm('overview') },
  };
  const inclusionsShellBinding: ShellBinding<ServiceInclusionsShellData> = {
    data:  { items: inclusions, serviceTitle: decodedServiceTitle },
    state: detailLoaded ? modules.inclusions : { status: 'loading', notes: [] },
    hasDraft: moduleStatus?.inclusions === 'pending' && hasInclusionsDraft,
    // A child cannot open an editor until Overview Save has issued the Service
    // id. The station supplies the matching Pending-dim guidance and remains
    // the defensive write boundary if this presentation lock is bypassed.
    handlers: service
      ? { edit: editing.openInclusionsEditor, 'discard-draft': () => setDiscardConfirm('inclusions') }
      : { 'discard-draft': () => setDiscardConfirm('inclusions') },
  };
  const faqsShellBinding: ShellBinding<ServiceFaqsShellData> = {
    data:  { items: faqs, serviceTitle: decodedServiceTitle },
    state: detailLoaded ? modules.faqs : { status: 'loading', notes: [] },
    hasDraft: moduleStatus?.faqs === 'pending' && hasFaqsDraft,
    handlers: service
      ? { edit: editing.openFaqsEditor, 'discard-draft': () => setDiscardConfirm('faqs') }
      : { 'discard-draft': () => setDiscardConfirm('faqs') },
  };

  // Footer gate: Enable/Disable is meaningful once published at least once.
  // Same durable signal as isNewNeverPublished above — see its comment.
  const hasBeenPublished = modules.overview.status === 'active' || hasSettledOverview;

  return {
    // record + station
    service, station, platformStatus, isActive, isDisabledMasked, canPublish, isNewNeverPublished, hasBeenPublished,
    relatedPkg, inclSummary, faqsSummary, pendingModuleNames, displayTitle,
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
