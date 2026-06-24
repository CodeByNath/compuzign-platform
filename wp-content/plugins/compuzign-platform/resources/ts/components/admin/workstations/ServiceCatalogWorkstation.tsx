import { useEffect, useState, useCallback } from 'preact/hooks';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { Spinner } from '@/components/ui/Spinner';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { Category, PricingTierData, ServiceItem, TierId } from '@/api/types/cost-builder';
import { createService } from '@/api/endpoints/admin';
import type { AdminServiceDetailResponse, StationSummary, SurfacePackageSummary } from '@/api/types/admin';
import { renderModuleStatus } from '@/components/admin/utils/moduleStatus';
import { InlineEditorShell } from '../InlineEditorShell';
import { ServiceOverviewEditor } from '../editors/ServiceOverviewEditor';
import type { OverviewDraft } from '../editors/ServiceOverviewEditor';
import { ServiceViewStep, decodeHtml, CommercialBlock, TIER_KEYS, TIER_LABELS } from './ServiceViewStep';

interface Props {
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
}

// ── Station status ────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'pending' | 'drafts' | 'disabled';
type StationStatus = 'active' | 'pending' | 'drafts' | 'disabled';

const STATION_STATUS_PILL: Record<StationStatus, { cls: string; label: string }> = {
  'active':   { cls: 'cz-status-pill--active',   label: 'Active'   },
  'pending':  { cls: 'cz-status-pill--pending',  label: 'Pending'  },
  'drafts':   { cls: 'cz-status-pill--pending',  label: 'Pending'  },
  'disabled': { cls: 'cz-status-pill--inactive', label: 'Disabled' },
};

function resolveStationStatus(station: StationSummary): StationStatus {
  if (station.platform_status === 'disabled') {
    // Never-published: overview not yet settled — show Pending, not Disabled.
    // Disabled is reserved for services that were once live and explicitly turned off.
    if ((station.module_status as Record<string, string>)?.overview !== 'settled') return 'pending';
    return 'disabled';
  }
  if (station.has_drafts) return 'drafts';
  if (Object.values(station.module_status).some((v) => v === 'pending')) return 'pending';
  return 'active';
}

// ── Category normalization ────────────────────────────────────────────────────
// AdminCatalogResponse returns id: number | null. Real taxonomy terms always have
// integer IDs; null only appears for synthetic "Uncategorised" groupings.
// Filter null-ID entries out before passing to contexts expecting Category[].

type AdminCategory = { id: number | null; name: string; slug: string };

function normalizeAdminCategories(cats: AdminCategory[]): Category[] {
  return cats
    .filter((c): c is { id: number; name: string; slug: string } => c.id !== null)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
}

// ── Drawer handoff adapter ────────────────────────────────────────────────────
// Produces a minimal ServiceItem for opening the existing ServiceViewStep drawer.
// The drawer immediately calls fetchAdminServiceDetail(service.id) on mount and
// loads authoritative data from there. This adapter only carries enough for the
// drawer loading window — do not treat it as a second service model.

