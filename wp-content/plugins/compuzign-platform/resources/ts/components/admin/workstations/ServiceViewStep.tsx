import { useEffect, useState, useCallback, useRef, useMemo } from 'preact/hooks';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { Category, ServiceItem } from '@/api/types/cost-builder';
import { updateServiceCategory } from '@/api/endpoints/admin';
import type { SurfacePackageSummary } from '@/api/types/admin';
import { useServiceStation } from '@/hooks/useServiceStation';
import { initOverviewDraft } from '../editors/ServiceOverviewEditor';
import type { OverviewDraft } from '../editors/ServiceOverviewEditor';
import type { InclusionsDraft } from '../editors/ServiceInclusionsEditor';
import type { FaqsDraft } from '../editors/ServiceFaqsEditor';
import { ModeProvider } from '@/components/admin/schema/modeContext';
import { OverviewShell } from '@/components/admin/schema/shells/overviewShell';
import { ChildShell } from '@/components/admin/schema/shells/childShell';
import {
  serviceOverviewShell,
  serviceInclusionsShell,
  serviceFaqsShell,
} from '@/components/admin/schema/shells/bindings/service';
import type {
  ServiceOverviewShellData,
  ServiceInclusionsShellData,
  ServiceFaqsShellData,
  ServicePackageSummaryShellData,
} from '@/components/admin/schema/shells/bindings/service';
import type { ShellBinding } from '@/components/admin/schema/types';
import { SERVICE_ENTITY } from '@/components/admin/schema/entities/service';
import { ReadBlock } from '../ReadBlock';
import { EntityDrawer } from '../EntityDrawer';
import type { DrawerTabId } from '../DrawerTabs';
import { getPackageNotes } from '@/components/admin/utils/moduleNotifications';
import { decodeHtml, TIER_KEYS, TIER_LABELS } from './serviceDrawerShared';
import { ServiceTierStep } from './ServiceTierStep';
import { ServicePromotionStep } from './ServicePromotionStep';
import {
  DynamicStationManager, providersExposeManager, relationProvidersFor,
} from '@/components/admin/relations';
import type {
  ManagerContinuation, StationConnectionDescriptor, StationManagerScope,
} from '@/components/admin/relations';
export { decodeHtml, TIER_KEYS, TIER_LABELS };

// ── CommercialBlock ───────────────────────────────────────────────────────────
// Reusable summary card for the Commercial tab.
// header  → label + status pill
// body    → count + description
// footer  → View action (disabled when onView is undefined)

export interface CommercialBlockProps {
  label:          string;
  count:          string;
  desc:           string;
  status:         string;
  onView?:        () => void;
  descHighlight?: boolean;
}

export function CommercialBlock({ label, count, desc, status, onView, descHighlight }: CommercialBlockProps) {
  return (
    <ReadBlock
      title={label}
      status={status}
      actions={[{ id: 'view', label: 'View', onSelect: onView, disabled: !onView }]}
    >
      <div class="drawerModule__empty">
        <p class="drawerModule__empty-title">{count}</p>
        <p
          class="drawerModule__empty-copy"
          style={descHighlight ? 'color:var(--admin-warning)' : undefined}
        >
          {desc}
        </p>
      </div>
    </ReadBlock>
  );
}

// ── Dirty-detection comparators ───────────────────────────────────────────────
// Pure functions — no component state. Each returns true when the working draft
// differs from the snapshot taken at editor-open time.

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

// ── ServiceViewStep ───────────────────────────────────────────────────────────
// Tabbed service detail drawer.
// Service tab  → Water Layer:  overview, description, features, FAQs.
// Commercial tab → Surface Layer: tier config, promo config, pricing summary.

