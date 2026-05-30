import { useEffect, useState } from 'preact/hooks';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { Spinner } from '@/components/ui/Spinner';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { CostBuilderResponse, ServiceItem, TierId } from '@/api/types/cost-builder';
import { fetchSurfacePackageDetail } from '@/api/endpoints/admin';
import type { SurfacePackageDetailResponse, SurfacePackageSummary } from '@/api/types/admin';
import { TierManageStep } from './SurfacePackagesWorkstation';

interface Props {
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function decodeHtml(s: string): string {
  if (typeof document === 'undefined') return s;
  const el = document.createElement('textarea');
  el.innerHTML = s;
  return el.value;
}

const TIER_KEYS: TierId[] = ['basic', 'standard', 'premium', 'enterprise'];

const TIER_LABELS: Record<string, string> = {
  basic: 'Basic', standard: 'Standard', premium: 'Premium', enterprise: 'Enterprise',
};

// ── PackageTierSelectStep ─────────────────────────────────────────────────────
// Step 1 of the 2-step "Manage Surface Package" drawer.
// Fetches package detail using packageId from stepData so it is self-sufficient
// regardless of how stepData was initialised (avoids batched-render state issues).

function PackageTierSelectStep({ ctx }: { ctx: StepContext }) {
  const packageId = ctx.stepData.packageId as number;

  const [detail, setDetail]   = useState<SurfacePackageDetailResponse | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    fetchSurfacePackageDetail(packageId)
      .then(setDetail)
      .catch((err: unknown) => {
        setLoadErr(err instanceof Error ? err.message : 'Failed to load package.');
      });
  }, [packageId]);

  if (!detail && !loadErr) {
    return <div class="cz-action-progress"><Spinner label="Loading package…" /></div>;
  }

  if (loadErr || !detail) {
    return <div class="cz-admin-error-msg">{loadErr ?? 'Package data unavailable.'}</div>;
  }

  const pkg = detail.package;

  const handleManage = (tierId: string) => {
    const tier = pkg.tiers[tierId];
    ctx.setStepData('tierId', tierId);
    ctx.setStepData('isNew', false);
    ctx.setStepData('currentEnabled', tier?.enabled ?? true);
    ctx.goNext();
  };

  return (
    <div>
      <p style="margin:0 0 var(--cz-space-4);font-size:var(--cz-font-size-sm);color:var(--admin-text-muted)">
        Select a tier to configure.
      </p>

      <div class="cz-sp-tier-table-wrap">
        <table class="cz-sp-tier-table">
          <thead>
            <tr>
              <th>Tier</th>
              <th>Price</th>
              <th>Cycle</th>
              <th class="cz-sp-tier-table__center">Inclusions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {TIER_KEYS.map((tierId) => {
              const tier        = pkg.tiers[tierId];
              const isPopular   = pkg.popular_tier === tierId;
              const tierEnabled = tier?.enabled ?? true;
              const displayLbl  = (tier?.label && tier.label !== '') ? tier.label : TIER_LABELS[tierId];
              const incCount    = tier?.inclusions_override?.length ?? 0;

              return (
                <tr key={tierId} class={!tierEnabled ? 'cz-sp-tier-row--disabled' : ''}>
                  <td class="cz-sp-tier-table__name">
                    <div class="cz-sp-tier-table__name-inner">
                      <span>{displayLbl}</span>
                      {isPopular && (
                        <span class="cz-tier-badge cz-tier-badge--popular">Popular</span>
                      )}
                      {!tierEnabled && (
                        <span class="cz-status-pill cz-status-pill--inactive">Off</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span class={`cz-price-tag${tier?.price != null ? ' cz-price-tag--has-price' : ''}`}>
                      {tier?.price != null ? `$${tier.price.toLocaleString()}` : '—'}
                    </span>
                  </td>
                  <td class="cz-sp-tier-table__muted">{tier?.billing_cycle ?? '—'}</td>
                  <td class="cz-sp-tier-table__center cz-sp-tier-table__muted">
                    {incCount > 0 ? incCount : '—'}
                  </td>
                  <td class="cz-sp-tier-table__actions">
                    <button
                      type="button"
                      class="cz-admin-btn cz-admin-btn--ghost cz-admin-btn--sm"
                      onClick={() => handleManage(tierId)}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div class="cz-action-shell__footer">
        <button type="button" class="cz-admin-btn cz-admin-btn--ghost" onClick={ctx.close}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── ServiceViewStep ───────────────────────────────────────────────────────────
// Read-only Service Core detail. Surfaces the related Surface Package (if any)
// and bridges to tier management via "Manage Surface Package".

function ServiceViewStep({ ctx }: { ctx: StepContext }) {
  const service  = ctx.stepData.service  as ServiceItem;
  const packages = ctx.stepData.packages as SurfacePackageSummary[];
  const doOpen   = ctx.stepData.openAction as (config: ActionConfig) => void;

  const relatedPkg = packages.find((p) => p.service_refs.includes(service.id)) ?? null;

  const inclusions = service.inclusions ?? [];
  const faqs       = service.faqs ?? [];
  const tiers      = service.pricing?.tiers;
  const isActive   = service.meta?.is_active !== false;

  const handleManageSurfacePkg = () => {
    if (!relatedPkg) return;
    ctx.close();
    doOpen({
      id:    `pkg-tiers-${relatedPkg.post_id}`,
      mode:  'drawer',
      title: relatedPkg.title,
      initialStepData: {
        packageId:      relatedPkg.post_id,
        tierId:         null,
        isNew:          false,
        currentEnabled: true,
      },
      steps: [
        { id: 'tier-select', title: 'Select Tier', component: PackageTierSelectStep },
        { id: 'tier-form',   title: 'Edit Tier',   component: TierManageStep        },
      ],
    });
  };

  return (
    <div class="cz-req-detail">

      {/* ── Section 1: Service Core ────────────────────────────────────── */}
      <div class="cz-req-detail__section">
        <p class="cz-req-detail__section-title">Service Core</p>
        <div class="cz-req-contact-grid">
          <div class="cz-req-contact-grid__item">
            <span class="cz-req-contact-grid__label">Status</span>
            <span class="cz-req-contact-grid__value">
              <span class={`cz-status-pill cz-status-pill--${isActive ? 'active' : 'inactive'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </span>
          </div>
          <div class="cz-req-contact-grid__item">
            <span class="cz-req-contact-grid__label">Category</span>
            <span class="cz-req-contact-grid__value">
              {service.categories.map((c) => decodeHtml(c.name)).join(', ') || '—'}
            </span>
          </div>
          <div class="cz-req-contact-grid__item">
            <span class="cz-req-contact-grid__label">Billing cycle</span>
            <span class="cz-req-contact-grid__value">{service.meta?.billing_cycle ?? '—'}</span>
          </div>
          {service.meta?.popular_tier && (
            <div class="cz-req-contact-grid__item">
              <span class="cz-req-contact-grid__label">Popular tier</span>
              <span class="cz-req-contact-grid__value">
                <span class="cz-tier-badge cz-tier-badge--popular">
                  {TIER_LABELS[service.meta.popular_tier] ?? service.meta.popular_tier}
                </span>
              </span>
            </div>
          )}
        </div>

        {service.excerpt && (
          <div style="margin-top:var(--cz-space-3)">
            <p class="cz-req-contact-grid__label" style="margin-bottom:4px">Short description</p>
            <p style="margin:0;font-size:var(--cz-font-size-sm);color:var(--admin-text);line-height:1.6">
              {service.excerpt}
            </p>
          </div>
        )}

        {service.content && (
          <div style="margin-top:var(--cz-space-3)">
            <p class="cz-req-contact-grid__label" style="margin-bottom:4px">Long description</p>
            <p style="margin:0;font-size:var(--cz-font-size-sm);color:var(--admin-text-muted);line-height:1.6">
              {service.content}
            </p>
          </div>
        )}
      </div>

      {/* ── Section 2: Inclusion pool ──────────────────────────────────── */}
      {inclusions.length > 0 && (
        <div class="cz-req-detail__section">
          <p class="cz-req-detail__section-title">
            Inclusions pool
            <span style="font-weight:400;color:var(--admin-text-faint);margin-left:6px">
              {inclusions.length} canonical
            </span>
          </p>
          <div class="cz-sc-inclusion-pool">
            {inclusions.map((inc) => (
              <span key={inc.id} class="cz-tf-chip">{inc.label}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 3: FAQ pool ────────────────────────────────────────── */}
      {faqs.length > 0 && (
        <div class="cz-req-detail__section">
          <p class="cz-req-detail__section-title">
            FAQ pool
            <span style="font-weight:400;color:var(--admin-text-faint);margin-left:6px">
              {faqs.length} entries
            </span>
          </p>
          <div class="cz-sc-faq-list">
            {faqs.map((faq) => (
              <div key={faq.id} class="cz-sc-faq-item">
                <p class="cz-sc-faq-item__q">{faq.question}</p>
                {faq.answer && <p class="cz-sc-faq-item__a">{faq.answer}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 4: Tier reference ──────────────────────────────────── */}
      {tiers && (
        <div class="cz-req-detail__section">
          <p class="cz-req-detail__section-title">Tier pricing reference</p>
          <p style="margin:0 0 var(--cz-space-2);font-size:11px;color:var(--admin-text-faint)">
            Reflects active Surface Package overlay where applicable. Authoring is in Surface Packages.
          </p>
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
                  const tier = tiers[tierId];
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
                        {tier?.features?.length ? tier.features.length : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Section 5: Surface Package ────────────────────────────────── */}
      <div class="cz-req-detail__section">
        <p class="cz-req-detail__section-title">Surface Package</p>

        {relatedPkg ? (
          <div class="cz-sc-pkg-block">
            <div class="cz-sc-pkg-block__meta">
              <div>
                <p class="cz-sc-pkg-block__title">{relatedPkg.title}</p>
                <p class="cz-sc-pkg-block__stats">
                  {TIER_KEYS.filter((t) => relatedPkg.tiers[t]).length} tier{TIER_KEYS.filter((t) => relatedPkg.tiers[t]).length !== 1 ? 's' : ''} configured
                  {relatedPkg.popular_tier && (
                    <> · popular: {TIER_LABELS[relatedPkg.popular_tier] ?? relatedPkg.popular_tier}</>
                  )}
                </p>
              </div>
              <span class={`cz-status-pill cz-status-pill--${relatedPkg.post_status === 'publish' ? 'active' : 'inactive'}`}>
                {relatedPkg.post_status === 'publish' ? 'Active' : 'Disabled'}
              </span>
            </div>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary"
              style="margin-top:var(--cz-space-3)"
              onClick={handleManageSurfacePkg}
            >
              Manage Surface Package
            </button>
          </div>
        ) : (
          <div class="cz-sc-pkg-block cz-sc-pkg-block--empty">
            <p class="cz-sc-pkg-block__empty-msg">
              No Surface Package has been created for this service yet.
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div class="cz-action-shell__footer">
        <button type="button" class="cz-admin-btn cz-admin-btn--ghost" onClick={ctx.close}>
          Close
        </button>
      </div>
    </div>
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
    openAction({
      id:    `service-view-${service.id}`,
      mode:  'drawer',
      title: service.title,
      initialStepData: {
        service,
        packages,
        openAction,
      },
      steps: [{ id: 'detail', title: 'Service Detail', component: ServiceViewStep }],
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
      </div>

      {totalServices === 0 ? (
        <div class="cz-admin-empty">
          <p>No services in catalog. Use the import endpoint to load from XLSX.</p>
        </div>
      ) : (
        <>
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
                      <th>Cycle</th>
                      <th style="text-align:right">Basic</th>
                      <th style="text-align:right">Standard</th>
                      <th style="text-align:right">Premium</th>
                      <th style="text-align:right">Enterprise</th>
                      <th style="text-align:center">Popular</th>
                      <th style="text-align:center">Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => {
                      const tiers      = service.pricing?.tiers;
                      const popularTier = service.meta?.popular_tier ?? null;
                      const isActive   = service.meta?.is_active !== false;
                      const fmtPrice   = (v: number | null | undefined) =>
                        v != null ? `$${v.toLocaleString()}` : '—';

                      return (
                        <tr key={service.id}>
                          <td class="cz-sc-table__name">{service.title}</td>
                          <td style="color:var(--admin-text-muted);font-size:12px">
                            {service.meta?.billing_cycle ?? '—'}
                          </td>
                          <td class="cz-sc-table__price">
                            <span class={`cz-price-tag${tiers?.basic?.price != null ? ' cz-price-tag--has-price' : ''}`}>
                              {fmtPrice(tiers?.basic?.price)}
                            </span>
                          </td>
                          <td class="cz-sc-table__price">
                            <span class={`cz-price-tag${tiers?.standard?.price != null ? ' cz-price-tag--has-price' : ''}`}>
                              {fmtPrice(tiers?.standard?.price)}
                            </span>
                          </td>
                          <td class="cz-sc-table__price">
                            <span class={`cz-price-tag${tiers?.premium?.price != null ? ' cz-price-tag--has-price' : ''}`}>
                              {fmtPrice(tiers?.premium?.price)}
                            </span>
                          </td>
                          <td class="cz-sc-table__price">
                            <span class={`cz-price-tag${tiers?.enterprise?.price != null ? ' cz-price-tag--has-price' : ''}`}>
                              {fmtPrice(tiers?.enterprise?.price)}
                            </span>
                          </td>
                          <td style="text-align:center">
                            {popularTier ? (
                              <span class="cz-tier-badge cz-tier-badge--popular">
                                {TIER_LABELS[popularTier] ?? popularTier}
                              </span>
                            ) : (
                              <span style="color:var(--admin-text-faint);font-size:12px">—</span>
                            )}
                          </td>
                          <td style="text-align:center">
                            <span class={`cz-status-pill cz-status-pill--${isActive ? 'active' : 'inactive'}`}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style="text-align:right">
                            <button
                              type="button"
                              class="cz-admin-btn cz-admin-btn--ghost cz-admin-btn--sm"
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
        </>
      )}
    </div>
  );
}
