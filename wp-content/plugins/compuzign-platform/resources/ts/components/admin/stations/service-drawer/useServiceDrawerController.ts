// Service drawer controller — the Service drawer's coordination layer.
//
// Owns everything the drawer needs to behave: local record identity, the
// module-level edit state machine (one module editing while others stay
// readable), draft/dirty tracking, save/cancel/discard, the Service lifecycle
// actions, and the guarded-exit workflow. It coordinates the authoritative
// useServiceStation (the write boundary — never duplicated here) and reports
// host concerns through the EntityDrawerHostBridge.
//
// It renders NOTHING: it returns state and callbacks. ServiceDrawerContent turns
// them into the mature EntityDrawer presentation, ServiceDrawerFooter into the
// record footer, and ServiceDrawerDialogs into the confirm/exit modals. Extracted
// verbatim from the former ServiceViewStep god file — the host coupling
// (StepContext.setFooter / setCloseGuard / requestExit / setStepData / close) is
// the only thing that changed, and it moved onto the bridge.

import { useEffect, useState, useCallback, useRef } from 'preact/hooks';
import type { Category, ServiceItem, PlatformStatus } from '@/api/types/cost-builder';
import { updateServiceCategory } from '@/api/endpoints/admin';
import type { SurfacePackageSummary } from '@/api/types/admin';
import { useServiceStation } from '@/admin-station/stations/service';
import type { OverviewDraft, InclusionsDraft, FaqsDraft } from '@/admin-station/stations/service';
import { initOverviewDraft } from '../../editors/ServiceOverviewEditor';
import type {
  ServiceOverviewShellData,
  ServiceInclusionsShellData,
  ServiceFaqsShellData,
} from '@/components/admin/schema/shells/bindings/service';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import type { DrawerTabId } from '@/drawer-kit/DrawerTabs';
import { decodeHtml } from '../serviceDrawerShared';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import type { ServiceEditingSection, ServiceExitDialog } from './serviceDrawerTypes';

// ── Dirty checks — pure, no component state ──────────────────────────────────
function isOverviewDirty(a: OverviewDraft, b: OverviewDraft): boolean {
  return a.title !== b.title || a.excerpt !== b.excerpt ||
         a.content !== b.content || a.category_id !== b.category_id;
}
function isInclusionsDirty(a: InclusionsDraft, b: InclusionsDraft): boolean {
  if (a.items.length !== b.items.length) return true;
  return a.items.some((item, i) => item.id !== b.items[i].id || item.label !== b.items[i].label);
}
function isFaqsDirty(a: FaqsDraft, b: FaqsDraft): boolean {
  if (a.items.length !== b.items.length) return true;
  return a.items.some((item, i) =>
    item.id !== b.items[i].id ||
    item.question !== b.items[i].question ||
    item.answer   !== b.items[i].answer,
  );
}

export interface ServiceDrawerControllerArgs {
  service:       ServiceItem;
  packages:      SurfacePackageSummary[];
  allCategories: Category[];
  initialTab?:   DrawerTabId;
  initialEdit?:  boolean;
  bridge:        EntityDrawerHostBridge;
}

