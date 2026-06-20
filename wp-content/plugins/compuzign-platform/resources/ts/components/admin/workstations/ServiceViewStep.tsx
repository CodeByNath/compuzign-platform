import { useEffect, useState, useCallback, useRef } from 'preact/hooks';
import { Spinner } from '@/components/ui/Spinner';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { Category, ServiceItem, TierId } from '@/api/types/cost-builder';
import { fetchSurfacePackageDetail } from '@/api/endpoints/admin';
import type { SurfacePackageDetailResponse, SurfacePackageSummary, PromotionTier } from '@/api/types/admin';
import { TierManageStep } from './SurfacePackagesWorkstation';
import { PromotionViewStep } from './PromotionsWorkstation';
import { renderModuleStatus, resolveTierStatus, statusDotColor } from '@/components/admin/utils/moduleStatus';
import { InlineEditorShell } from '../InlineEditorShell';
import { useServiceStation } from '@/hooks/useServiceStation';
import { ServiceOverviewEditor, initOverviewDraft } from '../editors/ServiceOverviewEditor';
import type { OverviewDraft } from '../editors/ServiceOverviewEditor';
import { ServiceInclusionsEditor } from '../editors/ServiceInclusionsEditor';
import type { InclusionsDraft } from '../editors/ServiceInclusionsEditor';
import { ServiceFaqsEditor } from '../editors/ServiceFaqsEditor';
import type { FaqsDraft } from '../editors/ServiceFaqsEditor';
import { ServiceOverviewViewCard } from '../views/ServiceOverviewViewCard';
import { ServiceInclusionsViewCard } from '../views/ServiceInclusionsViewCard';
import { ServiceFaqsViewCard } from '../views/ServiceFaqsViewCard';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function decodeHtml(s: string): string {
  if (typeof document === 'undefined') return s;
  const el = document.createElement('textarea');
  el.innerHTML = s;
  return el.value;
}

export const TIER_KEYS: TierId[] = ['basic', 'standard', 'premium', 'enterprise'];

export const TIER_LABELS: Record<string, string> = {
  basic: 'Basic', standard: 'Standard', premium: 'Premium', enterprise: 'Enterprise',
};

const PROMO_STATUS_MAP: Record<string, { dot: string; cls: string; label: string }> = {
  'active':   { dot: 'var(--admin-success)',    cls: 'cz-status-pill--active',   label: 'Active'   },
  'archived': { dot: 'var(--admin-error)',      cls: 'cz-status-pill--inactive', label: 'Archived' },
  'draft':    { dot: 'var(--admin-text-faint)', cls: 'cz-status-pill--draft',    label: 'Draft'    },
};

// ── CommercialBlock ───────────────────────────────────────────────────────────
// Reusable summary card for the Commercial tab.
// header  → label + status pill
// body    → count + description
// footer  → View action (disabled when onView is undefined)

export interface CommercialBlockProps {
  label:          string;
  count:          string;
  desc:           string;
  status:         string;
  onView?:        () => void;
  descHighlight?: boolean;
}

