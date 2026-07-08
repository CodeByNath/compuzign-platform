import { useEffect, useState, useCallback } from 'preact/hooks';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { AsyncLoading, AsyncError } from '@/components/admin/ui/AsyncSection';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { Category, PricingTierData, ServiceItem, TierId } from '@/api/types/cost-builder';
import { createService, updateServiceCategory } from '@/api/endpoints/admin';
import type { AdminServiceDetailResponse, StationSummary, SurfacePackageSummary } from '@/api/types/admin';
import { resolveStationCommercialSummary, resolveStationStatus } from '@/components/admin/utils/moduleStatus';
import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
import { ReadBlock } from '../ReadBlock';
import { DrawerTabs } from '../DrawerTabs';
import { MODULE_ICONS } from '@/components/admin/schema/icons';
import { Workstation } from '../shell/Workstation';
import { EntityTable } from '../EntityTable';
import { SERVICE_ENTITY } from '@/components/admin/schema/entities/service';
import type { ServiceCatalogRow } from '@/components/admin/schema/tables/service';
import { InlineEditorShell } from '../InlineEditorShell';
import { ServiceOverviewEditor } from '../editors/ServiceOverviewEditor';
import type { OverviewDraft } from '../editors/ServiceOverviewEditor';
import { ServiceViewStep, decodeHtml, CommercialBlock, TIER_KEYS, TIER_LABELS } from './ServiceViewStep';

interface Props {
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
}

// ── Station status ────────────────────────────────────────────────────────────
// Filter buckets + the display pill live in utils/moduleStatus (moved in S3b
// so the catalog TableSchema can project them); this file keeps only the
// filter vocabulary.

type StatusFilter = 'all' | 'active' | 'pending' | 'drafts' | 'disabled';

// ── Category normalization ────────────────────────────────────────────────────
// AdminCatalogResponse returns id: number | null. Real taxonomy terms always have
// integer IDs; null only appears for synthetic "Uncategorised" groupings.
// Filter null-ID entries out before passing to contexts expecting Category[].

type AdminCategory = { id: number | null; name: string; slug: string; description?: string };

// Exported since S6: the Category Services collection surface is the second
// consumer — it opens the real Service drawer for each assigned service and
// needs the identical handoff payload (do not fork a reduced Service drawer).
export function normalizeAdminCategories(cats: AdminCategory[]): Category[] {
  return cats
    .filter((c): c is { id: number; name: string; slug: string; description?: string } => c.id !== null)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? '' }));
}

// ── Drawer handoff adapter ────────────────────────────────────────────────────
// Produces a minimal ServiceItem for opening the existing ServiceViewStep drawer.
// The drawer immediately calls fetchAdminServiceDetail(service.id) on mount and
// loads authoritative data from there. This adapter only carries enough for the
// drawer loading window — do not treat it as a second service model.

export function buildServiceItemForStationHandoff(summary: StationSummary): ServiceItem {
  return {
    id:         summary.id,
    title:      summary.title,
    slug:       summary.slug,
    excerpt:    '',
    content:    '',
    categories: normalizeAdminCategories(summary.categories),
    inclusions:   [],
    faqs:         [],
    availability: { is_available: true, message: '' },
    meta: {
      platform_status:   summary.platform_status,
      module_status:     summary.module_status as any,
      short_description: '',
      long_description:  '',
      billing_cycle:     '',
      sla:               '',
      uptime:            '',
      notes:             '',
      popular_tier:      null,
      popular_label:     null,
      sort_order:        0,
    },
    pricing: {
      tiers:  {} as Record<TierId, PricingTierData>,
      bundle: { title: '', description: '', price: null },
    },
    promotion_tiers: [],
  };
}

// ── New-service creation helper ───────────────────────────────────────────────

function buildNewServiceItem(
  data: { id: number; title: string; slug: string; platform_status: string; module_status: Record<string, string>; categories?: Array<{ id: number; name: string; slug: string }> },
  drafts?: AdminServiceDetailResponse['drafts'] | null,
): ServiceItem {
  const ov = drafts?.overview;
  return {
    id:         data.id,
    title:      ov?.title   ?? data.title,
    slug:       data.slug,
    excerpt:    ov?.excerpt ?? '',
    content:    ov?.content ?? '',
    categories: (data.categories ?? []).filter(c => c.id !== null) as Category[],
    inclusions: [],
    faqs:       [],
    availability: { is_available: true, message: '' },
    meta: {
      platform_status:   (data.platform_status as any) ?? 'disabled',
      module_status:     data.module_status as any,
      short_description: '',
      long_description:  '',
      billing_cycle:     '',
      sla:               '',
      uptime:            '',
      notes:             '',
      popular_tier:      null,
      popular_label:     null,
      sort_order:        0,
    },
    pricing: {
      tiers:  {} as Record<TierId, PricingTierData>,
      bundle: { title: '', description: '', price: null },
    },
    promotion_tiers: [],
  };
}

