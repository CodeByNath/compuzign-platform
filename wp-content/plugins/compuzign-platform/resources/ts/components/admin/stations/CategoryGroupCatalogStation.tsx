import { useEffect, useState, useCallback, useRef } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { AsyncLoading, AsyncError } from '@/components/admin/ui/AsyncSection';
import type { ActionConfig, StepContext } from '../ActionShell';
import { createCategoryGroup, fetchAdminCategoryGroups, fetchAdminCategories } from '@/api/endpoints/admin';
import type { Category } from '@/api/types/cost-builder';
import type {
  CategoryGroupOverviewDraft,
  CategoryGroupStationItem,
  CategoryStationItem,
  SurfacePackageSummary,
} from '@/api/types/admin';
import type { ServiceSummary } from '@/admin-station/stations/service';
import { ModeProvider } from '@/components/admin/schema/modeContext';
import { OverviewShell } from '@/components/admin/schema/shells/overviewShell';
import { categoryGroupOverviewShell } from '@/components/admin/schema/shells/bindings/categoryGroup';
import type { CategoryGroupOverviewShellData } from '@/components/admin/schema/shells/bindings/categoryGroup';
import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
import type { ShellBinding } from '@/components/admin/schema/types';
import { CATEGORY_GROUP_ENTITY } from '@/components/admin/schema/entities/categoryGroup';
import { Station } from '../shell/Station';
import { EntityTable } from '../EntityTable';
import { EntityDrawer } from '../EntityDrawer';
import { normalizeAdminCategories } from './ServiceCatalogStation';
import { buildCategoryGroupViewConfig } from './CategoryGroupViewStep';
import type { CategoryGroupDrawerDeps } from './CategoryGroupViewStep';

interface Props {
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
}

// ── Category Group Create Step ────────────────────────────────────────────────
// Pattern: CategoryCreateStep, one owned module. New-state overview card (Edit
// enabled, blank placeholders); Save creates via the station POST (born
// disabled) and re-opens the view step for the new group. The categories
// gateway is omitted pre-creation — no binding is delivered, so EntityDrawer's
// Connections tab renders empty until the group exists.