export function CommercialBlock({ label, count, desc, status, onView, descHighlight }: CommercialBlockProps) {
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

// ── Dirty-detection comparators ───────────────────────────────────────────────
// Pure functions — no component state. Each returns true when the working draft
// differs from the snapshot taken at editor-open time.

function isOverviewDirty(a: OverviewDraft, b: OverviewDraft): boolean {
  return a.title !== b.title || a.excerpt !== b.excerpt ||
         a.content !== b.content || a.category_id !== b.category_id;
}

function isInclusionsDirty(a: InclusionsDraft, b: InclusionsDraft): boolean {
  if (a.items.length !== b.items.length) return true;
  return a.items.some((item, i) => item.id !== b.items[i].id || item.label !== b.items[i].label);
}

function isFaqsDirty(a: FaqsDraft, b: FaqsDraft): boolean {
  if (a.items.length !== b.items.length) return true;
  return a.items.some((item, i) =>
    item.id !== b.items[i].id ||
    item.question !== b.items[i].question ||
    item.answer   !== b.items[i].answer,
  );
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

// ── ServiceViewStep ───────────────────────────────────────────────────────────
// Tabbed service detail drawer.
// Service tab  → Water Layer:  overview, description, features, FAQs.
// Commercial tab → Surface Layer: tier config, promo config, pricing summary.

export function ServiceViewStep({ ctx }: { ctx: StepContext }) {
  const service      = ctx.stepData.service      as ServiceItem;
  const packages     = ctx.stepData.packages     as SurfacePackageSummary[];
  const doOpen       = ctx.stepData.openAction   as (config: ActionConfig) => void;
  const allCategories = ctx.stepData.allCategories as Category[] ?? [];
  const onRefresh    = ctx.stepData.onRefresh    as (() => void) | undefined;

  const [tab, setTab] = useState<'service' | 'commercial'>('service');

  const station = useServiceStation(service, packages, onRefresh);
  const {
    isActive, canPublish, hasPendingModules, pendingModuleNames, moduleStatus,
    overviewStatus, inclusionsStatus, faqsStatus,
    overviewNotes, inclusionsNotes, faqsNotes,
    relatedPkg, inclusions, faqs, tiers, overviewDraft: stationOverviewDraft,
    pkgSummaryStatus, pkgSummaryCount, pkgSummaryDesc, pkgSummaryDescPending,
    promoStatus, promotionCount,
    inclSummary, faqsSummary,
    toggleActive, settleModules, publishService,
    saveOverview, saveInclusions, saveFaqs,
    revertOverview, revertInclusions, revertFaqs,
    createPackageIfMissing,
  } = station;

  // Drawer Principle v1 — module state machine: null = View, named value = Edit (InlineEditorShell active)
  const [editingSection,   setEditingSection]   = useState<'overview' | 'inclusions' | 'faqs' | null>(null);
  const [overviewDraft,    setOverviewDraft]    = useState<OverviewDraft | null>(null);
  const [inclusionsDraft,  setInclusionsDraft]  = useState<InclusionsDraft | null>(null);
  const [faqsDraft,        setFaqsDraft]        = useState<FaqsDraft | null>(null);
  // Snapshots taken at editor-open time for dirty detection — never mutated after init.
  const [overviewOriginal,   setOverviewOriginal]   = useState<OverviewDraft | null>(null);
  const [inclusionsOriginal, setInclusionsOriginal] = useState<InclusionsDraft | null>(null);
  const [faqsOriginal,       setFaqsOriginal]       = useState<FaqsDraft | null>(null);
  const [saving,             setSaving]           = useState(false);
  const [saveErr,            setSaveErr]          = useState<string | null>(null);
  const [saveOk,             setSaveOk]           = useState(false);
  const [showPublishModal,   setShowPublishModal] = useState(false);
  const [openPanel,          setOpenPanel]        = useState<'overview' | 'inclusions' | 'faqs' | null>(null);
  const [exitDialog,         setExitDialog]       = useState<'unsaved' | 'pending' | null>(null);
  const [exitSaving,         setExitSaving]       = useState(false);

  useEffect(() => {
    if (!saveOk) return;
    const t = setTimeout(() => setSaveOk(false), 3000);
    return () => clearTimeout(t);
  }, [saveOk]);

  const isEditorDirty =
    (editingSection === 'overview'   && overviewDraft   != null && overviewOriginal   != null && isOverviewDirty(overviewDraft, overviewOriginal))   ||
    (editingSection === 'inclusions' && inclusionsDraft != null && inclusionsOriginal != null && isInclusionsDirty(inclusionsDraft, inclusionsOriginal)) ||
    (editingSection === 'faqs'       && faqsDraft       != null && faqsOriginal       != null && isFaqsDirty(faqsDraft, faqsOriginal));

  const editingSectionLabel =
    editingSection === 'overview'   ? 'Service Overview'  :
    editingSection === 'inclusions' ? 'Included Features' :
    editingSection === 'faqs'       ? 'Common Questions'  : null;

  const handleToggleActive = useCallback(async () => {
    const result = await toggleActive();
    if (result) {
      ctx.setStepData('service', {
        ...service,
        meta: {
          ...service.meta,
          platform_status: result.platform_status,
          module_status:   result.module_status as any,
        },
      });
    }
  }, [toggleActive, service, ctx]);

  const handleSettleModules = useCallback(async () => {
    const result = await settleModules();
    if (result) {
      ctx.setStepData('service', {
        ...service,
        title:      result.service.title,
        excerpt:    result.service.excerpt,
        content:    result.service.content,
        categories: result.service.categories,
        inclusions: result.inclusions,
        faqs:       result.faqs,
      });
    }
  }, [settleModules, service, ctx]);

  const handlePublishService = useCallback(async () => {
    const result = await publishService();
    if (result) {
      ctx.setStepData('service', {
        ...service,
        ...(result.settled && result.service ? {
          title:      result.service.title,
          excerpt:    result.service.excerpt,
          content:    result.service.content,
          categories: result.service.categories,
          inclusions: result.inclusions ?? service.inclusions,
          faqs:       result.faqs ?? service.faqs,
        } : {}),
        meta: {
          ...service.meta,
          platform_status: result.platform_status,
          module_status:   result.module_status as any,
        },
      });
    }
  }, [publishService, service, ctx]);

  const openOverviewEditor = useCallback(() => {
    const wc = stationOverviewDraft;
    const draft: OverviewDraft = wc
      ? { title: wc.title, excerpt: wc.excerpt, content: wc.content, category_id: wc.category_ids[0] ?? null }
      : initOverviewDraft(service);
    setOverviewOriginal(draft);
    setOverviewDraft(draft);
    setEditingSection('overview');
    setOpenPanel(null);
    setSaveErr(null);
  }, [service, stationOverviewDraft]);

  const openInclusionsEditor = useCallback(() => {
    const draft: InclusionsDraft = { items: inclusions };
    setInclusionsOriginal(draft);
    setInclusionsDraft(draft);
    setEditingSection('inclusions');
    setOpenPanel(null);
    setSaveErr(null);
  }, [inclusions]);

  const openFaqsEditor = useCallback(() => {
    const draft: FaqsDraft = { items: faqs };
    setFaqsOriginal(draft);
    setFaqsDraft(draft);
    setEditingSection('faqs');
    setOpenPanel(null);
    setSaveErr(null);
  }, [faqs]);

  const handleCancelEdit = useCallback(() => {
    setEditingSection(null);
    setOverviewDraft(null);    setOverviewOriginal(null);
    setInclusionsDraft(null);  setInclusionsOriginal(null);
    setFaqsDraft(null);        setFaqsOriginal(null);
    setSaveErr(null);
    setSaving(false);
  }, []);

  const handleSaveOverview = useCallback(async () => {
    if (!overviewDraft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await saveOverview(overviewDraft);
      setOpenPanel(null);
      setEditingSection(null);
      setOverviewDraft(null);    setOverviewOriginal(null);
      setSaveOk(true);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }, [overviewDraft, saveOverview]);

  const handleSaveInclusions = useCallback(async () => {
    if (!inclusionsDraft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await saveInclusions(inclusionsDraft);
      setOpenPanel(null);
      setEditingSection(null);
      setInclusionsDraft(null);  setInclusionsOriginal(null);
      setSaveOk(true);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }, [inclusionsDraft, saveInclusions]);

  const handleSaveFaqs = useCallback(async () => {
    if (!faqsDraft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await saveFaqs(faqsDraft);
      setOpenPanel(null);
      setEditingSection(null);
      setFaqsDraft(null);  setFaqsOriginal(null);
      setSaveOk(true);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }, [faqsDraft, saveFaqs]);

  const handleOpenTierConfig = async () => {
    const pkg = await createPackageIfMissing(service.id, service.title);
    if (!pkg) return;
    const { pkgId, pkgTitle } = pkg;

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

  const pkgSummaryOnView = isActive && !station.loading.creating ? handleOpenTierConfig : undefined;

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

  const handleConfirmPublish = useCallback(async () => {
    setShowPublishModal(false);
    await (isActive ? handleSettleModules() : handlePublishService());
  }, [isActive, handleSettleModules, handlePublishService]);

  // ── Exit workflow helpers ─────────────────────────────────────────────────

  // Bypass the close guard — used after the admin explicitly acts on an exit dialog.
  const closeWithoutGuard = useCallback(() => {
    ctx.setCloseGuard(null);
    ctx.close();
  }, [ctx]);

  // Save whichever module is currently open and return the new module_status.
  // Throws on API failure so callers can surface the error.
  const saveCurrentModule = useCallback(async (): Promise<Record<string, string> | null> => {
    if (editingSection === 'overview'   && overviewDraft)   return saveOverview(overviewDraft);
    if (editingSection === 'inclusions' && inclusionsDraft) return saveInclusions(inclusionsDraft);
    if (editingSection === 'faqs'       && faqsDraft)       return saveFaqs(faqsDraft);
    return null;
  }, [editingSection, overviewDraft, inclusionsDraft, faqsDraft, saveOverview, saveInclusions, saveFaqs]);

  // "Save now" from the unsaved-changes exit dialog.
  // Saves the open module, then either shows the pending dialog or closes.
  const handleExitSaveAndProceed = useCallback(async () => {
    setExitSaving(true);
    setSaveErr(null);
    try {
      const newModuleStatus = await saveCurrentModule();
      setEditingSection(null);
      setOverviewDraft(null);    setOverviewOriginal(null);
      setInclusionsDraft(null);  setInclusionsOriginal(null);
      setFaqsDraft(null);        setFaqsOriginal(null);
      const stillPending = isActive && newModuleStatus != null && (
        newModuleStatus.overview   === 'pending' ||
        newModuleStatus.inclusions === 'pending' ||
        newModuleStatus.faqs       === 'pending'
      );
      if (stillPending) {
        setExitDialog('pending');
      } else {
        setExitDialog(null);
        closeWithoutGuard();
      }
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setExitSaving(false);
    }
  }, [saveCurrentModule, isActive, closeWithoutGuard]);

  // "Discard and close" from the unsaved-changes exit dialog.
  // Discards the draft immediately and closes — does not check pending modules.
  const handleExitDiscard = useCallback(() => {
    setEditingSection(null);
    setOverviewDraft(null);    setOverviewOriginal(null);
    setInclusionsDraft(null);  setInclusionsOriginal(null);
    setFaqsDraft(null);        setFaqsOriginal(null);
    setSaveErr(null);
    setSaving(false);
    setExitDialog(null);
    closeWithoutGuard();
  }, [closeWithoutGuard]);

  // "Settle Changes" from the pending-modules exit dialog.
  const handleExitSettle = useCallback(async () => {
    setExitSaving(true);
    try {
      await handleSettleModules();
      setExitDialog(null);
      closeWithoutGuard();
    } finally {
      setExitSaving(false);
    }
  }, [handleSettleModules, closeWithoutGuard]);

  // ── Close guard registration ──────────────────────────────────────────────
  // Registered once; reads current state via ref to avoid stale closures.
  const exitStateRef = useRef({ editingSection, isEditorDirty, isActive, hasPendingModules });
  useEffect(() => {
    exitStateRef.current = { editingSection, isEditorDirty, isActive, hasPendingModules };
  });

  const { setCloseGuard } = ctx;
  useEffect(() => {
    setCloseGuard(() => {
      const s = exitStateRef.current;
      if (s.editingSection && s.isEditorDirty) {
        setExitDialog('unsaved');
        return false;
      }
      if (s.isActive && s.hasPendingModules) {
        setExitDialog('pending');
        return false;
      }
      return true;
    });
    return () => setCloseGuard(null);
  }, [setCloseGuard]);

  const handleToggleActiveRef = useRef(handleToggleActive);
  handleToggleActiveRef.current = handleToggleActive;

  useEffect(() => {
    const { setFooter, close } = ctx;
    setFooter(
      <div class="cz-tf-footer">
        {tab === 'service' && (
          isActive ? (
            <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={() => handleToggleActiveRef.current()} disabled={station.loading.status}>
              {station.loading.status ? '…' : 'Disable Service'}
            </button>
          ) : (
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => handleToggleActiveRef.current()} disabled={station.loading.status}>
              {station.loading.status ? '…' : 'Enable Service'}
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
            disabled={!canPublish || station.loading.status}
          >
            {station.loading.status ? '…' : isActive ? 'Settle Changes' : 'Publish Service'}
          </button>
        )}
      </div>
    );
    return () => setFooter(null);
  }, [tab, isActive, station.loading.status, canPublish, ctx.setFooter, ctx.close]);

  // ── Pre-resolved display values for view cards ────────────────────────────
  const rawDisplayTitle = stationOverviewDraft?.title.trim() || service.title.trim() || '';
  const displayTitle    = rawDisplayTitle ? decodeHtml(rawDisplayTitle) : '';
  const displayExcerpt  = stationOverviewDraft?.excerpt.trim() || service.excerpt?.trim() || '';
  const displayContent  = stationOverviewDraft?.content.trim() || service.content?.trim() || '';
  const displayCategory = stationOverviewDraft
    ? (allCategories.find(c => stationOverviewDraft.category_ids.includes(c.id ?? -1))?.name ?? 'Not selected')
    : (service.categories[0]?.name ?? 'Not selected');
  const decodedServiceTitle = decodeHtml(service.title);

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
          <ServiceOverviewViewCard
            status={overviewStatus}
            notes={overviewNotes}
            panelOpen={openPanel === 'overview'}
            onTogglePanel={() => setOpenPanel(p => p === 'overview' ? null : 'overview')}
            displayTitle={displayTitle}
            displayExcerpt={displayExcerpt}
            displayContent={displayContent}
            displayCategory={displayCategory}
            isPending={moduleStatus?.overview === 'pending'}
            onEdit={openOverviewEditor}
            onRevert={revertOverview}
          />
          {/* ── / Service Level Module: Service Overview ─────────────────────────── */}


          {/* ── Service Level Module: Included Features ──────────────────────────── */}
          <ServiceInclusionsViewCard
            status={inclusionsStatus}
            notes={inclusionsNotes}
            panelOpen={openPanel === 'inclusions'}
            onTogglePanel={() => setOpenPanel(p => p === 'inclusions' ? null : 'inclusions')}
            inclusions={inclusions}
            serviceTitle={decodedServiceTitle}
            isPending={moduleStatus?.inclusions === 'pending'}
            onEdit={openInclusionsEditor}
            onRevert={revertInclusions}
          />
          {/* ── / Service Level Module: Included Features ────────────────────────── */}

          {/* ── Service Level Module: Common Questions ───────────────────────────── */}
          <ServiceFaqsViewCard
            status={faqsStatus}
            notes={faqsNotes}
            panelOpen={openPanel === 'faqs'}
            onTogglePanel={() => setOpenPanel(p => p === 'faqs' ? null : 'faqs')}
            faqs={faqs}
            serviceTitle={decodedServiceTitle}
            isPending={moduleStatus?.faqs === 'pending'}
            onEdit={openFaqsEditor}
            onRevert={revertFaqs}
          />
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

    {/* ── Publish / Settle confirmation modal ──────────────────────────────── */}
    {showPublishModal && (
      <div
        class="cz-publish-confirm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) setShowPublishModal(false); }}
      >
        <div class="cz-publish-confirm">
          <div class="cz-publish-confirm__header">
            <h3 class="cz-publish-confirm__title">
              {isActive
                ? `Settle changes to ${decodeHtml(service.title)}?`
                : `Ready to publish ${decodeHtml(service.title)}?`}
            </h3>
          </div>
          <div class="cz-publish-confirm__body">
            <p class="cz-publish-confirm__lead">
              {isActive
                ? 'This confirms the current live content as the settled state for each module.'
                : 'You are about to publish this service and make it visible in the catalog.'}
            </p>
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
              disabled={station.loading.status}
            >
              Cancel
            </button>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--primary"
              onClick={handleConfirmPublish}
              disabled={station.loading.status}
            >
              {station.loading.status ? '…' : isActive ? 'Settle' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Unsaved-changes exit dialog ──────────────────────────────────────── */}
    {exitDialog === 'unsaved' && (
      <div
        class="cz-publish-confirm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) setExitDialog(null); }}
      >
        <div class="cz-publish-confirm">
          <div class="cz-publish-confirm__header">
            <h3 class="cz-publish-confirm__title">Unsaved changes</h3>
          </div>
          <div class="cz-publish-confirm__body">
            <p class="cz-publish-confirm__lead">
              You have unsaved changes in <strong>{editingSectionLabel}</strong>.
              Closing will discard them.
            </p>
            {saveErr && <p class="cz-admin-error-msg" style="margin-top:var(--cz-space-2)">{saveErr}</p>}
          </div>
          <div class="cz-publish-confirm__footer">
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary"
              onClick={handleExitDiscard}
              disabled={exitSaving}
            >
              Discard and close
            </button>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--primary"
              onClick={handleExitSaveAndProceed}
              disabled={exitSaving}
            >
              {exitSaving ? 'Saving…' : 'Save now'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Pending-modules exit dialog ───────────────────────────────────────── */}
    {exitDialog === 'pending' && (
      <div
        class="cz-publish-confirm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) setExitDialog(null); }}
      >
        <div class="cz-publish-confirm">
          <div class="cz-publish-confirm__header">
            <h3 class="cz-publish-confirm__title">Unsettled modules</h3>
          </div>
          <div class="cz-publish-confirm__body">
            <p class="cz-publish-confirm__lead">
              The following modules have live changes that have not been settled:
            </p>
            <ul class="cz-publish-confirm__summary">
              {pendingModuleNames.map((name) => (
                <li key={name}><strong>{name}</strong> — Pending</li>
              ))}
            </ul>
            <p style="margin-top:var(--cz-space-3);font-size:var(--cz-text-sm);color:var(--admin-text-secondary)">
              Changes are saved as a draft and not yet live. Settle now to publish them,
              or close and return later.
            </p>
          </div>
          <div class="cz-publish-confirm__footer">
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary"
              onClick={() => { setExitDialog(null); closeWithoutGuard(); }}
              disabled={exitSaving}
            >
              Close without settling
            </button>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--primary"
              onClick={handleExitSettle}
              disabled={exitSaving}
            >
              {exitSaving ? 'Settling…' : 'Settle Changes'}
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
        isDirty={isEditorDirty}
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
        isDirty={isEditorDirty}
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
        isDirty={isEditorDirty}
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
