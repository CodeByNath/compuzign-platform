import { useEffect, useState, useCallback } from 'preact/hooks';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { Spinner } from '@/components/ui/Spinner';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { Category, CostBuilderResponse, PricingTierData, ServiceItem, TierId } from '@/api/types/cost-builder';
import {
  createService,
  fetchSurfacePackageDetail,
  updateServiceFaqs,
  updateServiceInclusions,
  updateServiceOverview,
  updateServiceStatus,
} from '@/api/endpoints/admin';
import type { SurfacePackageDetailResponse, SurfacePackageSummary, PromotionTier } from '@/api/types/admin';
import { TierManageStep } from './SurfacePackagesWorkstation';
import { PromotionViewStep } from './PromotionsWorkstation';
import { InlineEditorShell } from '../InlineEditorShell';
import { ServiceOverviewEditor, initOverviewDraft } from '../editors/ServiceOverviewEditor';
import type { OverviewDraft } from '../editors/ServiceOverviewEditor';
import { ServiceInclusionsEditor, initInclusionsDraft } from '../editors/ServiceInclusionsEditor';
import type { InclusionsDraft } from '../editors/ServiceInclusionsEditor';
import { ServiceFaqsEditor, initFaqsDraft } from '../editors/ServiceFaqsEditor';
import type { FaqsDraft } from '../editors/ServiceFaqsEditor';

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

function buildNewServiceItem(data: {
  id: number; title: string; slug: string;
  excerpt: string; content: string;
  categories: Array<{ id: number; name: string; slug: string }>;
}): ServiceItem {
  return {
    id:         data.id,
    title:      data.title,
    slug:       data.slug,
    excerpt:    data.excerpt,
    content:    data.content,
    categories: data.categories,
    inclusions: [],
    faqs:       [],
    availability: { is_available: true, message: '' },
    meta: {
      short_description: '',
      long_description:  '',
      billing_cycle:     '',
      sla:               '',
      uptime:            '',
      notes:             '',
      popular_tier:      null,
      popular_label:     null,
      sort_order:        0,
      is_active:         true,
    },
    pricing: {
      tiers:  {} as Record<TierId, PricingTierData>,
      bundle: { title: '', description: '', price: null },
    },
    promotion_tiers: [],
  };
}

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
        Choose a tier to edit.
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
                      class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
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

      <div class="cz-tf-footer">
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={ctx.close}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── PromoSelectStep ───────────────────────────────────────────────────────────
// Step 1 of the 2-step "Promotion Configuration" drawer opened from ServiceViewStep.