function buildServiceItemForStationHandoff(summary: StationSummary): ServiceItem {
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

  const [tab,     setTab]     = useState<'service' | 'commercial'>('service');
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState<OverviewDraft>({
    title:       '',
    excerpt:     '',
    content:     '',
    category_id: null,
  });
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

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
        const newService = buildNewServiceItem(result.service, result.drafts);
        onRefresh?.();
        ctx.close();
        doOpen({
          id:       `service-view-${newService.id}`,
          mode:     'drawer',
          title:    newService.title,
          titleDot: 'var(--admin-error)',
          initialStepData: { service: newService, packages, openAction: doOpen, allCategories, onRefresh },
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
  }, [draft, doOpen, packages, allCategories, onRefresh, ctx]);

  return (
    <>
    <div class="cz-req-detail">

      <div class="cz-sv-tabs">
        <button
          type="button"
          class={`cz-sv-tab${tab === 'service' ? ' cz-sv-tab--active' : ''}`}
          onClick={() => setTab('service')}
        >
          Service
        </button>
        <button
          type="button"
          class={`cz-sv-tab${tab === 'commercial' ? ' cz-sv-tab--active' : ''}`}
          onClick={() => setTab('commercial')}
        >
          Commercial
        </button>
      </div>

      {tab === 'service' && (
        <>
          {/* ── Service Level Module: Service Overview ──────────────────────────────── */}
          <div class="drawerModule drawerOverview service">
            <div class="drawerModule__header">
              <span class="drawerModule__icon drawerModule__icon--overview">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="drawerModule__icon-svg"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
                  <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                </svg>
              </span>
              <div class="drawerModule__heading">
                <p class="drawerModule__title">Service Overview</p>
                <p class="drawerModule__subtitle">General information about your service.</p>
              </div>
              <div class="drawerModule__status drawerModule__status--dim">
                {renderModuleStatus('pending-dim')}
              </div>
            </div>
            <div class="drawerModule__body">
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
                      ? decodeHtml(allCategories.find(c => c.id === draft.category_id)?.name ?? 'Not selected')
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
            </div>
            <div class="drawerModule__footer">
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            </div>
          </div>
          {/* ── / Service Level Module: Service Overview ─────────────────────────── */}

          {/* Drawer Principle v1 — Locked state: shell visible, action disabled; modules unavailable until service exists */}
          {/* ── Service Level Module: Included Features ──────────────────────────── */}
          <div class="drawerModule drawerModule--locked">
            <div class="drawerModule__header">
              <span class="drawerModule__icon drawerModule__icon--features">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="drawerModule__icon-svg"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              </span>
              <div class="drawerModule__heading">
                <p class="drawerModule__title">Included Features</p>
                <p class="drawerModule__subtitle">Add and manage the features included in this service.</p>
              </div>
              <div class="drawerModule__status drawerModule__status--dim">
                {renderModuleStatus('pending-dim')}
              </div>
            </div>
            <div class="drawerModule__body">
              <div class="drawerModule__empty">
                <p class="drawerModule__empty-title">No features</p>
                <p class="drawerModule__empty-copy">
                  {draft.title.trim()
                    ? `Add features to the ${draft.title}.`
                    : 'Configure the service to add features.'
                  }
                </p>
              </div>
            </div>
            <div class="drawerModule__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled>
                Edit
              </button>
            </div>
          </div>
          {/* ── / Service Level Module: Included Features ────────────────────────── */}

          {/* ── Service Level Module: Common Questions ───────────────────────────── */}
          <div class="drawerModule drawerModule--locked">
            <div class="drawerModule__header">
              <span class="drawerModule__icon drawerModule__icon--faqs">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="drawerModule__icon-svg"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
              </span>
              <div class="drawerModule__heading">
                <p class="drawerModule__title">Common Questions</p>
                <p class="drawerModule__subtitle">Add questions and answers for this service.</p>
              </div>
              <div class="drawerModule__status drawerModule__status--dim">
                {renderModuleStatus('pending-dim')}
              </div>
            </div>
            <div class="drawerModule__body">
              <div class="drawerModule__empty">
                <p class="drawerModule__empty-title">No questions added</p>
                <p class="drawerModule__empty-copy">
                  {draft.title.trim()
                    ? `Add common questions for the ${draft.title}.`
                    : 'Configure the service to add questions.'
                  }
                </p>
              </div>
            </div>
            <div class="drawerModule__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled>
                Edit
              </button>
            </div>
          </div>
          {/* ── / Service Level Module: Common Questions ──────────────────────────── */}
        </>
      )}

      {tab === 'commercial' && (
        <>
          <CommercialBlock
            label="Package Summary"
            count="0 tiers configured"
            desc="Pricing and tiers not available."
            status="pending-dim"
          />
          <CommercialBlock
            label="Promotion Configuration"
            count="0 promotion configured"
            desc="No active promotion."
            status="pending-dim"
          />

          <div class="cz-req-detail__section cz-sv-section--no-border">
            <p class="cz-req-detail__section-title">Pricing Summary</p>
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

      <div class="cz-tf-footer">
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={ctx.close}>
          Cancel
        </button>
      </div>
    </div>

    {editing && (
      <InlineEditorShell
        title="Create Service"
        onSave={handleSave}
        onCancel={() => { setEditing(false); setSaveErr(null); }}
        saving={saving}
        saveErr={saveErr}
      >
        <ServiceOverviewEditor
          draft={draft}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          categories={allCategories}
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

  useEffect(() => {
    if (data && activeCategory === null && data.categories.length > 0) {
      setActiveCategory(data.categories[0].slug);
    }
  }, [data]);

  const handleViewService = (station: StationSummary) => {
    const item   = buildServiceItemForStationHandoff(station);
    const svcDot = station.platform_status === 'active'
      ? 'var(--admin-success)'
      : 'var(--admin-error)';
    openAction({
      id:       `service-view-${station.id}`,
      mode:     'drawer',
      title:    station.title,
      titleDot: svcDot,
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
      title: 'New Service',
      initialStepData: {
        packages,
        openAction,
        allCategories: normalizeAdminCategories(data?.categories ?? []),
        onRefresh:     refetch,
      },
      steps: [{ id: 'create', title: 'New Service', component: ServiceCreateStep }],
    });
  };

  if (loading) {
    return (
      <div class="cz-admin-loading">
        <Spinner label="Loading catalog…" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div class="cz-admin-error-msg">{error}</div>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" style="margin-top:12px" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

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
    <div>
      <div class="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Service Catalog</h2>
          <p class="cz-ws-subtitle">
            {totalStations} service{totalStations !== 1 ? 's' : ''} across {allCategories.length} categories
            — manage your service library and availability.
          </p>
        </div>
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={handleCreateService}>
          + New Service
        </button>
      </div>

      {totalStations === 0 ? (
        <div class="cz-admin-empty">
          <p>No services in catalog. Use the import endpoint to load from XLSX.</p>
        </div>
      ) : (
        <>
          <div class="cz-pricing-category-tabs cz-pricing-category-tabs--split">
            <div class="cz-pricing-category-tabs__group">
              {allCategories.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  class={`cz-pricing-tab${activeCategory === cat.slug ? ' cz-pricing-tab--active' : ''}`}
                  onClick={() => { setActiveCategory(cat.slug); setStatusFilter('active'); }}
                >
                  {decodeHtml(cat.name)}
                </button>
              ))}
            </div>
            <div class="cz-pricing-category-tabs__group">
              {(['active', 'pending', 'drafts', 'disabled', 'all'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  class={`cz-pricing-tab${statusFilter === f ? ' cz-pricing-tab--active' : ''}`}
                  onClick={() => setStatusFilter(f)}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {visibleStations.length === 0 ? (
            <div class="cz-admin-empty">
              <p>No services match the current filter.</p>
            </div>
          ) : (
            <div class="cz-ws-card" style="padding:0;overflow:hidden">
              <div class="cz-sc-table-wrap">
                <table class="cz-sc-table">
                  <thead>
                    <tr>
                      <th class="cz-sc-table__service">Service</th>
                      <th class="cz-sc-table__status">Status</th>
                      <th class="cz-sc-table__actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStations.map((station) => {
                      const st   = resolveStationStatus(station);
                      const pill = STATION_STATUS_PILL[st];
                      return (
                        <tr key={station.id}>
                          <td class="cz-sc-table__service cz-sc-table__name">{station.title}</td>
                          <td class="cz-sc-table__status">
                            <span class={`cz-status-pill ${pill.cls}`}>{pill.label}</span>
                          </td>
                          <td class="cz-sc-table__actions">
                            <button
                              type="button"
                              class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                              onClick={() => handleViewService(station)}
                            >
                              View
                            </button>
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
      )}
    </div>
  );
}