// ── Service Create Step ───────────────────────────────────────────────────────

function ServiceCreateStep({ ctx }: { ctx: StepContext }) {
  const doOpen        = ctx.stepData.openAction    as (config: ActionConfig) => void;
  const packages      = ctx.stepData.packages      as SurfacePackageSummary[];
  const allCategories = ctx.stepData.allCategories as Category[];
  const onRefresh     = ctx.stepData.onRefresh     as (() => void) | undefined;

  const [tab,     setTab]     = useState<'details' | 'connections'>('details');
  const [editing, setEditing] = useState(false);
  const [localCategories, setLocalCategories] = useState<Category[]>(allCategories);
  const [draft,   setDraft]   = useState<OverviewDraft>({
    title:       '',
    excerpt:     '',
    content:     '',
    category_id: null,
  });
  const [saving,           setSaving]           = useState(false);
  const [saveErr,          setSaveErr]          = useState<string | null>(null);
  const [catDesc,          setCatDesc]          = useState('');
  const [catDescOriginal,  setCatDescOriginal]  = useState('');
  const [overviewPanelOpen, setOverviewPanelOpen] = useState(false);

  const overviewComplete = !!draft.title.trim() && !!draft.content.trim() && draft.category_id !== null;
  const overviewNotes: ModuleNote[] = overviewComplete
    ? [{ id: 'new-service.overview.waiting', message: 'Waiting for service publication.', type: 'info' }]
    : [{ id: 'new-service.overview.start',   message: 'Edit and create a service.',       type: 'info' }];

  const [featuresPanelOpen,   setFeaturesPanelOpen]   = useState(false);
  const [questionsPanelOpen,  setQuestionsPanelOpen]  = useState(false);
  const [packagePanelOpen,    setPackagePanelOpen]    = useState(false);

  // Locked state: the Included Features / Common Questions / Package Summary action
  // buttons are always disabled until the service exists, so the pill always shows the
  // activation prompt. The "Edit and …" prompts are owned by the view step
  // (getInclusionsNotes / getFaqsNotes / getPackageNotes), which fire once the service
  // exists and the module action is enabled.
  const featuresNotes: ModuleNote[] = [
    { id: 'new-service.features.activation', message: 'Waiting for service activation.', type: 'info' },
  ];
  const questionsNotes: ModuleNote[] = [
    { id: 'new-service.questions.activation', message: 'Waiting for service activation.', type: 'info' },
  ];
  const packageNotes: ModuleNote[] = [
    { id: 'new-service.package.activation', message: 'Waiting for service activation.', type: 'info' },
  ];

  const handleSave = useCallback(async () => {
    if (!draft.title.trim()) { setSaveErr('Title is required.'); return; }
    if (draft.category_id === null) { setSaveErr('Category is required.'); return; }
    setSaving(true);
    setSaveErr(null);
    try {
      const result = await createService({
        title:        draft.title,
        excerpt:      draft.excerpt,
        content:      draft.content,
        category_ids: [draft.category_id],
      });
      if (result.success) {
        if (draft.category_id !== null && catDesc.trim() !== catDescOriginal.trim()) {
          await updateServiceCategory(draft.category_id, { description: catDesc.trim() });
        }
        const newService = buildNewServiceItem(result.service, result.drafts);
        onRefresh?.();
        ctx.close();
        doOpen({
          id:       `service-view-${newService.id}`,
          mode:     'drawer',
          title:    'Service',
          initialStepData: { service: newService, packages, openAction: doOpen, allCategories: localCategories, onRefresh },
          steps: [{ id: 'detail', title: 'Service Detail', component: ServiceViewStep }],
        });
      } else {
        setSaveErr('Failed to create service.');
      }
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }, [draft, catDesc, catDescOriginal, doOpen, packages, allCategories, onRefresh, ctx]);

  // Drawer Principle v1 — render footer in the shared shell footer slot (not inline
  // in the scrolling body) so it aligns with the standard drawer footer. Single
  // action → right-aligned via the leading spacer.
  useEffect(() => {
    const { setFooter, close } = ctx;
    setFooter(
      <div class="cz-tf-footer">
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={close}>
          Cancel
        </button>
      </div>,
    );
    return () => setFooter(null);
  }, [ctx.setFooter, ctx.close]);

  return (
    <>
    <div class="cz-req-detail">

      <DrawerTabs active={tab} onSelect={setTab} />

      {tab === 'details' && (
        <>
          {/* ── Service Level Module: Service Overview ──────────────────────────────── */}
          <ReadBlock
            title="Service Overview"
            subtitle="General information about the service."
            icon={MODULE_ICONS.overview}
            iconVariant="drawerModule__icon--overview"
            scopeClass="drawerOverview service"
            status="pending-dim"
            notes={overviewNotes}
            panelOpen={overviewPanelOpen}
            onTogglePanel={() => setOverviewPanelOpen(o => !o)}
            actions={[{
              id: 'edit',
              label: 'Edit',
              onSelect: () => {
                const desc = localCategories.find(c => c.id === draft.category_id)?.description ?? '';
                setCatDesc(desc);
                setCatDescOriginal(desc);
                setEditing(true);
              },
            }]}
          >
            <div class="drawerModule__fields">
              <div class="drawerModule__field">
                <p class="drawerModule__label">Title</p>
                <p class="drawerModule__value">
                  {draft.title.trim() ? draft.title : 'New Service'}
                </p>
              </div>
              <div class="drawerModule__field">
                <p class="drawerModule__label">Category</p>
                <p class="drawerModule__value">
                  {draft.category_id !== null
                    ? decodeHtml(localCategories.find(c => c.id === draft.category_id)?.name ?? 'Not selected')
                    : 'Not selected'
                  }
                </p>
              </div>
              <div class="drawerModule__field">
                <p class="drawerModule__label">Description</p>
                <p class={`drawerModule__value${draft.content.trim() ? ' drawerModule__value--clamp' : ' drawerModule__value--muted'}`}>
                  {draft.content.trim()
                    ? draft.content
                    : draft.title.trim()
                      ? `Enter a description for the ${draft.title}.`
                      : 'Enter a description for the service.'
                  }
                </p>
              </div>
            </div>
          </ReadBlock>
          {/* ── / Service Level Module: Service Overview ─────────────────────────── */}

          {/* Drawer Principle v1 — Locked state: shell visible, action disabled; modules unavailable until service exists */}
          {/* ── Service Level Module: Included Features ──────────────────────────── */}
          <ReadBlock
            title="Included Features"
            subtitle="Add and manage the features included in this service."
            icon={MODULE_ICONS.features}
            iconVariant="drawerModule__icon--features"
            scopeClass="drawerModule--locked"
            status="pending-dim"
            notes={featuresNotes}
            panelOpen={featuresPanelOpen}
            onTogglePanel={() => setFeaturesPanelOpen(o => !o)}
            actions={[{ id: 'edit', label: 'Edit', disabled: true }]}
          >
            <div class="drawerModule__empty">
              <p class="drawerModule__empty-title">No features</p>
              <p class="drawerModule__empty-copy">
                {draft.title.trim()
                  ? `Add features to the ${draft.title}.`
                  : 'Configure the service to add features.'
                }
              </p>
            </div>
          </ReadBlock>
          {/* ── / Service Level Module: Included Features ────────────────────────── */}

          {/* ── Service Level Module: Common Questions ───────────────────────────── */}
          <ReadBlock
            title="Common Questions"
            subtitle="Add questions and answers for this service."
            icon={MODULE_ICONS.faqs}
            iconVariant="drawerModule__icon--faqs"
            scopeClass="drawerModule--locked"
            status="pending-dim"
            notes={questionsNotes}
            panelOpen={questionsPanelOpen}
            onTogglePanel={() => setQuestionsPanelOpen(o => !o)}
            actions={[{ id: 'edit', label: 'Edit', disabled: true }]}
          >
            <div class="drawerModule__empty">
              <p class="drawerModule__empty-title">No questions added</p>
              <p class="drawerModule__empty-copy">
                {draft.title.trim()
                  ? `Add common questions for the ${draft.title}.`
                  : 'Configure the service to add questions.'
                }
              </p>
            </div>
          </ReadBlock>
          {/* ── / Service Level Module: Common Questions ──────────────────────────── */}
        </>
      )}

      {tab === 'connections' && (
        <>
          {/* Drawer Principle v1 — Locked state: shell visible, action disabled; modules unavailable until service exists */}
          {/* ── Commercial Module: Package Summary ───────────────────────────────── */}
          <ReadBlock
            title="Package Summary"
            subtitle="Pricing and tiers for this service."
            icon={MODULE_ICONS.package}
            scopeClass="drawerModule--locked"
            status="pending-dim"
            notes={packageNotes}
            panelOpen={packagePanelOpen}
            onTogglePanel={() => setPackagePanelOpen(o => !o)}
            actions={[{ id: 'view', label: 'View', disabled: true }]}
          >
            <div class="drawerModule__empty">
              <p class="drawerModule__empty-title">0 tiers configured</p>
              <p class="drawerModule__empty-copy">Pricing and tiers not available.</p>
            </div>
          </ReadBlock>
          {/* ── / Commercial Module: Package Summary ─────────────────────────────── */}

          <CommercialBlock
            label="Promotion Configuration"
            count="0 promotion configured"
            desc="No active promotion."
            status="pending-dim"
          />

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
                  {TIER_KEYS.map((tierId) => (
                    <tr key={tierId}>
                      <td class="cz-sp-tier-table__name">{TIER_LABELS[tierId]}</td>
                      <td />
                      <td />
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>

    {editing && (
      <InlineEditorShell
        title="Create Service"
        onSave={handleSave}
        onCancel={() => { setEditing(false); setSaveErr(null); setCatDesc(catDescOriginal); }}
        saving={saving}
        saveErr={saveErr}
      >
        <ServiceOverviewEditor
          draft={draft}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          categories={localCategories}
          catDescription={catDesc}
          onCatDescriptionChange={setCatDesc}
          onCategoryCreated={(cat) => setLocalCategories(prev => prev.some(c => c.id === cat.id) ? prev : [...prev, cat])}
        />
      </InlineEditorShell>
    )}
    </>
  );
}

// ── Main workstation ──────────────────────────────────────────────────────────

export function ServiceCatalogWorkstation({ refreshKey, openAction }: Props) {
  const { data, loading, error, refetch } = useAdminCatalog();
  const { data: surfacePkgData }          = useSurfacePackages();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [statusFilter, setStatusFilter]     = useState<StatusFilter>('active');

  const packages = surfacePkgData?.packages ?? [];

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  // Default category is All Categories (activeCategory === null). No auto-select.

  const handleViewService = (station: StationSummary) => {
    const item   = buildServiceItemForStationHandoff(station);
    openAction({
      id:       `service-view-${station.id}`,
      mode:     'drawer',
      title:    'Service',
      initialStepData: {
        service:       item,
        packages,
        openAction,
        allCategories: normalizeAdminCategories(data?.categories ?? []),
        onRefresh:     refetch,
      },
      steps: [{ id: 'detail', title: 'Service Detail', component: ServiceViewStep }],
    });
  };

  const handleCreateService = () => {
    openAction({
      id:    'service-create',
      mode:  'drawer',
      title: 'Service',
      initialStepData: {
        packages,
        openAction,
        allCategories: normalizeAdminCategories(data?.categories ?? []),
        onRefresh:     refetch,
      },
      steps: [{ id: 'create', title: 'New Service', component: ServiceCreateStep }],
    });
  };

  if (loading) return <AsyncLoading label="Loading catalog…" />;

  if (error) return <AsyncError error={error} onRetry={refetch} />;

  const allStations   = data?.stations ?? [];
  const totalStations = allStations.length;
  const allCategories = data?.categories ?? [];

  const categoryStations = activeCategory
    ? allStations.filter((s) => s.categories.some((c) => c.slug === activeCategory))
    : allStations;

  const visibleStations = statusFilter === 'all'
    ? categoryStations
    : categoryStations.filter((s) => resolveStationStatus(s) === statusFilter);

  return (
    <Workstation>
      <Workstation.Header className="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Services</h2>
          <p class="cz-ws-subtitle">
            {totalStations} service{totalStations !== 1 ? 's' : ''} across {allCategories.length} categories
            — manage your service library and availability.
          </p>
        </div>
      </Workstation.Header>

      {totalStations === 0 ? (
        <Workstation.Content>
          <div class="cz-admin-empty">
            <p>No services in catalog. Use the import endpoint to load from XLSX.</p>
          </div>
        </Workstation.Content>
      ) : (
        <>
          <Workstation.Toolbar className="cz-sc-filters">
            <div class="cz-tf-field cz-sc-filters__field">
              <label class="cz-tf-label">Browse Category</label>
              <select
                class="cz-tf-select"
                value={activeCategory ?? ''}
                onChange={(e) => setActiveCategory((e.target as HTMLSelectElement).value || null)}
              >
                <option value="">All Categories</option>
                {allCategories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>{decodeHtml(cat.name)}</option>
                ))}
              </select>
            </div>
            <div class="cz-tf-field cz-sc-filters__field">
              <label class="cz-tf-label">Status</label>
              <select
                class="cz-tf-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter((e.target as HTMLSelectElement).value as StatusFilter)}
              >
                {(['active', 'pending', 'drafts', 'disabled', 'all'] as const).map((f) => (
                  <option key={f} value={f}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>
          </Workstation.Toolbar>

          <Workstation.Actions className="cz-sc-section__actions">
            <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={handleCreateService}>
              + New Service
            </button>
          </Workstation.Actions>

          <Workstation.Content>
            <EntityTable
              schema={SERVICE_ENTITY.placements.table!}
              rows={visibleStations.map((station): ServiceCatalogRow => ({
                station,
                summary: resolveStationCommercialSummary(station.id, packages),
              }))}
              rowKey={(r) => r.station.id}
              handlers={{ view: (r) => handleViewService(r.station) }}
            />
          </Workstation.Content>
        </>
      )}
    </Workstation>
  );
}