function PromoSelectStep({ ctx }: { ctx: StepContext }) {
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
    return <div class="cz-action-progress"><Spinner label="Loading promotions…" /></div>;
  }

  if (loadErr || !detail) {
    return <div class="cz-admin-error-msg">{loadErr ?? 'Package data unavailable.'}</div>;
  }

  const promos = detail.package.promotion_tiers ?? [];

  const handleManage = (promo: PromotionTier) => {
    ctx.setStepData('promoId', promo.id);
    ctx.setStepData('promo', promo);
    ctx.setStepData('isNew', false);
    ctx.goNext();
  };

  return (
    <div>
      <p style="margin:0 0 var(--cz-space-4);font-size:var(--admin-fs-label);color:var(--admin-text-muted)">
        Choose a promotion to edit.
      </p>

      {promos.length === 0 ? (
        <p class="cz-sc-pkg-block__empty-msg">
          No promotions configured for this service. Add from the Promotions workstation.
        </p>
      ) : (
        <div class="cz-promo-table-wrap">
          <table class="cz-promo-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Based On</th>
                <th>Price</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {promos.map((promo) => (
                <tr key={promo.id} class={promo.status === 'archived' ? 'cz-promo-row--archived' : ''}>
                  <td class="cz-promo-table__name">
                    <div class="cz-promo-table__name-inner">
                      <span>{promo.name || '(unnamed)'}</span>
                      {promo.badge && <span class="cz-tier-badge">{promo.badge}</span>}
                    </div>
                  </td>
                  <td class="cz-promo-table__muted">
                    {promo.based_on ? (TIER_LABELS[promo.based_on] ?? promo.based_on) : '—'}
                  </td>
                  <td>
                    <span class={`cz-price-tag${promo.price !== null ? ' cz-price-tag--has-price' : ''}`}>
                      {promo.price !== null ? `$${promo.price.toLocaleString()}` : '—'}
                    </span>
                  </td>
                  <td>
                    <span class={`cz-status-pill cz-status-pill--${promo.status}`}>
                      {promo.status.charAt(0).toUpperCase() + promo.status.slice(1)}
                    </span>
                  </td>
                  <td class="cz-promo-table__actions">
                    <button
                      type="button"
                      class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                      onClick={() => handleManage(promo)}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div class="cz-tf-footer">
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={ctx.close}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── ServiceViewStep ───────────────────────────────────────────────────────────
// Tabbed service detail drawer.
// Service tab  → Water Layer:  overview, description, features, FAQs.
// Commercial tab → Surface Layer: tier config, promo config, pricing summary.

function ServiceViewStep({ ctx }: { ctx: StepContext }) {
  const service      = ctx.stepData.service      as ServiceItem;
  const packages     = ctx.stepData.packages     as SurfacePackageSummary[];
  const doOpen       = ctx.stepData.openAction   as (config: ActionConfig) => void;
  const allCategories = ctx.stepData.allCategories as Category[] ?? [];
  const onRefresh    = ctx.stepData.onRefresh    as (() => void) | undefined;

  const [tab, setTab] = useState<'service' | 'commercial'>('service');

  const [editingSection,   setEditingSection]   = useState<'overview' | 'inclusions' | 'faqs' | null>(null);
  const [overviewDraft,    setOverviewDraft]    = useState<OverviewDraft | null>(null);
  const [inclusionsDraft,  setInclusionsDraft]  = useState<InclusionsDraft | null>(null);
  const [faqsDraft,        setFaqsDraft]        = useState<FaqsDraft | null>(null);
  const [saving,           setSaving]           = useState(false);
  const [saveErr,          setSaveErr]          = useState<string | null>(null);
  const [saveOk,           setSaveOk]           = useState(false);
  const [statusSaving,     setStatusSaving]     = useState(false);

  useEffect(() => {
    if (!saveOk) return;
    const t = setTimeout(() => setSaveOk(false), 3000);
    return () => clearTimeout(t);
  }, [saveOk]);

  const isActive = service.meta?.is_active !== false;

  const handleToggleActive = useCallback(async () => {
    setStatusSaving(true);
    try {
      const result = await updateServiceStatus(service.id, { is_active: !isActive });
      if (result.success) {
        ctx.setStepData('service', {
          ...service,
          meta: { ...service.meta, is_active: result.service.is_active },
        });
        onRefresh?.();
      }
    } finally {
      setStatusSaving(false);
    }
  }, [service, isActive, ctx, onRefresh]);

  const handlePublishService = useCallback(async () => {
    setStatusSaving(true);
    try {
      const result = await updateServiceStatus(service.id, { is_active: true, post_status: 'publish' });
      if (result.success) {
        ctx.setStepData('service', {
          ...service,
          meta: { ...service.meta, is_active: result.service.is_active },
        });
        onRefresh?.();
      }
    } finally {
      setStatusSaving(false);
    }
  }, [service, ctx, onRefresh]);

  const openOverviewEditor = useCallback(() => {
    setOverviewDraft(initOverviewDraft(service));
    setEditingSection('overview');
    setSaveErr(null);
  }, [service]);

  const openInclusionsEditor = useCallback(() => {
    setInclusionsDraft(initInclusionsDraft(service));
    setEditingSection('inclusions');
    setSaveErr(null);
  }, [service]);

  const openFaqsEditor = useCallback(() => {
    setFaqsDraft(initFaqsDraft(service));
    setEditingSection('faqs');
    setSaveErr(null);
  }, [service]);

  const handleCancelEdit = useCallback(() => {
    setEditingSection(null);
    setOverviewDraft(null);
    setInclusionsDraft(null);
    setFaqsDraft(null);
    setSaveErr(null);
  }, []);

  const handleSaveOverview = useCallback(async () => {
    if (!overviewDraft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const result = await updateServiceOverview(service.id, {
        title:        overviewDraft.title,
        excerpt:      overviewDraft.excerpt,
        content:      overviewDraft.content,
        category_ids: overviewDraft.category_id !== null ? [overviewDraft.category_id] : [],
      });
      if (result.success) {
        ctx.setStepData('service', {
          ...service,
          title:      result.service.title,
          excerpt:    result.service.excerpt,
          content:    result.service.content,
          categories: result.service.categories,
        });
        onRefresh?.();
        setEditingSection(null);
        setOverviewDraft(null);
        setSaveOk(true);
      } else {
        setSaveErr('Failed to save changes.');
      }
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }, [overviewDraft, service, ctx, onRefresh]);

  const handleSaveInclusions = useCallback(async () => {
    if (!inclusionsDraft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const result = await updateServiceInclusions(service.id, {
        inclusions: inclusionsDraft.items,
      });
      if (result.success) {
        ctx.setStepData('service', { ...service, inclusions: result.inclusions });
        onRefresh?.();
        setEditingSection(null);
        setInclusionsDraft(null);
        setSaveOk(true);
      } else {
        setSaveErr('Failed to save inclusions.');
      }
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }, [inclusionsDraft, service, ctx, onRefresh]);

  const handleSaveFaqs = useCallback(async () => {
    if (!faqsDraft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const result = await updateServiceFaqs(service.id, {
        faqs: faqsDraft.items,
      });
      if (result.success) {
        ctx.setStepData('service', { ...service, faqs: result.faqs });
        onRefresh?.();
        setEditingSection(null);
        setFaqsDraft(null);
        setSaveOk(true);
      } else {
        setSaveErr('Failed to save FAQs.');
      }
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }, [faqsDraft, service, ctx, onRefresh]);

  const relatedPkg = packages.find((p) => p.service_refs.includes(service.id)) ?? null;

  const inclusions = service.inclusions ?? [];
  const faqs       = service.faqs ?? [];
  const tiers      = service.pricing?.tiers;

  const handleOpenTierConfig = () => {
    if (!relatedPkg) return;
    const onBack = () => doOpen({
      id:       `service-view-${service.id}`,
      mode:     'drawer',
      title:    decodeHtml(service.title),
      titleDot: `var(--admin-${isActive ? 'success' : 'error'})`,
      initialStepData: { service, packages, openAction: doOpen, allCategories, onRefresh },
      steps: [{ id: 'detail', title: 'Service Detail', component: ServiceViewStep }],
    });
    ctx.close();
    doOpen({
      id:    `pkg-tiers-${relatedPkg.post_id}`,
      mode:  'drawer',
      title: relatedPkg.title,
      onBack,
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

  const pkgIsActive         = relatedPkg?.post_status === 'publish';
  const configuredTierCount = relatedPkg
    ? TIER_KEYS.filter((t) => relatedPkg.tiers[t]).length
    : 0;
  const promotionCount = relatedPkg?.promotion_tiers.length ?? 0;

  const handleOpenPromoConfig = () => {
    if (!relatedPkg) return;
    const onBack = () => doOpen({
      id:       `service-view-${service.id}`,
      mode:     'drawer',
      title:    decodeHtml(service.title),
      titleDot: `var(--admin-${isActive ? 'success' : 'error'})`,
      initialStepData: { service, packages, openAction: doOpen, allCategories, onRefresh },
      steps: [{ id: 'detail', title: 'Service Detail', component: ServiceViewStep }],
    });
    ctx.close();
    doOpen({
      id:    `pkg-promos-${relatedPkg.post_id}`,
      mode:  'drawer',
      title: relatedPkg.title,
      onBack,
      initialStepData: {
        packageId: relatedPkg.post_id,
        promoId:   null,
        promo:     null,
        isNew:     false,
      },
      steps: [
        { id: 'promo-select', title: 'Select Promotion', component: PromoSelectStep  },
        { id: 'promo-view',   title: 'Promotion',        component: PromotionViewStep },
      ],
    });
  };

  return (
    <>
    <div class="cz-req-detail">

      {/* ── Tab bar ───────────────────────────────────────────────────── */}
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

      {/* ── Service tab: Water Layer ───────────────────────────────────── */}
      {tab === 'service' && (
        <>
          {/* ── Service Level Module: Service Overview ──────────────────────────────── */}
          <div class="cz-req-detail__section cz-sv-section--no-border">
            <p class="cz-req-detail__section-title">Service Overview</p>
            <div class="cz-sv-overview-block">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-sv-overview-block__edit" onClick={openOverviewEditor}>
                ✎ Edit
              </button>
              <div class="cz-sv-overview-block__identity">
                <p class="cz-sv-overview-block__name">{decodeHtml(service.title)}</p>
                {service.excerpt && (
                  <p class="cz-sv-overview-block__excerpt">{service.excerpt}</p>
                )}
              </div>
              <div class="cz-sv-overview-block__meta">
                <span class="cz-req-contact-grid__label">Category</span>
                <span class="cz-sv-overview-block__value">
                  {service.categories.map((c) => decodeHtml(c.name)).join(', ') || '—'}
                </span>
              </div>
              {service.content && (
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Description</span>
                  <p class="cz-sv-overview-block__desc">{service.content}</p>
                </div>
              )}
            </div>
          </div>
          {/* ── / Service Level Module: Service Overview ─────────────────────────── */}

          {/* ── Service Level Module: Included Features ──────────────────────────── */}
          <div class="cz-req-detail__section cz-sv-section--no-border">
            <p class="cz-req-detail__section-title">
              Included Features
              {inclusions.length > 0 && (
                <span style="font-weight:400;color:var(--admin-text-faint);margin-left:6px">
                  {inclusions.length}
                </span>
              )}
            </p>
            {inclusions.length > 0 ? (
              <div class="cz-sc-inclusion-pool">
                {inclusions.map((inc) => (
                  <span key={inc.id} class="cz-tf-chip">
                    {inc.label}
                    <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-tf-chip__edit" onClick={openInclusionsEditor}>
                      ✎
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div class="cz-sv-overview-block cz-sv-overview-block--prompt">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-sv-overview-block__edit" onClick={openInclusionsEditor}>
                  ✎ Edit
                </button>
                <div class="cz-sv-overview-block__identity">
                  <p class="cz-sv-overview-block__name" style="color:var(--admin-text-faint)">Nil features</p>
                  <p class="cz-sv-overview-block__excerpt" style="color:var(--admin-text-faint)">No features added — click Edit to add inclusions</p>
                </div>
              </div>
            )}
          </div>
          {/* ── / Service Level Module: Included Features ────────────────────────── */}

          {/* ── Service Level Module: Common Questions ───────────────────────────── */}
          <div class="cz-req-detail__section">
            <p class="cz-req-detail__section-title">
              Common Questions
              {faqs.length > 0 && (
                <span style="font-weight:400;color:var(--admin-text-faint);margin-left:6px">
                  {faqs.length}
                </span>
              )}
            </p>
            {faqs.length > 0 ? (
              <div class="cz-sc-faq-list">
                {faqs.map((faq) => (
                  <div key={faq.id} class="cz-sc-faq-item">
                    <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-sc-faq-item__edit" onClick={openFaqsEditor}>
                      ✎ Edit
                    </button>
                    <p class="cz-sc-faq-item__q">{faq.question}</p>
                    {faq.answer && <p class="cz-sc-faq-item__a">{faq.answer}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div class="cz-sv-overview-block cz-sv-overview-block--prompt">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-sv-overview-block__edit" onClick={openFaqsEditor}>
                  ✎ Edit
                </button>
                <div class="cz-sv-overview-block__identity">
                  <p class="cz-sv-overview-block__name" style="color:var(--admin-text-faint)">Nil questions</p>
                  <p class="cz-sv-overview-block__excerpt" style="color:var(--admin-text-faint)">No questions added — click Edit to add FAQs</p>
                </div>
              </div>
            )}
          </div>
          {/* ── / Service Level Module: Common Questions ──────────────────────────── */}
        </>
      )}

      {/* ── Commercial tab: Surface Layer ─────────────────────────────── */}
      {tab === 'commercial' && (
        relatedPkg ? (
          <>
            <div class="cz-sv-commercial-block">
              <div class="cz-sv-commercial-block__header">
                <span class="cz-sv-commercial-block__label">Tier Configuration</span>
                <div class="cz-sv-commercial-block__status">
                  <span class="cz-admin-status-dot" style={`color:var(--admin-${pkgIsActive ? 'success' : 'error'})`} />
                  <span class={`cz-status-pill cz-status-pill--${pkgIsActive ? 'active' : 'inactive'}`}>
                    {pkgIsActive ? 'Linked' : 'Disabled'}
                  </span>
                </div>
              </div>
              <p class="cz-sv-commercial-block__count">
                {configuredTierCount} tier{configuredTierCount !== 1 ? 's' : ''} configured
              </p>
              <p class="cz-sv-commercial-block__desc">
                Pricing and tiers are managed in the Service Packages workstation.
              </p>
              <div class="cz-sv-commercial-block__footer">
                <button
                  type="button"
                  class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                  onClick={handleOpenTierConfig}
                >
                  View
                </button>
              </div>
            </div>

            <div class="cz-sv-commercial-block">
              <div class="cz-sv-commercial-block__header">
                <span class="cz-sv-commercial-block__label">Promotion Configuration</span>
                <div class="cz-sv-commercial-block__status">
                  <span class="cz-admin-status-dot" style={`color:var(--admin-${pkgIsActive ? 'success' : 'error'})`} />
                  <span class={`cz-status-pill cz-status-pill--${pkgIsActive ? 'active' : 'inactive'}`}>
                    {pkgIsActive ? 'Linked' : 'Disabled'}
                  </span>
                </div>
              </div>
              <p class="cz-sv-commercial-block__count">
                {promotionCount} promotion{promotionCount !== 1 ? 's' : ''} configured
              </p>
              <p class="cz-sv-commercial-block__desc">
                Promotions are managed in the Promotions workstation.
              </p>
              <div class="cz-sv-commercial-block__footer">
                <button
                  type="button"
                  class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                  onClick={handleOpenPromoConfig}
                >
                  View
                </button>
              </div>
            </div>

            {tiers && (
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
          </>
        ) : (
          <>
            <div class="cz-sv-commercial-block">
              <div class="cz-sv-commercial-block__header">
                <span class="cz-sv-commercial-block__label">Tier Configuration</span>
                <div class="cz-sv-commercial-block__status">
                  <span class="cz-admin-status-dot" style="color:var(--admin-text-faint)" />
                  <span class="cz-status-pill cz-status-pill--draft">Not configured</span>
                </div>
              </div>
              <p class="cz-sv-commercial-block__count">0 tiers configured</p>
              <p class="cz-sv-commercial-block__desc">Pricing and tiers not available.</p>
              <div class="cz-sv-commercial-block__footer">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled>
                  View
                </button>
              </div>
            </div>

            <div class="cz-sv-commercial-block">
              <div class="cz-sv-commercial-block__header">
                <span class="cz-sv-commercial-block__label">Promotion Configuration</span>
                <div class="cz-sv-commercial-block__status">
                  <span class="cz-admin-status-dot" style="color:var(--admin-text-faint)" />
                  <span class="cz-status-pill cz-status-pill--draft">Not configured</span>
                </div>
              </div>
              <p class="cz-sv-commercial-block__count">0 promotion configured</p>
              <p class="cz-sv-commercial-block__desc">No active promotion.</p>
              <div class="cz-sv-commercial-block__footer">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled>
                  View
                </button>
              </div>
            </div>

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
        )
      )}

      {saveOk && <div class="cz-admin-ok-msg">Changes saved.</div>}

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div class="cz-tf-footer">
        {tab === 'service' && (
          isActive ? (
            <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={handleToggleActive} disabled={statusSaving}>
              {statusSaving ? '…' : 'Disable Service'}
            </button>
          ) : (
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={handleToggleActive} disabled={statusSaving}>
              {statusSaving ? '…' : 'Enable Service'}
            </button>
          )
        )}
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={ctx.close}>
          Cancel
        </button>
        {tab === 'service' && (
          <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={handlePublishService} disabled={statusSaving}>
            {statusSaving ? '…' : 'Publish Service'}
          </button>
        )}
      </div>
    </div>

    {editingSection === 'overview' && overviewDraft && (
      <InlineEditorShell
        title="Edit Overview"
        onSave={handleSaveOverview}
        onCancel={handleCancelEdit}
        saving={saving}
        saveErr={saveErr}
      >
        <ServiceOverviewEditor
          draft={overviewDraft}
          onChange={(patch) => setOverviewDraft((d) => d ? { ...d, ...patch } : d)}
          categories={allCategories}
        />
      </InlineEditorShell>
    )}

    {editingSection === 'inclusions' && inclusionsDraft && (
      <InlineEditorShell
        title="Edit Included Features"
        onSave={handleSaveInclusions}
        onCancel={handleCancelEdit}
        saving={saving}
        saveErr={saveErr}
      >
        <ServiceInclusionsEditor
          draft={inclusionsDraft}
          onChange={setInclusionsDraft}
        />
      </InlineEditorShell>
    )}

    {editingSection === 'faqs' && faqsDraft && (
      <InlineEditorShell
        title="Edit Common Questions"
        onSave={handleSaveFaqs}
        onCancel={handleCancelEdit}
        saving={saving}
        saveErr={saveErr}
      >
        <ServiceFaqsEditor
          draft={faqsDraft}
          onChange={setFaqsDraft}
        />
      </InlineEditorShell>
    )}
    </>
  );
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
    category_id: (allCategories.find((c) => c.id !== null)?.id as number) ?? null,
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
        const newService = buildNewServiceItem(result.service);
        onRefresh?.();
        ctx.close();
        doOpen({
          id:       `service-view-${newService.id}`,
          mode:     'drawer',
          title:    newService.title,
          titleDot: 'var(--admin-success)',
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
            <p class="cz-req-detail__section-title">Service Overview</p>
            <div class="cz-sv-overview-block">
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-sv-overview-block__edit"
                style="opacity:1;pointer-events:auto"
                onClick={() => setEditing(true)}
              >
                ✎ Edit
              </button>
              <div class="cz-sv-overview-block__identity">
                <p class="cz-sv-overview-block__name" style="color:var(--admin-text-faint)">Untitled service</p>
                <p class="cz-sv-overview-block__excerpt" style="color:var(--admin-text-faint)">No category — click Edit to get started</p>
              </div>
            </div>
          </div>
          {/* ── / Service Level Module: Service Overview ─────────────────────────── */}

          {/* ── Service Level Module: Included Features ──────────────────────────── */}
          <div class="cz-req-detail__section cz-sv-section--no-border">
            <p class="cz-req-detail__section-title">Included Features</p>
            <div class="cz-sv-overview-block cz-sv-module--locked">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-sv-overview-block__edit" disabled>
                ✎ Edit
              </button>
              <div class="cz-sv-overview-block__identity">
                <p class="cz-sv-overview-block__name" style="color:var(--admin-text-faint)">Nil features</p>
                <p class="cz-sv-overview-block__excerpt" style="color:var(--admin-text-faint)">No service — edit and create a service</p>
              </div>
            </div>
          </div>
          {/* ── / Service Level Module: Included Features ────────────────────────── */}

          {/* ── Service Level Module: Common Questions ───────────────────────────── */}
          <div class="cz-req-detail__section">
            <p class="cz-req-detail__section-title">Common Questions</p>
            <div class="cz-sv-overview-block cz-sv-module--locked">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-sv-overview-block__edit" disabled>
                ✎ Edit
              </button>
              <div class="cz-sv-overview-block__identity">
                <p class="cz-sv-overview-block__name" style="color:var(--admin-text-faint)">Nil questions</p>
                <p class="cz-sv-overview-block__excerpt" style="color:var(--admin-text-faint)">No service — edit and create a service</p>
              </div>
            </div>
          </div>
          {/* ── / Service Level Module: Common Questions ──────────────────────────── */}
        </>
      )}

      {tab === 'commercial' && (
        <>
          <div class="cz-sv-commercial-block">
            <div class="cz-sv-commercial-block__header">
              <span class="cz-sv-commercial-block__label">Tier Configuration</span>
              <div class="cz-sv-commercial-block__status">
                <span class="cz-admin-status-dot" style="color:var(--admin-text-faint)" />
                <span class="cz-status-pill cz-status-pill--draft">Not configured</span>
              </div>
            </div>
            <p class="cz-sv-commercial-block__count">0 tiers configured</p>
            <p class="cz-sv-commercial-block__desc">Pricing and tiers not available.</p>
            <div class="cz-sv-commercial-block__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled>
                View
              </button>
            </div>
          </div>

          <div class="cz-sv-commercial-block">
            <div class="cz-sv-commercial-block__header">
              <span class="cz-sv-commercial-block__label">Promotion Configuration</span>
              <div class="cz-sv-commercial-block__status">
                <span class="cz-admin-status-dot" style="color:var(--admin-text-faint)" />
                <span class="cz-status-pill cz-status-pill--draft">Not configured</span>
              </div>
            </div>
            <p class="cz-sv-commercial-block__count">0 promotion configured</p>
            <p class="cz-sv-commercial-block__desc">No active promotion.</p>
            <div class="cz-sv-commercial-block__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled>
                View
              </button>
            </div>
          </div>

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
    const svcActive = service.meta?.is_active !== false;
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
                      // Cast needed: overlay removes disabled tier keys at runtime
                      // despite Record<TierId, PricingTierData> typing.
                      const tiers       = service.pricing?.tiers as Partial<Record<TierId, PricingTierData>> | undefined;
                      const popularTier = service.meta?.popular_tier ?? null;
                      const isActive    = service.meta?.is_active !== false;
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
