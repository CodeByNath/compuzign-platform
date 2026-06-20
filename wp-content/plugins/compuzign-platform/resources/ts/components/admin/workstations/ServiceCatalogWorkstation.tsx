import { useEffect, useState, useCallback } from 'preact/hooks';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { Spinner } from '@/components/ui/Spinner';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { Category, CostBuilderResponse, PricingTierData, ServiceItem, TierId } from '@/api/types/cost-builder';
import { createService } from '@/api/endpoints/admin';
import type { AdminServiceDetailResponse, SurfacePackageSummary } from '@/api/types/admin';
import { renderModuleStatus, resolveServiceStationRowSummary, STATUS_PILL_MAP } from '@/components/admin/utils/moduleStatus';
import { InlineEditorShell } from '../InlineEditorShell';
import { ServiceOverviewEditor } from '../editors/ServiceOverviewEditor';
import type { OverviewDraft } from '../editors/ServiceOverviewEditor';
import { ServiceViewStep, decodeHtml, CommercialBlock, TIER_KEYS, TIER_LABELS } from './ServiceViewStep';

interface Props {
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
}

function buildNewServiceItem(
  data: { id: number; title: string; slug: string; platform_status: string; module_status: Record<string, string> },
  drafts?: AdminServiceDetailResponse['drafts'] | null,
): ServiceItem {
  const ov = drafts?.overview;
  return {
    id:         data.id,
    title:      ov?.title   ?? data.title,
    slug:       data.slug,
    excerpt:    ov?.excerpt ?? '',
    content:    ov?.content ?? '',
    categories: [],
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
  const allCategories = ctx.stepData.allCategories as Category[] ?? [];
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
          <div class="cz-req-detail__section cz-sv-section--no-border">
            <div class="cz-sv-module">
              <div class="cz-sv-module-header">
                <p class="cz-req-detail__section-title">Service Overview</p>
                <div>
                  <span class="cz-sv-overview-block__status" style="opacity:0.45">
                    {renderModuleStatus('pending-dim')}
                  </span>
                </div>
              </div>
              <div class="cz-sv-module-body">
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Title</span>
                  <p class="cz-sv-overview-block__value">
                    {draft.title.trim() ? draft.title : 'New Service'}
                  </p>
                </div>
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Category</span>
                  <span class="cz-sv-overview-block__value">
                    {draft.category_id !== null
                      ? decodeHtml(allCategories.find(c => c.id === draft.category_id)?.name ?? 'Not selected')
                      : 'Not selected'
                    }
                  </span>
                </div>
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Description</span>
                  <p class="cz-sv-overview-block__desc">
                    {draft.content.trim()
                      ? draft.content
                      : draft.title.trim()
                        ? `Enter a description for the ${draft.title}.`
                        : 'Enter a description for the service.'
                    }
                  </p>
                </div>
              </div>
              <div class="cz-sv-module-footer">
                <button
                  type="button"
                  class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                  onClick={() => setEditing(true)}
                >
                  ✎ Edit
                </button>
              </div>
            </div>
          </div>
          {/* ── / Service Level Module: Service Overview ─────────────────────────── */}

          {/* Drawer Principle v1 — Locked state: shell visible, action disabled; modules unavailable until service exists */}
          {/* ── Service Level Module: Included Features ──────────────────────────── */}
          <div class="cz-req-detail__section cz-sv-section--no-border">
            <div class="cz-sv-module cz-sv-module--locked">
              <div class="cz-sv-module-header">
                <p class="cz-req-detail__section-title">Included Features</p>
                <div>
                  <span class="cz-sv-overview-block__status" style="opacity:0.45">
                    {renderModuleStatus('pending-dim')}
                  </span>
                </div>
              </div>
              <div class="cz-sv-module-body">
                <div class="cz-sv-overview-block__identity">
                  <p class="cz-sv-overview-block__name">No features</p>
                  <p class="cz-sv-overview-block__excerpt">
                    {draft.title.trim()
                      ? `Add features to the ${draft.title}.`
                      : 'Configure the service to add features.'
                    }
                  </p>
                </div>
              </div>
              <div class="cz-sv-module-footer">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled>
                  ✎ Edit
                </button>
              </div>
            </div>
          </div>
          {/* ── / Service Level Module: Included Features ────────────────────────── */}

          {/* ── Service Level Module: Common Questions ───────────────────────────── */}
          <div class="cz-req-detail__section">
            <div class="cz-sv-module cz-sv-module--locked">
              <div class="cz-sv-module-header">
                <p class="cz-req-detail__section-title">Common Questions</p>
                <div>
                  <span class="cz-sv-overview-block__status" style="opacity:0.45">
                    {renderModuleStatus('pending-dim')}
                  </span>
                </div>
              </div>
              <div class="cz-sv-module-body">
                <div class="cz-sv-overview-block__identity">
                  <p class="cz-sv-overview-block__name">No questions added</p>
                  <p class="cz-sv-overview-block__excerpt">
                    {draft.title.trim()
                      ? `Add common questions for the ${draft.title}.`
                      : 'Configure the service to add questions.'
                    }
                  </p>
                </div>
              </div>
              <div class="cz-sv-module-footer">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled>
                  ✎ Edit
                </button>
              </div>
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
  const { data, loading, error, refetch } = useCostBuilder();
  const { data: surfacePkgData }          = useSurfacePackages();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const packages = surfacePkgData?.packages ?? [];

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  useEffect(() => {
    const resp = data as CostBuilderResponse | null;
    if (resp && activeCategory === null && resp.categories.length > 0) {
      setActiveCategory(resp.categories[0].slug);
    }
  }, [data]);

  const handleViewService = (service: ServiceItem) => {
    const svcActive = service.meta?.platform_status === 'active';
    openAction({
      id:       `service-view-${service.id}`,
      mode:     'drawer',
      title:    service.title,
      titleDot: `var(--admin-${svcActive ? 'success' : 'error'})`,
      initialStepData: {
        service,
        packages,
        openAction,
        allCategories: resp?.categories ?? [],
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
        allCategories: resp?.categories ?? [],
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

  const resp          = data as CostBuilderResponse | null;
  const allServices   = resp?.services_by_category.flatMap((g) => g.services) ?? [];
  const totalServices = allServices.length;

  const activeGroup = resp?.services_by_category.find((g) => g.category_slug === activeCategory)
    ?? resp?.services_by_category[0];
  const services: ServiceItem[] = activeGroup?.services ?? [];

  return (
    <div>
      <div class="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Service Catalog</h2>
          <p class="cz-ws-subtitle">
            {totalServices} service{totalServices !== 1 ? 's' : ''} across {resp?.categories.length ?? 0} categories
            — manage your service library and availability.
          </p>
        </div>
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={handleCreateService}>
          + New Service
        </button>
      </div>

      {totalServices === 0 ? (
        <div class="cz-admin-empty">
          <p>No services in catalog. Use the import endpoint to load from XLSX.</p>
        </div>
      ) : (
        <>
          {/* ── Service Browse Step ──────────────────────────────────────────────── */}
          {/* ── Category tabs ── */}
          <div class="cz-pricing-category-tabs">
            {(resp?.categories ?? []).map((cat) => (
              <button
                key={cat.slug}
                type="button"
                class={`cz-pricing-tab${activeCategory === cat.slug ? ' cz-pricing-tab--active' : ''}`}
                onClick={() => setActiveCategory(cat.slug)}
              >
                {decodeHtml(cat.name)}
              </button>
            ))}
          </div>

          {/* ── Service table ── */}
          {services.length === 0 ? (
            <div class="cz-admin-empty">
              <p>No services in this category yet.</p>
            </div>
          ) : (
            <div class="cz-ws-card" style="padding:0;overflow:hidden">
              <div class="cz-sc-table-wrap">
                <table class="cz-sc-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Basic</th>
                      <th>Standard</th>
                      <th>Premium</th>
                      <th>Enterprise</th>
                      <th class="cz-sc-table__popular">Popular</th>
                      <th style="text-align:center">Status</th>
                      <th class="cz-sc-table__actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => {
                      // Cast needed: overlay removes disabled tier keys at runtime
                      // despite Record<TierId, PricingTierData> typing.
                      const tiers       = service.pricing?.tiers as Partial<Record<TierId, PricingTierData>> | undefined;
                      const popularTier = service.meta?.popular_tier ?? null;
                      const row         = resolveServiceStationRowSummary(service);
                      const hasPackage  = packages.some((p) => p.service_refs.includes(service.id));
                      const fmtPrice    = (v: number | null | undefined) =>
                        v != null ? `$${v.toLocaleString()}` : '—';

                      const tierCell = (tierId: TierId) => {
                        const data = tiers?.[tierId];
                        if (hasPackage && !data) {
                          return <span class="cz-status-pill cz-status-pill--inactive">Off</span>;
                        }
                        if (data?.price != null) {
                          return <span class="cz-price-tag cz-price-tag--has-price">{fmtPrice(data.price)}</span>;
                        }
                        if (hasPackage) {
                          return <span class="cz-price-tag">Contact</span>;
                        }
                        return <span class="cz-price-tag">—</span>;
                      };

                      return (
                        <tr key={service.id}>
                          <td class="cz-sc-table__name">{service.title}</td>
                          <td class="cz-sc-table__price">{tierCell('basic')}</td>
                          <td class="cz-sc-table__price">{tierCell('standard')}</td>
                          <td class="cz-sc-table__price">{tierCell('premium')}</td>
                          <td class="cz-sc-table__price">{tierCell('enterprise')}</td>
                          <td class="cz-sc-table__popular">
                            {popularTier ? (
                              <span class="cz-tier-badge cz-tier-badge--popular">
                                {TIER_LABELS[popularTier] ?? popularTier}
                              </span>
                            ) : (
                              <span style="color:var(--admin-text-faint);font-size:12px">—</span>
                            )}
                          </td>
                          <td style="text-align:center">
                            <span class={`cz-status-pill ${STATUS_PILL_MAP[row.resolvedStatus]?.cls ?? 'cz-status-pill--inactive'}`}>
                              {STATUS_PILL_MAP[row.resolvedStatus]?.label ?? 'Inactive'}
                            </span>
                          </td>
                          <td style="text-align:right">
                            <button
                              type="button"
                              class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                              onClick={() => handleViewService(service)}
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
          {/* ── / Service Browse Step ────────────────────────────────────────────── */}
        </>
      )}
    </div>
  );
}