export function useServiceDrawerController({
  service: seedService, packages, allCategories, initialTab, initialEdit, bridge,
}: ServiceDrawerControllerArgs) {
  // Local record identity, seeded from the opening handoff and advanced by
  // lifecycle actions. Replaces the old host's ctx.setStepData('service', …):
  // the same numeric id keeps useServiceStation from refetching, while the
  // derived platform_status/module_status stay live for the footer and pills.
  const [service, setService] = useState<ServiceItem>(seedService);

  const [tab, setTab] = useState<DrawerTabId>(initialTab ?? 'details');

  const station = useServiceStation(service, packages, bridge.onMutationComplete);
  const {
    platformStatus, isActive, detailLoaded, canPublish, hasPendingModules, pendingModuleNames, moduleStatus,
    hasInclusionsDraft, hasFaqsDraft,
    modules,
    relatedPkg, inclusions, faqs, overviewDraft: stationOverviewDraft, settledOverview,
    inclSummary, faqsSummary,
    toggleActive, archiveStation, trashStation, settleModules, publishService,
    saveOverview, saveInclusions, saveFaqs,
    revertOverview, revertInclusions, revertFaqs,
  } = station;

  // Module state machine: null = View, named value = Edit (InlineEditorShell active).
  const [editingSection,   setEditingSection]   = useState<ServiceEditingSection>(null);
  const [overviewDraft,    setOverviewDraft]    = useState<OverviewDraft | null>(null);
  const [inclusionsDraft,  setInclusionsDraft]  = useState<InclusionsDraft | null>(null);
  const [faqsDraft,        setFaqsDraft]        = useState<FaqsDraft | null>(null);
  const [catDesc,         setCatDesc]         = useState('');
  const [catDescOriginal, setCatDescOriginal] = useState('');
  const [localCategories, setLocalCategories] = useState<Category[]>(allCategories);
  const [overviewOriginal,   setOverviewOriginal]   = useState<OverviewDraft | null>(null);
  const [inclusionsOriginal, setInclusionsOriginal] = useState<InclusionsDraft | null>(null);
  const [faqsOriginal,       setFaqsOriginal]       = useState<FaqsDraft | null>(null);
  const [saving,             setSaving]           = useState(false);
  const [saveErr,            setSaveErr]          = useState<string | null>(null);
  const [saveOk,             setSaveOk]           = useState(false);
  const [showPublishModal,   setShowPublishModal] = useState(false);
  const [discardConfirm,     setDiscardConfirm]   = useState<'overview' | 'inclusions' | 'faqs' | null>(null);
  const [openPanel,          setOpenPanel]        = useState<string | null>(null);
  const [exitDialog,         setExitDialog]       = useState<ServiceExitDialog>(null);
  const [exitSaving,         setExitSaving]       = useState(false);
  const [splitOpen,          setSplitOpen]        = useState(false);
  const [newSvcFields,       setNewSvcFields]     = useState({ title: false, category: false, description: false });

  useEffect(() => {
    if (!saveOk) return;
    const t = setTimeout(() => setSaveOk(false), 3000);
    return () => clearTimeout(t);
  }, [saveOk]);

  const isEditorDirty =
    (editingSection === 'overview'   && overviewDraft   != null && overviewOriginal   != null && isOverviewDirty(overviewDraft, overviewOriginal))   ||
    (editingSection === 'inclusions' && inclusionsDraft != null && inclusionsOriginal != null && isInclusionsDirty(inclusionsDraft, inclusionsOriginal)) ||
    (editingSection === 'faqs'       && faqsDraft       != null && faqsOriginal       != null && isFaqsDirty(faqsDraft, faqsOriginal));

  const editingSectionLabel =
    editingSection === 'overview'   ? 'Service Overview'  :
    editingSection === 'inclusions' ? 'Included Features' :
    editingSection === 'faqs'       ? 'Common Questions'  : null;

  const isNewNeverPublished = platformStatus === 'disabled' && moduleStatus?.overview !== 'settled';

  // ── Lifecycle — advance the local record instead of the old host's stepData ──
  const handleToggleActive = useCallback(async () => {
    const result = await toggleActive();
    if (result) {
      setService((prev) => ({
        ...prev,
        meta: { ...prev.meta, platform_status: result.platform_status as PlatformStatus, module_status: result.module_status as any },
      }));
    }
  }, [toggleActive]);

  const handleSettleModules = useCallback(async () => {
    const result = await settleModules();
    if (result) {
      setService((prev) => ({
        ...prev,
        title:      result.service.title,
        excerpt:    result.service.excerpt,
        content:    result.service.content,
        categories: result.service.categories,
        inclusions: result.inclusions,
        faqs:       result.faqs,
      }));
    }
  }, [settleModules]);

  const handlePublishService = useCallback(async () => {
    const result = await publishService();
    if (result) {
      setService((prev) => ({
        ...prev,
        ...(result.settled && result.service ? {
          title:      result.service.title,
          excerpt:    result.service.excerpt,
          content:    result.service.content,
          categories: result.service.categories,
          inclusions: result.inclusions ?? prev.inclusions,
          faqs:       result.faqs ?? prev.faqs,
        } : {}),
        meta: { ...prev.meta, platform_status: result.platform_status as PlatformStatus, module_status: result.module_status as any },
      }));
    }
  }, [publishService]);

  // ── Module editors ──────────────────────────────────────────────────────────
  const openOverviewEditor = useCallback(() => {
    const wc = stationOverviewDraft;
    let draft: OverviewDraft;
    if (wc) {
      draft = { title: wc.title, excerpt: wc.excerpt, content: wc.content, category_id: wc.category_ids[0] ?? null };
    } else if (settledOverview) {
      draft = { title: settledOverview.title, excerpt: settledOverview.excerpt, content: settledOverview.content, category_id: settledOverview.categories[0]?.id ?? null };
    } else {
      draft = initOverviewDraft(service);
    }
    const catId = draft.category_id;
    const desc  = catId ? (localCategories.find(c => c.id === catId)?.description ?? '') : '';
    setCatDesc(desc);
    setCatDescOriginal(desc);
    setOverviewOriginal(draft);
    setOverviewDraft(draft);
    setEditingSection('overview');
    setOpenPanel(null);
    setSaveErr(null);
  }, [service, stationOverviewDraft, settledOverview, localCategories]);

  const initialEditOpened = useRef(false);
  useEffect(() => {
    if (!initialEdit || !detailLoaded || initialEditOpened.current) return;
    initialEditOpened.current = true;
    openOverviewEditor();
  }, [initialEdit, detailLoaded, openOverviewEditor]);

  const openInclusionsEditor = useCallback(() => {
    const draft: InclusionsDraft = { items: inclusions };
    setInclusionsOriginal(draft);
    setInclusionsDraft(draft);
    setEditingSection('inclusions');
    setOpenPanel(null);
    setSaveErr(null);
  }, [inclusions]);

  const openFaqsEditor = useCallback(() => {
    const draft: FaqsDraft = { items: faqs };
    setFaqsOriginal(draft);
    setFaqsDraft(draft);
    setEditingSection('faqs');
    setOpenPanel(null);
    setSaveErr(null);
  }, [faqs]);

  const handleCancelEdit = useCallback(() => {
    setEditingSection(null);
    setOverviewDraft(null);    setOverviewOriginal(null);
    setInclusionsDraft(null);  setInclusionsOriginal(null);
    setFaqsDraft(null);        setFaqsOriginal(null);
    setCatDesc(catDescOriginal);
    setSaveErr(null);
    setSaving(false);
  }, [catDescOriginal]);

  const handleSaveOverview = useCallback(async () => {
    if (!overviewDraft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await saveOverview(overviewDraft);
      if (overviewDraft.category_id !== null && catDesc.trim() !== catDescOriginal.trim()) {
        await updateServiceCategory(overviewDraft.category_id, { description: catDesc.trim() });
        const savedCatId = overviewDraft.category_id;
        const savedDesc  = catDesc.trim();
        setLocalCategories(prev => prev.map(c => c.id === savedCatId ? { ...c, description: savedDesc } : c));
      }
      setCatDescOriginal(catDesc);
      setOpenPanel(null);
      setEditingSection(null);
      setOverviewDraft(null);    setOverviewOriginal(null);
      setSaveOk(true);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }, [overviewDraft, catDesc, catDescOriginal, saveOverview]);

  const handleSaveInclusions = useCallback(async () => {
    if (!inclusionsDraft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await saveInclusions(inclusionsDraft);
      setOpenPanel(null);
      setEditingSection(null);
      setInclusionsDraft(null);  setInclusionsOriginal(null);
      setSaveOk(true);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }, [inclusionsDraft, saveInclusions]);

  const handleSaveFaqs = useCallback(async () => {
    if (!faqsDraft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await saveFaqs(faqsDraft);
      setOpenPanel(null);
      setEditingSection(null);
      setFaqsDraft(null);  setFaqsOriginal(null);
      setSaveOk(true);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }, [faqsDraft, saveFaqs]);

  const handleConfirmPublish = useCallback(async () => {
    setShowPublishModal(false);
    await (isActive ? handleSettleModules() : handlePublishService());
  }, [isActive, handleSettleModules, handlePublishService]);

  const handleConfirmDiscard = useCallback(async () => {
    const module = discardConfirm;
    setDiscardConfirm(null);
    if (module === 'overview')   await revertOverview();
    if (module === 'inclusions') await revertInclusions();
    if (module === 'faqs')       await revertFaqs();
  }, [discardConfirm, revertOverview, revertInclusions, revertFaqs]);

  // ── Guarded exit ─────────────────────────────────────────────────────────────
  // The composition owns the exit dialogs; the bridge only closes. A pending
  // continuation (close, or a tab switch) is stashed while a dialog is open and
  // run when it resolves. A bypass ref lets terminal actions and resolved dialogs
  // close without the guard re-blocking on not-yet-flushed state.
  const bypassRef = useRef(false);
  const pendingContinuationRef = useRef<null | (() => void)>(null);

  const exitStateRef = useRef({ editingSection, isEditorDirty, isActive, hasPendingModules, isNewNeverPublished, stationOverviewDraft });
  useEffect(() => {
    exitStateRef.current = { editingSection, isEditorDirty, isActive, hasPendingModules, isNewNeverPublished, stationOverviewDraft };
  });

  // Evaluate whether an exit may proceed now; raise the matching dialog if not.
  const evaluateExit = useCallback((): boolean => {
    if (bypassRef.current) return true;
    const s = exitStateRef.current;
    if (s.editingSection && s.isEditorDirty) { setExitDialog('unsaved'); return false; }
    if (s.isNewNeverPublished && s.stationOverviewDraft !== null) { setExitDialog('new-service-draft'); return false; }
    if (s.isActive && s.hasPendingModules) { setExitDialog('pending'); return false; }
    return true;
  }, []);

  // Registered with the host: consulted on Escape / backdrop / header + footer
  // Close. Blocking stashes the actual close as the pending continuation.
  useEffect(() => {
    bridge.setCloseGuard(() => {
      const ok = evaluateExit();
      if (!ok) pendingContinuationRef.current = () => bridge.close();
      return ok;
    });
    return () => bridge.setCloseGuard(null);
  }, [bridge, evaluateExit]);

  // Close bypassing the guard — for terminal lifecycle actions (archive/trash),
  // which must never re-trigger the exit dialog on the record they just left.
  const closeBypassingGuard = useCallback(() => {
    bypassRef.current = true;
    bridge.close();
  }, [bridge]);

  // Run the stashed continuation (close or tab switch) with the guard bypassed,
  // then restore the guard for whatever surface remains.
  const resolveExit = useCallback(() => {
    bypassRef.current = true;
    const c = pendingContinuationRef.current;
    pendingContinuationRef.current = null;
    c?.();
    bypassRef.current = false;
  }, []);

  // Tab switch is guarded too: while a dirty module is open, switching raises the
  // unsaved dialog and defers the switch (parity with the old requestExit tab intent).
  const selectServiceTab = useCallback((next: DrawerTabId) => {
    if (evaluateExit()) setTab(next);
    else pendingContinuationRef.current = () => setTab(next);
  }, [evaluateExit]);

  // ── Split-dropdown outside-click dismissal ──────────────────────────────────
  useEffect(() => {
    if (!splitOpen) return;
    const handle = () => setSplitOpen(false);
    const t = setTimeout(() => document.addEventListener('click', handle), 0);
    return () => { clearTimeout(t); document.removeEventListener('click', handle); };
  }, [splitOpen]);

  const handleArchive = useCallback(async () => {
    setSplitOpen(false);
    const result = await archiveStation();
    if (result) closeBypassingGuard();
  }, [archiveStation, closeBypassingGuard]);

  const handleTrash = useCallback(async () => {
    setSplitOpen(false);
    const result = await trashStation();
    if (result) closeBypassingGuard();
  }, [trashStation, closeBypassingGuard]);

  // ── New-never-published exit prompt ─────────────────────────────────────────
  const handleNewSvcSaveDraft = useCallback(async () => {
    if (!stationOverviewDraft) return;
    setExitSaving(true);
    try {
      const draft: OverviewDraft = {
        title:       stationOverviewDraft.title,
        excerpt:     stationOverviewDraft.excerpt ?? '',
        content:     stationOverviewDraft.content,
        category_id: stationOverviewDraft.category_ids[0] ?? null,
      };
      await saveOverview(draft);
      setExitDialog(null);
      setNewSvcFields({ title: false, category: false, description: false });
      resolveExit();
    } finally {
      setExitSaving(false);
    }
  }, [stationOverviewDraft, saveOverview, resolveExit]);

  const handleNewSvcTrash = useCallback(async () => {
    setExitDialog(null);
    setNewSvcFields({ title: false, category: false, description: false });
    const result = await trashStation();
    if (result) resolveExit();
  }, [trashStation, resolveExit]);

  const saveCurrentModule = useCallback(async (): Promise<Record<string, string> | null> => {
    if (editingSection === 'overview'   && overviewDraft)   return saveOverview(overviewDraft);
    if (editingSection === 'inclusions' && inclusionsDraft) return saveInclusions(inclusionsDraft);
    if (editingSection === 'faqs'       && faqsDraft)       return saveFaqs(faqsDraft);
    return null;
  }, [editingSection, overviewDraft, inclusionsDraft, faqsDraft, saveOverview, saveInclusions, saveFaqs]);

  const handleExitSaveAndProceed = useCallback(async () => {
    setExitSaving(true);
    setSaveErr(null);
    try {
      const newModuleStatus = await saveCurrentModule();
      setEditingSection(null);
      setOverviewDraft(null);    setOverviewOriginal(null);
      setInclusionsDraft(null);  setInclusionsOriginal(null);
      setFaqsDraft(null);        setFaqsOriginal(null);
      const stillPending = isActive && newModuleStatus != null && (
        newModuleStatus.overview   === 'pending' ||
        newModuleStatus.inclusions === 'pending' ||
        newModuleStatus.faqs       === 'pending'
      );
      if (stillPending) {
        setExitDialog('pending');
      } else {
        setExitDialog(null);
        resolveExit();
      }
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setExitSaving(false);
    }
  }, [saveCurrentModule, isActive, resolveExit]);

  const handleExitDiscard = useCallback(() => {
    setEditingSection(null);
    setOverviewDraft(null);    setOverviewOriginal(null);
    setInclusionsDraft(null);  setInclusionsOriginal(null);
    setFaqsDraft(null);        setFaqsOriginal(null);
    setSaveErr(null);
    setSaving(false);
    setExitDialog(null);
    resolveExit();
  }, [resolveExit]);

  const handleExitCloseWithoutSettling = useCallback(() => {
    setExitDialog(null);
    resolveExit();
  }, [resolveExit]);

  const handleExitSettle = useCallback(async () => {
    setExitSaving(true);
    try {
      await handleSettleModules();
      setExitDialog(null);
      resolveExit();
    } finally {
      setExitSaving(false);
    }
  }, [handleSettleModules, resolveExit]);

  // Footer Close routes through the host (and thus the registered guard).
  const requestClose = useCallback(() => bridge.close(), [bridge]);

  // ── Derived display values ──────────────────────────────────────────────────
  const rawDisplayTitle = stationOverviewDraft?.title.trim() || settledOverview?.title.trim() || service.title.trim() || '';
  const displayTitle    = rawDisplayTitle ? decodeHtml(rawDisplayTitle) : '';
  const displayContent  = stationOverviewDraft?.content.trim() || settledOverview?.content?.trim() || service.content?.trim() || '';
  const displayCategory = stationOverviewDraft
    ? decodeHtml(allCategories.find(c => stationOverviewDraft.category_ids.includes(c.id ?? -1))?.name ?? 'Not selected')
    : decodeHtml(settledOverview?.categories[0]?.name ?? service.categories[0]?.name ?? 'Not selected');
  const decodedServiceTitle = decodeHtml(service.title);

  // ── Shell bindings — Station DNA delivered to the archetype shells ──────────
  const overviewShellBinding: ShellBinding<ServiceOverviewShellData> = {
    data:  { title: displayTitle, category: displayCategory, content: displayContent },
    state: detailLoaded ? modules.overview : { status: 'loading', notes: [] },
    hasDraft: moduleStatus?.overview === 'pending' && stationOverviewDraft !== null,
    handlers: { edit: openOverviewEditor, 'discard-draft': () => setDiscardConfirm('overview') },
  };
  const inclusionsShellBinding: ShellBinding<ServiceInclusionsShellData> = {
    data:  { items: inclusions, serviceTitle: decodedServiceTitle },
    state: detailLoaded ? modules.inclusions : { status: 'loading', notes: [] },
    hasDraft: moduleStatus?.inclusions === 'pending' && hasInclusionsDraft,
    handlers: { edit: openInclusionsEditor, 'discard-draft': () => setDiscardConfirm('inclusions') },
  };
  const faqsShellBinding: ShellBinding<ServiceFaqsShellData> = {
    data:  { items: faqs, serviceTitle: decodedServiceTitle },
    state: detailLoaded ? modules.faqs : { status: 'loading', notes: [] },
    hasDraft: moduleStatus?.faqs === 'pending' && hasFaqsDraft,
    handlers: { edit: openFaqsEditor, 'discard-draft': () => setDiscardConfirm('faqs') },
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
    editingSection, editingSectionLabel, isEditorDirty, saving, saveErr, saveOk,
    overviewDraft, setOverviewDraft, inclusionsDraft, setInclusionsDraft, faqsDraft, setFaqsDraft,
    localCategories, catDesc, setCatDesc,
    handleSaveOverview, handleSaveInclusions, handleSaveFaqs, handleCancelEdit,
    // footer
    splitOpen, setSplitOpen, requestClose,
    handleToggleActive, handleArchive, handleTrash, openPublishModal: () => setShowPublishModal(true),
    // dialogs
    showPublishModal, setShowPublishModal, handleConfirmPublish,
    discardConfirm, setDiscardConfirm, handleConfirmDiscard,
    exitDialog, setExitDialog, exitSaving, displayCategory, stationOverviewDraft,
    newSvcFields, setNewSvcFields,
    handleExitSaveAndProceed, handleExitDiscard, handleExitSettle, handleExitCloseWithoutSettling,
    handleNewSvcSaveDraft, handleNewSvcTrash,
  };
}

export type ServiceDrawerController = ReturnType<typeof useServiceDrawerController>;
