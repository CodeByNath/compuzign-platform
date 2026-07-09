import { useEffect, useState, useCallback, useMemo, useRef } from 'preact/hooks';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { CategoryGroupStationItem, CategoryStationItem } from '@/api/types/admin';
import { useCategoryGroupStation } from '@/hooks/useCategoryGroupStation';
import type { CategoryGroupCategoryCounts } from '@/hooks/useCategoryGroupStation';
import type { CategoryGroupOverviewDraft } from '@/api/types/admin';
import { ModeProvider } from '@/components/admin/schema/modeContext';
import { OverviewShell } from '@/components/admin/schema/shells/overviewShell';
import { categoryGroupOverviewShell } from '@/components/admin/schema/shells/bindings/categoryGroup';
import type {
  CategoryGroupOverviewShellData,
  CategoryGroupCategoriesShellData,
} from '@/components/admin/schema/shells/bindings/categoryGroup';
import { categoryOverviewShell } from '@/components/admin/schema/shells/bindings/category';
import type { CategoryOverviewShellData } from '@/components/admin/schema/shells/bindings/category';
import type { ShellBinding, ShellSchema } from '@/components/admin/schema/types';
import { CATEGORY_GROUP_ENTITY } from '@/components/admin/schema/entities/categoryGroup';
import { EntityDrawer } from '../EntityDrawer';
import { DrawerTabs } from '../DrawerTabs';
import { decodeHtml } from './serviceDrawerShared';
// Read-only reuse — no edits to CategoryViewStep.tsx. buildCategoryViewConfig
// already wires CategoryViewStep as its step component; importing it here does
// not touch that file, it only opens the existing real Category drawer.
import { buildCategoryViewConfig } from './CategoryViewStep';
import type { CategoryDrawerDeps } from './CategoryViewStep';

// ── Drawer dependency bundle ──────────────────────────────────────────────────
// Structural clone of CategoryDrawerDeps, one level up. `categoryDrawerDeps` is
// the unmodified CategoryDrawerDeps bundle the Category catalog itself builds —
// handed through unchanged so a category card's View opens the real Category
// drawer via the existing buildCategoryViewConfig, with the same services/
// packages/allCategories context that drawer already expects.
export interface CategoryGroupDrawerDeps {
  getCatalogData: () => { groups: CategoryGroupStationItem[]; categories: CategoryStationItem[] };
  categoryDrawerDeps: CategoryDrawerDeps;
  onRefresh?: () => void;
  openAction: (config: ActionConfig) => void;
}

// ── Config builder (shared by the workstation, create flow, card transit) ─────

export function buildCategoryGroupViewConfig(
  group: CategoryGroupStationItem,
  deps:  CategoryGroupDrawerDeps,
  initialTab: 'details' | 'connections' = 'details',
): ActionConfig {
  return {
    id:    `category-group-view-${group.id}`,
    mode:  'drawer',
    title: 'Category Group',
    initialStepData: { group, deps, initialTab },
    steps: [{ id: 'detail', title: 'Category Group Detail', component: CategoryGroupViewStep }],
  };
}

// The dedicated Categories collection surface: a Details | Connections list
// drawer reached from the Connections-tab Categories gateway's View. Back
// returns to the Category Group drawer on its Connections tab, where the
// gateway lives — same mechanics as buildServicesCollectionConfig.
function buildCategoriesCollectionConfig(group: CategoryGroupStationItem, deps: CategoryGroupDrawerDeps): ActionConfig {
  return {
    id:             `category-group-categories-${group.id}`,
    mode:           'drawer',
    title:          'Category Group',
    hideStepHeader: true,
    onBack:         () => deps.openAction(buildCategoryGroupViewConfig(group, deps, 'connections')),
    initialStepData: { group, deps },
    steps: [{ id: 'categories', title: 'Categories', component: CategoryGroupCategoriesStep }],
  };
}

// Group-scoped child categories, read fresh from the workstation ref.
function categoriesFor(group: CategoryGroupStationItem, deps: CategoryGroupDrawerDeps): CategoryStationItem[] {
  return deps.getCatalogData().categories.filter((c) => c.group_id === group.id);
}

