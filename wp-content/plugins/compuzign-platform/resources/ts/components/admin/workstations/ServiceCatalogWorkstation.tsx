import { useEffect, useState, useCallback, useRef } from 'preact/hooks';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { Spinner } from '@/components/ui/Spinner';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { Category, CostBuilderResponse, PricingTierData, ServiceItem, TierId } from '@/api/types/cost-builder';
import {
  createService,
  createSurfacePackage,
  fetchSurfacePackageDetail,
  updateServiceFaqs,
  updateServiceInclusions,
  updateServiceOverview,
  updateServiceStatus,
} from '@/api/endpoints/admin';
import type { SurfacePackageDetailResponse, SurfacePackageSummary, PromotionTier } from '@/api/types/admin';
import { TierManageStep } from './SurfacePackagesWorkstation';
import { PromotionViewStep } from './PromotionsWorkstation';
import { resolveOverviewStatus, renderModuleStatus, resolvePackageStatus, resolveTierStatus, statusDotColor } from '@/components/admin/utils/moduleStatus';
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

const PROMO_STATUS_MAP: Record<string, { dot: string; cls: string; label: string }> = {
  'active':   { dot: 'var(--admin-success)',    cls: 'cz-status-pill--active',   label: 'Active'   },
  'archived': { dot: 'var(--admin-error)',      cls: 'cz-status-pill--inactive', label: 'Archived' },
  'draft':    { dot: 'var(--admin-text-faint)', cls: 'cz-status-pill--draft',    label: 'Draft'    },
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
      platform_status:   'disabled',
      module_status:     { overview: 'pending', inclusions: 'pending', faqs: 'pending' },
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

// ── PackageDetailStep ─────────────────────────────────────────────────────────
// Unified package overview drawer opened from the Service Commercial tab.
// Packages tab  → 4 tier cards + pricing summary; tier View → goNext → TierManageStep.
// Promotions tab → promotion cards; promo View → doOpen → PromotionViewStep drawer.

function PackageDetailStep({ ctx }: { ctx: StepContext }) {
  const packageId  = ctx.stepData.packageId  as number;
  const pkgTitle   = ctx.stepData.pkgTitle   as string ?? '';
  const initialTab = (ctx.stepData.initialTab as 'packages' | 'promotions') ?? 'packages';
  const doOpen     = ctx.stepData.openAction  as ((config: ActionConfig) => void) | undefined;
  const pkgBack    = ctx.stepData.pkgBack     as (() => void) | undefined;

  const [tab, setTab]         = useState<'packages' | 'promotions'>(initialTab);
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

  const pkg          = detail.package;
  const promos       = pkg.promotion_tiers ?? [];
  const pkgStatus = pkg.platform_status ?? 'disabled';

  const handleManageTier = (tierId: string) => {
    const t = pkg.tiers[tierId];
    ctx.setStepData('tierId', tierId);
    ctx.setStepData('isNew', false);
    ctx.setStepData('currentEnabled', t?.enabled ?? true);
    ctx.goNext();
  };

  const reopenSelf = (activeTab: 'packages' | 'promotions') => {
    doOpen?.({
      id:             `pkg-detail-${packageId}`,
      mode:           'drawer',
      title:          pkgTitle,
      onBack:         pkgBack,
      hideStepHeader: true,
      initialStepData: {
        packageId,
        pkgTitle,
        initialTab:     activeTab,
        openAction:     doOpen,
        pkgBack,
        tierId:         null,
        isNew:          false,
        currentEnabled: true,
      },
      steps: [
        { id: 'pkg-detail', title: 'Package',   component: PackageDetailStep },
        { id: 'tier-form',  title: 'Edit Tier', component: TierManageStep    },
      ],
    });
  };

  const handleManagePromo = (promo: PromotionTier) => {
    if (!doOpen) return;
    ctx.close();
    doOpen({
      id:     `promo-view-${promo.id}`,
      mode:   'drawer',
      title:  promo.name || '(unnamed)',
      onBack: () => reopenSelf('promotions'),
      initialStepData: {
        packageId,
        promoId: promo.id,
        promo,
        isNew:   false,
      },
      steps: [{ id: 'promo-view', title: 'Promotion', component: PromotionViewStep }],
    });
  };

  return (
    <div class="cz-req-detail">

      {/* Tab bar */}
      <div class="cz-sv-tabs">
        <button
          type="button"
          class={`cz-sv-tab${tab === 'packages' ? ' cz-sv-tab--active' : ''}`}
          onClick={() => setTab('packages')}
        >
          Packages
        </button>
        <button
          type="button"
          class={`cz-sv-tab${tab === 'promotions' ? ' cz-sv-tab--active' : ''}`}
          onClick={() => setTab('promotions')}
        >
          Promotions
        </button>
      </div>

      {/* Packages tab */}
      {tab === 'packages' && (
        <>
          {TIER_KEYS.map((tierId) => {
            const tier       = pkg.tiers[tierId];
            const status     = resolveTierStatus(tier, { pkgStatus: pkg.platform_status ?? 'disabled' });
            const showData   = !!(tier && (tier.price !== null || tier.billing_cycle || (tier as any).contact));
            const priceOk    = !!(tier && (tier.price !== null || tier.contact));
            const cycleOk    = !!tier?.billing_cycle;
            const priceText  = tier?.contact && tier.price === null
              ? 'Contact'
              : tier?.price != null ? `$${tier.price.toFixed(2)}` : '$0.00';
            const cycleText  = tier?.billing_cycle ?? 'Not available';
            const inclCount  = tier?.inclusions_override?.length ?? 0;
            const faqCount   = tier?.faq_refs?.length ?? 0;
            const inclLabel  = `${inclCount} ${inclCount === 1 ? 'inclusion' : 'inclusions'}`;
            const faqLabel   = `${faqCount} ${faqCount === 1 ? 'Common Question' : 'Common Questions'}`;
            return (
              <div key={tierId} class="cz-sv-commercial-block">
                <div class="cz-sv-commercial-block__header">
                  <span class="cz-sv-commercial-block__label">Tier Summary</span>
                  <div
                    class="cz-sv-commercial-block__status"
                    style={status === 'pending-dim' ? 'opacity:0.45' : undefined}
                  >
                    {renderModuleStatus(status)}
                  </div>
                </div>
                <div class="cz-sv-commercial-block__body">
                  <p class="cz-sv-commercial-block__count">Package {TIER_LABELS[tierId]}</p>
                  {tier?.label?.trim() && (
                    <p class="cz-sp-transit__sublabel">{tier.label}</p>
                  )}
                  {showData ? (
                    <p class="cz-sv-commercial-block__desc">
                      <span style={priceOk ? undefined : 'color:var(--admin-warning)'}>{priceText}</span>
                      {' · '}
                      <span style={cycleOk ? undefined : 'color:var(--admin-warning)'}>{cycleText}</span>
                    </p>
                  ) : (
                    <p class="cz-sv-commercial-block__desc">View Tier Overview and manage pricing.</p>
                  )}
                  <p class="cz-sv-commercial-block__desc" style="color:var(--admin-text-faint)">
                    {inclLabel} | {faqLabel}
                  </p>
                </div>
                <div class="cz-sv-commercial-block__footer">
                  <button
                    type="button"
                    class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                    onClick={() => handleManageTier(tierId)}
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}

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
                    const tier   = pkg.tiers[tierId];
                    const status = resolveTierStatus(tier, { pkgStatus });
                    return (
                      <tr key={tierId}>
                        <td class="cz-sp-tier-table__name">
                          <span class="cz-admin-status-dot" style={`color:${statusDotColor(status)};margin-right:6px`} />
                          {TIER_LABELS[tierId]}
                        </td>
                        <td>
                          <span class={`cz-price-tag${tier?.price != null ? ' cz-price-tag--has-price' : ''}`}>
                            {tier?.price != null ? `$${tier.price.toLocaleString()}` : '—'}
                          </span>
                        </td>
                        <td class="cz-sp-tier-table__muted">{tier?.billing_cycle ?? '—'}</td>
                        <td class="cz-sp-tier-table__center cz-sp-tier-table__muted">
                          {tier?.inclusions_override?.length ? tier.inclusions_override.length : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Promotions tab */}
      {tab === 'promotions' && (
        promos.length > 0 ? (
          <>
            {promos.map((promo) => {
              const s  = promo.status ?? 'draft';
              const ps = PROMO_STATUS_MAP[s] ?? PROMO_STATUS_MAP['draft'];
              return (
                <div key={promo.id} class="cz-sv-commercial-block">
                  <div class="cz-sv-commercial-block__header">
                    <span class="cz-sv-commercial-block__label">Promotion</span>
                    <div class="cz-sv-commercial-block__status">
                      <span class="cz-admin-status-dot" style={`color:${ps.dot}`} />
                      <span class={`cz-status-pill ${ps.cls}`}>{ps.label}</span>
                    </div>
                  </div>
                  <p class="cz-sv-commercial-block__count">{promo.name || '(unnamed)'}</p>
                  <p class="cz-sv-commercial-block__desc">
                    {promo.based_on ? `Based on ${TIER_LABELS[promo.based_on] ?? promo.based_on}` : 'No base tier.'}
                    {promo.price != null ? ` · $${promo.price.toLocaleString()}` : ''}
                  </p>
                  <div class="cz-sv-commercial-block__footer">
                    <button
                      type="button"
                      class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                      onClick={() => handleManagePromo(promo)}
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div class="cz-req-detail__section">
            <div class="cz-sv-module">
              <div class="cz-sv-module-header cz-sv-module-header--no-border">
                <p class="cz-req-detail__section-title">Promotions</p>
              </div>
              <div class="cz-sv-module-body">
                <div class="cz-sv-overview-block__identity">
                  <p class="cz-sv-overview-block__name">No promotions configured</p>
                  <p class="cz-sv-overview-block__excerpt">Add from the Promotions workstation.</p>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Footer */}
      <div class="cz-tf-footer">
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={ctx.close}>
          Cancel
        </button>
      </div>

    </div>
  );
}

// ── CommercialBlock ───────────────────────────────────────────────────────────
// Reusable summary card for the Commercial tab.
// header  → label + status pill
// body    → count + description
// footer  → View action (disabled when onView is undefined)

interface CommercialBlockProps {
  label:          string;
  count:          string;
  desc:           string;
  status:         string;
  onView?:        () => void;
  descHighlight?: boolean;
}

function CommercialBlock({ label, count, desc, status, onView, descHighlight }: CommercialBlockProps) {
  return (
    <div class="cz-sv-commercial-block">
      <div class="cz-sv-commercial-block__header">
        <span class="cz-sv-commercial-block__label">{label}</span>
        <div class="cz-sv-commercial-block__status">
          {renderModuleStatus(status)}
        </div>
      </div>
      <div class="cz-sv-commercial-block__body">
        <p class="cz-sv-commercial-block__count">{count}</p>
        <p
          class="cz-sv-commercial-block__desc"
          style={descHighlight ? 'color:var(--admin-warning)' : undefined}
        >
          {desc}
        </p>
      </div>
      <div class="cz-sv-commercial-block__footer">
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
          onClick={onView}
          disabled={!onView}
        >
          View
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

  // Drawer Principle v1 — module state machine: null = View, named value = Edit (InlineEditorShell active)
  const [editingSection,   setEditingSection]   = useState<'overview' | 'inclusions' | 'faqs' | null>(null);
  const [overviewDraft,    setOverviewDraft]    = useState<OverviewDraft | null>(null);
  const [inclusionsDraft,  setInclusionsDraft]  = useState<InclusionsDraft | null>(null);
  const [faqsDraft,        setFaqsDraft]        = useState<FaqsDraft | null>(null);
  const [saving,             setSaving]           = useState(false);
  const [saveErr,            setSaveErr]          = useState<string | null>(null);
  const [saveOk,             setSaveOk]           = useState(false);
  const [statusSaving,       setStatusSaving]     = useState(false);
  const [showPublishModal,   setShowPublishModal] = useState(false);
  const [creatingPkg,        setCreatingPkg]      = useState(false);

  useEffect(() => {
    if (!saveOk) return;
    const t = setTimeout(() => setSaveOk(false), 3000);
    return () => clearTimeout(t);
  }, [saveOk]);

  const platformStatus = service.meta?.platform_status ?? 'disabled';
  const isActive       = platformStatus === 'active';

  const handleToggleActive = useCallback(async () => {
    setStatusSaving(true);
    const nextStatus = isActive ? 'disabled' : 'active';
    try {
      const result = await updateServiceStatus(service.id, { platform_status: nextStatus });
      if (result.success) {
        ctx.setStepData('service', {
          ...service,
          meta: {
            ...service.meta,
            platform_status: result.service.platform_status,
            module_status:   result.service.module_status as any,
          },
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
      const result = await updateServiceStatus(service.id, { platform_status: 'active' });
      if (result.success) {
        ctx.setStepData('service', {
          ...service,
          meta: {
            ...service.meta,
            platform_status: result.service.platform_status,
            module_status:   result.service.module_status as any,
          },
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
    setSaving(false);
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
          meta:       result.service.module_status
                        ? { ...service.meta, module_status: result.service.module_status as any }
                        : service.meta,
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
        ctx.setStepData('service', {
          ...service,
          inclusions: result.inclusions,
          meta:       result.module_status
                        ? { ...service.meta, module_status: result.module_status as any }
                        : service.meta,
        });
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
        ctx.setStepData('service', {
          ...service,
          faqs: result.faqs,
          meta: result.module_status
                  ? { ...service.meta, module_status: result.module_status as any }
                  : service.meta,
        });
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

  const handleOpenTierConfig = async () => {
    let pkgId: number;
    let pkgTitle: string;

    if (relatedPkg) {
      pkgId    = relatedPkg.post_id;
      pkgTitle = relatedPkg.title;
    } else {
      // No package linked yet — create a draft package, then open it for setup.
      setCreatingPkg(true);
      try {
        const { package_id } = await createSurfacePackage({
          service_id: service.id,
          title:      service.title,
        });
        pkgId    = package_id;
        pkgTitle = service.title;
        onRefresh?.();
      } catch {
        setCreatingPkg(false);
        return;
      }
      setCreatingPkg(false);
    }

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
      id:             `pkg-detail-${pkgId}`,
      mode:           'drawer',
      title:          pkgTitle,
      onBack,
      hideStepHeader: true,
      initialStepData: {
        packageId:      pkgId,
        pkgTitle,
        initialTab:     'packages',
        openAction:     doOpen,
        pkgBack:        onBack,
        tierId:         null,
        isNew:          false,
        currentEnabled: true,
      },
      steps: [
        { id: 'pkg-detail', title: 'Package',   component: PackageDetailStep },
        { id: 'tier-form',  title: 'Edit Tier', component: TierManageStep    },
      ],
    });
  };

  const pkgIsActive         = relatedPkg?.platform_status === 'active';
  const configuredTierCount = relatedPkg
    ? TIER_KEYS.filter((t) => relatedPkg.tiers[t]).length
    : 0;
  const promotionCount = relatedPkg?.promotion_tiers.length ?? 0;

  const promoStatus = !relatedPkg || promotionCount === 0
    ? 'pending-dim'
    : pkgIsActive ? 'active' : 'pending-full';

  // ── Package Summary card state ────────────────────────────────────────────
  const pkgSummaryStatus = resolvePackageStatus(relatedPkg);

  const allTiersEnabled = relatedPkg != null &&
    TIER_KEYS.every((t) => relatedPkg.tiers[t]?.enabled === true);


  const pkgSummaryCount = relatedPkg
    ? `${configuredTierCount} tier${configuredTierCount !== 1 ? 's' : ''} configured`
    : '0 tiers configured';

  const pkgSummaryDesc = pkgSummaryStatus === 'active'
    ? 'Package Overview includes a full summary view of pricing and tiers.'
    : isActive && !relatedPkg
      ? 'View Package Overview and manage pricing and tiers.'
      : 'Pricing and tiers not available.';

  // State 4: package active but not all tiers are enabled — signal attention on description
  const pkgSummaryDescPending = isActive && pkgSummaryStatus === 'active' && !allTiersEnabled;

  const pkgSummaryOnView = isActive && !creatingPkg ? handleOpenTierConfig : undefined;

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
      id:             `pkg-detail-${relatedPkg.post_id}`,
      mode:           'drawer',
      title:          relatedPkg.title,
      onBack,
      hideStepHeader: true,
      initialStepData: {
        packageId:      relatedPkg.post_id,
        pkgTitle:       relatedPkg.title,
        initialTab:     'promotions',
        openAction:     doOpen,
        pkgBack:        onBack,
        tierId:         null,
        isNew:          false,
        currentEnabled: true,
      },
      steps: [
        { id: 'pkg-detail', title: 'Package',   component: PackageDetailStep },
        { id: 'tier-form',  title: 'Edit Tier', component: TierManageStep    },
      ],
    });
  };

  // ── Module status resolvers ──────────────────────────────────────────────

  const moduleStatus = service.meta?.module_status;

  const getInclusionsStatus = () => {
    if (inclusions.length === 0) return 'pending-dim';
    const allComplete = inclusions.every(inc => !!inc.label?.trim());
    if (!allComplete) return 'pending-dim';
    if (moduleStatus?.inclusions === 'pending') return 'pending-full';
    if (!isActive) return 'pending-full';
    return 'active';
  };

  const getFaqsStatus = () => {
    if (faqs.length === 0) return 'pending-dim';
    const allComplete = faqs.every(faq => !!(faq.question?.trim()) && !!(faq.answer?.trim()));
    if (!allComplete) return 'pending-dim';
    if (moduleStatus?.faqs === 'pending') return 'pending-full';
    if (!isActive) return 'pending-full';
    return 'active';
  };

  const overviewStatus   = resolveOverviewStatus(service, {
    platformStatus,
    moduleTransition: moduleStatus?.overview ?? 'settled',
  });
  const inclusionsStatus = getInclusionsStatus();
  const faqsStatus       = getFaqsStatus();

  const hasModulePendingChanges =
    inclusionsStatus === 'pending-full' || inclusionsStatus === 'pending-dim' ||
    faqsStatus === 'pending-full' || faqsStatus === 'pending-dim';

  const canPublish =
    overviewStatus === 'pending-full' ||
    (overviewStatus === 'active' && hasModulePendingChanges);

  const handleConfirmPublish = useCallback(async () => {
    setShowPublishModal(false);
    await handlePublishService();
  }, [handlePublishService]);

  const pluralCount = (n: number, singular: string, plural: string) =>
    `${n} ${n === 1 ? singular : plural}`;

  const inclSummary = (() => {
    if (inclusionsStatus === 'pending-dim') return {
      text: inclusions.length === 0 ? '0 included features added' : `${pluralCount(inclusions.length, 'included feature', 'included features')} pending`,
      orange: true,
    };
    const complete = inclusions.filter(inc => !!inc.label?.trim()).length;
    return { text: `${pluralCount(complete, 'included feature', 'included features')} added`, orange: false };
  })();

  const faqsSummary = (() => {
    if (faqsStatus === 'pending-dim') return {
      text: faqs.length === 0 ? '0 common questions added' : `${pluralCount(faqs.length, 'common question', 'common questions')} pending`,
      orange: true,
    };
    const complete = faqs.filter(faq => !!(faq.question?.trim()) && !!(faq.answer?.trim())).length;
    return { text: `${pluralCount(complete, 'common question', 'common questions')} added`, orange: false };
  })();

  const handleToggleActiveRef = useRef(handleToggleActive);
  handleToggleActiveRef.current = handleToggleActive;

  useEffect(() => {
    const { setFooter, close } = ctx;
    setFooter(
      <div class="cz-tf-footer">
        {tab === 'service' && (
          isActive ? (
            <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={() => handleToggleActiveRef.current()} disabled={statusSaving}>
              {statusSaving ? '…' : 'Disable Service'}
            </button>
          ) : (
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => handleToggleActiveRef.current()} disabled={statusSaving}>
              {statusSaving ? '…' : 'Enable Service'}
            </button>
          )
        )}
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={close}>
          Cancel
        </button>
        {tab === 'service' && (
          <button
            type="button"
            class="cz-admin-btn cz-admin-btn--primary"
            onClick={() => setShowPublishModal(true)}
            disabled={!canPublish || statusSaving}
          >
            {statusSaving ? '…' : 'Publish Service'}
          </button>
        )}
      </div>
    );
    return () => setFooter(null);
  }, [tab, isActive, statusSaving, canPublish, ctx.setFooter, ctx.close]);


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
            <div class="cz-sv-module">
              <div class="cz-sv-module-header">
                <p class="cz-req-detail__section-title">Service Overview</p>
                <div>
                  <span
                    class="cz-sv-overview-block__status"
                    style={overviewStatus === 'pending-dim' ? 'opacity:0.45' : undefined}
                  >
                    {renderModuleStatus(overviewStatus)}
                  </span>
                </div>
              </div>
              <div class="cz-sv-module-body">
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Title</span>
                  <p class="cz-sv-overview-block__value">
                    {service.title.trim() ? decodeHtml(service.title) : 'New Service'}
                  </p>
                </div>
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Short Description</span>
                  <p class="cz-sv-overview-block__value">
                    {service.excerpt?.trim()
                      ? service.excerpt
                      : service.title.trim()
                        ? `Enter a short description for the ${decodeHtml(service.title)}.`
                        : 'Enter a short description for this service.'
                    }
                  </p>
                </div>
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Category</span>
                  <span class="cz-sv-overview-block__value">
                    {service.categories.length > 0
                      ? service.categories.map((c) => decodeHtml(c.name)).join(', ')
                      : 'Not selected'
                    }
                  </span>
                </div>
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Description</span>
                  <p class="cz-sv-overview-block__desc">
                    {service.content.trim()
                      ? service.content
                      : service.title.trim()
                        ? `Enter a description for the ${decodeHtml(service.title)}.`
                        : 'Enter a description for the service.'
                    }
                  </p>
                </div>
              </div>
              <div class="cz-sv-module-footer">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={openOverviewEditor}>
                  ✎ Edit
                </button>
              </div>
            </div>
          </div>
          {/* ── / Service Level Module: Service Overview ─────────────────────────── */}


          {/* ── Service Level Module: Included Features ──────────────────────────── */}
          <div class="cz-req-detail__section cz-sv-section--no-border">
            <div class="cz-sv-module">
              <div class={`cz-sv-module-header${inclusions.length > 0 ? ' cz-sv-module-header--no-border' : ''}`}>
                <p class="cz-req-detail__section-title">
                  Included Features
                  {inclusions.length > 0 && (
                    <span style="font-weight:400;color:var(--admin-text-faint);margin-left:6px">
                      {inclusions.length}
                    </span>
                  )}
                </p>
                <div>
                  <span
                    class="cz-sv-overview-block__status"
                    style={inclusionsStatus === 'pending-dim' ? 'opacity:0.45' : undefined}
                  >
                    {renderModuleStatus(inclusionsStatus)}
                  </span>
                </div>
              </div>
              <div class="cz-sv-module-body">
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
                  <div class="cz-sv-overview-block__identity">
                    <p class="cz-sv-overview-block__name">No features</p>
                    <p class="cz-sv-overview-block__excerpt">
                      {service.title.trim()
                        ? `Add features to the ${decodeHtml(service.title)}.`
                        : 'Add features to this service.'
                      }
                    </p>
                  </div>
                )}
              </div>
              <div class="cz-sv-module-footer">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={openInclusionsEditor}>
                  ✎ Edit
                </button>
              </div>
            </div>
          </div>
          {/* ── / Service Level Module: Included Features ────────────────────────── */}

          {/* ── Service Level Module: Common Questions ───────────────────────────── */}
          <div class="cz-req-detail__section">
            <div class="cz-sv-module">
              <div class={`cz-sv-module-header${faqs.length > 0 ? ' cz-sv-module-header--no-border' : ''}`}>
                <p class="cz-req-detail__section-title">
                  Common Questions
                  {faqs.length > 0 && (
                    <span style="font-weight:400;color:var(--admin-text-faint);margin-left:6px">
                      {faqs.length}
                    </span>
                  )}
                </p>
                <div>
                  <span
                    class="cz-sv-overview-block__status"
                    style={faqsStatus === 'pending-dim' ? 'opacity:0.45' : undefined}
                  >
                    {renderModuleStatus(faqsStatus)}
                  </span>
                </div>
              </div>
              <div class="cz-sv-module-body">
                {faqs.length > 0 ? (
                  <div class="cz-sc-faq-list">
                    {faqs.map((faq) => (
                      <div key={faq.id} class="cz-sc-faq-item">
                        <p class="cz-sc-faq-item__q">
                          {faq.question.trim() || 'No Question Added'}
                        </p>
                        <p class="cz-sc-faq-item__a">
                          {faq.answer?.trim() || 'No Answer Added'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div class="cz-sv-overview-block__identity">
                    <p class="cz-sv-overview-block__name">No questions added</p>
                    <p class="cz-sv-overview-block__excerpt">
                      {service.title.trim()
                        ? `Add common questions for the ${decodeHtml(service.title)}.`
                        : 'Add common questions for this service.'
                      }
                    </p>
                  </div>
                )}
              </div>
              <div class="cz-sv-module-footer">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={openFaqsEditor}>
                  ✎ Edit
                </button>
              </div>
            </div>
          </div>
          {/* ── / Service Level Module: Common Questions ──────────────────────────── */}
        </>
      )}

      {/* ── Commercial tab: Surface Layer ─────────────────────────────── */}
      {tab === 'commercial' && (
        <>
          <CommercialBlock
            label="Package Summary"
            count={pkgSummaryCount}
            desc={pkgSummaryDesc}
            status={pkgSummaryStatus}
            descHighlight={pkgSummaryDescPending}
            onView={pkgSummaryOnView}
          />
          <CommercialBlock
            label="Promotion Configuration"
            count={relatedPkg
              ? `${promotionCount} promotion${promotionCount !== 1 ? 's' : ''} configured`
              : '0 promotion configured'}
            desc={relatedPkg
              ? 'Promotions are managed in the Promotions workstation.'
              : 'No active promotion.'}
            status={promoStatus}
            onView={relatedPkg ? handleOpenPromoConfig : undefined}
          />
          {relatedPkg && tiers && (
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
      )}

      {saveOk && <div class="cz-admin-ok-msg">Changes saved.</div>}
    </div>

    {/* ── Publish confirmation modal ─────────────────────────────────────── */}
    {showPublishModal && (
      <div
        class="cz-publish-confirm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) setShowPublishModal(false); }}
      >
        <div class="cz-publish-confirm">
          <div class="cz-publish-confirm__header">
            <h3 class="cz-publish-confirm__title">Ready to publish {decodeHtml(service.title)}?</h3>
          </div>
          <div class="cz-publish-confirm__body">
            <p class="cz-publish-confirm__lead">You are about to publish this service.</p>
            <ul class="cz-publish-confirm__summary">
              <li><strong>Service Overview:</strong> Ready</li>
              <li style={inclSummary.orange ? 'color:var(--admin-warning);font-weight:600' : undefined}>
                <strong>Included Features:</strong> {inclSummary.text}
              </li>
              <li style={faqsSummary.orange ? 'color:var(--admin-warning);font-weight:600' : undefined}>
                <strong>Common Questions:</strong> {faqsSummary.text}
              </li>
            </ul>
          </div>
          <div class="cz-publish-confirm__footer">
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary"
              onClick={() => setShowPublishModal(false)}
              disabled={statusSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--primary"
              onClick={handleConfirmPublish}
              disabled={statusSaving}
            >
              {statusSaving ? '…' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Drawer Principle v1 — Edit state: each module rendered through InlineEditorShell */}
    {editingSection === 'overview' && overviewDraft && (
      <InlineEditorShell
        title="Service Overview"
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
        title="Included Features"
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
        title="Common Questions"
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
        const newService = buildNewServiceItem(result.service);
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
                      const isActive    = service.meta?.platform_status === 'active';
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
