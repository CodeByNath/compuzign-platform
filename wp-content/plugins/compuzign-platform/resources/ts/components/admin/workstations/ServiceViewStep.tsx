import { useEffect, useState, useCallback, useRef } from 'preact/hooks';
import { Spinner } from '@/components/ui/Spinner';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { Category, ServiceItem, TierId } from '@/api/types/cost-builder';
import {
  fetchSurfacePackageDetail,
  fetchServicePackageStation,
  saveServicePackageStationTier,
  setServicePackageStationTierEnabled,
  fetchServicePromotionStation,
  createServicePromotion,
  saveServicePromotion,
  archiveServicePromotion,
  reactivateServicePromotion,
  updateServiceCategory,
} from '@/api/endpoints/admin';
import type {
  SurfacePackageDetailResponse,
  SurfacePackageSummary,
  PromotionTier,
  PromotionTierPayload,
  ServicePackageStationResponse,
  ServicePromotionStationResponse,
  SurfaceTierDetail,
  InclusionItem,
  FaqItem,
} from '@/api/types/admin';
import { useApi } from '@/hooks/useApi';
import { TierManageStep } from './SurfacePackagesWorkstation';
import { PromotionViewStep } from './PromotionsWorkstation';
import { resolveTierStatus, statusDotColor } from '@/components/admin/utils/moduleStatus';
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
import { ServiceContextPanel } from '../views/ServiceContextPanel';
import { ModuleStatusPill } from '../ui/ModuleStatusPill';
import { ModuleNotificationPanel } from '../ui/ModuleNotificationPanel';
import {
  getPackageNotes,
  getTierNotes,
  evaluateModule,
  tierOverviewModule,
  tierFeaturesModule,
  tierFaqsModule,
} from '@/components/admin/utils/moduleNotifications';

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
  'active':   { dot: 'var(--admin-success)',    cls: 'cz-module-status-pill--active',   label: 'Active'   },
  'archived': { dot: 'var(--admin-error)',      cls: 'cz-module-status-pill--inactive', label: 'Archived' },
  'draft':    { dot: 'var(--admin-text-faint)', cls: 'cz-module-status-pill--draft',    label: 'Draft'    },
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
    <div class="drawerModule">
      <div class="drawerModule__header">
        <div class="drawerModule__heading">
          <p class="drawerModule__title">{label}</p>
        </div>
        <div class={`drawerModule__status${status === 'pending-dim' ? ' drawerModule__status--dim' : ''}`}>
          <ModuleStatusPill status={status} notes={[]} />
        </div>
      </div>
      <div class="drawerModule__body">
        <div class="drawerModule__empty">
          <p class="drawerModule__empty-title">{count}</p>
          <p
            class="drawerModule__empty-copy"
            style={descHighlight ? 'color:var(--admin-warning)' : undefined}
          >
            {desc}
          </p>
        </div>
      </div>
      <div class="drawerModule__footer">
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
  // Single-open accordion for the tier cards' notification panels.
  const [openTierPanel, setOpenTierPanel] = useState<string | null>(null);

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

  // Context-aware tab ordering: the originating context (initialTab) renders first
  // and active. Establishes the navigation rule for future tabs (Campaigns, etc.).
  const TAB_LABELS: Record<'packages' | 'promotions', string> = {
    packages:   'Packages',
    promotions: 'Promotions',
  };
  const orderedTabs: Array<'packages' | 'promotions'> = initialTab === 'promotions'
    ? ['promotions', 'packages']
    : ['packages', 'promotions'];

  return (
    <div class="cz-req-detail">

      {/* Tab bar — originating context first */}
      <div class="cz-sv-tabs">
        {orderedTabs.map((t) => (
          <button
            key={t}
            type="button"
            class={`cz-sv-tab${tab === t ? ' cz-sv-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
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
            const featLabel  = `${inclCount} ${inclCount === 1 ? 'feature' : 'features'}`;
            const faqLabel   = `${faqCount} ${faqCount === 1 ? 'common question' : 'common questions'}`;
            const tierNotes  = getTierNotes(tier, { platformStatus: pkg.platform_status ?? 'disabled' });
            return (
              <div key={tierId} class="drawerModule">
                <div class="drawerModule__header">
                  <div class="drawerModule__heading">
                    <p class="drawerModule__title">Package {TIER_LABELS[tierId]}</p>
                    {tier?.label?.trim() && (
                      <p class="drawerModule__subtitle">{tier.label}</p>
                    )}
                  </div>
                  <div class={`drawerModule__status${status === 'pending-dim' ? ' drawerModule__status--dim' : ''}`}>
                    <ModuleStatusPill
                      status={status}
                      notes={tierNotes}
                      onOpen={() => setOpenTierPanel(p => p === tierId ? null : tierId)}
                    />
                  </div>
                </div>
                {openTierPanel === tierId && tierNotes.length > 0 && (
                  <ModuleNotificationPanel notes={tierNotes} />
                )}
                <div class="drawerModule__body">
                  <div class="drawerModule__empty">
                    <p class="drawerModule__empty-title">Tier summary</p>
                    {showData ? (
                      <p class="drawerModule__empty-copy">
                        Price:{' '}
                        <span style={priceOk ? undefined : 'color:var(--admin-warning)'}>{priceText}</span>
                        {' · '}
                        <span style={cycleOk ? undefined : 'color:var(--admin-warning)'}>{cycleText}</span>
                      </p>
                    ) : (
                      <p class="drawerModule__empty-copy">View Tier Overview and manage pricing.</p>
                    )}
                    <p class="drawerModule__empty-copy" style="color:var(--admin-text-faint)">
                      Includes: {featLabel} | {faqLabel}
                    </p>
                  </div>
                </div>
                <div class="drawerModule__footer">
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
                <div key={promo.id} class="drawerModule">
                  <div class="drawerModule__header">
                    <div class="drawerModule__heading">
                      <p class="drawerModule__title">{promo.name || '(unnamed)'}</p>
                      <p class="drawerModule__subtitle">
                        {promo.based_on ? `Based on ${TIER_LABELS[promo.based_on] ?? promo.based_on}` : 'No base tier.'}
                        {promo.price != null ? ` · $${promo.price.toLocaleString()}` : ''}
                      </p>
                    </div>
                    <div class="drawerModule__status">
                      <span class="cz-admin-status-dot" style={`color:${ps.dot}`} />
                      <span class={`cz-module-status-pill ${ps.cls}`}>{ps.label}</span>
                    </div>
                  </div>
                  <div class="drawerModule__footer">
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
          <div class="cz-shell-section">
            <div class="drawerModule">
              <div class="drawerModule__header">
                <div class="drawerModule__heading">
                  <p class="drawerModule__title">Promotions</p>
                </div>
              </div>
              <div class="drawerModule__body">
                <div class="drawerModule__empty">
                  <p class="drawerModule__empty-title">No promotions configured</p>
                  <p class="drawerModule__empty-copy">Add from the Promotions workstation.</p>
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
    platformStatus, isActive, detailLoaded, canPublish, hasPendingModules, pendingModuleNames, moduleStatus,
    hasInclusionsDraft, hasFaqsDraft,
    overviewStatus, inclusionsStatus, faqsStatus,
    overviewNotes, inclusionsNotes, faqsNotes,
    relatedPkg, inclusions, faqs, tiers, overviewDraft: stationOverviewDraft, settledOverview,
    pkgSummaryStatus, pkgSummaryCount, pkgSummaryDesc, pkgSummaryDescPending,
    promoStatus, promotionCount,
    inclSummary, faqsSummary,
    toggleActive, archiveStation, trashStation, settleModules, publishService,
    saveOverview, saveInclusions, saveFaqs,
    revertOverview, revertInclusions, revertFaqs,
    createPackageIfMissing,
  } = station;

  // Drawer Principle v1 — module state machine: null = View, named value = Edit (InlineEditorShell active)
  const [editingSection,   setEditingSection]   = useState<'overview' | 'inclusions' | 'faqs' | null>(null);
  const [overviewDraft,    setOverviewDraft]    = useState<OverviewDraft | null>(null);
  const [inclusionsDraft,  setInclusionsDraft]  = useState<InclusionsDraft | null>(null);
  const [faqsDraft,        setFaqsDraft]        = useState<FaqsDraft | null>(null);
  // Category description for the overview editor — lifted from ServiceOverviewEditor.
  const [catDesc,         setCatDesc]         = useState('');
  const [catDescOriginal, setCatDescOriginal] = useState('');
  // Local, mutable category list seeded from the passed-in snapshot. Patched on
  // category-description save so reopening the editor in the same drawer session
  // reads the just-saved description instead of the stale prop. Mirrors ServiceCreateStep.
  const [localCategories, setLocalCategories] = useState<Category[]>(allCategories);
  // Snapshots taken at editor-open time for dirty detection — never mutated after init.
  const [overviewOriginal,   setOverviewOriginal]   = useState<OverviewDraft | null>(null);
  const [inclusionsOriginal, setInclusionsOriginal] = useState<InclusionsDraft | null>(null);
  const [faqsOriginal,       setFaqsOriginal]       = useState<FaqsDraft | null>(null);
  const [saving,             setSaving]           = useState(false);
  const [saveErr,            setSaveErr]          = useState<string | null>(null);
  const [saveOk,             setSaveOk]           = useState(false);
  const [showPublishModal,   setShowPublishModal] = useState(false);
  const [discardConfirm,     setDiscardConfirm]   = useState<'overview' | 'inclusions' | 'faqs' | null>(null);
  const [openPanel,          setOpenPanel]        = useState<'overview' | 'inclusions' | 'faqs' | 'package' | null>(null);
  const [exitDialog,         setExitDialog]       = useState<'unsaved' | 'pending' | 'new-service-draft' | null>(null);
  const [exitSaving,         setExitSaving]       = useState(false);
  const [splitOpen,          setSplitOpen]        = useState(false);
  const [newSvcFields,       setNewSvcFields]     = useState({ title: false, category: false, description: false });

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
    // Seed order: existing draft → authoritative settled overview (adminDetail) →
    // minimal catalog handoff service (last resort). The handoff service carries
    // empty content, so seeding from it would open the editor blank and let a save
    // of any other field overwrite the live description with empty.
    let draft: OverviewDraft;
    if (wc) {
      draft = { title: wc.title, excerpt: wc.excerpt, content: wc.content, category_id: wc.category_ids[0] ?? null };
    } else if (settledOverview) {
      draft = {
        title:       settledOverview.title,
        excerpt:     settledOverview.excerpt,
        content:     settledOverview.content,
        category_id: settledOverview.categories[0]?.id ?? null,
      };
    } else {
      draft = initOverviewDraft(service);
    }
    const catId = draft.category_id;
    const desc  = catId ? (localCategories.find(c => c.id === catId)?.description ?? '') : '';
    setCatDesc(desc);
    setCatDescOriginal(desc);
    setOverviewOriginal(draft);
    setOverviewDraft(draft);
    setEditingSection('overview');
    setOpenPanel(null);
    setSaveErr(null);
  }, [service, stationOverviewDraft, settledOverview, localCategories]);

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
    setCatDesc(catDescOriginal);
    setSaveErr(null);
    setSaving(false);
  }, [catDescOriginal]);

  const handleSaveOverview = useCallback(async () => {
    if (!overviewDraft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await saveOverview(overviewDraft);
      if (overviewDraft.category_id !== null && catDesc.trim() !== catDescOriginal.trim()) {
        await updateServiceCategory(overviewDraft.category_id, { description: catDesc.trim() });
        // Patch the saved description into the local list so an in-session editor
        // reopen reads the new value instead of the stale snapshot.
        const savedCatId = overviewDraft.category_id;
        const savedDesc  = catDesc.trim();
        setLocalCategories(prev => prev.map(c => c.id === savedCatId ? { ...c, description: savedDesc } : c));
      }
      setCatDescOriginal(catDesc);
      setOpenPanel(null);
      setEditingSection(null);
      setOverviewDraft(null);    setOverviewOriginal(null);
      setSaveOk(true);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }, [overviewDraft, catDesc, catDescOriginal, saveOverview]);

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
    const onBack = () => doOpen({
      id:       `service-view-${service.id}`,
      mode:     'drawer',
      title:    decodeHtml(service.title),
      titleDot: `var(--admin-${isActive ? 'success' : 'error'})`,
      initialStepData: { service, packages, openAction: doOpen, allCategories, onRefresh },
      steps: [{ id: 'detail', title: 'Service Detail', component: ServiceViewStep }],
    });

    if (relatedPkg) {
      // Legacy path: service has a cz_surface_package post — use existing Package drawer.
      const pkg = await createPackageIfMissing(service.id, service.title);
      if (!pkg) return;
      const { pkgId, pkgTitle } = pkg;
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
    } else {
      // Phase 2 path: service born after Phase 1 — use Service Station-owned tier editing.
      ctx.close();
      doOpen({
        id:             `service-tiers-${service.id}`,
        mode:           'drawer',
        title:          decodeHtml(service.title),
        onBack,
        hideStepHeader: true,
        initialStepData: { serviceId: service.id, service, openAction: doOpen, onRefresh },
        steps: [{ id: 'service-tiers', title: 'Tier Configuration', component: ServiceTierStep }],
      });
    }
  };

  const pkgSummaryOnView = isActive && !station.loading.creating ? handleOpenTierConfig : undefined;

  const handleOpenPromoConfig = () => {
    const onBack = () => doOpen({
      id:       `service-view-${service.id}`,
      mode:     'drawer',
      title:    decodeHtml(service.title),
      titleDot: `var(--admin-${isActive ? 'success' : 'error'})`,
      initialStepData: { service, packages, openAction: doOpen, allCategories, onRefresh },
      steps: [{ id: 'detail', title: 'Service Detail', component: ServiceViewStep }],
    });

    if (relatedPkg) {
      // Legacy path: service has a cz_surface_package post — open Package drawer on promotions tab.
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
    } else {
      // Phase 4 path: service born after Phase 1 — use Service Station-owned promotion editing.
      ctx.close();
      doOpen({
        id:             `service-promos-${service.id}`,
        mode:           'drawer',
        title:          decodeHtml(service.title),
        onBack,
        hideStepHeader: true,
        initialStepData: { serviceId: service.id, service, openAction: doOpen, onRefresh },
        steps: [{ id: 'service-promos', title: 'Promotions', component: ServicePromotionStep }],
      });
    }
  };

  const handleConfirmPublish = useCallback(async () => {
    setShowPublishModal(false);
    await (isActive ? handleSettleModules() : handlePublishService());
  }, [isActive, handleSettleModules, handlePublishService]);

  const handleConfirmDiscard = useCallback(async () => {
    const module = discardConfirm;
    setDiscardConfirm(null);
    if (module === 'overview')   await revertOverview();
    if (module === 'inclusions') await revertInclusions();
    if (module === 'faqs')       await revertFaqs();
  }, [discardConfirm, revertOverview, revertInclusions, revertFaqs]);

  // ── New never-published service detection ──────────────────────────────────
  // platform_status is 'disabled' and overview has never been settled.
  // Used to drive the "Pending" table status, the "Move to Trash" footer action,
  // and the new-service exit prompt.
  const isNewNeverPublished = platformStatus === 'disabled' && moduleStatus?.overview !== 'settled';

  // ── Exit workflow helpers ─────────────────────────────────────────────────

  // Bypass the close guard — used after the admin explicitly acts on an exit dialog.
  const closeWithoutGuard = useCallback(() => {
    ctx.setCloseGuard(null);
    ctx.close();
  }, [ctx]);

  // ── New-service exit prompt handlers ──────────────────────────────────────

  const handleNewSvcSaveDraft = useCallback(async () => {
    if (!stationOverviewDraft) return;
    setExitSaving(true);
    try {
      // Unchecked fields fall back to the existing draft value — nothing is wiped.
      // Checked fields are explicitly confirmed; unchecked fields are preserved as-is.
      const draft: OverviewDraft = {
        title:       newSvcFields.title       ? stationOverviewDraft.title                      : stationOverviewDraft.title,
        excerpt:     stationOverviewDraft.excerpt ?? '',
        content:     newSvcFields.description ? stationOverviewDraft.content                    : stationOverviewDraft.content,
        category_id: newSvcFields.category    ? (stationOverviewDraft.category_ids[0] ?? null)  : (stationOverviewDraft.category_ids[0] ?? null),
      };
      await saveOverview(draft);
      setExitDialog(null);
      setNewSvcFields({ title: false, category: false, description: false });
      closeWithoutGuard();
    } finally {
      setExitSaving(false);
    }
  }, [newSvcFields, stationOverviewDraft, saveOverview, closeWithoutGuard]);

  const handleNewSvcTrash = useCallback(async () => {
    setExitDialog(null);
    setNewSvcFields({ title: false, category: false, description: false });
    const result = await trashStation();
    // Bypass the close guard — trashing is terminal and must not re-open the exit dialog.
    if (result) closeWithoutGuard();
  }, [trashStation, closeWithoutGuard]);

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
  const exitStateRef = useRef({ editingSection, isEditorDirty, isActive, hasPendingModules, isNewNeverPublished, stationOverviewDraft });
  useEffect(() => {
    exitStateRef.current = { editingSection, isEditorDirty, isActive, hasPendingModules, isNewNeverPublished, stationOverviewDraft };
  });

  const { setCloseGuard } = ctx;
  useEffect(() => {
    setCloseGuard(() => {
      const s = exitStateRef.current;
      if (s.editingSection && s.isEditorDirty) {
        setExitDialog('unsaved');
        return false;
      }
      // New never-published service with a saved draft — ask what to keep before leaving.
      if (s.isNewNeverPublished && s.stationOverviewDraft !== null) {
        setExitDialog('new-service-draft');
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

  // Close split dropdown when clicking outside (only active while open)
  useEffect(() => {
    if (!splitOpen) return;
    const handle = () => setSplitOpen(false);
    const t = setTimeout(() => document.addEventListener('click', handle), 0);
    return () => { clearTimeout(t); document.removeEventListener('click', handle); };
  }, [splitOpen]);

  const handleArchive = useCallback(async () => {
    setSplitOpen(false);
    const result = await archiveStation();
    // Terminal action — bypass the close guard so a new-never-published draft does
    // not re-trigger the exit dialog and trap the drawer on the archived service.
    if (result) closeWithoutGuard();
  }, [archiveStation, closeWithoutGuard]);

  const handleTrash = useCallback(async () => {
    setSplitOpen(false);
    const result = await trashStation();
    // Terminal action — bypass the close guard so a new-never-published draft does
    // not re-trigger the exit dialog and loop back into the trashed service.
    if (result) closeWithoutGuard();
  }, [trashStation, closeWithoutGuard]);

  const handleArchiveRef = useRef(handleArchive);
  handleArchiveRef.current = handleArchive;

  const handleTrashRef = useRef(handleTrash);
  handleTrashRef.current = handleTrash;

  useEffect(() => {
    const { setFooter, close } = ctx;
    const isLiveState = platformStatus === 'active' || platformStatus === 'disabled';

    // Enable/Disable is only meaningful once a service has been published at least once.
    // New drafts (overview never settled, never active) leave it disabled to prevent the
    // admin needing to Enable before Publish. After publishing succeeds the flag flips
    // reactively; if publishing fails the flag remains false.
    const hasBeenPublished =
      overviewStatus === 'active' || moduleStatus?.overview === 'settled';

    setFooter(
      <div class="cz-tf-footer">
        {/* Split button — visible for active/disabled states */}
        {tab === 'service' && isLiveState && (
          <div class={`cz-footer-split${platformStatus === 'active' ? ' cz-footer-split--danger' : ' cz-footer-split--secondary'}`}>
            {/* Primary action:
                Active         → Disable
                Disabled+published → Enable
                New never-published → Move to Trash */}
            <button
              type="button"
              class="cz-footer-split__btn"
              disabled={station.loading.status}
              onClick={() => {
                if (isNewNeverPublished) handleTrashRef.current();
                else handleToggleActiveRef.current();
              }}
            >
              {station.loading.status
                ? '…'
                : platformStatus === 'active'
                  ? 'Disable'
                  : isNewNeverPublished
                    ? 'Move to Trash'
                    : 'Enable'}
            </button>
            {/* Chevron — opens lifecycle dropdown */}
            <button
              type="button"
              class="cz-footer-split__chevron"
              disabled={station.loading.status}
              onClick={(e) => { e.stopPropagation(); setSplitOpen((v) => !v); }}
              aria-label="More actions"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
              </svg>
            </button>
            {/* Dropdown: Archive + Trash. Trigger always opens; each action gates itself.
                Archive is only meaningful once published; Trash is always available. */}
            {splitOpen && (
              <div class="cz-footer-split__menu">
                <button
                  type="button"
                  class="cz-footer-split__item"
                  disabled={!hasBeenPublished || station.loading.status}
                  onClick={() => handleArchiveRef.current()}
                >
                  Archive
                </button>
                {/* Move to Trash is the primary action for new never-published drafts —
                    don't repeat it inside the dropdown in that state. */}
                {!isNewNeverPublished && (
                  <button
                    type="button"
                    class="cz-footer-split__item cz-footer-split__item--danger"
                    disabled={station.loading.status}
                    onClick={() => handleTrashRef.current()}
                  >
                    Move to Trash
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={close}>
          Cancel
        </button>
        <div class="cz-tf-footer__spacer" />
        {/* Publish — available when canPublish; no longer gated on platformStatus */}
        {tab === 'service' && isLiveState && (
          <button
            type="button"
            class="cz-admin-btn cz-admin-btn--primary"
            onClick={() => setShowPublishModal(true)}
            disabled={!canPublish || station.loading.status}
          >
            {station.loading.status ? '…' : 'Publish'}
          </button>
        )}
      </div>
    );
    return () => setFooter(null);
  }, [tab, platformStatus, splitOpen, station.loading.status, canPublish, overviewStatus, moduleStatus, ctx.setFooter, ctx.close]);

  // ── Pre-resolved display values for view cards ────────────────────────────
  // Fallback order mirrors the status path: draft → adminDetail settled → CostBuilder service.
  const rawDisplayTitle = stationOverviewDraft?.title.trim() || settledOverview?.title.trim() || service.title.trim() || '';
  const displayTitle    = rawDisplayTitle ? decodeHtml(rawDisplayTitle) : '';
  const displayExcerpt  = stationOverviewDraft?.excerpt.trim() || settledOverview?.excerpt?.trim() || service.excerpt?.trim() || '';
  const displayContent  = stationOverviewDraft?.content.trim() || settledOverview?.content?.trim() || service.content?.trim() || '';
  const displayCategory = stationOverviewDraft
    ? decodeHtml(allCategories.find(c => stationOverviewDraft.category_ids.includes(c.id ?? -1))?.name ?? 'Not selected')
    : decodeHtml(settledOverview?.categories[0]?.name ?? service.categories[0]?.name ?? 'Not selected');
  const decodedServiceTitle = decodeHtml(service.title);

  // Package Summary notes — module-owned, mirrors the Service module view cards.
  const packageNotes = getPackageNotes(relatedPkg, { platformStatus });

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
            status={detailLoaded ? overviewStatus : 'loading'}
            notes={detailLoaded ? overviewNotes : []}
            panelOpen={openPanel === 'overview'}
            onTogglePanel={() => setOpenPanel(p => p === 'overview' ? null : 'overview')}
            displayTitle={displayTitle}
            displayExcerpt={displayExcerpt}
            displayContent={displayContent}
            displayCategory={displayCategory}
            hasDraft={moduleStatus?.overview === 'pending' && stationOverviewDraft !== null}
            onEdit={openOverviewEditor}
            onDiscard={() => setDiscardConfirm('overview')}
          />
          {/* ── / Service Level Module: Service Overview ─────────────────────────── */}


          {/* ── Service Level Module: Included Features ──────────────────────────── */}
          <ServiceInclusionsViewCard
            status={detailLoaded ? inclusionsStatus : 'loading'}
            notes={detailLoaded ? inclusionsNotes : []}
            panelOpen={openPanel === 'inclusions'}
            onTogglePanel={() => setOpenPanel(p => p === 'inclusions' ? null : 'inclusions')}
            inclusions={inclusions}
            serviceTitle={decodedServiceTitle}
            hasDraft={moduleStatus?.inclusions === 'pending' && hasInclusionsDraft}
            onEdit={openInclusionsEditor}
            onDiscard={() => setDiscardConfirm('inclusions')}
          />
          {/* ── / Service Level Module: Included Features ────────────────────────── */}

          {/* ── Service Level Module: Common Questions ───────────────────────────── */}
          <ServiceFaqsViewCard
            status={detailLoaded ? faqsStatus : 'loading'}
            notes={detailLoaded ? faqsNotes : []}
            panelOpen={openPanel === 'faqs'}
            onTogglePanel={() => setOpenPanel(p => p === 'faqs' ? null : 'faqs')}
            faqs={faqs}
            serviceTitle={decodedServiceTitle}
            hasDraft={moduleStatus?.faqs === 'pending' && hasFaqsDraft}
            onEdit={openFaqsEditor}
            onDiscard={() => setDiscardConfirm('faqs')}
          />
          {/* ── / Service Level Module: Common Questions ──────────────────────────── */}
        </>
      )}

      {/* ── Commercial tab: Surface Layer ─────────────────────────────── */}
      {tab === 'commercial' && (
        <>
          {/* ── Commercial Module: Package Summary ───────────────────────────────── */}
          <div class="drawerModule">
            <div class="drawerModule__header">
              <span class="drawerModule__icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="drawerModule__icon-svg"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M12.378 1.602a.75.75 0 00-.756 0L3.366 6.39a.75.75 0 000 1.298l8.256 4.768a.75.75 0 00.756 0l8.256-4.768a.75.75 0 000-1.298L12.378 1.602zM3 9.46v7.788a.75.75 0 00.378.65l8.25 4.764V13.41L3 9.46zm9.75 13.452l8.25-4.764a.75.75 0 00.378-.65V9.46l-8.628 4.984v8.468z" />
                </svg>
              </span>
              <div class="drawerModule__heading">
                <p class="drawerModule__title">Package Summary</p>
                <p class="drawerModule__subtitle">Pricing and tiers for this service.</p>
              </div>
              <div class={`drawerModule__status${(detailLoaded ? pkgSummaryStatus : 'loading') === 'pending-dim' ? ' drawerModule__status--dim' : ''}`}>
                <ModuleStatusPill
                  status={detailLoaded ? pkgSummaryStatus : 'loading'}
                  notes={detailLoaded ? packageNotes : []}
                  onOpen={() => setOpenPanel(p => p === 'package' ? null : 'package')}
                />
              </div>
            </div>
            {openPanel === 'package' && packageNotes.length > 0 && (
              <ModuleNotificationPanel notes={packageNotes} />
            )}
            <div class="drawerModule__body">
              <div class="drawerModule__empty">
                <p class="drawerModule__empty-title">{pkgSummaryCount}</p>
                <p
                  class="drawerModule__empty-copy"
                  style={pkgSummaryDescPending ? 'color:var(--admin-warning)' : undefined}
                >
                  {pkgSummaryDesc}
                </p>
              </div>
            </div>
            <div class="drawerModule__footer">
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                onClick={pkgSummaryOnView}
                disabled={!pkgSummaryOnView}
              >
                View
              </button>
            </div>
          </div>
          {/* ── / Commercial Module: Package Summary ─────────────────────────────── */}
          <CommercialBlock
            label="Promotion Configuration"
            count={relatedPkg
              ? `${promotionCount} promotion${promotionCount !== 1 ? 's' : ''} configured`
              : '0 promotions configured'}
            desc={relatedPkg
              ? 'Promotions are managed in the Promotions workstation.'
              : 'Create and manage promotions for this service.'}
            status={promoStatus}
            onView={handleOpenPromoConfig}
          />
          {relatedPkg && tiers && (
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

    {/* ── Discard draft confirmation modal ────────────────────────────────── */}
    {discardConfirm && (
      <div
        class="cz-publish-confirm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) setDiscardConfirm(null); }}
      >
        <div class="cz-publish-confirm">
          <div class="cz-publish-confirm__header">
            <h3 class="cz-publish-confirm__title">Discard draft?</h3>
          </div>
          <div class="cz-publish-confirm__body">
            <p class="cz-publish-confirm__lead">
              This will remove the saved draft and return this module to its last settled version.
            </p>
          </div>
          <div class="cz-publish-confirm__footer">
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary"
              onClick={() => setDiscardConfirm(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--danger"
              onClick={handleConfirmDiscard}
            >
              Discard Draft
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

    {/* ── New never-published service exit prompt ──────────────────────────── */}
    {exitDialog === 'new-service-draft' && (
      <div
        class="cz-publish-confirm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) setExitDialog(null); }}
      >
        <div class="cz-publish-confirm">
          <div class="cz-publish-confirm__header">
            <h3 class="cz-publish-confirm__title">Before you leave</h3>
          </div>
          <div class="cz-publish-confirm__body">
            <p class="cz-publish-confirm__lead">
              Select the fields you want to keep in your draft.
            </p>
            <div style="display:flex;flex-direction:column;gap:var(--cz-space-3);margin-top:var(--cz-space-3)">
              {[
                { key: 'title',       label: 'Title',       value: stationOverviewDraft?.title || '(empty)'        },
                { key: 'category',    label: 'Category',    value: displayCategory || 'Not selected'               },
                { key: 'description', label: 'Description', value: stationOverviewDraft?.content ? '…' : '(empty)' },
              ].map(({ key, label, value }) => (
                <label key={key} style="display:flex;align-items:center;gap:var(--cz-space-3);cursor:pointer">
                  <input
                    type="checkbox"
                    checked={(newSvcFields as Record<string, boolean>)[key]}
                    onChange={(e) => setNewSvcFields(prev => ({ ...prev, [key]: (e.target as HTMLInputElement).checked }))}
                  />
                  <span>
                    <strong style="font-size:var(--admin-fs-label)">{label}</strong>
                    <span style="margin-left:var(--cz-space-2);font-size:var(--admin-fs-s-label);color:var(--admin-text-faint)">
                      {value}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div class="cz-publish-confirm__footer">
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary"
              onClick={() => setExitDialog(null)}
              disabled={exitSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--danger"
              onClick={handleNewSvcTrash}
              disabled={exitSaving}
            >
              Move to Trash
            </button>
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--primary"
              onClick={handleNewSvcSaveDraft}
              disabled={exitSaving || (!newSvcFields.title && !newSvcFields.category && !newSvcFields.description)}
            >
              {exitSaving ? 'Saving…' : 'Save Draft'}
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
          categories={localCategories}
          catDescription={catDesc}
          onCatDescriptionChange={setCatDesc}
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

// ── ServiceTierStep ───────────────────────────────────────────────────────────
// Phase 2: Service Station-owned tier configuration drawer.
// Used when a service was born after Phase 1 and has no legacy cz_surface_package post.
// Reads and writes directly to cz_service_package_station via service-level endpoints.

type TierDraft = {
  label:               string;
  price:               number | null;
  contact:             boolean;
  billing_cycle:       string;
  inclusions_override: InclusionItem[];
  faq_refs:            string[];
  popular:             boolean;
  popular_label:       string;
  enabled:             boolean;
  new_inclusions:      Array<{ label: string }>;
  new_faqs:            Array<{ question: string; answer: string }>;
};

function tierDraftFromDetail(detail: SurfaceTierDetail, popularTier: string | null, tierId: string, popularLabel: string): TierDraft {
  return {
    label:               detail.label,
    price:               detail.price,
    contact:             detail.contact,
    billing_cycle:       detail.billing_cycle ?? 'monthly',
    inclusions_override: detail.inclusions_override,
    faq_refs:            detail.faq_refs,
    popular:             popularTier === tierId,
    popular_label:       popularTier === tierId ? popularLabel : '',
    enabled:             detail.enabled,
    new_inclusions:      [],
    new_faqs:            [],
  };
}

export function ServiceTierStep({ ctx }: { ctx: StepContext }) {
  const serviceId = ctx.stepData.serviceId as number;
  const onRefresh = ctx.stepData.onRefresh as (() => void) | undefined;
  // Full parent service (richer than the station's service stub) — read-only
  // context for the Service tab. Passed through by handleOpenTierConfig.
  const serviceItem = ctx.stepData.service as ServiceItem | undefined;

  const { data, loading, error, refetch } = useApi<ServicePackageStationResponse>(
    () => fetchServicePackageStation(serviceId)
  );

  const [editingTierId, setEditingTierId]   = useState<string | null>(null);
  const [draft,         setDraft]           = useState<TierDraft | null>(null);
  // Single Individual Tier drawer: editingSection === null → tier view (3 module cards);
  // a named value → that section's InlineEditorShell. Sections edit slices of the one
  // shared TierDraft in memory; only Publish Tier persists via saveServicePackageStationTier.
  const [editingSection,  setEditingSection]  = useState<'tier-overview' | 'tier-inclusions' | 'tier-faqs' | null>(null);
  const [sectionOriginal, setSectionOriginal] = useState<TierDraft | null>(null);
  const [saving,        setSaving]          = useState(false);
  const [saveErr,       setSaveErr]         = useState<string | null>(null);
  const [saveOk,        setSaveOk]          = useState(false);
  const [newIncLabel,   setNewIncLabel]     = useState('');
  const [newFaqQ,       setNewFaqQ]         = useState('');
  const [newFaqA,       setNewFaqA]         = useState('');
  // Individual Tier drawer: Commercial (the tier's own modules) | Service (read-only
  // parent context). Commercial is the working context, so it is the default.
  const [tierTab,       setTierTab]         = useState<'commercial' | 'service'>('commercial');
  // Single-open accordion for the Commercial cards' notification panels.
  const [openTierPanel, setOpenTierPanel]   = useState<'tier-overview' | 'tier-features' | 'tier-faqs' | null>(null);

  useEffect(() => {
    if (!saveOk) return;
    const t = setTimeout(() => setSaveOk(false), 2500);
    return () => clearTimeout(t);
  }, [saveOk]);

  const openTierEdit = (tierId: string) => {
    if (!data) return;
    const detail = data.station.tiers[tierId] ?? {
      label: '', price: null, contact: false, billing_cycle: null,
      inclusions_override: [], features: [], faq_refs: [], enabled: false,
    };
    setEditingTierId(tierId);
    setDraft(tierDraftFromDetail(detail as SurfaceTierDetail, data.station.popular_tier, tierId, data.station.popular_label));
    setEditingSection(null);
    setSectionOriginal(null);
    setSaveErr(null);
    setSaveOk(false);
    setTierTab('commercial');
    setOpenTierPanel(null);
  };

  // Publish Tier — the single backend write for the whole TierDraft.
  const handleSave = useCallback(async () => {
    if (!draft || !editingTierId) return;
    setSaving(true); setSaveErr(null);
    try {
      await saveServicePackageStationTier(serviceId, editingTierId, draft);
      setSaveOk(true);
      refetch();
      onRefresh?.();
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [draft, editingTierId, serviceId, refetch, onRefresh]);

  // Disable/Enable Tier — flips enabled and Publishes through the same save path.
  const handleToggleEnabled = useCallback(async () => {
    if (!draft || !editingTierId) return;
    const next = { ...draft, enabled: !draft.enabled };
    setDraft(next);
    setSaving(true); setSaveErr(null);
    try {
      await saveServicePackageStationTier(serviceId, editingTierId, next);
      setSaveOk(true);
      refetch();
      onRefresh?.();
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [draft, editingTierId, serviceId, refetch, onRefresh]);

  // Section edit lifecycle — in-memory only. Save keeps the live draft changes and
  // returns to tier view; Cancel reverts the slice to the pre-edit snapshot.
  const openSection = (section: 'tier-overview' | 'tier-inclusions' | 'tier-faqs') => {
    setSectionOriginal(draft);
    setEditingSection(section);
    setSaveErr(null);
    setSaveOk(false);
  };
  const saveSection = async () => {
    setEditingSection(null);
    setSectionOriginal(null);
  };
  const cancelSection = () => {
    if (sectionOriginal) setDraft(sectionOriginal);
    setEditingSection(null);
    setSectionOriginal(null);
  };

  // Returns to the tier list — no backend write unless Publish was clicked.
  const handleBack = () => {
    setEditingTierId(null);
    setDraft(null);
    setEditingSection(null);
    setSectionOriginal(null);
    setSaveErr(null);
    setSaveOk(false);
    setNewIncLabel('');
    setNewFaqQ('');
    setNewFaqA('');
  };

  if (loading) return <div class="cz-admin-loading"><Spinner label="Loading tiers…" /></div>;
  if (error)   return <div class="cz-admin-error-msg">Failed to load tier data: {error}</div>;
  if (!data)   return null;

  const { station, service: svc } = data;

  // ── Tier selector view ────────────────────────────────────────────────────
  if (!editingTierId || !draft) {
    return (
      <div class="cz-req-detail">
        <div class="cz-ws-header" style="padding: var(--cz-space-5) var(--cz-space-6) var(--cz-space-4)">
          <div>
            <h3 class="cz-ws-title" style="font-size: var(--admin-fs-sub)">Tier Configuration</h3>
            <p class="cz-ws-subtitle">Select a tier to configure pricing and inclusions.</p>
          </div>
        </div>

        {TIER_KEYS.map((tierId) => {
          const detail = station.tiers[tierId];
          const isConfigured = detail && (detail.billing_cycle || detail.price !== null || detail.contact || detail.inclusions_override?.length > 0);
          const isEnabled = detail?.enabled ?? false;
          return (
            <div
              key={tierId}
              class="cz-shell-section cz-shell-section--no-border"
              style="cursor: pointer"
              onClick={() => openTierEdit(tierId)}
            >
              <div class="drawerModule">
                <div class="drawerModule__header">
                  <div class="drawerModule__heading">
                    <p class="drawerModule__title">{TIER_LABELS[tierId]}</p>
                    <p class="drawerModule__subtitle">
                      {isConfigured
                        ? (detail.price !== null
                            ? `$${detail.price} / ${detail.billing_cycle}`
                            : detail.contact ? 'Contact Us' : detail.billing_cycle ?? 'Configured')
                        : 'Not configured'}
                    </p>
                  </div>
                  <div class="drawerModule__status">
                    {isConfigured && (
                      <ModuleStatusPill status={isEnabled ? 'active' : 'disabled'} notes={[]} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div class="cz-tf-footer">
          <div class="cz-tf-footer__spacer" />
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={ctx.close}>
            Close
          </button>
        </div>
      </div>
    );
  }

  // ── Individual Tier drawer ────────────────────────────────────────────────
  const incPool = svc.inclusions;
  const faqPool = svc.faqs;

  // Edit mode — InlineEditorShell over a slice of the shared TierDraft (in-memory).
  if (editingSection === 'tier-overview') {
    return (
      <InlineEditorShell title="Tier Overview" onSave={saveSection} onCancel={cancelSection} saving={false} saveErr={null}>
        <div class="cz-tf-form">
          {/* Contact toggle */}
          <div class="cz-tf-field" style="flex-direction: row; align-items: center; gap: var(--cz-space-3)">
            <input type="checkbox" id="tier-contact" checked={draft.contact}
              onChange={(e) => setDraft(d => d ? { ...d, contact: (e.target as HTMLInputElement).checked, price: null } : d)} />
            <label class="cz-tf-label" for="tier-contact" style="margin: 0">Contact Us (no fixed price)</label>
          </div>
          {!draft.contact && (
            <div class="cz-tf-field">
              <label class="cz-tf-label">Price</label>
              <input type="number" class="cz-tf-input" min="0" step="0.01"
                value={draft.price ?? ''}
                onInput={(e) => {
                  const v = (e.target as HTMLInputElement).value;
                  setDraft(d => d ? { ...d, price: v === '' ? null : parseFloat(v) } : d);
                }} />
            </div>
          )}
          <div class="cz-tf-field">
            <label class="cz-tf-label">Billing Cycle</label>
            <select class="cz-tf-select" value={draft.billing_cycle}
              onChange={(e) => setDraft(d => d ? { ...d, billing_cycle: (e.target as HTMLSelectElement).value } : d)}>
              <option value="monthly">Monthly</option>
              <option value="annually">Annually</option>
              <option value="one-time">One-time</option>
            </select>
          </div>
          <div class="cz-tf-field">
            <label class="cz-tf-label">Display Label (optional)</label>
            <input type="text" class="cz-tf-input" value={draft.label}
              onInput={(e) => setDraft(d => d ? { ...d, label: (e.target as HTMLInputElement).value } : d)} />
          </div>
          <div class="cz-tf-field" style="flex-direction: row; align-items: center; gap: var(--cz-space-3)">
            <input type="checkbox" id="tier-popular" checked={draft.popular}
              onChange={(e) => setDraft(d => d ? { ...d, popular: (e.target as HTMLInputElement).checked } : d)} />
            <label class="cz-tf-label" for="tier-popular" style="margin: 0">Mark as popular tier</label>
          </div>
          {draft.popular && (
            <div class="cz-tf-field">
              <label class="cz-tf-label">Popular badge label</label>
              <input type="text" class="cz-tf-input" value={draft.popular_label}
                onInput={(e) => setDraft(d => d ? { ...d, popular_label: (e.target as HTMLInputElement).value } : d)} />
            </div>
          )}
        </div>
      </InlineEditorShell>
    );
  }

  if (editingSection === 'tier-inclusions') {
    return (
      <InlineEditorShell title="Included Features" onSave={saveSection} onCancel={cancelSection} saving={false} saveErr={null}>
        <div class="cz-tf-form">
          <div class="cz-tf-field">
            <label class="cz-tf-label">Inclusions</label>
            {draft.inclusions_override.length > 0 && (
              <div class="cz-sc-inclusion-pool" style="margin-bottom: var(--cz-space-2)">
                {draft.inclusions_override.map((inc) => (
                  <span key={inc.id} class="cz-tf-chip">
                    {inc.label}
                    <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-tf-chip__edit"
                      onClick={() => setDraft(d => d ? { ...d, inclusions_override: d.inclusions_override.filter(i => i.id !== inc.id) } : d)}>
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            {incPool.length > 0 && (
              <select class="cz-tf-select" value=""
                onChange={(e) => {
                  const sel = e.target as HTMLSelectElement;
                  const id = sel.value;
                  if (!id) return;
                  const inc = incPool.find(i => i.id === id);
                  if (inc && !draft.inclusions_override.find(i => i.id === id)) {
                    setDraft(d => d ? { ...d, inclusions_override: [...d.inclusions_override, inc] } : d);
                  }
                  sel.value = '';
                }}>
                <option value="">Add from pool…</option>
                {incPool.filter(i => !draft.inclusions_override.find(s => s.id === i.id)).map(i => (
                  <option key={i.id} value={i.id}>{i.label}</option>
                ))}
              </select>
            )}
            <div style="display:flex; gap: var(--cz-space-2); margin-top: var(--cz-space-2)">
              <input type="text" class="cz-tf-input" placeholder="New inclusion label"
                value={newIncLabel}
                onInput={(e) => setNewIncLabel((e.target as HTMLInputElement).value)} />
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                onClick={() => {
                  if (!newIncLabel.trim()) return;
                  setDraft(d => d ? { ...d, new_inclusions: [...d.new_inclusions, { label: newIncLabel.trim() }] } : d);
                  setNewIncLabel('');
                }}>Add</button>
            </div>
            {draft.new_inclusions.length > 0 && (
              <div style="margin-top: var(--cz-space-1); font-size: var(--admin-fs-s-label); color: var(--admin-text-faint)">
                New: {draft.new_inclusions.map(i => i.label).join(', ')}
              </div>
            )}
          </div>
        </div>
      </InlineEditorShell>
    );
  }

  if (editingSection === 'tier-faqs') {
    return (
      <InlineEditorShell title="Common Questions" onSave={saveSection} onCancel={cancelSection} saving={false} saveErr={null}>
        <div class="cz-tf-form">
          <div class="cz-tf-field">
            <label class="cz-tf-label">FAQs</label>
            {draft.faq_refs.length > 0 && (
              <div style="margin-bottom: var(--cz-space-2)">
                {draft.faq_refs.map(ref => {
                  const faq = faqPool.find(f => f.id === ref);
                  return (
                    <div key={ref} style="display:flex; align-items:center; gap: var(--cz-space-2); margin-bottom: 4px">
                      <span style="font-size: var(--admin-fs-s-label); color: var(--admin-text)">{faq?.question ?? ref}</span>
                      <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                        onClick={() => setDraft(d => d ? { ...d, faq_refs: d.faq_refs.filter(r => r !== ref) } : d)}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
            {faqPool.length > 0 && (
              <select class="cz-tf-select" value=""
                onChange={(e) => {
                  const sel = e.target as HTMLSelectElement;
                  const id = sel.value;
                  if (!id) return;
                  if (!draft.faq_refs.includes(id)) {
                    setDraft(d => d ? { ...d, faq_refs: [...d.faq_refs, id] } : d);
                  }
                  sel.value = '';
                }}>
                <option value="">Add FAQ from pool…</option>
                {faqPool.filter(f => !draft.faq_refs.includes(f.id)).map(f => (
                  <option key={f.id} value={f.id}>{f.question}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </InlineEditorShell>
    );
  }

  // View mode — Service | Commercial tabs over the same TierDraft.
  const tierPriceText = draft.contact ? 'Contact Us' : (draft.price != null ? `$${draft.price}` : '—');

  // Module lifecycle via the generic evaluator. Tier Overview is the parent; Included
  // Features and Common Questions gate on it — until pricing is complete they resolve
  // to pending-dim with a "Waiting for Tier Overview." note (no new status).
  const tierLike = {
    enabled:       draft.enabled,
    price:         draft.price,
    billing_cycle: draft.billing_cycle,
    contact:       draft.contact,
  };
  const platformStatus       = station.platform_status ?? 'disabled';
  const tierOverviewComplete = (draft.price !== null || draft.contact) && !!draft.billing_cycle;

  const overviewState = evaluateModule(tierOverviewModule, tierLike, { platformStatus });
  const featuresState = evaluateModule(
    tierFeaturesModule,
    { count: draft.inclusions_override.length },
    { platformStatus, parentReady: tierOverviewComplete, parentLabel: 'Tier Overview' },
  );
  const faqsState = evaluateModule(
    tierFaqsModule,
    { count: draft.faq_refs.length },
    { platformStatus, parentReady: tierOverviewComplete, parentLabel: 'Tier Overview' },
  );

  const renderTierStatus = (
    key: 'tier-overview' | 'tier-features' | 'tier-faqs',
    state: { status: string; notes: typeof overviewState.notes },
  ) => (
    <div class={`drawerModule__status${state.status === 'pending-dim' ? ' drawerModule__status--dim' : ''}`}>
      <ModuleStatusPill
        status={state.status}
        notes={state.notes}
        onOpen={() => setOpenTierPanel((p) => (p === key ? null : key))}
      />
    </div>
  );

  return (
    <div class="cz-req-detail">
      <div class="cz-sv-tabs" style="margin-bottom: 0">
        <button type="button" class="cz-action-shell__back" onClick={handleBack} disabled={saving} aria-label="Back to tier list">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
          </svg>
        </button>
        <span style="font-size: var(--admin-fs-sub); font-weight: var(--admin-fw-strong); color: var(--admin-text); padding-left: var(--cz-space-3)">
          {draft.label.trim() || TIER_LABELS[editingTierId]}
        </span>
      </div>

      {/* Service | Commercial tabs */}
      <div class="cz-sv-tabs">
        <button
          type="button"
          class={`cz-sv-tab${tierTab === 'service' ? ' cz-sv-tab--active' : ''}`}
          onClick={() => setTierTab('service')}
        >
          Service
        </button>
        <button
          type="button"
          class={`cz-sv-tab${tierTab === 'commercial' ? ' cz-sv-tab--active' : ''}`}
          onClick={() => setTierTab('commercial')}
        >
          Commercial
        </button>
      </div>

      {/* ── Commercial tab: the tier's own modules ───────────────────────────── */}
      {tierTab === 'commercial' && (
        <>
          {/* ── Tier Module: Tier Overview ───────────────────────────────────── */}
          <div class="cz-shell-section cz-shell-section--no-border">
            <div class="drawerModule drawerOverview service">
              <div class="drawerModule__header">
                <div class="drawerModule__heading">
                  <p class="drawerModule__title">Tier Overview</p>
                  <p class="drawerModule__subtitle">Pricing and presentation for this tier.</p>
                </div>
                {renderTierStatus('tier-overview', overviewState)}
              </div>
              {openTierPanel === 'tier-overview' && overviewState.notes.length > 0 && (
                <ModuleNotificationPanel notes={overviewState.notes} />
              )}
              <div class="drawerModule__body">
                <div class="drawerModule__fields">
                  <div class="drawerModule__field">
                    <p class="drawerModule__label">Label</p>
                    <p class="drawerModule__value">{draft.label.trim() || TIER_LABELS[editingTierId]}</p>
                  </div>
                  <div class="drawerModule__field">
                    <p class="drawerModule__label">Price</p>
                    <p class="drawerModule__value">{tierPriceText}</p>
                  </div>
                  <div class="drawerModule__field">
                    <p class="drawerModule__label">Billing Cycle</p>
                    <p class="drawerModule__value">{draft.billing_cycle || '—'}</p>
                  </div>
                  {draft.popular && (
                    <div class="drawerModule__field">
                      <p class="drawerModule__label">Presentation</p>
                      <p class="drawerModule__value">Popular{draft.popular_label ? ` · ${draft.popular_label}` : ''}</p>
                    </div>
                  )}
                </div>
              </div>
              <div class="drawerModule__footer">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => openSection('tier-overview')}>
                  Edit
                </button>
              </div>
            </div>
          </div>

          {/* ── Tier Module: Included Features ─────────────────────────────────── */}
          <div class="cz-shell-section cz-shell-section--no-border">
            <div class="drawerModule">
              <div class="drawerModule__header">
                <div class="drawerModule__heading">
                  <p class="drawerModule__title">
                    Included Features
                    {draft.inclusions_override.length > 0 && (
                      <span class="drawerModule__count">{draft.inclusions_override.length}</span>
                    )}
                  </p>
                  <p class="drawerModule__subtitle">Features included in this tier.</p>
                </div>
                {renderTierStatus('tier-features', featuresState)}
              </div>
              {openTierPanel === 'tier-features' && featuresState.notes.length > 0 && (
                <ModuleNotificationPanel notes={featuresState.notes} />
              )}
              <div class="drawerModule__body">
                {draft.inclusions_override.length > 0 ? (
                  <div class="cz-sc-inclusion-pool">
                    {draft.inclusions_override.map((inc) => (
                      <span key={inc.id} class="cz-tf-chip">{inc.label}</span>
                    ))}
                  </div>
                ) : (
                  <div class="drawerModule__empty">
                    <p class="drawerModule__empty-title">No features</p>
                    <p class="drawerModule__empty-copy">Add features included in this tier.</p>
                  </div>
                )}
              </div>
              <div class="drawerModule__footer">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => openSection('tier-inclusions')}>
                  Edit
                </button>
              </div>
            </div>
          </div>

          {/* ── Tier Module: Common Questions ──────────────────────────────────── */}
          <div class="cz-shell-section cz-shell-section--no-border">
            <div class="drawerModule">
              <div class="drawerModule__header">
                <div class="drawerModule__heading">
                  <p class="drawerModule__title">
                    Common Questions
                    {draft.faq_refs.length > 0 && (
                      <span class="drawerModule__count">{draft.faq_refs.length}</span>
                    )}
                  </p>
                  <p class="drawerModule__subtitle">Questions and answers for this tier.</p>
                </div>
                {renderTierStatus('tier-faqs', faqsState)}
              </div>
              {openTierPanel === 'tier-faqs' && faqsState.notes.length > 0 && (
                <ModuleNotificationPanel notes={faqsState.notes} />
              )}
              <div class="drawerModule__body">
                {draft.faq_refs.length > 0 ? (
                  <div>
                    {draft.faq_refs.map(ref => {
                      const faq = faqPool.find(f => f.id === ref);
                      return (
                        <p key={ref} class="drawerModule__empty-copy" style="margin: 0 0 4px">{faq?.question ?? ref}</p>
                      );
                    })}
                  </div>
                ) : (
                  <div class="drawerModule__empty">
                    <p class="drawerModule__empty-title">No questions added</p>
                    <p class="drawerModule__empty-copy">Add common questions for this tier.</p>
                  </div>
                )}
              </div>
              <div class="drawerModule__footer">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => openSection('tier-faqs')}>
                  Edit
                </button>
              </div>
            </div>
          </div>

          {(saveErr || saveOk) && (
            <div class="cz-shell-section cz-shell-section--no-border">
              {saveErr && <p class="cz-admin-error-msg">{saveErr}</p>}
              {saveOk  && <p class="cz-admin-ok-msg">Saved.</p>}
            </div>
          )}
        </>
      )}

      {/* ── Service tab: read-only parent context ────────────────────────────── */}
      {tierTab === 'service' && (
        <ServiceContextPanel
          title={decodeHtml(serviceItem?.title ?? svc.title)}
          category={
            serviceItem && serviceItem.categories.length > 0
              ? serviceItem.categories.map((c) => decodeHtml(c.name)).join(', ')
              : 'Not selected'
          }
          content={serviceItem?.content ?? ''}
          inclusions={svc.inclusions}
          faqs={svc.faqs}
        />
      )}

      <div class="cz-tf-footer">
        <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={handleToggleEnabled} disabled={saving}>
          {draft.enabled ? 'Disable Tier' : 'Enable Tier'}
        </button>
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={handleBack} disabled={saving}>
          Cancel
        </button>
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Publish Tier'}
        </button>
      </div>
    </div>
  );
}

// ── ServicePromotionStep ──────────────────────────────────────────────────────
// Phase 4: Service Station-owned promotion management.
// Used when a service was born after Phase 1 and has no legacy cz_surface_package post.
// Reads and writes directly to cz_service_promotion_station via service-level endpoints.

const BASED_ON_TIERS = [
  { id: 'basic', label: 'Basic' },
  { id: 'standard', label: 'Standard' },
  { id: 'premium', label: 'Premium' },
  { id: 'enterprise', label: 'Enterprise' },
];

type PromoDraft = Omit<PromotionTierPayload, 'new_inclusions'> & {
  new_inclusions: Array<{ label: string }>;
};

function emptyPromoDraft(): PromoDraft {
  return {
    name: '', slug: '', status: 'draft', based_on: null,
    headline: '', description: '', price: null, billing_label: '',
    features: [], inclusions: [], exclusions: [], badge: '',
    campaign_label: '', starts_at: null, ends_at: null,
    priority: 0, is_featured: false, metadata: {},
    new_inclusions: [],
  };
}

function draftFromPromo(p: PromotionTier): PromoDraft {
  return {
    name: p.name, slug: p.slug, status: p.status as 'draft' | 'active' | 'archived',
    based_on: p.based_on, headline: p.headline, description: p.description,
    price: p.price, billing_label: p.billing_label, features: [...p.features],
    inclusions: [...p.inclusions], exclusions: [...p.exclusions],
    badge: p.badge, campaign_label: p.campaign_label,
    starts_at: p.starts_at, ends_at: p.ends_at,
    priority: p.priority, is_featured: p.is_featured, metadata: { ...(p.metadata ?? {}) },
    new_inclusions: [],
  };
}

export function ServicePromotionStep({ ctx }: { ctx: StepContext }) {
  const serviceId = ctx.stepData.serviceId as number;
  const onRefresh = ctx.stepData.onRefresh as (() => void) | undefined;

  const { data, loading, error, refetch } = useApi<ServicePromotionStationResponse>(
    () => fetchServicePromotionStation(serviceId)
  );

  const [draft,          setDraft]          = useState<PromoDraft | null>(null);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [isNew,          setIsNew]          = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [saveErr,        setSaveErr]        = useState<string | null>(null);
  const [saveOk,         setSaveOk]         = useState(false);

  useEffect(() => {
    if (!saveOk) return;
    const t = setTimeout(() => setSaveOk(false), 2500);
    return () => clearTimeout(t);
  }, [saveOk]);

  const openCreate = () => { setIsNew(true); setEditingPromoId(null); setDraft(emptyPromoDraft()); setSaveErr(null); setSaveOk(false); };
  const openEdit   = (p: PromotionTier) => { setIsNew(false); setEditingPromoId(p.id); setDraft(draftFromPromo(p)); setSaveErr(null); setSaveOk(false); };
  const handleBack = () => { setDraft(null); setEditingPromoId(null); setIsNew(false); setSaveErr(null); setSaveOk(false); };

  const handleSave = useCallback(async () => {
    if (!draft) return;
    setSaving(true); setSaveErr(null);
    try {
      if (isNew)            await createServicePromotion(serviceId, draft);
      else if (editingPromoId) await saveServicePromotion(serviceId, editingPromoId, draft);
      setSaveOk(true); refetch(); onRefresh?.();
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [draft, isNew, editingPromoId, serviceId, refetch, onRefresh]);

  const handleArchive    = async (id: string) => { try { await archiveServicePromotion(serviceId, id);    refetch(); } catch {} };
  const handleReactivate = async (id: string) => { try { await reactivateServicePromotion(serviceId, id); refetch(); } catch {} };

  if (loading) return <div class="cz-admin-loading"><Spinner label="Loading promotions…" /></div>;
  if (error)   return <div class="cz-admin-error-msg">Failed to load promotions: {error}</div>;
  if (!data)   return null;

  const { promotions, service: svc } = data;

  // ── Promotion list view ───────────────────────────────────────────────────
  if (!draft) {
    return (
      <div class="cz-req-detail">
        <div class="cz-ws-header" style="padding: var(--cz-space-5) var(--cz-space-6) var(--cz-space-4)">
          <div>
            <h3 class="cz-ws-title" style="font-size: var(--admin-fs-sub)">Promotions</h3>
            <p class="cz-ws-subtitle">{promotions.length} promotion{promotions.length !== 1 ? 's' : ''} configured</p>
          </div>
          <div class="cz-ws-actions">
            <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" onClick={openCreate}>
              New Promotion
            </button>
          </div>
        </div>

        {promotions.length === 0 && (
          <div style="padding: var(--cz-space-6); color: var(--admin-text-faint)">
            No promotions yet.
          </div>
        )}

        {promotions.map((promo) => (
          <div key={promo.id} class="cz-shell-section cz-shell-section--no-border">
            <div class="drawerModule">
              <div class="drawerModule__header">
                <div class="drawerModule__heading">
                  <p class="drawerModule__title">{promo.name || '(unnamed)'}</p>
                  <p class="drawerModule__subtitle">
                    {promo.based_on ? `Based on ${promo.based_on}` : 'No base tier'}
                    {promo.price !== null ? ` · $${promo.price}` : ''}
                  </p>
                </div>
                <div class="drawerModule__status">
                  <span class={`cz-module-status-pill cz-module-status-pill--${promo.status === 'active' ? 'active' : promo.status === 'archived' ? 'inactive' : 'pending'}`}>
                    <span class="cz-module-status-pill__marker">●</span>
                    {promo.status === 'active' ? 'Active' : promo.status === 'archived' ? 'Archived' : 'Draft'}
                  </span>
                </div>
              </div>
              <div class="drawerModule__footer">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => openEdit(promo)}>Edit</button>
                {promo.status !== 'archived'
                  ? <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => handleArchive(promo.id)}>Archive</button>
                  : <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => handleReactivate(promo.id)}>Reactivate</button>
                }
              </div>
            </div>
          </div>
        ))}

        <div class="cz-tf-footer">
          <div class="cz-tf-footer__spacer" />
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={ctx.close}>Close</button>
        </div>
      </div>
    );
  }

  // ── Promotion edit form ───────────────────────────────────────────────────
  const incPool = svc.inclusions;

  return (
    <div class="cz-req-detail">
      <div class="cz-sv-tabs" style="margin-bottom: 0">
        <button type="button" class="cz-action-shell__back" onClick={handleBack} disabled={saving} aria-label="Back">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
          </svg>
        </button>
        <span style="font-size: var(--admin-fs-sub); font-weight: var(--admin-fw-strong); color: var(--admin-text); padding-left: var(--cz-space-3)">
          {isNew ? 'New Promotion' : (draft.name || 'Edit Promotion')}
        </span>
      </div>

      <div class="cz-tf-form" style="padding: var(--cz-space-5) var(--cz-space-6); overflow-y: auto; flex: 1">

        <div class="cz-tf-field">
          <label class="cz-tf-label">Name</label>
          <input type="text" class="cz-tf-input" value={draft.name}
            onInput={(e) => setDraft(d => d ? { ...d, name: (e.target as HTMLInputElement).value } : d)} />
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Status</label>
          <select class="cz-tf-select" value={draft.status}
            onChange={(e) => setDraft(d => d ? { ...d, status: (e.target as HTMLSelectElement).value as 'draft' | 'active' | 'archived' } : d)}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Based on tier</label>
          <select class="cz-tf-select" value={draft.based_on ?? ''}
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              setDraft(d => d ? { ...d, based_on: (v as 'basic' | 'standard' | 'premium' | 'enterprise') || null } : d);
            }}>
            <option value="">None</option>
            {BASED_ON_TIERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Headline</label>
          <input type="text" class="cz-tf-input" value={draft.headline}
            onInput={(e) => setDraft(d => d ? { ...d, headline: (e.target as HTMLInputElement).value } : d)} />
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Description</label>
          <textarea class="cz-tf-textarea" value={draft.description}
            onInput={(e) => setDraft(d => d ? { ...d, description: (e.target as HTMLTextAreaElement).value } : d)} />
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Price</label>
          <input type="number" class="cz-tf-input" min="0" step="0.01" value={draft.price ?? ''}
            onInput={(e) => { const v = (e.target as HTMLInputElement).value; setDraft(d => d ? { ...d, price: v === '' ? null : parseFloat(v) } : d); }} />
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Billing label</label>
          <input type="text" class="cz-tf-input" value={draft.billing_label}
            onInput={(e) => setDraft(d => d ? { ...d, billing_label: (e.target as HTMLInputElement).value } : d)} />
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Badge</label>
          <input type="text" class="cz-tf-input" value={draft.badge}
            onInput={(e) => setDraft(d => d ? { ...d, badge: (e.target as HTMLInputElement).value } : d)} />
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Inclusions</label>
          {draft.inclusions.length > 0 && (
            <div class="cz-sc-inclusion-pool" style="margin-bottom: var(--cz-space-2)">
              {draft.inclusions.map(inc => (
                <span key={inc.id} class="cz-tf-chip">
                  {inc.label}
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-tf-chip__edit"
                    onClick={() => setDraft(d => d ? { ...d, inclusions: d.inclusions.filter(i => i.id !== inc.id) } : d)}>✕</button>
                </span>
              ))}
            </div>
          )}
          {incPool.length > 0 && (
            <select class="cz-tf-select" value=""
              onChange={(e) => {
                const sel = e.target as HTMLSelectElement;
                const id = sel.value; if (!id) return;
                const inc = incPool.find(i => i.id === id);
                if (inc && !draft.inclusions.find(i => i.id === id)) {
                  setDraft(d => d ? { ...d, inclusions: [...d.inclusions, inc] } : d);
                }
                sel.value = '';
              }}>
              <option value="">Add from pool…</option>
              {incPool.filter(i => !draft.inclusions.find(s => s.id === i.id)).map(i => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </select>
          )}
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Campaign label</label>
          <input type="text" class="cz-tf-input" value={draft.campaign_label}
            onInput={(e) => setDraft(d => d ? { ...d, campaign_label: (e.target as HTMLInputElement).value } : d)} />
        </div>

        <div class="cz-tf-field" style="flex-direction: row; align-items: center; gap: var(--cz-space-3)">
          <input type="checkbox" id="promo-featured" checked={draft.is_featured}
            onChange={(e) => setDraft(d => d ? { ...d, is_featured: (e.target as HTMLInputElement).checked } : d)} />
          <label class="cz-tf-label" for="promo-featured" style="margin: 0">Featured</label>
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Priority</label>
          <input type="number" class="cz-tf-input" min="0" value={draft.priority}
            onInput={(e) => setDraft(d => d ? { ...d, priority: parseInt((e.target as HTMLInputElement).value, 10) || 0 } : d)} />
        </div>

        {saveErr && <p class="cz-admin-error-msg" style="margin-top: var(--cz-space-3)">{saveErr}</p>}
        {saveOk  && <p class="cz-admin-ok-msg"   style="margin-top: var(--cz-space-3)">Saved.</p>}
      </div>

      <div class="cz-tf-footer">
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={handleBack} disabled={saving}>Back</button>
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
