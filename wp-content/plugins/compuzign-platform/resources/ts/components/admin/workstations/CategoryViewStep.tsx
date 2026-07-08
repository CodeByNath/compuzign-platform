import { useEffect, useState, useCallback, useMemo, useRef } from 'preact/hooks';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { Category } from '@/api/types/cost-builder';
import type { CategoryStationItem, StationSummary, SurfacePackageSummary } from '@/api/types/admin';
import { useCategoryStation } from '@/hooks/useCategoryStation';
import type { CategoryServiceCounts } from '@/hooks/useCategoryStation';
import type { CategoryOverviewDraft } from '@/api/types/admin';
import { ModeProvider } from '@/components/admin/schema/modeContext';
import { OverviewShell } from '@/components/admin/schema/shells/overviewShell';
import {
  categoryOverviewShell,
  categoryServicesShell,
} from '@/components/admin/schema/shells/bindings/category';
import type {
  CategoryOverviewShellData,
  CategoryServicesShellData,
} from '@/components/admin/schema/shells/bindings/category';
import { serviceOverviewShell } from '@/components/admin/schema/shells/bindings/service';
import type { ServiceOverviewShellData } from '@/components/admin/schema/shells/bindings/service';
import type { ShellBinding, ShellSchema } from '@/components/admin/schema/types';
import { CATEGORY_ENTITY } from '@/components/admin/schema/entities/category';
import { EntityDrawer } from '../EntityDrawer';
import { decodeHtml } from './serviceDrawerShared';
import { ServiceViewStep } from './ServiceViewStep';
import { buildServiceItemForStationHandoff } from './ServiceCatalogWorkstation';

// ── Drawer dependency bundle ──────────────────────────────────────────────────
// The catalog data the Category drawers need (assigned services + the payload
// for transiting into the real Service drawer) is snapshotted at open time via
// a getter reading the workstation's live ref — so reopening a drawer (e.g.
// returning from a service edit) reads fresh counts. onRefresh refetches the
// workstation streams; openAction is the ActionShell opener.
export interface CategoryDrawerDeps {
  getCatalogData: () => { stations: StationSummary[]; packages: SurfacePackageSummary[]; categories: Category[] };
  onRefresh?:  () => void;
  openAction:  (config: ActionConfig) => void;
}

// ── Config builders (shared by the workstation + the back-navigation) ─────────
// Function declarations so the view step, the collection step, and their
// mutual back-handlers can reference each other regardless of order.

export function buildCategoryViewConfig(category: CategoryStationItem, deps: CategoryDrawerDeps): ActionConfig {
  return {
    id:    `category-view-${category.id}`,
    mode:  'drawer',
    title: 'Category',
    initialStepData: { category, deps },
    steps: [{ id: 'detail', title: 'Category Detail', component: CategoryViewStep }],
  };
}

function buildServicesCollectionConfig(category: CategoryStationItem, deps: CategoryDrawerDeps): ActionConfig {
  return {
    id:             `category-services-${category.id}`,
    mode:           'drawer',
    title:          'Category Services',
    hideStepHeader: true,
    onBack:         () => deps.openAction(buildCategoryViewConfig(category, deps)),
    initialStepData: { category, deps },
    steps: [{ id: 'services', title: 'Assigned Services', component: CategoryServicesStep }],
  };
}

// Category-scoped assigned services, read fresh from the workstation ref.
function assignedFor(category: CategoryStationItem, deps: CategoryDrawerDeps): StationSummary[] {
  return deps.getCatalogData().stations.filter((s) => s.categories.some((c) => c.id === category.id));
}

// Presentation Status Contract mapping for the summary cards (Active / Pending /
// Disabled only). Mirrors the catalog's stationStatusLabel derivation: a
// never-published (disabled + overview unsettled) service reads Pending.
function summaryCardStatus(s: StationSummary): string {
  if (s.platform_status === 'active') return 'active';
  if (s.platform_status === 'disabled') {
    return s.module_status?.overview !== 'settled' ? 'pending-dim' : 'disabled';
  }
  return 'pending-dim';
}

// ── CategoryViewStep ──────────────────────────────────────────────────────────
// Manifest-assembly drawer (pattern: ServiceViewStep, one owned module). Details
// tab = the owned Category Overview; Connections tab = the Assigned Services
// summary gateway whose View transits to the collection surface.