export function ServiceViewStep({ ctx }: { ctx: StepContext }) {
  const service      = ctx.stepData.service      as ServiceItem;
  const packages     = ctx.stepData.packages     as SurfacePackageSummary[];
  const doOpen       = ctx.stepData.openAction   as (config: ActionConfig) => void;
  const allCategories = ctx.stepData.allCategories as Category[] ?? [];
  const onRefresh    = ctx.stepData.onRefresh    as (() => void) | undefined;

  const returnContinuation = ctx.stepData.managerContinuation as ManagerContinuation | undefined;
  const [tab, setTab] = useState<DrawerTabId>(returnContinuation ? 'manager' : 'details');
  const packageConnection = useMemo<StationConnectionDescriptor>(() => ({
    providerKey: 'package',
    relationshipKey: `service:${service.id}:package`,
    stationContext: { type: 'service', id: service.id },
    destinationRef: { type: 'tier', id: 'all' },
  }), [service.id]);
  const managerScope = useMemo<StationManagerScope>(() => returnContinuation?.scopeKind === 'subject-connections'
    && returnContinuation.subject
    ? {
      kind: 'subject-connections', stationContext: returnContinuation.stationContext,
      subject: returnContinuation.subject,
      activeProviderKey: returnContinuation.activeProviderKey,
      activeRelationshipKey: returnContinuation.activeRelationshipKey,
    }
    : {
      kind: 'connection-graph', stationContext: { type: 'service', id: service.id },
      activeProviderKey: returnContinuation?.activeProviderKey,
      activeRelationshipKey: returnContinuation?.activeRelationshipKey ?? packageConnection.relationshipKey,
    }, [service.id, returnContinuation, packageConnection]);
  const managerAvailabilityScope = useMemo<StationManagerScope>(() => ({
    kind: 'connection-graph', stationContext: { type: 'service', id: service.id },
  }), [service.id]);
  const managerProviders = useMemo(
    () => relationProvidersFor(managerAvailabilityScope),
    [managerAvailabilityScope],
  );
  const showManager = providersExposeManager(managerProviders);

  const selectServiceTab = (next: DrawerTabId) => {
    ctx.requestExit({ kind: 'tab', target: next }, () => setTab(next));
  };

  useEffect(() => {
    ctx.setPanelMode(tab === 'manager' ? 'manager-wide' : 'standard');
  }, [ctx.setPanelMode, tab]);
  useEffect(() => () => ctx.setPanelMode('standard'), [ctx.setPanelMode]);

  const station = useServiceStation(service, packages, onRefresh);
  const {
    platformStatus, isActive, detailLoaded, canPublish, hasPendingModules, pendingModuleNames, moduleStatus,
    hasInclusionsDraft, hasFaqsDraft,
    modules,
    relatedPkg, inclusions, faqs, overviewDraft: stationOverviewDraft, settledOverview,
    pkgSummaryStatus, pkgSummaryCount, pkgSummaryDesc,
    promoStatus, promotionCount,
    inclSummary, faqsSummary,
    toggleActive, archiveStation, trashStation, settleModules, publishService,
    saveOverview, saveInclusions, saveFaqs,
    revertOverview, revertInclusions, revertFaqs,
  } = station;

  // Drawer Principle v1 — module state machine: null = View, named value = Edit (InlineEditorShell active)
  const [editingSection,   setEditingSection]   = useState<'overview' | 'inclusions' | 'faqs' | null>(null);
  const [overviewDraft,    setOverviewDraft]    = useState<OverviewDraft | null>(null);
  const [inclusionsDraft,  setInclusionsDraft]  = useState<InclusionsDraft | null>(null);
  const [faqsDraft,        setFaqsDraft]        = useState<FaqsDraft | null>(null);
  // Category description for the overview editor — lifted from ServiceOverviewEditor.
  const [catDesc,         setCatDesc]         = useState('');
  const [catDescOriginal, setCatDescOriginal] = useState('');
  // Local, mutable category list seeded from the passed-in snapshot. Patched on
  // category-description save so reopening the editor in the same drawer session
  // reads the just-saved description instead of the stale prop. Mirrors ServiceCreateStep.
  const [localCategories, setLocalCategories] = useState<Category[]>(allCategories);
  // Snapshots taken at editor-open time for dirty detection — never mutated after init.
  const [overviewOriginal,   setOverviewOriginal]   = useState<OverviewDraft | null>(null);
  const [inclusionsOriginal, setInclusionsOriginal] = useState<InclusionsDraft | null>(null);
  const [faqsOriginal,       setFaqsOriginal]       = useState<FaqsDraft | null>(null);
  const [saving,             setSaving]           = useState(false);
  const [saveErr,            setSaveErr]          = useState<string | null>(null);
  const [saveOk,             setSaveOk]           = useState(false);
  const [showPublishModal,   setShowPublishModal] = useState(false);
  const [discardConfirm,     setDiscardConfirm]   = useState<'overview' | 'inclusions' | 'faqs' | null>(null);
  // Single-open notification-panel accordion, keyed by module key (EntityDrawer).
  const [openPanel,          setOpenPanel]        = useState<string | null>(null);
  const [exitDialog,         setExitDialog]       = useState<'unsaved' | 'pending' | 'new-service-draft' | null>(null);
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

  const handleToggleActive = useCallback(async () => {
    const result = await toggleActive();
    if (result) {
      ctx.setStepData('service', {
        ...service,
        meta: {
          ...service.meta,
          platform_status: result.platform_status,
          module_status:   result.module_status as any,
        },
      });
    }
  }, [toggleActive, service, ctx]);

  const handleSettleModules = useCallback(async () => {
    const result = await settleModules();
    if (result) {
      ctx.setStepData('service', {
        ...service,
        title:      result.service.title,
        excerpt:    result.service.excerpt,
        content:    result.service.content,
        categories: result.service.categories,
        inclusions: result.inclusions,
        faqs:       result.faqs,
      });
    }
  }, [settleModules, service, ctx]);

  const handlePublishService = useCallback(async () => {
    const result = await publishService();
    if (result) {
      ctx.setStepData('service', {
        ...service,
        ...(result.settled && result.service ? {
          title:      result.service.title,
          excerpt:    result.service.excerpt,
          content:    result.service.content,
          categories: result.service.categories,
          inclusions: result.inclusions ?? service.inclusions,
          faqs:       result.faqs ?? service.faqs,
        } : {}),
        meta: {
          ...service.meta,
          platform_status: result.platform_status,
          module_status:   result.module_status as any,
        },
      });
    }
  }, [publishService, service, ctx]);

  const openOverviewEditor = useCallback(() => {
    const wc = stationOverviewDraft;
    // Seed order: existing draft → authoritative settled overview (adminDetail) →
    // minimal catalog handoff service (last resort). The handoff service carries
    // empty content, so seeding from it would open the editor blank and let a save
    // of any other field overwrite the live description with empty.
    let draft: OverviewDraft;
    if (wc) {
      draft = { title: wc.title, excerpt: wc.excerpt, content: wc.content, category_id: wc.category_ids[0] ?? null };
    } else if (settledOverview) {
      draft = {
        title:       settledOverview.title,
        excerpt:     settledOverview.excerpt,
        content:     settledOverview.content,
        category_id: settledOverview.categories[0]?.id ?? null,
      };
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
        // Patch the saved description into the local list so an in-session editor
        // reopen reads the new value instead of the stale snapshot.
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

  const handleOpenTierConfig = (
    managerContinuation?: ManagerContinuation,
    initialTierId?: string,
    initialTierSection?: 'tier-overview',
  ) => {
    const serviceReturn = () => doOpen({
      id:       `service-view-${service.id}`,
      mode:     'drawer',
      title:    'Service',
      initialStepData: { service, packages, openAction: doOpen, allCategories, onRefresh, managerContinuation },
      steps: [{ id: 'detail', title: 'Service Detail', component: ServiceViewStep }],
    });

    // All tier management routes exclusively through the Service Station-owned Package
    // Station (cz_service_package_station). The legacy cz_surface_package drawer path
    // has been retired. The single header Back is context-aware: while a tier is open,
    // ServiceTierStep sets tierBack.current to return to the package overview; at the
    // overview it falls through to the parent Service drawer.
    const tierBack: { current: (() => void) | null } = { current: null };
    ctx.close();
    doOpen({
      id:             `service-tiers-${service.id}`,
      mode:           'drawer',
      title:          'Package',
      onBack:         () => (tierBack.current ?? serviceReturn)(),
      hideStepHeader: true,
      initialStepData: {
        serviceId: service.id, service, openAction: doOpen, onRefresh, serviceBack: serviceReturn,
        // Manager card destinations return directly to Manager. The mutable
        // tierBack bridge is retained only for non-Manager canonical routes.
        tierBack: managerContinuation ? undefined : tierBack,
        initialTierId, initialTierSection,
      },
      steps: [{ id: 'service-tiers', title: 'Tier Configuration', component: ServiceTierStep }],
    });
  };

  const handleManagerDestination = (
    action: 'view-all' | 'open-current' | 'edit-current',
    continuation: ManagerContinuation,
  ) => {
    const tierDestination = continuation.destination ?? continuation.subject;
    const tierId = tierDestination?.type === 'tier' ? String(tierDestination.id) : undefined;
    handleOpenTierConfig(
      continuation,
      action === 'open-current' || action === 'edit-current' ? tierId : undefined,
      action === 'edit-current' ? 'tier-overview' : undefined,
    );
  };

  const pkgSummaryOnView = isActive && !station.loading.creating && showManager
    ? () => selectServiceTab('manager')
    : undefined;

  const handleOpenPromoConfig = () => {
    const serviceReturn = () => doOpen({
      id:       `service-view-${service.id}`,
      mode:     'drawer',
      title:    'Service',
      initialStepData: { service, packages, openAction: doOpen, allCategories, onRefresh },
      steps: [{ id: 'detail', title: 'Service Detail', component: ServiceViewStep }],
    });

    // All promotion management routes exclusively through the Service Station-owned
    // Promotion Station (cz_service_promotion_station). The legacy cz_surface_package
    // promotion drawer path has been retired. The single header Back is context-aware:
    // while a promotion's detail view is open, ServicePromotionStep sets promoBack.current
    // to return to the promotion list; at the list it falls through to the parent Service
    // drawer (mirrors handleOpenTierConfig's tierBack).
    const promoBack: { current: (() => void) | null } = { current: null };
    ctx.close();
    doOpen({
      id:             `service-promos-${service.id}`,
      mode:           'drawer',
      title:          'Promotion',
      onBack:         () => (promoBack.current ?? serviceReturn)(),
      hideStepHeader: true,
      initialStepData: { serviceId: service.id, service, openAction: doOpen, onRefresh, serviceBack: serviceReturn, promoBack },
      steps: [{ id: 'service-promos', title: 'Promotions', component: ServicePromotionStep }],
    });
  };

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

  // ── New never-published service detection ──────────────────────────────────
  // platform_status is 'disabled' and overview has never been settled.
  // Used to drive the "Pending" table status, the "Move to Trash" footer action,
  // and the new-service exit prompt.
  const isNewNeverPublished = platformStatus === 'disabled' && moduleStatus?.overview !== 'settled';

  // ── Exit workflow helpers ─────────────────────────────────────────────────

  // Bypass the close guard — used after the admin explicitly acts on an exit dialog.
  const closeWithoutGuard = useCallback(() => {
    ctx.setCloseGuard(null);
    ctx.close();
  }, [ctx]);
  const continuePendingExit = useCallback(() => {
    ctx.setCloseGuard(null);
    ctx.confirmPendingExit();
  }, [ctx]);

  // ── New-service exit prompt handlers ──────────────────────────────────────

  const handleNewSvcSaveDraft = useCallback(async () => {
    if (!stationOverviewDraft) return;
    setExitSaving(true);
    try {
      // Unchecked fields fall back to the existing draft value — nothing is wiped.
      // Checked fields are explicitly confirmed; unchecked fields are preserved as-is.
      const draft: OverviewDraft = {
        title:       newSvcFields.title       ? stationOverviewDraft.title                      : stationOverviewDraft.title,
        excerpt:     stationOverviewDraft.excerpt ?? '',
        content:     newSvcFields.description ? stationOverviewDraft.content                    : stationOverviewDraft.content,
        category_id: newSvcFields.category    ? (stationOverviewDraft.category_ids[0] ?? null)  : (stationOverviewDraft.category_ids[0] ?? null),
      };
      await saveOverview(draft);
      setExitDialog(null);
      setNewSvcFields({ title: false, category: false, description: false });
      continuePendingExit();
    } finally {
      setExitSaving(false);
    }
  }, [newSvcFields, stationOverviewDraft, saveOverview, continuePendingExit]);

  const handleNewSvcTrash = useCallback(async () => {
    setExitDialog(null);
    setNewSvcFields({ title: false, category: false, description: false });
    const result = await trashStation();
    // Bypass the close guard — trashing is terminal and must not re-open the exit dialog.
    if (result) continuePendingExit();
  }, [trashStation, continuePendingExit]);

  // Save whichever module is currently open and return the new module_status.
  // Throws on API failure so callers can surface the error.
  const saveCurrentModule = useCallback(async (): Promise<Record<string, string> | null> => {
    if (editingSection === 'overview'   && overviewDraft)   return saveOverview(overviewDraft);
    if (editingSection === 'inclusions' && inclusionsDraft) return saveInclusions(inclusionsDraft);
    if (editingSection === 'faqs'       && faqsDraft)       return saveFaqs(faqsDraft);
    return null;
  }, [editingSection, overviewDraft, inclusionsDraft, faqsDraft, saveOverview, saveInclusions, saveFaqs]);

  // "Save now" from the unsaved-changes exit dialog.
  // Saves the open module, then either shows the pending dialog or closes.
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
        continuePendingExit();
      }
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setExitSaving(false);
    }
  }, [saveCurrentModule, isActive, continuePendingExit]);

  // "Discard and close" from the unsaved-changes exit dialog.
  // Discards the draft immediately and closes — does not check pending modules.
  const handleExitDiscard = useCallback(() => {
    setEditingSection(null);
    setOverviewDraft(null);    setOverviewOriginal(null);
    setInclusionsDraft(null);  setInclusionsOriginal(null);
    setFaqsDraft(null);        setFaqsOriginal(null);
    setSaveErr(null);
    setSaving(false);
    setExitDialog(null);
    continuePendingExit();
  }, [continuePendingExit]);

  // "Settle Changes" from the pending-modules exit dialog.
  const handleExitSettle = useCallback(async () => {
    setExitSaving(true);
    try {
      await handleSettleModules();
      setExitDialog(null);
      continuePendingExit();
    } finally {
      setExitSaving(false);
    }
  }, [handleSettleModules, continuePendingExit]);

  // ── Close guard registration ──────────────────────────────────────────────
  // Registered once; reads current state via ref to avoid stale closures.
  const exitStateRef = useRef({ editingSection, isEditorDirty, isActive, hasPendingModules, isNewNeverPublished, stationOverviewDraft });
  useEffect(() => {
    exitStateRef.current = { editingSection, isEditorDirty, isActive, hasPendingModules, isNewNeverPublished, stationOverviewDraft };
  });

  const { setCloseGuard } = ctx;
  useEffect(() => {
    setCloseGuard(() => {
      const s = exitStateRef.current;
      if (s.editingSection && s.isEditorDirty) {
        setExitDialog('unsaved');
        return false;
      }
      // New never-published service with a saved draft — ask what to keep before leaving.
      if (s.isNewNeverPublished && s.stationOverviewDraft !== null) {
        setExitDialog('new-service-draft');
        return false;
      }
      if (s.isActive && s.hasPendingModules) {
        setExitDialog('pending');
        return false;
      }
      return true;
    });
    return () => setCloseGuard(null);
  }, [setCloseGuard]);

  const handleToggleActiveRef = useRef(handleToggleActive);
  handleToggleActiveRef.current = handleToggleActive;

  // Close split dropdown when clicking outside (only active while open)
  useEffect(() => {
    if (!splitOpen) return;
    const handle = () => setSplitOpen(false);
    const t = setTimeout(() => document.addEventListener('click', handle), 0);
    return () => { clearTimeout(t); document.removeEventListener('click', handle); };
  }, [splitOpen]);

  const handleArchive = useCallback(async () => {
    setSplitOpen(false);
    const result = await archiveStation();
    // Terminal action — bypass the close guard so a new-never-published draft does
    // not re-trigger the exit dialog and trap the drawer on the archived service.
    if (result) closeWithoutGuard();
  }, [archiveStation, closeWithoutGuard]);

  const handleTrash = useCallback(async () => {
    setSplitOpen(false);
    const result = await trashStation();
    // Terminal action — bypass the close guard so a new-never-published draft does
    // not re-trigger the exit dialog and loop back into the trashed service.
    if (result) closeWithoutGuard();
  }, [trashStation, closeWithoutGuard]);

  const handleArchiveRef = useRef(handleArchive);
  handleArchiveRef.current = handleArchive;

  const handleTrashRef = useRef(handleTrash);
  handleTrashRef.current = handleTrash;

  useEffect(() => {
    const { setFooter, close } = ctx;
    // Manager owns the shared footer while its workspace is mounted. The
    // previous Details/Connections effect cleanup has already cleared theirs.
    if (tab === 'manager') return;
    const isLiveState = platformStatus === 'active' || platformStatus === 'disabled';

    // Enable/Disable is only meaningful once a service has been published at least once.
    // New drafts (overview never settled, never active) leave it disabled to prevent the
    // admin needing to Enable before Publish. After publishing succeeds the flag flips
    // reactively; if publishing fails the flag remains false.
    const hasBeenPublished =
      modules.overview.status === 'active' || moduleStatus?.overview === 'settled';

    setFooter(
      <div class="cz-tf-footer">
        {/* Split button — visible for active/disabled states */}
        {tab === 'details' && isLiveState && (
          <div class={`cz-footer-split${platformStatus === 'active' || isNewNeverPublished ? ' cz-footer-split--danger' : ' cz-footer-split--secondary'}`}>
            {/* Primary action:
                Active         → Disable
                Disabled+published → Enable
                New never-published → Move to Trash */}
            <button
              type="button"
              class="cz-footer-split__btn"
              disabled={station.loading.status}
              onClick={() => {
                if (isNewNeverPublished) handleTrashRef.current();
                else handleToggleActiveRef.current();
              }}
            >
              {station.loading.status
                ? '…'
                : platformStatus === 'active'
                  ? 'Disable'
                  : isNewNeverPublished
                    ? 'Move to Trash'
                    : 'Enable'}
            </button>
            {/* Chevron — opens lifecycle dropdown */}
            <button
              type="button"
              class="cz-footer-split__chevron"
              disabled={station.loading.status}
              onClick={(e) => { e.stopPropagation(); setSplitOpen((v) => !v); }}
              aria-label="More actions"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
              </svg>
            </button>
            {/* Dropdown: Archive + Trash. Trigger always opens; each action gates itself.
                Archive is only meaningful once published; Trash is always available. */}
            {splitOpen && (
              <div class="cz-footer-split__menu">
                <button
                  type="button"
                  class="cz-footer-split__item"
                  disabled={!hasBeenPublished || station.loading.status}
                  onClick={() => handleArchiveRef.current()}
                >
                  Archive
                </button>
                {/* Move to Trash is the primary action for new never-published drafts —
                    don't repeat it inside the dropdown in that state. */}
                {!isNewNeverPublished && (
                  <button
                    type="button"
                    class="cz-footer-split__item"
                    disabled={station.loading.status}
                    onClick={() => handleTrashRef.current()}
                  >
                    Move to Trash
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {/* No left-side actions (e.g. Commercial tab) → push the single Cancel right. */}
        {!(tab === 'details' && isLiveState) && <div class="cz-tf-footer__spacer" />}
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={close}>
          Cancel
        </button>
        {tab === 'details' && isLiveState && <div class="cz-tf-footer__spacer" />}
        {/* Publish — available when canPublish; no longer gated on platformStatus */}
        {tab === 'details' && isLiveState && (
          <button
            type="button"
            class="cz-admin-btn cz-admin-btn--primary"
            onClick={() => setShowPublishModal(true)}
            disabled={!canPublish || station.loading.status}
          >
            {station.loading.status ? '…' : 'Publish'}
          </button>
        )}
      </div>
    );
    return () => setFooter(null);
  }, [tab, platformStatus, splitOpen, station.loading.status, canPublish, modules.overview.status, moduleStatus, ctx.setFooter, ctx.close]);

  // ── Pre-resolved display values for the module shells ────────────────────
  // Fallback order mirrors the status path: draft → adminDetail settled → CostBuilder service.
  const rawDisplayTitle = stationOverviewDraft?.title.trim() || settledOverview?.title.trim() || service.title.trim() || '';
  const displayTitle    = rawDisplayTitle ? decodeHtml(rawDisplayTitle) : '';
  const displayContent  = stationOverviewDraft?.content.trim() || settledOverview?.content?.trim() || service.content?.trim() || '';
  const displayCategory = stationOverviewDraft
    ? decodeHtml(allCategories.find(c => stationOverviewDraft.category_ids.includes(c.id ?? -1))?.name ?? 'Not selected')
    : decodeHtml(settledOverview?.categories[0]?.name ?? service.categories[0]?.name ?? 'Not selected');
  const decodedServiceTitle = decodeHtml(service.title);

  // Package Summary notes — module-owned, mirrors the Service module shells.
  const packageNotes = getPackageNotes(relatedPkg, { platformStatus });

  // ── Shell bindings — Station DNA delivered to the S2 archetype shells ─────
  // Status/notes pass through exactly as the station derives them (the hook's
  // `modules:{…}` delivery, S4); 'loading' holds the pill and body shimmer
  // until the authoritative detail resolves, matching the pre-S2 cards.
  const overviewShellBinding: ShellBinding<ServiceOverviewShellData> = {
    data:  { title: displayTitle, category: displayCategory, content: displayContent },
    state: detailLoaded
      ? modules.overview
      : { status: 'loading', notes: [] },
    hasDraft: moduleStatus?.overview === 'pending' && stationOverviewDraft !== null,
    handlers: {
      edit:            openOverviewEditor,
      'discard-draft': () => setDiscardConfirm('overview'),
    },
  };

  const inclusionsShellBinding: ShellBinding<ServiceInclusionsShellData> = {
    data:  { items: inclusions, serviceTitle: decodedServiceTitle },
    state: detailLoaded
      ? modules.inclusions
      : { status: 'loading', notes: [] },
    hasDraft: moduleStatus?.inclusions === 'pending' && hasInclusionsDraft,
    handlers: {
      edit:            openInclusionsEditor,
      'discard-draft': () => setDiscardConfirm('inclusions'),
    },
  };

  const faqsShellBinding: ShellBinding<ServiceFaqsShellData> = {
    data:  { items: faqs, serviceTitle: decodedServiceTitle },
    state: detailLoaded
      ? modules.faqs
      : { status: 'loading', notes: [] },
    hasDraft: moduleStatus?.faqs === 'pending' && hasFaqsDraft,
    handlers: {
      edit:            openFaqsEditor,
      'discard-draft': () => setDiscardConfirm('faqs'),
    },
  };

  // Package Summary — the package station's primary module, placed in the
  // Connections tab in the `summary` viewpoint (Commercial group, S3a).
  const packageSummaryShellBinding: ShellBinding<ServicePackageSummaryShellData> = {
    data:  { headline: pkgSummaryCount, copy: pkgSummaryDesc },
    state: detailLoaded
      ? { status: pkgSummaryStatus, notes: packageNotes }
      : { status: 'loading', notes: [] },
    hasDraft: false,
    handlers: pkgSummaryOnView ? { view: pkgSummaryOnView } : {},
    connection: packageConnection,
  };

  return (
    <>
    {/* ── Drawer body — assembled from the service manifest's drawer
           placements (Schema architecture S4). Tab state stays controlled
           here because the footer gates on the active tab. The Commercial-
           group tail (Promotion Configuration + Pricing Summary) is bespoke
           trailing content pending its own DNA/placement. ─────────────── */}
    <EntityDrawer
      entity={SERVICE_ENTITY}
      tab={tab}
      onSelectTab={selectServiceTab}
      showManager={showManager}
      managerContent={showManager ? (
        <DynamicStationManager
          scope={managerScope}
          shell={ctx}
          connection={packageConnection}
          continuation={returnContinuation}
          onDestination={handleManagerDestination}
        />
      ) : null}
      bindings={{
        overview:   overviewShellBinding,
        inclusions: inclusionsShellBinding,
        faqs:       faqsShellBinding,
        package:    packageSummaryShellBinding,
      }}
      openPanel={openPanel}
      onTogglePanel={(m) => setOpenPanel((p) => (p === m ? null : m))}
      trailing={{
        connections: (
          <>
            <CommercialBlock
              label="Promotion Configuration"
              count={relatedPkg
                ? `${promotionCount} promotion${promotionCount !== 1 ? 's' : ''} configured`
                : '0 promotions configured'}
              desc={relatedPkg
                ? 'Promotions are managed in the Promotions workstation.'
                : 'Create and manage promotions for this service.'}
              status={promoStatus}
              onView={handleOpenPromoConfig}
            />
            {relatedPkg && (
              <div class="cz-shell-section cz-shell-section--no-border">
                <p class="cz-shell-section__title">Pricing Summary</p>
                <div class="cz-sp-tier-table-wrap">
                  <table class="cz-sp-tier-table">
                    <thead>
                      <tr>
                        <th>Tier</th>
                        <th>Price</th>
                        <th>Cycle</th>
                        <th class="cz-sp-tier-table__center">Features</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TIER_KEYS.map((tierId) => {
                        const tier = relatedPkg.tiers[tierId];
                        return (
                          <tr key={tierId}>
                            <td class="cz-sp-tier-table__name">{TIER_LABELS[tierId]}</td>
                            <td>
                              <span class={`cz-price-tag${tier?.price != null ? ' cz-price-tag--has-price' : ''}`}>
                                {tier?.price != null ? `$${tier.price.toLocaleString()}` : '—'}
                              </span>
                            </td>
                            <td class="cz-sp-tier-table__muted">{tier?.billing_cycle ?? '—'}</td>
                            <td class="cz-sp-tier-table__center cz-sp-tier-table__muted">
                              {tier?.inclusion_count ? tier.inclusion_count : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ),
      }}
    >
      {saveOk && <div class="cz-admin-ok-msg">Changes saved.</div>}
    </EntityDrawer>

    {/* ── Publish / Settle confirmation modal ──────────────────────────────── */}
    {showPublishModal && (
      <div
        class="cz-publish-confirm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) setShowPublishModal(false); }}
      >
        <div class="cz-publish-confirm">
          <div class="cz-publish-confirm__header">
            <h3 class="cz-publish-confirm__title">
              {isActive
                ? `Settle changes to ${decodeHtml(service.title)}?`
                : `Ready to publish ${decodeHtml(service.title)}?`}
            </h3>
          </div>
          <div class="cz-publish-confirm__body">
            <p class="cz-publish-confirm__lead">
              {isActive
                ? 'This confirms the current live content as the settled state for each module.'
                : 'You are about to publish this service and make it visible in the catalog.'}
            </p>
            <ul class="cz-publish-confirm__summary">
              <li><strong>Service Overview:</strong> Ready</li>
              <li style={inclSummary.orange ? 'color:var(--admin-warning);font-weight:600' : undefined}>
                <strong>Included Features:</strong> {inclSummary.text}
              </li>
              <li style={faqsSummary.orange ? 'color:var(--admin-warning);font-weight:600' : undefined}>
                <strong>Common Questions:</strong> {faqsSummary.text}
              </li>
            </ul>
          </div>
          <div class="cz-publish-confirm__footer">
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary"
              onClick={() => setShowPublishModal(false)}
              disabled={station.loading.status}
            >
              Cancel
            </button>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--primary"
              onClick={handleConfirmPublish}
              disabled={station.loading.status}
            >
              {station.loading.status ? '…' : isActive ? 'Settle' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Discard draft confirmation modal ────────────────────────────────── */}
    {discardConfirm && (
      <div
        class="cz-publish-confirm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) setDiscardConfirm(null); }}
      >
        <div class="cz-publish-confirm">
          <div class="cz-publish-confirm__header">
            <h3 class="cz-publish-confirm__title">Discard draft?</h3>
          </div>
          <div class="cz-publish-confirm__body">
            <p class="cz-publish-confirm__lead">
              This will remove the saved draft and return this module to its last settled version.
            </p>
          </div>
          <div class="cz-publish-confirm__footer">
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary"
              onClick={() => setDiscardConfirm(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--danger"
              onClick={handleConfirmDiscard}
            >
              Discard Draft
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Unsaved-changes exit dialog ──────────────────────────────────────── */}
    {exitDialog === 'unsaved' && (
      <div
        class="cz-publish-confirm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) setExitDialog(null); }}
      >
        <div class="cz-publish-confirm">
          <div class="cz-publish-confirm__header">
            <h3 class="cz-publish-confirm__title">Unsaved changes</h3>
          </div>
          <div class="cz-publish-confirm__body">
            <p class="cz-publish-confirm__lead">
              You have unsaved changes in <strong>{editingSectionLabel}</strong>.
              Closing will discard them.
            </p>
            {saveErr && <p class="cz-admin-error-msg" style="margin-top:var(--cz-space-2)">{saveErr}</p>}
          </div>
          <div class="cz-publish-confirm__footer">
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary"
              onClick={handleExitDiscard}
              disabled={exitSaving}
            >
              Discard and close
            </button>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--primary"
              onClick={handleExitSaveAndProceed}
              disabled={exitSaving}
            >
              {exitSaving ? 'Saving…' : 'Save now'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Pending-modules exit dialog ───────────────────────────────────────── */}
    {exitDialog === 'pending' && (
      <div
        class="cz-publish-confirm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) setExitDialog(null); }}
      >
        <div class="cz-publish-confirm">
          <div class="cz-publish-confirm__header">
            <h3 class="cz-publish-confirm__title">Unsettled modules</h3>
          </div>
          <div class="cz-publish-confirm__body">
            <p class="cz-publish-confirm__lead">
              The following modules have live changes that have not been settled:
            </p>
            <ul class="cz-publish-confirm__summary">
              {pendingModuleNames.map((name) => (
                <li key={name}><strong>{name}</strong> — Pending</li>
              ))}
            </ul>
            <p style="margin-top:var(--cz-space-3);font-size:var(--cz-text-sm);color:var(--admin-text-secondary)">
              Changes are saved as a draft and not yet live. Settle now to publish them,
              or close and return later.
            </p>
          </div>
          <div class="cz-publish-confirm__footer">
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary"
              onClick={() => { setExitDialog(null); continuePendingExit(); }}
              disabled={exitSaving}
            >
              Close without settling
            </button>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--primary"
              onClick={handleExitSettle}
              disabled={exitSaving}
            >
              {exitSaving ? 'Settling…' : 'Settle Changes'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── New never-published service exit prompt ──────────────────────────── */}
    {exitDialog === 'new-service-draft' && (
      <div
        class="cz-publish-confirm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) setExitDialog(null); }}
      >
        <div class="cz-publish-confirm">
          <div class="cz-publish-confirm__header">
            <h3 class="cz-publish-confirm__title">Before you leave</h3>
          </div>
          <div class="cz-publish-confirm__body">
            <p class="cz-publish-confirm__lead">
              Select the fields you want to keep in your draft.
            </p>
            <div style="display:flex;flex-direction:column;gap:var(--cz-space-3);margin-top:var(--cz-space-3)">
              {[
                { key: 'title',       label: 'Title',       value: stationOverviewDraft?.title || '(empty)'        },
                { key: 'category',    label: 'Category',    value: displayCategory || 'Not selected'               },
                { key: 'description', label: 'Description', value: stationOverviewDraft?.content ? '…' : '(empty)' },
              ].map(({ key, label, value }) => (
                <label key={key} style="display:flex;align-items:center;gap:var(--cz-space-3);cursor:pointer">
                  <input
                    type="checkbox"
                    checked={(newSvcFields as Record<string, boolean>)[key]}
                    onChange={(e) => setNewSvcFields(prev => ({ ...prev, [key]: (e.target as HTMLInputElement).checked }))}
                  />
                  <span>
                    <strong style="font-size:var(--admin-fs-label)">{label}</strong>
                    <span style="margin-left:var(--cz-space-2);font-size:var(--admin-fs-s-label);color:var(--admin-text-faint)">
                      {value}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div class="cz-publish-confirm__footer">
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary"
              onClick={() => setExitDialog(null)}
              disabled={exitSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--danger"
              onClick={handleNewSvcTrash}
              disabled={exitSaving}
            >
              Move to Trash
            </button>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--primary"
              onClick={handleNewSvcSaveDraft}
              disabled={exitSaving || (!newSvcFields.title && !newSvcFields.category && !newSvcFields.description)}
            >
              {exitSaving ? 'Saving…' : 'Save Draft'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Drawer Principle v1 — Edit state: the active module's shell in `edit`
        mode (module-level, inside InlineEditorShell — the existing universal
        edit flow, unchanged). The session (draft, save/cancel, dirty state)
        stays step-owned; the schema declares which editor renders. */}
    {editingSection === 'overview' && overviewDraft && (
      <ModeProvider mode="edit">
      <OverviewShell
        schema={serviceOverviewShell}
        binding={overviewShellBinding}
        editSession={{
          draft:    overviewDraft,
          patch:    (p) => setOverviewDraft((d) => d ? { ...d, ...(p as Partial<OverviewDraft>) } : d),
          replace:  (next) => setOverviewDraft(next as OverviewDraft),
          onSave:   handleSaveOverview,
          onCancel: handleCancelEdit,
          saving,
          saveErr,
          isDirty:  isEditorDirty,
          extras: {
            categories:             localCategories,
            catDescription:         catDesc,
            onCatDescriptionChange: setCatDesc,
          },
        }}
      />
      </ModeProvider>
    )}

    {editingSection === 'inclusions' && inclusionsDraft && (
      <ModeProvider mode="edit">
      <ChildShell
        schema={serviceInclusionsShell}
        binding={inclusionsShellBinding}
        editSession={{
          draft:    inclusionsDraft,
          patch:    (p) => setInclusionsDraft((d) => d ? { ...d, ...(p as Partial<InclusionsDraft>) } : d),
          replace:  (next) => setInclusionsDraft(next as InclusionsDraft),
          onSave:   handleSaveInclusions,
          onCancel: handleCancelEdit,
          saving,
          saveErr,
          isDirty:  isEditorDirty,
        }}
      />
      </ModeProvider>
    )}

    {editingSection === 'faqs' && faqsDraft && (
      <ModeProvider mode="edit">
      <ChildShell
        schema={serviceFaqsShell}
        binding={faqsShellBinding}
        editSession={{
          draft:    faqsDraft,
          patch:    (p) => setFaqsDraft((d) => d ? { ...d, ...(p as Partial<FaqsDraft>) } : d),
          replace:  (next) => setFaqsDraft(next as FaqsDraft),
          onSave:   handleSaveFaqs,
          onCancel: handleCancelEdit,
          saving,
          saveErr,
          isDirty:  isEditorDirty,
        }}
      />
      </ModeProvider>
    )}
    </>
  );
}
