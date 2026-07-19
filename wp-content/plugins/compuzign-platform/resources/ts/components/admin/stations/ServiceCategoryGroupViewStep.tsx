import { useEffect, useState, useCallback, useMemo, useRef } from 'preact/hooks';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { ServiceCategoryGroupStationItem, CategoryStationItem } from '@/api/types/admin';
import { useServiceCategoryGroupStation } from '@/hooks/useServiceCategoryGroupStation';
import type { ServiceCategoryGroupCategoryCounts } from '@/hooks/useServiceCategoryGroupStation';
import type { ServiceCategoryGroupOverviewDraft } from '@/api/types/admin';
import { ModeProvider } from '@/drawer-kit/schema/modeContext';
import { OverviewShell } from '@/drawer-kit/schema/shells/overviewShell';
import { serviceCategoryGroupOverviewShell } from '@/components/admin/schema/shells/bindings/serviceCategoryGroup';
import type {
  ServiceCategoryGroupOverviewShellData,
} from '@/components/admin/schema/shells/bindings/serviceCategoryGroup';
import { categoryOverviewShell } from '@/components/admin/schema/shells/bindings/category';
import type { CategoryOverviewShellData } from '@/components/admin/schema/shells/bindings/category';
import type { ShellBinding, ShellSchema } from '@/drawer-kit/schema/types';
import { SERVICE_CATEGORY_GROUP_ENTITY } from '@/components/admin/schema/entities/serviceCategoryGroup';
import { EntityDrawer } from '@/drawer-kit/EntityDrawer';
import { DrawerTabs } from '@/drawer-kit/DrawerTabs';
import { decodeHtml } from './serviceDrawerShared';
// Read-only reuse — no edits to CategoryViewStep.tsx. buildCategoryViewConfig
// already wires CategoryViewStep as its step component; importing it here does
// not touch that file, it only opens the existing real Category drawer.
import { buildCategoryViewConfig } from './CategoryViewStep';
import type { CategoryDrawerDeps } from './CategoryViewStep';

// ===========================================================================
// SECTION: CATEGORY_GROUP_DRAWER_MODEL
// ===========================================================================
// Structural clone of CategoryDrawerDeps, one level up. `categoryDrawerDeps` is
// the unmodified CategoryDrawerDeps bundle the Category catalog itself builds —
// handed through unchanged so a category card's View opens the real Category
// drawer via the existing buildCategoryViewConfig, with the same services/
// packages/allCategories context that drawer already expects.
export interface ServiceCategoryGroupDrawerDeps {
  getCatalogData: () => { groups: ServiceCategoryGroupStationItem[]; categories: CategoryStationItem[] };
  categoryDrawerDeps: CategoryDrawerDeps;
  onRefresh?: () => void;
  openAction: (config: ActionConfig) => void;
}

// ── Config builder (shared by the station, create flow, card transit) ─────

export function buildServiceCategoryGroupViewConfig(
  group: ServiceCategoryGroupStationItem,
  deps:  ServiceCategoryGroupDrawerDeps,
  initialTab: 'details' | 'connections' = 'details',
): ActionConfig {
  return {
    id:    `category-group-view-${group.id}`,
    mode:  'drawer',
    title: 'Service Category Group',
    initialStepData: { group, deps, initialTab },
    steps: [{ id: 'detail', title: 'Service Category Group Detail', component: ServiceCategoryGroupViewStep }],
  };
}

// The dedicated Categories collection surface: a Details | Connections list
// drawer reached from the Connections-tab Categories gateway's View. Back
// returns to the Service Category Group drawer on its Connections tab, where the
// Group-scoped child categories, read fresh from the station ref.
function categoriesFor(group: ServiceCategoryGroupStationItem, deps: ServiceCategoryGroupDrawerDeps): CategoryStationItem[] {
  return deps.getCatalogData().categories.filter((c) => c.group_id === group.id);
}

// Presentation Status Contract mapping for the summary cards (Active / Pending /
// Disabled only) — mirrors CategoryViewStep's summaryCardStatus, applied to a
// CategoryStationItem instead of a ServiceSummary.
// ── ServiceCategoryGroupViewStep ──────────────────────────────────────────────────────
// Manifest-assembly drawer (pattern: CategoryViewStep, one owned module). Details
// tab = the owned Service Category Group Overview; Connections tab = the Assigned
// Categories summary gateway whose View transits to the collection surface.