export function CategoryViewStep({ ctx }: { ctx: StepContext }) {
  const category = ctx.stepData.category as CategoryStationItem;
  const deps     = ctx.stepData.deps     as CategoryDrawerDeps;
  const doOpen   = deps.openAction;
  const onRefresh = deps.onRefresh;

  const [tab, setTab] = useState<'details' | 'connections'>('details');

  // Assigned services (read fresh at mount) → the gateway split.
  const assignedStations = useMemo(() => assignedFor(category, deps), [category.id]);
  const serviceCounts: CategoryServiceCounts = useMemo(() => {
    const total  = assignedStations.length;
    const active = assignedStations.filter((s) => s.platform_status === 'active').length;
    return { total, active, disabled: total - active };
  }, [assignedStations]);

  const station = useCategoryStation(category, onRefresh, serviceCounts);
  const {
    platformStatus, isActive, hasDraft, moduleStatus, modules,
    saveOverview, revertOverview, settleModules, publishCategory,
    toggleActive, archiveStation, trashStation,
  } = station;

  // Publish is meaningful only when there is something to publish: a complete
  // but unsettled overview (activate), or an active category with a pending
  // draft (settle). A complete-but-disabled category activates via Enable
  // instead — mirrors the service footer grammar (ServiceDrawerModuleArchitecture §8).
  const canPublish = modules.overview.status === 'pending-full' || (isActive && hasDraft);

  // ── Edit overlay (Edit Granularity: step-owned per-module session) ──────────
  const [editing,         setEditing]         = useState(false);
  const [draft,           setDraft]           = useState<CategoryOverviewDraft | null>(null);
  const [original,        setOriginal]        = useState<CategoryOverviewDraft | null>(null);
  const [saving,          setSaving]          = useState(false);
  const [saveErr,         setSaveErr]         = useState<string | null>(null);
  const [saveOk,          setSaveOk]          = useState(false);
  const [openPanel,       setOpenPanel]       = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [discardConfirm,  setDiscardConfirm]  = useState(false);
  const [exitDialog,      setExitDialog]      = useState<'unsaved' | null>(null);
  const [splitOpen,       setSplitOpen]       = useState(false);

  useEffect(() => {
    if (!saveOk) return;
    const t = setTimeout(() => setSaveOk(false), 3000);
    return () => clearTimeout(t);
  }, [saveOk]);

  const isDirty = editing && draft != null && original != null &&
    (draft.name !== original.name || draft.description !== original.description);

  const openOverviewEditor = useCallback(() => {
    const seed: CategoryOverviewDraft = { name: station.category.name, description: station.category.description };
    setOriginal(seed);
    setDraft(seed);
    setEditing(true);
    setOpenPanel(null);
    setSaveErr(null);
  }, [station.category.name, station.category.description]);

  const handleCancelEdit = useCallback(() => {
    setEditing(false);
    setDraft(null);
    setOriginal(null);
    setSaveErr(null);
    setSaving(false);
  }, []);

  const handleSaveOverview = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await saveOverview(draft);
      setEditing(false);
      setDraft(null);
      setOriginal(null);
      setSaveOk(true);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }, [draft, saveOverview]);

  const handleConfirmDiscard = useCallback(async () => {
    setDiscardConfirm(false);
    await revertOverview();
  }, [revertOverview]);

  const handleConfirmPublish = useCallback(async () => {
    setShowPublishModal(false);
    await (isActive ? settleModules() : publishCategory());
  }, [isActive, settleModules, publishCategory]);

  // ── Terminal-action close bypass + dirty-editor close guard ─────────────────
  const closeWithoutGuard = useCallback(() => {
    ctx.setCloseGuard(null);
    ctx.close();
  }, [ctx]);

  const guardRef = useRef({ editing, isDirty });
  useEffect(() => { guardRef.current = { editing, isDirty }; });

  const { setCloseGuard } = ctx;
  useEffect(() => {
    setCloseGuard(() => {
      const s = guardRef.current;
      if (s.editing && s.isDirty) { setExitDialog('unsaved'); return false; }
      return true;
    });
    return () => setCloseGuard(null);
  }, [setCloseGuard]);

  const handleToggleActive = useCallback(async () => { setSplitOpen(false); await toggleActive(); }, [toggleActive]);
  const handleArchive = useCallback(async () => {
    setSplitOpen(false);
    const r = await archiveStation();
    if (r) closeWithoutGuard();
  }, [archiveStation, closeWithoutGuard]);
  const handleTrash = useCallback(async () => {
    setSplitOpen(false);
    const r = await trashStation();
    if (r) closeWithoutGuard();
  }, [trashStation, closeWithoutGuard]);

  const actionRefs = useRef({ handleToggleActive, handleArchive, handleTrash });
  actionRefs.current = { handleToggleActive, handleArchive, handleTrash };

  // Close the split dropdown on outside click.
  useEffect(() => {
    if (!splitOpen) return;
    const handle = () => setSplitOpen(false);
    const t = setTimeout(() => document.addEventListener('click', handle), 0);
    return () => { clearTimeout(t); document.removeEventListener('click', handle); };
  }, [splitOpen]);

  // ── Footer (ServiceDrawerModuleArchitecture §8 grammar, one module) ─────────
  const isNewNeverPublished = platformStatus === 'disabled' && moduleStatus.overview !== 'settled';
  const hasBeenPublished    = isActive || moduleStatus.overview === 'settled';

  useEffect(() => {
    const { setFooter, close } = ctx;
    const isLiveState = platformStatus === 'active' || platformStatus === 'disabled';

    setFooter(
      <div class="cz-tf-footer">
        {tab === 'details' && isLiveState && (
          <div class={`cz-footer-split${platformStatus === 'active' || isNewNeverPublished ? ' cz-footer-split--danger' : ' cz-footer-split--secondary'}`}>
            <button
              type="button"
              class="cz-footer-split__btn"
              disabled={station.loading.status}
              onClick={() => { if (isNewNeverPublished) actionRefs.current.handleTrash(); else actionRefs.current.handleToggleActive(); }}
            >
              {station.loading.status
                ? '…'
                : platformStatus === 'active'
                  ? 'Disable'
                  : isNewNeverPublished
                    ? 'Move to Trash'
                    : 'Enable'}
            </button>
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
            {splitOpen && (
              <div class="cz-footer-split__menu">
                <button
                  type="button"
                  class="cz-footer-split__item"
                  disabled={!hasBeenPublished || station.loading.status}
                  onClick={() => actionRefs.current.handleArchive()}
                >
                  Archive
                </button>
                {!isNewNeverPublished && (
                  <button
                    type="button"
                    class="cz-footer-split__item"
                    disabled={station.loading.status}
                    onClick={() => actionRefs.current.handleTrash()}
                  >
                    Move to Trash
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {!(tab === 'details' && isLiveState) && <div class="cz-tf-footer__spacer" />}
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={close}>
          Cancel
        </button>
        {tab === 'details' && isLiveState && <div class="cz-tf-footer__spacer" />}
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
  }, [tab, platformStatus, splitOpen, station.loading.status, canPublish, isNewNeverPublished, hasBeenPublished, ctx.setFooter, ctx.close]);

  // ── Gateway → collection transit ────────────────────────────────────────────
  const openServicesCollection = useCallback(() => {
    doOpen(buildServicesCollectionConfig(category, deps));
  }, [category, deps, doOpen]);

  // ── Shell bindings ──────────────────────────────────────────────────────────
  const overviewBinding: ShellBinding<CategoryOverviewShellData> = {
    data:  { name: decodeHtml(station.category.name), slug: station.category.slug, description: station.category.description },
    state: modules.overview,
    hasDraft,
    handlers: {
      edit:            openOverviewEditor,
      'discard-draft': () => setDiscardConfirm(true),
    },
  };

  const total = serviceCounts.total;
  const servicesBinding: ShellBinding<CategoryServicesShellData> = {
    data: {
      headline: `${total} service${total !== 1 ? 's' : ''}`,
      copy:     total === 0
        ? 'No services assigned yet.'
        : `${serviceCounts.active} active · ${serviceCounts.disabled} inactive`,
    },
    state: modules.services,
    hasDraft: false,
    handlers: { view: openServicesCollection },
  };

  return (
    <>
      <EntityDrawer
        entity={CATEGORY_ENTITY}
        tab={tab}
        onSelectTab={setTab}
        bindings={{ overview: overviewBinding, services: servicesBinding }}
        openPanel={openPanel}
        onTogglePanel={(m) => setOpenPanel((p) => (p === m ? null : m))}
      >
        {saveOk && <div class="cz-admin-ok-msg">Changes saved.</div>}
      </EntityDrawer>

      {/* Publish / Settle confirmation */}
      {showPublishModal && (
        <div class="cz-publish-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPublishModal(false); }}>
          <div class="cz-publish-confirm">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">
                {isActive ? `Settle changes to ${decodeHtml(station.category.name)}?` : `Ready to publish ${decodeHtml(station.category.name)}?`}
              </h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">
                {isActive
                  ? 'This confirms the current draft as the settled state for the category overview.'
                  : 'You are about to publish this category and make it visible on the public Cost Builder.'}
              </p>
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => setShowPublishModal(false)} disabled={station.loading.status}>Cancel</button>
              <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={handleConfirmPublish} disabled={station.loading.status}>
                {station.loading.status ? '…' : isActive ? 'Settle' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard draft confirmation */}
      {discardConfirm && (
        <div class="cz-publish-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDiscardConfirm(false); }}>
          <div class="cz-publish-confirm">
            <div class="cz-publish-confirm__header"><h3 class="cz-publish-confirm__title">Discard draft?</h3></div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">This will remove the saved draft and return the overview to its last settled version.</p>
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => setDiscardConfirm(false)}>Cancel</button>
              <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={handleConfirmDiscard}>Discard Draft</button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved-changes exit dialog */}
      {exitDialog === 'unsaved' && (
        <div class="cz-publish-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) setExitDialog(null); }}>
          <div class="cz-publish-confirm">
            <div class="cz-publish-confirm__header"><h3 class="cz-publish-confirm__title">Unsaved changes</h3></div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">You have unsaved changes in <strong>Category Overview</strong>. Closing will discard them.</p>
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => { handleCancelEdit(); setExitDialog(null); closeWithoutGuard(); }}>Discard and close</button>
              <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={() => setExitDialog(null)}>Keep editing</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit overlay — the overview shell in edit mode (module-level, step-owned session) */}
      {editing && draft && (
        <ModeProvider mode="edit">
          <OverviewShell
            schema={categoryOverviewShell}
            binding={overviewBinding}
            editSession={{
              draft,
              patch:    (p) => setDraft((d) => d ? { ...d, ...(p as Partial<CategoryOverviewDraft>) } : d),
              replace:  (next) => setDraft(next as CategoryOverviewDraft),
              onSave:   handleSaveOverview,
              onCancel: handleCancelEdit,
              saving,
              saveErr,
              isDirty,
            }}
          />
        </ModeProvider>
      )}
    </>
  );
}

// ── CategoryServicesStep ──────────────────────────────────────────────────────
// The Collection placement surface (v1.2, first realisation): the shared
// serviceOverviewShell repeated once per assigned service in the `summary`
// viewpoint, each card's `view` footer opening the real Service drawer. The
// surface owns the N bindings; no new mode, archetype, or renderer.

export function CategoryServicesStep({ ctx }: { ctx: StepContext }) {
  const category = ctx.stepData.category as CategoryStationItem;
  const deps     = ctx.stepData.deps     as CategoryDrawerDeps;

  const slot  = CATEGORY_ENTITY.placements.collections!.services;   // { module: 'service', mode: 'summary', footer: ['view'] }
  const shell = CATEGORY_ENTITY.shells[slot.module] as ShellSchema<ServiceOverviewShellData>;   // serviceOverviewShell under 'service'

  const stations = useMemo(() => assignedFor(category, deps), [category.id]);

  // Cancel-only footer (Back returns to the category via the config's onBack).
  useEffect(() => {
    const { setFooter, close } = ctx;
    setFooter(
      <div class="cz-tf-footer">
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={close}>Close</button>
      </div>
    );
    return () => setFooter(null);
  }, [ctx.setFooter, ctx.close]);

  // Each card's View opens the real Service drawer (existing cross-station
  // transit — same initialStepData the catalog assembles). Back returns here
  // (remount reads fresh counts); Cancel closes to the workstation.
  const openServiceDrawer = useCallback((s: StationSummary) => {
    const d = deps.getCatalogData();
    deps.openAction({
      id:    `service-view-${s.id}`,
      mode:  'drawer',
      title: 'Service',
      onBack: () => deps.openAction(buildServicesCollectionConfig(category, deps)),
      initialStepData: {
        service:       buildServiceItemForStationHandoff(s),
        packages:      d.packages,
        openAction:    deps.openAction,
        allCategories: d.categories,
        onRefresh:     deps.onRefresh,
      },
      steps: [{ id: 'detail', title: 'Service Detail', component: ServiceViewStep }],
    });
  }, [category, deps]);

  return (
    <div class="cz-req-detail">
      {stations.length === 0 ? (
        <div class="cz-admin-empty">
          <p>No services are assigned to this category. Assign services from the Service Catalog.</p>
        </div>
      ) : (
        stations.map((s) => {
          const binding: ShellBinding<ServiceOverviewShellData> = {
            data: {
              title:    decodeHtml(s.title),
              category: decodeHtml(s.categories[0]?.name ?? 'Uncategorised'),
              content:  '',
            },
            state:    { status: summaryCardStatus(s), notes: [] },
            hasDraft: false,
            handlers: { view: () => openServiceDrawer(s) },
          };
          return (
            <ModeProvider key={s.id} mode={slot.mode}>
              <OverviewShell schema={shell} binding={binding} footer={slot.footer} />
            </ModeProvider>
          );
        })
      )}
    </div>
  );
}
