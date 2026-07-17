import { useEffect, useState, useCallback, useMemo } from 'preact/hooks';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { AsyncLoading, AsyncError } from '@/components/admin/ui/AsyncSection';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { Category, PricingTierData, ServiceItem, TierId } from '@/api/types/cost-builder';
import { updateServiceCategory } from '@/api/endpoints/admin';
import type { SurfacePackageSummary } from '@/api/types/admin';
import { createService } from '@/admin-station/stations/service';
import type { ServiceDetail, ServiceSummary } from '@/admin-station/stations/service';
import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
import { ReadBlock } from '../ReadBlock';
import { DrawerTabs } from '../DrawerTabs';
import { MODULE_ICONS } from '@/components/admin/schema/icons';
import { Station } from '../shell/Station';
import { InlineEditorShell } from '../InlineEditorShell';
import { ServiceOverviewEditor } from '../editors/ServiceOverviewEditor';
import type { OverviewDraft } from '@/admin-station/stations/service';
import { ServiceViewStep, decodeHtml, TIER_KEYS, TIER_LABELS } from './ServiceViewStep';
import type { StationSurfaceProps } from '../schema/stations';
import type { StationManagerScope } from '../relations/types';
import { DynamicStationManager } from '../relations/DynamicStationManager';
import { usePageManagerShell } from '../relations/usePageManagerShell';
import { buildServiceDetailDrawerConfig } from '../relations/serviceDrawerConfig';
import type { DrawerHostContext } from '../relations/serviceDrawerConfig';
import { buildPackageFamilyDrawerConfig } from '../relations/serviceManagerDrawers';
import { ManagerSubTabs } from '../relations/ManagerSubTabs';
import type { ManagerSubTab } from '../relations/ManagerSubTabs';

type Props = StationSurfaceProps;

// ===========================================================================
// SECTION: SERVICE_CATALOGUE_MODEL
// ===========================================================================
// Filter buckets + the display pill live in utils/moduleStatus (moved in S3b
// so the catalog TableSchema can project them); this file keeps only the
// filter vocabulary.

// ── Category normalization ────────────────────────────────────────────────────
// ServiceCatalogResponse returns id: number | null. Real taxonomy terms always have
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