export function ServiceCategoryGroupViewStep({ ctx }: { ctx: StepContext }) {
  const group = ctx.stepData.group as ServiceCategoryGroupStationItem;
  const deps  = ctx.stepData.deps  as ServiceCategoryGroupDrawerDeps;
  const onRefresh = deps.onRefresh;

  const [tab, setTab] = useState<'details' | 'connections'>(
    (ctx.stepData.initialTab as 'details' | 'connections') ?? 'details',
  );

  // Assigned categories (read fresh at mount) → the gateway split.
  const assignedCategories = useMemo(() => categoriesFor(group, deps), [group.id]);
  const categoryCounts: ServiceCategoryGroupCategoryCounts = useMemo(() => {
    const total  = assignedCategories.length;
    const active = assignedCategories.filter((c) => c.platform_status === 'active').length;
    return { total, active, disabled: total - active };
  }, [assignedCategories]);

  const station = useServiceCategoryGroupStation(group, onRefresh, categoryCounts);
  const {
    platformStatus, isActive, hasDraft, moduleStatus, modules,
    saveOverview, revertOverview, settleModules, publishServiceCategoryGroup,
    toggleActive, archiveStation, trashStation,
  } = station;

  // Publish is meaningful only when there is something to publish: a complete
  // but unsettled overview (activate), or an active group with a pending draft
  // (settle). Mirrors CategoryViewStep's canPublish exactly.
  const canPublish = modules.overview.status === 'pending-full' || (isActive && hasDraft);

  // ===========================================================================
  // SECTION: CATEGORY_GROUP_OVERVIEW
  // ===========================================================================
  const [editing,         setEditing]         = useState(false);
  const [draft,           setDraft]           = useState<ServiceCategoryGroupOverviewDraft | null>(null);
  const [original,        setOriginal]        = useState<ServiceCategoryGroupOverviewDraft | null>(null);
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
    const seed: ServiceCategoryGroupOverviewDraft = { name: station.group.name, description: station.group.description };
    setOriginal(seed);
    setDraft(seed);
    setEditing(true);
    setOpenPanel(null);
    setSaveErr(null);
  }, [station.group.name, station.group.description]);

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
    await (isActive ? settleModules() : publishServiceCategoryGroup());
  }, [isActive, settleModules, publishServiceCategoryGroup]);

  // ===========================================================================
  // SECTION: CATEGORY_GROUP_LIFECYCLE
  // ===========================================================================
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

  // ===========================================================================
  // SECTION: CATEGORY_GROUP_CONNECTIONS
  // ===========================================================================

  // ===========================================================================
  // SECTION: CATEGORY_GROUP_RENDER
  // ===========================================================================
  const overviewBinding: ShellBinding<ServiceCategoryGroupOverviewShellData> = {
    data:  { name: decodeHtml(station.group.name), slug: station.group.slug, description: station.group.description },
    state: modules.overview,
    hasDraft,
    handlers: {
      edit:            openOverviewEditor,
      'discard-draft': () => setDiscardConfirm(true),
    },
  };


  return (
    <>
      <EntityDrawer
        entity={SERVICE_CATEGORY_GROUP_ENTITY}
        tab={tab}
        onSelectTab={setTab}
        bindings={{ overview: overviewBinding }}
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
                {isActive ? `Settle changes to ${decodeHtml(station.group.name)}?` : `Ready to publish ${decodeHtml(station.group.name)}?`}
              </h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">
                {isActive
                  ? 'This confirms the current draft as the settled state for the category group overview.'
                  : 'You are about to publish this category group and make it available in the admin.'}
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
              <p class="cz-publish-confirm__lead">You have unsaved changes in <strong>Service Category Group Overview</strong>. Closing will discard them.</p>
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
            schema={serviceCategoryGroupOverviewShell}
            binding={overviewBinding}
            editSession={{
              draft,
              patch:    (p) => setDraft((d) => d ? { ...d, ...(p as Partial<ServiceCategoryGroupOverviewDraft>) } : d),
              replace:  (next) => setDraft(next as ServiceCategoryGroupOverviewDraft),
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
/*
 * FILE INDEX
 *
 * CATEGORY_GROUP_DRAWER_MODEL   Dependencies, config, and Category handoff
 * CATEGORY_GROUP_OVERVIEW       Overview editing and dirty state
 * CATEGORY_GROUP_LIFECYCLE      Publish, status, travel, and guarded close
 * CATEGORY_GROUP_CONNECTIONS    Assigned-Category gateway and collection transit
 * CATEGORY_GROUP_RENDER         Shell binding, footer, and dialogs
 *
 * Search: SECTION: CATEGORY_GROUP_DRAWER_MODEL
 *         SECTION: CATEGORY_GROUP_OVERVIEW
 *         SECTION: CATEGORY_GROUP_LIFECYCLE
 *         SECTION: CATEGORY_GROUP_CONNECTIONS
 *         SECTION: CATEGORY_GROUP_RENDER
 */
