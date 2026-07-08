import { useEffect, useState, useCallback, useRef } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { AsyncLoading, AsyncError } from '@/components/admin/ui/AsyncSection';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { Category } from '@/api/types/cost-builder';
import { createCategory, fetchAdminCategories } from '@/api/endpoints/admin';
import type { CategoryOverviewDraft, CategoryStationItem, StationSummary, SurfacePackageSummary } from '@/api/types/admin';
import { ModeProvider } from '@/components/admin/schema/modeContext';
import { OverviewShell } from '@/components/admin/schema/shells/overviewShell';
import { categoryOverviewShell } from '@/components/admin/schema/shells/bindings/category';
import type { CategoryOverviewShellData } from '@/components/admin/schema/shells/bindings/category';
import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
import type { ShellBinding } from '@/components/admin/schema/types';
import { CATEGORY_ENTITY } from '@/components/admin/schema/entities/category';
import { Workstation } from '../shell/Workstation';
import { EntityTable } from '../EntityTable';
import { EntityDrawer } from '../EntityDrawer';
import { normalizeAdminCategories } from './ServiceCatalogWorkstation';
import { buildCategoryViewConfig } from './CategoryViewStep';
import type { CategoryDrawerDeps } from './CategoryViewStep';

interface Props {
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
}

// ── Category Create Step ──────────────────────────────────────────────────────
// Pattern: ServiceCreateStep, one owned module. New-state overview card (Edit
// enabled, blank placeholders); Save creates via the station POST (D3: born
// disabled) and re-opens the view step for the new category. The services
// gateway is omitted pre-creation — no binding is delivered, so EntityDrawer's
// Connections tab renders empty until the category exists.

function CategoryCreateStep({ ctx }: { ctx: StepContext }) {
  const deps = ctx.stepData.deps as CategoryDrawerDeps;

  const [draft,    setDraft]    = useState<CategoryOverviewDraft>({ name: '', description: '' });
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<string | null>(null);

  const complete = !!draft.name.trim() && !!draft.description.trim();
  const notes: ModuleNote[] = complete
    ? [{ id: 'new-category.overview.ready', message: 'Save to create this category.',   type: 'info' }]
    : [{ id: 'new-category.overview.start', message: 'Edit and describe this category.', type: 'info' }];

  const handleSave = useCallback(async () => {
    if (!draft.name.trim()) { setSaveErr('Name is required.'); return; }
    setSaving(true);
    setSaveErr(null);
    try {
      const result = await createCategory({ name: draft.name, description: draft.description });
      if (result.success) {
        deps.onRefresh?.();
        ctx.close();
        deps.openAction(buildCategoryViewConfig(result.category, deps));
      } else {
        setSaveErr(result.message ?? 'Failed to create category.');
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

  const overviewBinding: ShellBinding<CategoryOverviewShellData> = {
    data:  { name: draft.name, slug: '', description: draft.description },
    state: { status: 'pending-dim', notes },
    hasDraft: false,
    handlers: { edit: () => setEditing(true) },
  };

  return (
    <>
      <EntityDrawer
        entity={CATEGORY_ENTITY}
        bindings={{ overview: overviewBinding }}
        openPanel={openPanel}
        onTogglePanel={(m) => setOpenPanel((p) => (p === m ? null : m))}
      />

      {editing && (
        <ModeProvider mode="edit">
          <OverviewShell
            schema={categoryOverviewShell}
            binding={overviewBinding}
            editSession={{
              draft,
              patch:    (p) => setDraft((d) => ({ ...d, ...(p as Partial<CategoryOverviewDraft>) })),
              replace:  (next) => setDraft(next as CategoryOverviewDraft),
              onSave:   handleSave,
              onCancel: () => { setEditing(false); setSaveErr(null); },
              saving,
              saveErr,
              isDirty:  complete,
              title:    'Create Category',
            }}
          />
        </ModeProvider>
      )}
    </>
  );
}

// ── Main workstation ──────────────────────────────────────────────────────────

export function CategoryCatalogWorkstation({ refreshKey, openAction }: Props) {
  const categoriesApi = useApi(() => fetchAdminCategories());
  const catalog       = useAdminCatalog();
  const surfacePkgs   = useSurfacePackages();

  // Latest-value ref: the drawers snapshot their catalog payload from this at
  // open time, so reopening (e.g. returning from a service edit) reads fresh.
  const dataRef = useRef<{ stations: StationSummary[]; packages: SurfacePackageSummary[]; categories: Category[] }>({
    stations: [], packages: [], categories: [],
  });
  dataRef.current = {
    stations:   catalog.data?.stations ?? [],
    packages:   surfacePkgs.data?.packages ?? [],
    categories: normalizeAdminCategories(catalog.data?.categories ?? []),
  };
  const getCatalogData = useCallback(() => dataRef.current, []);

  useEffect(() => {
    if (refreshKey > 0) {
      categoriesApi.refetch();
      catalog.refetch();
      surfacePkgs.refetch();
    }
  }, [refreshKey]);

  // Refreshes both the category list and the catalog streams (two-way refresh:
  // editing a service from the collection updates the gateway counts on return).
  const onRefresh = () => {
    categoriesApi.refetch();
    catalog.refetch();
    surfacePkgs.refetch();
  };

  const deps: CategoryDrawerDeps = { getCatalogData, onRefresh, openAction };

  const openCategoryDrawer = (category: CategoryStationItem) => {
    openAction(buildCategoryViewConfig(category, deps));
  };

  const openCreateDrawer = () => {
    openAction({
      id:    'category-create',
      mode:  'drawer',
      title: 'Category',
      initialStepData: { deps },
      steps: [{ id: 'create', title: 'New Category', component: CategoryCreateStep }],
    });
  };

  if (categoriesApi.loading) return <AsyncLoading label="Loading categories…" />;
  if (categoriesApi.error)   return <AsyncError error={categoriesApi.error} onRetry={categoriesApi.refetch} />;

  const categories = categoriesApi.data?.categories ?? [];
  const total      = categories.length;

  return (
    <Workstation>
      <Workstation.Header className="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Categories</h2>
          <p class="cz-ws-subtitle">
            {total} categor{total !== 1 ? 'ies' : 'y'} — manage the catalog groupings and their public visibility.
          </p>
        </div>
      </Workstation.Header>

      <Workstation.Actions className="cz-sc-section__actions">
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={openCreateDrawer}>
          + New Category
        </button>
      </Workstation.Actions>

      <Workstation.Content>
        <EntityTable
          schema={CATEGORY_ENTITY.placements.table!}
          rows={categories}
          rowKey={(r) => r.id}
          handlers={{ view: (r) => openCategoryDrawer(r) }}
          frame="ws"
        />
      </Workstation.Content>
    </Workstation>
  );
}