// Presentation Status Contract mapping for the summary cards (Active / Pending /
// Disabled only) — mirrors CategoryViewStep's summaryCardStatus, applied to a
// CategoryStationItem instead of a StationSummary.
function categorySummaryCardStatus(c: CategoryStationItem): string {
  if (c.platform_status === 'active') return 'active';
  if (c.platform_status === 'disabled') {
    return c.module_status?.overview !== 'settled' ? 'pending-dim' : 'disabled';
  }
  return 'pending-dim';
}

// ── CategoryGroupViewStep ──────────────────────────────────────────────────────
// Manifest-assembly drawer (pattern: CategoryViewStep, one owned module). Details
// tab = the owned Category Group Overview; Connections tab = the Assigned
// Categories summary gateway whose View transits to the collection surface.

export function CategoryGroupViewStep({ ctx }: { ctx: StepContext }) {
  const group = ctx.stepData.group as CategoryGroupStationItem;
  const deps  = ctx.stepData.deps  as CategoryGroupDrawerDeps;
  const onRefresh = deps.onRefresh;

  const [tab, setTab] = useState<'details' | 'connections'>(
    (ctx.stepData.initialTab as 'details' | 'connections') ?? 'details',
  );

  // Assigned categories (read fresh at mount) → the gateway split.
  const assignedCategories = useMemo(() => categoriesFor(group, deps), [group.id]);
  const categoryCounts: CategoryGroupCategoryCounts = useMemo(() => {
    const total  = assignedCategories.length;
    const active = assignedCategories.filter((c) => c.platform_status === 'active').length;
    return { total, active, disabled: total - active };
  }, [assignedCategories]);

  const station = useCategoryGroupStation(group, onRefresh, categoryCounts);
  const {
    platformStatus, isActive, hasDraft, moduleStatus, modules,
    saveOverview, revertOverview, settleModules, publishCategoryGroup,
    toggleActive, archiveStation, trashStation,
  } = station;

  // Publish is meaningful only when there is something to publish: a complete
  // but unsettled overview (activate), or an active group with a pending draft
  // (settle). Mirrors CategoryViewStep's canPublish exactly.
  const canPublish = modules.overview.status === 'pending-full' || (isActive && hasDraft);

  // ── Edit overlay (Edit Granularity: step-owned per-module session) ──────────
  const [editing,         setEditing]         = useState(false);
  const [draft,           setDraft]           = useState<CategoryGroupOverviewDraft | null>(null);
  const [original,        setOriginal]        = useState<CategoryGroupOverviewDraft | null>(null);
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
    const seed: CategoryGroupOverviewDraft = { name: station.group.name, description: station.group.description };
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
    await (isActive ? settleModules() : publishCategoryGroup());
  }, [isActive, settleModules, publishCategoryGroup]);

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
  const openCategoriesCollection = useCallback(() => {
    deps.openAction(buildCategoriesCollectionConfig(group, deps));
  }, [group, deps]);

  // ── Shell bindings ──────────────────────────────────────────────────────────
  const overviewBinding: ShellBinding<CategoryGroupOverviewShellData> = {
    data:  { name: decodeHtml(station.group.name), slug: station.group.slug, description: station.group.description },
    state: modules.overview,
    hasDraft,
    handlers: {
      edit:            openOverviewEditor,
      'discard-draft': () => setDiscardConfirm(true),
    },
  };

  const total = categoryCounts.total;
  const categoriesBinding: ShellBinding<CategoryGroupCategoriesShellData> = {
    data: {
      headline: `${total} categor${total !== 1 ? 'ies' : 'y'}`,
      copy:     total === 0
        ? 'No categories assigned yet.'
        : `${categoryCounts.active} active · ${categoryCounts.disabled} inactive`,
    },
    state: modules.categories,
    hasDraft: false,
    handlers: { view: openCategoriesCollection },
  };

  return (
    <>
      <EntityDrawer
        entity={CATEGORY_GROUP_ENTITY}
        tab={tab}
        onSelectTab={setTab}
        bindings={{ overview: overviewBinding, categories: categoriesBinding }}
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
              <p class="cz-publish-confirm__lead">You have unsaved changes in <strong>Category Group Overview</strong>. Closing will discard them.</p>
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
            schema={categoryGroupOverviewShell}
            binding={overviewBinding}
            editSession={{
              draft,
              patch:    (p) => setDraft((d) => d ? { ...d, ...(p as Partial<CategoryGroupOverviewDraft>) } : d),
              replace:  (next) => setDraft(next as CategoryGroupOverviewDraft),
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

// ── CategoryGroupCategoriesStep ────────────────────────────────────────────────
// The dedicated Categories collection surface (Collection placement, on the
// promotion-list / package-overview pattern): a Details | Connections list
// drawer. Details = the shared categoryOverviewShell repeated once per child
// category in the summary viewpoint (repetition owned by the placement; the
// surface owns the N bindings); Connections = the parent Category Group
// context. Each card's View opens the real Category station drawer. No new
// mode, archetype, renderer, or tabless drawer.

export function CategoryGroupCategoriesStep({ ctx }: { ctx: StepContext }) {
  const group = ctx.stepData.group as CategoryGroupStationItem;
  const deps  = ctx.stepData.deps  as CategoryGroupDrawerDeps;

  const [listTab, setListTab] = useState<'details' | 'connections'>('details');

  const slot  = CATEGORY_GROUP_ENTITY.placements.collections!.categories;   // { module: 'category', mode: 'summary', footer: ['view'] }
  const shell = CATEGORY_GROUP_ENTITY.shells[slot.module] as ShellSchema<CategoryOverviewShellData>;   // categoryOverviewShell under 'category'

  const categories = useMemo(() => categoriesFor(group, deps), [group.id]);

  // Close footer (Back — the header control — returns to the Category Group drawer).
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

  // Each card's View opens the real Category drawer via the existing
  // buildCategoryViewConfig (read-only reuse — CategoryViewStep.tsx is
  // untouched), passing deps.categoryDrawerDeps unchanged. Back returns to this
  // collection surface (remount reads fresh categories).
  const openCategoryDrawer = useCallback((c: CategoryStationItem) => {
    deps.openAction({
      ...buildCategoryViewConfig(c, deps.categoryDrawerDeps),
      onBack: () => deps.openAction(buildCategoriesCollectionConfig(group, deps)),
    });
  }, [group, deps]);

  // Parent-group context for the Connections tab — categoryGroupOverviewShell in
  // the connections viewpoint (View returns to the Category Group drawer),
  // mirroring categoryContextBinding on CategoryServicesStep.
  const groupContextBinding: ShellBinding<CategoryGroupOverviewShellData> = {
    data:     { name: decodeHtml(group.name), slug: group.slug, description: decodeHtml(group.description) },
    state:    { status: group.platform_status === 'active' ? 'active' : 'disabled', notes: [] },
    hasDraft: false,
    handlers: { view: () => deps.openAction(buildCategoryGroupViewConfig(group, deps)) },
  };

  return (
    <div class="cz-req-detail">
      {/* Drawer Tab Contract — Details = the category cards; Connections = the
          parent category group (matching the Category Services collection level). */}
      <DrawerTabs active={listTab} onSelect={setListTab} />

      {listTab === 'details' && (
        categories.length === 0 ? (
          <div class="cz-admin-empty">
            <p>No categories are assigned to this group. Assign categories from the Categories workstation.</p>
          </div>
        ) : (
          categories.map((c) => {
            const binding: ShellBinding<CategoryOverviewShellData> = {
              data: {
                name:        decodeHtml(c.name),
                slug:        c.slug,
                description: decodeHtml(c.description),
              },
              state:    { status: categorySummaryCardStatus(c), notes: [] },
              hasDraft: false,
              handlers: { view: () => openCategoryDrawer(c) },
            };
            return (
              <ModeProvider key={c.id} mode={slot.mode}>
                <OverviewShell schema={shell} binding={binding} footer={slot.footer} />
              </ModeProvider>
            );
          })
        )
      )}

      {listTab === 'connections' && (
        <ModeProvider mode="connections">
          <OverviewShell schema={categoryGroupOverviewShell} binding={groupContextBinding} />
        </ModeProvider>
      )}
    </div>
  );
}