export function buildServiceItemForStationHandoff(summary: ServiceSummary): ServiceItem {
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
  drafts?: ServiceDetail['drafts'] | null,
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

// ===========================================================================
// SECTION: SERVICE_CREATION
// ===========================================================================

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

          {/* Promotions live inside Station Manager; no Service-level duplicate. */}

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

// ===========================================================================
// SECTION: SERVICE_CATALOGUE_TABLE
// ===========================================================================

function ServiceManagerStart({ onCreateService, onCreateGroup }: {
  onCreateService: () => void;
  onCreateGroup: () => void;
}) {
  return (
    <section class="cz-manager-start" aria-labelledby="cz-manager-start-title">
      <div class="cz-manager-section__title">
        <div>
          <h3 id="cz-manager-start-title">Start new</h3>
          <p>Create catalogue records here; each opens in the existing preview-first drawer.</p>
        </div>
      </div>
      <div class="cz-manager-start__grid">
        <article class="cz-manager-start__card">
          <span class="cz-manager-start__icon" aria-hidden="true">{MODULE_ICONS.overview}</span>
          <div><strong>Service</strong><p>Add a Service, preview its overview, then edit the fields that need content.</p></div>
          <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={onCreateService}>+ New Service</button>
        </article>
        <article class="cz-manager-start__card">
          <span class="cz-manager-start__icon" aria-hidden="true">{MODULE_ICONS.category}</span>
          <div><strong>Service Group</strong><p>Add a family group used to organise Services across this station.</p></div>
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={onCreateGroup}>+ New Group</button>
        </article>
      </div>
    </section>
  );
}

export function ServiceCatalogStation({ refreshKey, openAction, setNavigationInterceptor }: Props) {
  const { data, loading, error, refetch } = useAdminCatalog();
  const { data: surfacePkgData }          = useSurfacePackages();
  const { shell, footer } = usePageManagerShell();
  const [managerRefreshKey, setManagerRefreshKey] = useState(0);
  const [catalogLoadedAt, setCatalogLoadedAt] = useState<Date | null>(null);
  const [emptySubTab, setEmptySubTab] = useState<ManagerSubTab>('settings');

  const packages = surfacePkgData?.packages ?? [];

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  useEffect(() => {
    if (data) setCatalogLoadedAt(new Date());
  }, [data]);

  // `workstation-navigation` is a destination ID, not a symbol — kept verbatim.
  useEffect(() => {
    setNavigationInterceptor?.((proceed) => shell.requestExit({ kind: 'destination', target: 'workstation-navigation' }, proceed));
    return () => setNavigationInterceptor?.(null);
  }, [setNavigationInterceptor, shell.requestExit]);

  const stations = data?.stations ?? [];
  const hostSummary = useMemo(() => {
    const preferredId = packages[0]?.service_refs?.[0];
    return stations.find((station) => station.id === preferredId) ?? stations[0];
  }, [packages, stations]);
  const scope = useMemo<StationManagerScope | null>(() => hostSummary ? ({
    kind: 'connection-graph', stationContext: { type: 'service', id: hostSummary.id },
  }) : null, [hostSummary?.id]);

  const drawerDeps: DrawerHostContext | null = hostSummary ? {
    service: buildServiceItemForStationHandoff(hostSummary),
    packages,
    allCategories: normalizeAdminCategories(data?.categories ?? []),
    openAction,
    onRefresh: refetch,
  } : null;
  const handlePackageFamiliesChanged = useCallback(() => {
    setManagerRefreshKey((current) => current + 1);
  }, []);

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
  const handleCreateGroup = () => openAction(buildPackageFamilyDrawerConfig(undefined, handlePackageFamiliesChanged));
  const startContent = <ServiceManagerStart onCreateService={handleCreateService} onCreateGroup={handleCreateGroup} />;

  if (loading) return <AsyncLoading label="Loading catalog…" />;

  if (error) return <AsyncError error={error} onRetry={refetch} />;

  const totalStations = stations.length;

  return (
    <Station className="cz-service-manager-workstation">
      <Station.Header className="cz-ws-header">
        <div>
          <span class="cz-station-pill">Station Home</span>
          <h2 class="cz-ws-title">Your Service Manager</h2>
          <p class="cz-ws-subtitle">
            The operational dashboard for reading and managing your station data.
          </p>
        </div>
        <div class="cz-station-home__status" role="status" aria-label="Service Station status">
          <span class="cz-station-home__status-dot" aria-hidden="true" />
          <span>Station operational</span>
          <span class="cz-station-home__status-divider" aria-hidden="true" />
          <span>{catalogLoadedAt ? `Updated ${catalogLoadedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : `${totalStations} Services loaded`}</span>
        </div>
      </Station.Header>

      <Station.Content>
        {!hostSummary || !scope || !drawerDeps ? (
          <section class="cz-manager-workspace" aria-label="Your Service Manager">
            <ManagerSubTabs active={emptySubTab} onChange={setEmptySubTab} tabs={['details', 'connections', 'settings']} />
            {emptySubTab === 'settings' ? startContent : (
              <div class="cz-manager-empty">
                <strong>{emptySubTab === 'details' ? 'No Services yet.' : 'No connections yet.'}</strong>
                <p>Open Settings to create the first Service or Service Group.</p>
              </div>
            )}
          </section>
        ) : (
          <DynamicStationManager
            key={`${hostSummary.id}:${managerRefreshKey}`}
            scope={scope}
            shell={shell}
            surface="service-catalog"
            services={stations}
            openAction={openAction}
            settingsStartContent={startContent}
            onManagePackageFamilies={(group) => openAction(buildPackageFamilyDrawerConfig(group, handlePackageFamiliesChanged))}
            onOpenService={(summary, edit) => openAction(buildServiceDetailDrawerConfig(drawerDeps, summary, edit))}
          />
        )}
      </Station.Content>
      {footer && <div class="cz-package-manager-workstation__footer">{footer}</div>}
    </Station>
  );
}
/*
 * FILE INDEX
 *
 * SERVICE_CATALOGUE_MODEL     Status, category, and drawer handoff adapters
 * SERVICE_CREATION            Create-Service drawer and submission flow
 * SERVICE_CATALOGUE_TABLE     Your Service Manager dashboard host and drawer launch
 *
 * Search: SECTION: SERVICE_CATALOGUE_MODEL
 *         SECTION: SERVICE_CREATION
 *         SECTION: SERVICE_CATALOGUE_TABLE
 */