function CategoryGroupCreateStep({ ctx }: { ctx: StepContext }) {
  const deps = ctx.stepData.deps as CategoryGroupDrawerDeps;

  const [draft,    setDraft]    = useState<CategoryGroupOverviewDraft>({ name: '', description: '' });
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<string | null>(null);

  const complete = !!draft.name.trim() && !!draft.description.trim();
  const notes: ModuleNote[] = complete
    ? [{ id: 'new-category-group.overview.ready', message: 'Save to create this category group.',   type: 'info' }]
    : [{ id: 'new-category-group.overview.start', message: 'Edit and describe this category group.', type: 'info' }];

  const handleSave = useCallback(async () => {
    if (!draft.name.trim()) { setSaveErr('Name is required.'); return; }
    setSaving(true);
    setSaveErr(null);
    try {
      const result = await createCategoryGroup({ name: draft.name, description: draft.description });
      if (result.success) {
        deps.onRefresh?.();
        ctx.close();
        deps.openAction(buildCategoryGroupViewConfig(result.group, deps));
      } else {
        setSaveErr(result.message ?? 'Failed to create category group.');
      }
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }, [draft, deps, ctx]);

  useEffect(() => {
    const { setFooter, close } = ctx;
    setFooter(
      <div class="cz-tf-footer">
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={close}>Cancel</button>
      </div>
    );
    return () => setFooter(null);
  }, [ctx.setFooter, ctx.close]);

  const overviewBinding: ShellBinding<CategoryGroupOverviewShellData> = {
    data:  { name: draft.name, slug: '', description: draft.description },
    state: { status: 'pending-dim', notes },
    hasDraft: false,
    handlers: { edit: () => setEditing(true) },
  };

  return (
    <>
      <EntityDrawer
        entity={CATEGORY_GROUP_ENTITY}
        bindings={{ overview: overviewBinding }}
        openPanel={openPanel}
        onTogglePanel={(m) => setOpenPanel((p) => (p === m ? null : m))}
      />

      {editing && (
        <ModeProvider mode="edit">
          <OverviewShell
            schema={categoryGroupOverviewShell}
            binding={overviewBinding}
            editSession={{
              draft,
              patch:    (p) => setDraft((d) => ({ ...d, ...(p as Partial<CategoryGroupOverviewDraft>) })),
              replace:  (next) => setDraft(next as CategoryGroupOverviewDraft),
              onSave:   handleSave,
              onCancel: () => { setEditing(false); setSaveErr(null); },
              saving,
              saveErr,
              isDirty:  complete,
              title:    'Create Category Group',
            }}
          />
        </ModeProvider>
      )}
    </>
  );
}

// ── Main station ──────────────────────────────────────────────────────────
// Fetches its own group list plus the same category/service/package streams the
// Category catalog fetches — needed only to assemble the unmodified
// CategoryDrawerDeps bundle so a category card's View can open the real
// Category drawer through the existing buildCategoryViewConfig, unchanged.

export function CategoryGroupCatalogStation({ refreshKey, openAction }: Props) {
  const groupsApi     = useApi(() => fetchAdminCategoryGroups());
  const categoriesApi = useApi(() => fetchAdminCategories());
  const catalog       = useAdminCatalog();
  const surfacePkgs   = useSurfacePackages();

  // Latest-value ref: the drawers snapshot their catalog payload from this at
  // open time, so reopening (e.g. returning from a category edit) reads fresh —
  // same pattern as CategoryCatalogStation's dataRef.
  const dataRef = useRef<{
    groups:                 CategoryGroupStationItem[];
    categories:             CategoryStationItem[];
    stations:               ServiceSummary[];
    packages:               SurfacePackageSummary[];
    costBuilderCategories:  Category[];
  }>({
    groups: [], categories: [], stations: [], packages: [], costBuilderCategories: [],
  });
  dataRef.current = {
    groups:                 groupsApi.data?.category_groups ?? [],
    categories:             categoriesApi.data?.categories ?? [],
    stations:               catalog.data?.stations ?? [],
    packages:               surfacePkgs.data?.packages ?? [],
    costBuilderCategories:  normalizeAdminCategories(catalog.data?.categories ?? []),
  };

  const getCatalogData = useCallback(() => ({
    groups:     dataRef.current.groups,
    categories: dataRef.current.categories,
  }), []);

  useEffect(() => {
    if (refreshKey > 0) {
      groupsApi.refetch();
      categoriesApi.refetch();
      catalog.refetch();
      surfacePkgs.refetch();
    }
  }, [refreshKey]);

  // Refreshes every stream (two-way refresh: editing a category from the
  // collection updates the gateway counts on return).
  const onRefresh = () => {
    groupsApi.refetch();
    categoriesApi.refetch();
    catalog.refetch();
    surfacePkgs.refetch();
  };

  // The unmodified CategoryDrawerDeps bundle — handed through unchanged so the
  // real Category drawer (opened from a collection card) sees exactly the same
  // context the Category catalog itself would supply.
  const categoryDrawerDeps = {
    getCatalogData: () => ({
      stations:   dataRef.current.stations,
      packages:   dataRef.current.packages,
      categories: dataRef.current.costBuilderCategories,
    }),
    onRefresh,
    openAction,
  };

  const deps: CategoryGroupDrawerDeps = { getCatalogData, categoryDrawerDeps, onRefresh, openAction };

  const openCategoryGroupDrawer = (group: CategoryGroupStationItem) => {
    openAction(buildCategoryGroupViewConfig(group, deps));
  };

  const openCreateDrawer = () => {
    openAction({
      id:    'category-group-create',
      mode:  'drawer',
      title: 'Category Group',
      initialStepData: { deps },
      steps: [{ id: 'create', title: 'New Category Group', component: CategoryGroupCreateStep }],
    });
  };

  if (groupsApi.loading || categoriesApi.loading) return <AsyncLoading label="Loading category groups…" />;
  if (groupsApi.error)   return <AsyncError error={groupsApi.error} onRetry={groupsApi.refetch} />;
  if (categoriesApi.error) return <AsyncError error={categoriesApi.error} onRetry={categoriesApi.refetch} />;

  const groups = groupsApi.data?.category_groups ?? [];
  const total  = groups.length;

  return (
    <Station>
      <Station.Header className="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Category Groups</h2>
          <p class="cz-ws-subtitle">
            {total} categor{total !== 1 ? 'y groups' : 'y group'} — organise related categories together.
          </p>
        </div>
      </Station.Header>

      <Station.Actions className="cz-sc-section__actions">
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={openCreateDrawer}>
          + New Category Group
        </button>
      </Station.Actions>

      <Station.Content>
        <EntityTable
          schema={CATEGORY_GROUP_ENTITY.placements.table!}
          rows={groups}
          rowKey={(r) => r.id}
          handlers={{ view: (r) => openCategoryGroupDrawer(r) }}
          frame="ws"
        />
      </Station.Content>
    </Station>
  );
}
