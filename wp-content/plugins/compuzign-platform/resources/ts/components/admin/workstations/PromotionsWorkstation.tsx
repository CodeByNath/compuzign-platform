import { useEffect, useState, useCallback } from 'preact/hooks';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { Spinner } from '@/components/ui/Spinner';
import {
  fetchSurfacePackageDetail,
  createPromotionTier,
  savePromotionTier,
  archivePromotionTier,
  reactivatePromotionTier,
} from '@/api/endpoints/admin';
import { InlineEditorShell } from '../InlineEditorShell';
import { ReadBlock } from '../ReadBlock';
import { PackageSelectServiceStep } from './SurfacePackagesWorkstation';
import type { ActionConfig, StepContext } from '../ActionShell';
import type {
  SurfacePackageSummary,
  SurfacePackageDetailResponse,
  PromotionTier,
  PromotionStatus,
  BasedOnTier,
  InclusionItem,
  PromotionTierPayload,
  SurfaceServiceInfo,
} from '@/api/types/admin';

interface Props {
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIERS = ['basic', 'standard', 'premium', 'enterprise'] as const;
const TIER_LABELS: Record<string, string> = {
  basic: 'Basic', standard: 'Standard', premium: 'Premium', enterprise: 'Enterprise',
};
const BASED_ON_LABELS: Record<string, string> = TIER_LABELS;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(v: number | null): string {
  return v !== null ? `$${v.toLocaleString()}` : '—';
}

function fmtDate(s: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return s;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function statusPillClass(status: string): string {
  if (status === 'active')   return 'cz-status-pill cz-status-pill--active';
  if (status === 'archived') return 'cz-status-pill cz-status-pill--archived';
  return 'cz-status-pill cz-status-pill--draft';
}

// ── Local types ───────────────────────────────────────────────────────────────

type EditingSection = 'identity' | 'pricing' | 'inclusions' | 'addons' | 'notincluded' | 'campaign' | null;

type IdentityDraft = {
  name: string; status: PromotionStatus; basedOn: string; headline: string; description: string;
};
type PricingDraft  = { priceStr: string; billingLabel: string; badge: string; };
type CampaignDraft = {
  campaignLabel: string; startsAt: string; endsAt: string; priority: string; isFeatured: boolean;
};
type IncSnapshot = { sel: InclusionItem[]; pending: Array<{ label: string }>; excl: InclusionItem[] };

// ── PromotionViewStep — drawer step ───────────────────────────────────────────

export function PromotionViewStep({ ctx }: { ctx: StepContext }) {
  // Step data — supports both direct open (packageId) and service-selection flow (service + packages)
  const packageIdRaw    = ctx.stepData.packageId as number | undefined;
  const serviceFromStep = ctx.stepData.service   as SurfaceServiceInfo | undefined;
  const packagesFromCtx = ctx.stepData.packages  as SurfacePackageSummary[] | undefined;
  const initPromoId     = ctx.stepData.promoId   as string | null | undefined ?? null;
  const initPromo       = ctx.stepData.promo     as PromotionTier | null | undefined ?? null;
  const isNew           = !!(ctx.stepData.isNew  as boolean | undefined);

  // Resolve packageId — direct or via service lookup in packages list
  const resolvedPackageId: number | undefined =
    packageIdRaw ??
    (serviceFromStep && packagesFromCtx
      ? packagesFromCtx.find((p) => p.service_refs.includes(serviceFromStep.id))?.post_id
      : undefined);

  const [detail, setDetail]   = useState<SurfacePackageDetailResponse | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const [tab, setTab]                       = useState<'commercial' | 'service'>('commercial');
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [currentPromoId, setCurrentPromoId] = useState<string | null>(initPromoId);

  // false only when creating a brand-new promo before Identity is saved
  const identitySaved = !isNew || currentPromoId !== null;

  // ── Committed state ────────────────────────────────────────────────────────
  const [name, setName]               = useState(initPromo?.name ?? '');
  const [status, setStatus]           = useState<PromotionStatus>(initPromo?.status ?? 'draft');
  const [basedOn, setBasedOn]         = useState<string>(initPromo?.based_on ?? '');
  const [headline, setHeadline]       = useState(initPromo?.headline ?? '');
  const [description, setDescription] = useState(initPromo?.description ?? '');

  const [priceStr, setPriceStr]         = useState(initPromo?.price != null ? String(initPromo.price) : '');
  const [billingLabel, setBillingLabel] = useState(initPromo?.billing_label ?? '');
  const [badge, setBadge]               = useState(initPromo?.badge ?? '');

  const [selInclusions, setSelInclusions] = useState<InclusionItem[]>(initPromo?.inclusions ?? []);
  const [pendingIncs, setPendingIncs]     = useState<Array<{ label: string }>>([]);

  const [addons, setAddons] = useState<string[]>(initPromo?.features ?? []);

  const [selExclusions, setSelExclusions] = useState<InclusionItem[]>(initPromo?.exclusions ?? []);

  const [campaignLabel, setCampaignLabel] = useState(initPromo?.campaign_label ?? '');
  const [startsAt, setStartsAt]           = useState(initPromo?.starts_at?.slice(0, 10) ?? '');
  const [endsAt, setEndsAt]               = useState(initPromo?.ends_at?.slice(0, 10) ?? '');
  const [priority, setPriority]           = useState(String(initPromo?.priority ?? 0));
  const [isFeatured, setIsFeatured]       = useState(initPromo?.is_featured ?? false);

  // ── Editor draft states ────────────────────────────────────────────────────
  const [identityDraft, setIdentityDraft] = useState<IdentityDraft | null>(null);
  const [pricingDraft, setPricingDraft]   = useState<PricingDraft | null>(null);
  const [campaignDraft, setCampaignDraft] = useState<CampaignDraft | null>(null);

  const [incSnapshot, setIncSnapshot]   = useState<IncSnapshot | null>(null);
  const [showNewInc, setShowNewInc]     = useState(false);
  const [newIncLabel, setNewIncLabel]   = useState('');
  const [incSearch, setIncSearch]       = useState('');

  const [addonsSnapshot, setAddonsSnapshot] = useState<string[] | null>(null);
  const [showNewAddon, setShowNewAddon]     = useState(false);
  const [newAddonLabel, setNewAddonLabel]   = useState('');

  const [exclSnapshot, setExclSnapshot] = useState<InclusionItem[] | null>(null);
  const [exclSearch, setExclSearch]     = useState('');

  // ── Load package detail ────────────────────────────────────────────────────
  useEffect(() => {
    if (!resolvedPackageId) {
      ctx.setProgress('idle');
      return;
    }
    ctx.setProgress('loading', 'Loading…');
    fetchSurfacePackageDetail(resolvedPackageId)
      .then((res) => { setDetail(res); ctx.setProgress('idle'); })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load package.';
        setLoadErr(msg);
        ctx.setProgress('error', msg);
      });
  }, [resolvedPackageId]);

  // ── Full payload builder ───────────────────────────────────────────────────
  const buildPayload = (): PromotionTierPayload => ({
    name,
    slug: slugify(name),
    status,
    based_on: (basedOn as BasedOnTier) || null,
    headline,
    description,
    price: priceStr !== '' ? (parseFloat(priceStr) || null) : null,
    billing_label: billingLabel,
    features: addons,
    inclusions: selInclusions,
    exclusions: selExclusions,
    badge,
    campaign_label: campaignLabel,
    starts_at: startsAt ? `${startsAt} 00:00:00` : null,
    ends_at: endsAt ? `${endsAt} 23:59:59` : null,
    priority: parseInt(priority, 10) || 0,
    is_featured: isFeatured,
    metadata: {},
    new_inclusions: pendingIncs,
  });

  // ── Core save helper ───────────────────────────────────────────────────────
  const callSave = async (payload: PromotionTierPayload): Promise<string> => {
    if (!resolvedPackageId) throw new Error('No package to save to.');
    if (!currentPromoId) {
      const res = await createPromotionTier(resolvedPackageId, payload);
      return res.promo_id;
    }
    const res = await savePromotionTier(resolvedPackageId, currentPromoId, payload);
    return res.promo_id;
  };

  // ── Identity section ───────────────────────────────────────────────────────
  const openIdentityEditor = () => {
    setIdentityDraft({ name, status, basedOn, headline, description });
    setSaveErr(null);
    setEditingSection('identity');
  };

  const handleSaveIdentity = async () => {
    if (!identityDraft) return;
    if (!identityDraft.name.trim()) { setSaveErr('Promotion name is required.'); return; }
    setSaving(true);
    setSaveErr(null);
    try {
      const payload: PromotionTierPayload = {
        ...buildPayload(),
        name: identityDraft.name,
        slug: slugify(identityDraft.name),
        status: identityDraft.status,
        based_on: (identityDraft.basedOn as BasedOnTier) || null,
        headline: identityDraft.headline,
        description: identityDraft.description,
      };
      const savedId = await callSave(payload);
      if (!currentPromoId) setCurrentPromoId(savedId);
      setName(identityDraft.name);
      setStatus(identityDraft.status);
      setBasedOn(identityDraft.basedOn);
      setHeadline(identityDraft.headline);
      setDescription(identityDraft.description);
      const svcTitle = detail?.service?.title ?? serviceFromStep?.title ?? '';
      ctx.setTitle(`${identityDraft.name} — ${svcTitle}`);
      setEditingSection(null);
      setIdentityDraft(null);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  // ── Pricing section ────────────────────────────────────────────────────────
  const openPricingEditor = () => {
    setPricingDraft({ priceStr, billingLabel, badge });
    setSaveErr(null);
    setEditingSection('pricing');
  };

  const handleSavePricing = async () => {
    if (!pricingDraft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const payload: PromotionTierPayload = {
        ...buildPayload(),
        price: pricingDraft.priceStr !== '' ? (parseFloat(pricingDraft.priceStr) || null) : null,
        billing_label: pricingDraft.billingLabel,
        badge: pricingDraft.badge,
      };
      await callSave(payload);
      setPriceStr(pricingDraft.priceStr);
      setBillingLabel(pricingDraft.billingLabel);
      setBadge(pricingDraft.badge);
      setEditingSection(null);
      setPricingDraft(null);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  // ── Inclusions section ─────────────────────────────────────────────────────
  const openInclusionsEditor = () => {
    setIncSnapshot({ sel: [...selInclusions], pending: [...pendingIncs], excl: [...selExclusions] });
    setIncSearch('');
    setShowNewInc(false);
    setNewIncLabel('');
    setSaveErr(null);
    setEditingSection('inclusions');
  };

  const cancelInclusionsEditor = () => {
    if (incSnapshot) {
      setSelInclusions(incSnapshot.sel);
      setPendingIncs(incSnapshot.pending);
      setSelExclusions(incSnapshot.excl);
      setIncSnapshot(null);
    }
    setEditingSection(null);
  };

  const handleSaveInclusions = async () => {
    setSaving(true);
    setSaveErr(null);
    try {
      await callSave(buildPayload());
      setIncSnapshot(null);
      setEditingSection(null);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const toggleInclusion = (inc: InclusionItem) => {
    setSelInclusions((prev) => {
      const exists = prev.some((i) => i.id === inc.id);
      return exists ? prev.filter((i) => i.id !== inc.id) : [...prev, inc];
    });
    setSelExclusions((prev) => prev.filter((e) => e.id !== inc.id));
  };

  const handleAddNewInclusion = () => {
    const lbl = newIncLabel.trim();
    if (!lbl) return;
    const newId = slugify(lbl);
    setPendingIncs((p) => [...p, { label: lbl }]);
    setSelInclusions((prev) => prev.some((i) => i.id === newId) ? prev : [...prev, { id: newId, label: lbl }]);
    setNewIncLabel('');
    setShowNewInc(false);
  };

  // ── Add-ons section ────────────────────────────────────────────────────────
  const openAddonsEditor = () => {
    setAddonsSnapshot([...addons]);
    setShowNewAddon(false);
    setNewAddonLabel('');
    setSaveErr(null);
    setEditingSection('addons');
  };

  const cancelAddonsEditor = () => {
    if (addonsSnapshot) { setAddons(addonsSnapshot); setAddonsSnapshot(null); }
    setEditingSection(null);
  };

  const handleSaveAddons = async () => {
    setSaving(true);
    setSaveErr(null);
    try {
      await callSave(buildPayload());
      setAddonsSnapshot(null);
      setEditingSection(null);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddon = () => {
    const lbl = newAddonLabel.trim();
    if (!lbl) return;
    setAddons((prev) => [...prev, lbl]);
    setNewAddonLabel('');
    setShowNewAddon(false);
  };

  const handleUpdateAddon = (i: number, val: string) => {
    setAddons((prev) => prev.map((a, idx) => idx === i ? val : a));
  };

  const handleRemoveAddon = (i: number) => {
    setAddons((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── Not Included section ───────────────────────────────────────────────────
  const openExclusionsEditor = () => {
    setExclSnapshot([...selExclusions]);
    setExclSearch('');
    setSaveErr(null);
    setEditingSection('notincluded');
  };

  const cancelExclusionsEditor = () => {
    if (exclSnapshot) { setSelExclusions(exclSnapshot); setExclSnapshot(null); }
    setEditingSection(null);
  };

  const handleSaveExclusions = async () => {
    setSaving(true);
    setSaveErr(null);
    try {
      await callSave(buildPayload());
      setExclSnapshot(null);
      setEditingSection(null);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const toggleExclusion = (inc: InclusionItem) => {
    setSelExclusions((prev) => {
      const exists = prev.some((i) => i.id === inc.id);
      return exists ? prev.filter((i) => i.id !== inc.id) : [...prev, inc];
    });
  };

  // ── Campaign section ───────────────────────────────────────────────────────
  const openCampaignEditor = () => {
    setCampaignDraft({ campaignLabel, startsAt, endsAt, priority, isFeatured });
    setSaveErr(null);
    setEditingSection('campaign');
  };

  const handleSaveCampaign = async () => {
    if (!campaignDraft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      const payload: PromotionTierPayload = {
        ...buildPayload(),
        campaign_label: campaignDraft.campaignLabel,
        starts_at: campaignDraft.startsAt ? `${campaignDraft.startsAt} 00:00:00` : null,
        ends_at: campaignDraft.endsAt ? `${campaignDraft.endsAt} 23:59:59` : null,
        priority: parseInt(campaignDraft.priority, 10) || 0,
        is_featured: campaignDraft.isFeatured,
      };
      await callSave(payload);
      setCampaignLabel(campaignDraft.campaignLabel);
      setStartsAt(campaignDraft.startsAt);
      setEndsAt(campaignDraft.endsAt);
      setPriority(campaignDraft.priority);
      setIsFeatured(campaignDraft.isFeatured);
      setEditingSection(null);
      setCampaignDraft(null);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  // ── Archive / Reactivate ───────────────────────────────────────────────────
  const isArchived = status === 'archived';

  const handleToggleStatus = async () => {
    if (!resolvedPackageId || !currentPromoId) return;
    setSaving(true);
    setSaveErr(null);
    try {
      if (isArchived) {
        await reactivatePromotionTier(resolvedPackageId, currentPromoId);
        setStatus('active');
      } else {
        await archivePromotionTier(resolvedPackageId, currentPromoId);
        setStatus('archived');
      }
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Status update failed.');
    } finally {
      setSaving(false);
    }
  };

  // ── Derived lists for editors ──────────────────────────────────────────────
  const servicePool = detail?.service?.inclusions ?? [];
  const selIncIds   = new Set(selInclusions.map((i) => i.id));
  const selExclIds  = new Set(selExclusions.map((e) => e.id));

  const allForIncs: Array<InclusionItem & { isPending?: boolean }> = [
    ...pendingIncs.map((p) => ({ id: slugify(p.label), label: p.label, isPending: true as const })),
    ...servicePool,
  ];
  const filteredIncs   = allForIncs.filter((i) => i.label.toLowerCase().includes(incSearch.toLowerCase()));
  const unselectedPool = filteredIncs.filter((i) => !i.isPending && !selIncIds.has(i.id));

  const filteredForExcl = servicePool.filter(
    (i) => !selIncIds.has(i.id) && !selExclIds.has(i.id) && i.label.toLowerCase().includes(exclSearch.toLowerCase()),
  );

  const selIncCount = selInclusions.length + pendingIncs.length;

  // ── Render ─────────────────────────────────────────────────────────────────
  if (ctx.progress === 'loading' && !editingSection) {
    return <div class="cz-action-progress"><Spinner label="Loading…" /></div>;
  }
  if (loadErr) {
    return <div class="cz-admin-error-msg">{loadErr}</div>;
  }

  const service = detail?.service ?? serviceFromStep ?? null;

  return (
    <>
      <div class="cz-req-detail">

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div class="cz-sv-tabs">
          <button type="button" class={`cz-sv-tab${tab === 'commercial' ? ' cz-sv-tab--active' : ''}`} onClick={() => setTab('commercial')}>Promotion</button>
          <button type="button" class={`cz-sv-tab${tab === 'service' ? ' cz-sv-tab--active' : ''}`} onClick={() => setTab('service')}>Service Details</button>
        </div>

        {/* ── Commercial Tab ──────────────────────────────────────────── */}
        {tab === 'commercial' && (
          <>
            <ReadBlock title="Promotion Identity" onEdit={openIdentityEditor} noBorder>
              <div class="cz-sv-overview-block__identity">
                <p class="cz-sv-overview-block__name">{name || '(unnamed)'}</p>
              </div>
              <div class="cz-sv-overview-block__meta">
                <span class="cz-req-contact-grid__label">Status</span>
                <span class="cz-sv-overview-block__value"><span class={statusPillClass(status)}>{capitalize(status)}</span></span>
              </div>
              {basedOn && (
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Based On</span>
                  <span class="cz-sv-overview-block__value">{BASED_ON_LABELS[basedOn] ?? basedOn}</span>
                </div>
              )}
              {headline && (
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Headline</span>
                  <span class="cz-sv-overview-block__value">{headline}</span>
                </div>
              )}
              {description && (
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Description</span>
                  <span class="cz-sv-overview-block__desc">{description}</span>
                </div>
              )}
            </ReadBlock>

            <ReadBlock title="Pricing" onEdit={openPricingEditor} editDisabled={!identitySaved} noBorder>
              <div class="cz-sv-overview-block__meta">
                <span class="cz-req-contact-grid__label">Price</span>
                <span class="cz-sv-overview-block__value">
                  {priceStr ? `$${parseFloat(priceStr).toLocaleString()}` : '0.00'}
                </span>
              </div>
              {billingLabel && (
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Billing Label</span>
                  <span class="cz-sv-overview-block__value">{billingLabel}</span>
                </div>
              )}
              {badge && (
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Badge</span>
                  <span class="cz-sv-overview-block__value"><span class="cz-tier-badge">{badge}</span></span>
                </div>
              )}
            </ReadBlock>

            <ReadBlock title="Inclusions" count={selIncCount} onEdit={openInclusionsEditor} editDisabled={!identitySaved} noBorder>
              {selIncCount > 0 ? (
                <div class="cz-sc-inclusion-pool">
                  {pendingIncs.map((p, i) => (
                    <span key={i} class="cz-tf-chip">
                      {p.label}
                      <span class="cz-tf-new-badge">new</span>
                    </span>
                  ))}
                  {selInclusions.map((inc) => (
                    <span key={inc.id} class="cz-tf-chip">{inc.label}</span>
                  ))}
                </div>
              ) : (
                <p class="cz-sv-overview-block__name">No inclusions added</p>
              )}
            </ReadBlock>

            <ReadBlock title="Add-ons" count={addons.length || undefined} onEdit={openAddonsEditor} editDisabled={!identitySaved} noBorder>
              {addons.length > 0 ? (
                <div class="cz-sc-inclusion-pool">
                  {addons.map((a, i) => (
                    <span key={i} class="cz-tf-chip">{a}</span>
                  ))}
                </div>
              ) : (
                <p class="cz-sv-overview-block__name">No add-ons added</p>
              )}
            </ReadBlock>

            <ReadBlock title="Not Included" count={selExclusions.length || undefined} onEdit={openExclusionsEditor} editDisabled={!identitySaved} noBorder>
              {selExclusions.length > 0 ? (
                <div class="cz-sc-inclusion-pool">
                  {selExclusions.map((exc) => (
                    <span key={exc.id} class="cz-tf-chip cz-tf-chip--excluded">{exc.label}</span>
                  ))}
                </div>
              ) : (
                <p class="cz-sv-overview-block__name">No exclusions added</p>
              )}
            </ReadBlock>

            <ReadBlock title="Campaign" onEdit={openCampaignEditor} editDisabled={!identitySaved}>
              <div class="cz-sv-overview-block__identity">
                <p class="cz-sv-overview-block__name">{campaignLabel || 'No campaign set'}</p>
              </div>
              {(startsAt || endsAt) && (
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Dates</span>
                  <span class="cz-sv-overview-block__value">{fmtDate(startsAt || null)} → {fmtDate(endsAt || null)}</span>
                </div>
              )}
              {isFeatured && (
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Featured</span>
                  <span class="cz-sv-overview-block__value"><span class="cz-tier-badge cz-tier-badge--popular">★ Featured</span></span>
                </div>
              )}
            </ReadBlock>

            {saveErr && <div class="cz-admin-error-msg">{saveErr}</div>}

            <div class="cz-tf-footer">
              {currentPromoId && (
                <button
                  type="button"
                  class={`cz-admin-btn ${isArchived ? 'cz-admin-btn--secondary' : 'cz-admin-btn--danger'}`}
                  onClick={handleToggleStatus}
                  disabled={saving}
                >
                  {saving ? '…' : isArchived ? 'Enable Promotion' : 'Disable Promotion'}
                </button>
              )}
              <div class="cz-tf-footer__spacer" />
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={ctx.close}>
                {currentPromoId ? 'Done' : 'Cancel'}
              </button>
            </div>
          </>
        )}

        {/* ── Service Tab ──────────────────────────────────────────────── */}
        {tab === 'service' && (
          <>
            {service ? (
              <div class="cz-sv-commercial-block">
                <div class="cz-sv-commercial-block__header">
                  <span class="cz-sv-commercial-block__label">{service.title}</span>
                </div>
                {service.excerpt && (
                  <p class="cz-sv-commercial-block__count">{service.excerpt}</p>
                )}
                {service.categories && service.categories.length > 0 && (
                  <div class="cz-sv-overview-block__meta" style="margin-top:var(--cz-space-2)">
                    <span class="cz-req-contact-grid__label">Category</span>
                    <span class="cz-sv-overview-block__value">{service.categories.map((c) => c.name).join(', ')}</span>
                  </div>
                )}
              </div>
            ) : (
              <div class="cz-req-detail__section">
                <p class="cz-sc-pkg-block__empty-msg">No service linked to this package.</p>
              </div>
            )}
            <div class="cz-tf-footer">
              <div class="cz-tf-footer__spacer" />
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={ctx.close}>Done</button>
            </div>
          </>
        )}
      </div>

      {/* ── Identity InlineEditorShell ─────────────────────────────────────── */}
      {editingSection === 'identity' && identityDraft && (
        <InlineEditorShell
          title="Edit Promotion Identity"
          onSave={handleSaveIdentity}
          onCancel={() => { setEditingSection(null); setIdentityDraft(null); setSaveErr(null); }}
          saving={saving}
          saveErr={saveErr}
        >
          <div class="cz-tf-form">
            <div class="cz-tf-field">
              <label class="cz-tf-label">Name *</label>
              <input
                type="text"
                class="cz-tf-input"
                value={identityDraft.name}
                onInput={(e) => setIdentityDraft((d) => d ? { ...d, name: (e.target as HTMLInputElement).value } : d)}
                placeholder="e.g. Black Friday Special"
                autoFocus
              />
            </div>
            <div class="cz-tf-field">
              <label class="cz-tf-label">Status</label>
              <select
                class="cz-tf-select"
                value={identityDraft.status}
                onChange={(e) => setIdentityDraft((d) => d ? { ...d, status: (e.target as HTMLSelectElement).value as PromotionStatus } : d)}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div class="cz-tf-field">
              <label class="cz-tf-label">Based On</label>
              <select
                class="cz-tf-select"
                value={identityDraft.basedOn}
                onChange={(e) => setIdentityDraft((d) => d ? { ...d, basedOn: (e.target as HTMLSelectElement).value } : d)}
              >
                <option value="">Custom — not based on a core tier</option>
                {TIERS.map((t) => <option key={t} value={t}>{TIER_LABELS[t]}</option>)}
              </select>
              <p class="cz-tf-hint">Authoring context only — no runtime inheritance.</p>
            </div>
            <div class="cz-tf-field">
              <label class="cz-tf-label">Headline</label>
              <input
                type="text"
                class="cz-tf-input"
                value={identityDraft.headline}
                onInput={(e) => setIdentityDraft((d) => d ? { ...d, headline: (e.target as HTMLInputElement).value } : d)}
                placeholder="Short marketing headline"
              />
            </div>
            <div class="cz-tf-field">
              <label class="cz-tf-label">Description</label>
              <textarea
                class="cz-tf-textarea"
                rows={3}
                value={identityDraft.description}
                onInput={(e) => setIdentityDraft((d) => d ? { ...d, description: (e.target as HTMLTextAreaElement).value } : d)}
                placeholder="Longer promotional description"
              />
            </div>
          </div>
        </InlineEditorShell>
      )}

      {/* ── Pricing InlineEditorShell ──────────────────────────────────────── */}
      {editingSection === 'pricing' && pricingDraft && (
        <InlineEditorShell
          title="Edit Pricing"
          onSave={handleSavePricing}
          onCancel={() => { setEditingSection(null); setPricingDraft(null); setSaveErr(null); }}
          saving={saving}
          saveErr={saveErr}
        >
          <div class="cz-tf-form">
            <div class="cz-tf-field">
              <label class="cz-tf-label">Price</label>
              <input
                type="number"
                class="cz-tf-input cz-tf-input--price"
                value={pricingDraft.priceStr}
                onInput={(e) => setPricingDraft((d) => d ? { ...d, priceStr: (e.target as HTMLInputElement).value } : d)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div class="cz-tf-field">
              <label class="cz-tf-label">Billing Label</label>
              <input
                type="text"
                class="cz-tf-input"
                value={pricingDraft.billingLabel}
                onInput={(e) => setPricingDraft((d) => d ? { ...d, billingLabel: (e.target as HTMLInputElement).value } : d)}
                placeholder="e.g. per endpoint / month"
              />
            </div>
            <div class="cz-tf-field">
              <label class="cz-tf-label">Badge</label>
              <input
                type="text"
                class="cz-tf-input"
                value={pricingDraft.badge}
                onInput={(e) => setPricingDraft((d) => d ? { ...d, badge: (e.target as HTMLInputElement).value } : d)}
                placeholder="e.g. Black Friday, Save 30%"
              />
            </div>
          </div>
        </InlineEditorShell>
      )}

      {/* ── Inclusions InlineEditorShell ───────────────────────────────────── */}
      {editingSection === 'inclusions' && (
        <InlineEditorShell
          title="Edit Inclusions"
          onSave={handleSaveInclusions}
          onCancel={cancelInclusionsEditor}
          saving={saving}
          saveErr={saveErr}
        >
          <div class="cz-tf-form">
            <div class="cz-tf-section">
              <span class="cz-tf-label">Selected</span>
              {selIncCount > 0 ? (
                <div class="cz-tf-checklist">
                  {pendingIncs.map((p, i) => (
                    <label key={`pi-${i}`} class="cz-tf-check-item">
                      <input type="checkbox" checked onChange={() => setPendingIncs((prev) => prev.filter((_, idx) => idx !== i))} />
                      <span class="cz-tf-check-item__text">{p.label}</span>
                      <span class="cz-tf-new-badge">new</span>
                    </label>
                  ))}
                  {selInclusions.map((inc) => (
                    <label key={inc.id} class="cz-tf-check-item">
                      <input type="checkbox" checked onChange={() => toggleInclusion(inc)} />
                      <span class="cz-tf-check-item__text">{inc.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p class="cz-tf-hint">No items selected.</p>
              )}
            </div>
            <div class="cz-tf-section">
              <span class="cz-tf-label">Service pool</span>
              <input
                type="text"
                class="cz-tf-input"
                placeholder="Search…"
                value={incSearch}
                onInput={(e) => setIncSearch((e.target as HTMLInputElement).value)}
              />
              <div class="cz-tf-checklist">
                {unselectedPool.length === 0 ? (
                  <p class="cz-tf-hint">{incSearch ? 'No matches.' : 'All pool items are selected.'}</p>
                ) : (
                  unselectedPool.map((inc) => (
                    <label key={inc.id} class="cz-tf-check-item">
                      <input type="checkbox" checked={false} onChange={() => toggleInclusion(inc)} />
                      <span class="cz-tf-check-item__text">{inc.label}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            {showNewInc ? (
              <div class="cz-tf-inline-add">
                <input
                  type="text"
                  class="cz-tf-input"
                  placeholder="Inclusion label"
                  value={newIncLabel}
                  onInput={(e) => setNewIncLabel((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewInclusion(); } }}
                  autoFocus
                />
                <div class="cz-tf-inline-add__actions">
                  <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" onClick={handleAddNewInclusion}>Add to pool</button>
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => { setShowNewInc(false); setNewIncLabel(''); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button type="button" class="cz-tf-add-btn" onClick={() => setShowNewInc(true)}>+ Add new to service pool</button>
            )}
          </div>
        </InlineEditorShell>
      )}

      {/* ── Add-ons InlineEditorShell ──────────────────────────────────────── */}
      {editingSection === 'addons' && (
        <InlineEditorShell
          title="Edit Add-ons"
          onSave={handleSaveAddons}
          onCancel={cancelAddonsEditor}
          saving={saving}
          saveErr={saveErr}
        >
          <div class="cz-tf-form">
            {addons.map((addon, i) => (
              <div key={i} class="cz-tf-addon-row">
                <input
                  type="text"
                  class="cz-tf-input"
                  value={addon}
                  onInput={(e) => handleUpdateAddon(i, (e.target as HTMLInputElement).value)}
                />
                <button type="button" class="cz-tf-remove-btn" onClick={() => handleRemoveAddon(i)} title="Remove">×</button>
              </div>
            ))}
            {showNewAddon ? (
              <div class="cz-tf-inline-add">
                <input
                  type="text"
                  class="cz-tf-input"
                  placeholder="e.g. Priority onboarding"
                  value={newAddonLabel}
                  onInput={(e) => setNewAddonLabel((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAddon(); } }}
                  autoFocus
                />
                <div class="cz-tf-inline-add__actions">
                  <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" onClick={handleAddAddon}>Add</button>
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => { setShowNewAddon(false); setNewAddonLabel(''); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button type="button" class="cz-tf-add-btn" onClick={() => setShowNewAddon(true)}>+ Add add-on</button>
            )}
          </div>
        </InlineEditorShell>
      )}

      {/* ── Not Included InlineEditorShell ────────────────────────────────── */}
      {editingSection === 'notincluded' && (
        <InlineEditorShell
          title="Edit Not Included"
          onSave={handleSaveExclusions}
          onCancel={cancelExclusionsEditor}
          saving={saving}
          saveErr={saveErr}
        >
          <div class="cz-tf-form">
            <div class="cz-tf-section">
              <span class="cz-tf-label">Excluded items</span>
              {selExclusions.length > 0 ? (
                <div class="cz-tf-checklist cz-tf-checklist--excluded">
                  {selExclusions.map((exc) => (
                    <label key={exc.id} class="cz-tf-check-item cz-tf-check-item--excluded">
                      <input type="checkbox" checked onChange={() => toggleExclusion(exc)} />
                      <span class="cz-tf-check-item__text">{exc.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p class="cz-tf-hint">No items excluded.</p>
              )}
            </div>
            <div class="cz-tf-section">
              <span class="cz-tf-label">Service pool (not already included)</span>
              <input
                type="text"
                class="cz-tf-input"
                placeholder="Search…"
                value={exclSearch}
                onInput={(e) => setExclSearch((e.target as HTMLInputElement).value)}
              />
              <div class="cz-tf-checklist">
                {filteredForExcl.length === 0 ? (
                  <p class="cz-tf-hint">
                    {exclSearch ? 'No matches.' : servicePool.length === 0 ? 'No inclusions in service pool.' : 'All pool items are selected as inclusions.'}
                  </p>
                ) : (
                  filteredForExcl.map((inc) => (
                    <label key={inc.id} class="cz-tf-check-item">
                      <input type="checkbox" checked={false} onChange={() => toggleExclusion(inc)} />
                      <span class="cz-tf-check-item__text">{inc.label}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        </InlineEditorShell>
      )}

      {/* ── Campaign InlineEditorShell ─────────────────────────────────────── */}
      {editingSection === 'campaign' && campaignDraft && (
        <InlineEditorShell
          title="Edit Campaign"
          onSave={handleSaveCampaign}
          onCancel={() => { setEditingSection(null); setCampaignDraft(null); setSaveErr(null); }}
          saving={saving}
          saveErr={saveErr}
        >
          <div class="cz-tf-form">
            <div class="cz-tf-field">
              <label class="cz-tf-label">Campaign Label</label>
              <input
                type="text"
                class="cz-tf-input"
                value={campaignDraft.campaignLabel}
                onInput={(e) => setCampaignDraft((d) => d ? { ...d, campaignLabel: (e.target as HTMLInputElement).value } : d)}
                placeholder="e.g. Black Friday 2026"
              />
            </div>
            <div class="cz-tf-price-row">
              <div class="cz-tf-field">
                <label class="cz-tf-label">Valid From</label>
                <input
                  type="date"
                  class="cz-tf-input"
                  value={campaignDraft.startsAt}
                  onInput={(e) => setCampaignDraft((d) => d ? { ...d, startsAt: (e.target as HTMLInputElement).value } : d)}
                />
              </div>
              <div class="cz-tf-field">
                <label class="cz-tf-label">Valid Until</label>
                <input
                  type="date"
                  class="cz-tf-input"
                  value={campaignDraft.endsAt}
                  onInput={(e) => setCampaignDraft((d) => d ? { ...d, endsAt: (e.target as HTMLInputElement).value } : d)}
                />
              </div>
            </div>
            <div class="cz-tf-field">
              <label class="cz-tf-label">Sort Priority</label>
              <input
                type="number"
                class="cz-tf-input"
                value={campaignDraft.priority}
                onInput={(e) => setCampaignDraft((d) => d ? { ...d, priority: (e.target as HTMLInputElement).value } : d)}
                min="0"
                placeholder="0"
              />
              <p class="cz-tf-hint">Lower numbers appear first.</p>
            </div>
            <label class="cz-tf-check-row">
              <input
                type="checkbox"
                checked={campaignDraft.isFeatured}
                onChange={(e) => setCampaignDraft((d) => d ? { ...d, isFeatured: (e.target as HTMLInputElement).checked } : d)}
              />
              <span>Featured promotion</span>
            </label>
          </div>
        </InlineEditorShell>
      )}
    </>
  );
}

// ── PromotionPackageCard ──────────────────────────────────────────────────────

interface CardProps {
  pkg: SurfacePackageSummary;
  openAction: (config: ActionConfig) => void;
  onRefetch: () => void;
}

function PromotionPackageCard({ pkg, openAction, onRefetch }: CardProps) {
  const serviceNames = pkg.services.map((s) => s.title).join(', ') || '(no service linked)';
  const promos       = pkg.promotion_tiers;
  const isEnabled    = pkg.platform_status === 'active';
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const handleView = (promo: PromotionTier) => {
    openAction({
      id:   `promo-view-${pkg.post_id}-${promo.id}`,
      mode: 'drawer',
      title: `${promo.name || 'Promotion'} — ${serviceNames}`,
      initialStepData: {
        packageId:   pkg.post_id,
        promoId:     promo.id,
        promo,
        serviceName: serviceNames,
        isNew:       false,
      },
      steps: [{ id: 'promo-view', title: promo.name || 'Promotion', component: PromotionViewStep }],
    });
  };

  const handleAddPromotion = () => {
    openAction({
      id:   `promo-create-${pkg.post_id}`,
      mode: 'drawer',
      title: `New Promotion — ${serviceNames}`,
      initialStepData: {
        packageId:   pkg.post_id,
        promoId:     null,
        promo:       null,
        serviceName: serviceNames,
        isNew:       true,
      },
      steps: [{ id: 'promo-view', title: 'New Promotion', component: PromotionViewStep }],
    });
  };

  const handleArchive = async (promoId: string) => {
    setArchivingId(promoId);
    try {
      await archivePromotionTier(pkg.post_id, promoId);
      onRefetch();
    } catch {
      onRefetch();
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div class={`cz-ws-card${!isEnabled ? ' cz-ws-card--disabled' : ''}`}>

      {/* ── Package header ─────────────────────────────────────────────────── */}
      <div class="cz-sp-pkg-header">
        <div class="cz-sp-pkg-header__left">
          <p class="cz-sp-pkg-header__title">
            {pkg.title}
            {!isEnabled && <span class="cz-status-pill cz-status-pill--inactive">Disabled</span>}
          </p>
          <p class="cz-sp-pkg-header__service">{serviceNames}</p>
        </div>
        <div class="cz-sp-pkg-header__actions">
          <span class="cz-promo-count-pill">
            {promos.length} promotion{promos.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Promotions section header ──────────────────────────────────────── */}
      <div class="cz-sp-tiers-header">
        <p class="cz-sp-tiers-header__label">Promotion Tiers</p>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
          onClick={handleAddPromotion}
        >
          + Add Promotion
        </button>
      </div>

      {/* ── Promotions table ───────────────────────────────────────────────── */}
      {promos.length === 0 ? (
        <p class="cz-sp-empty-tiers">No promotion tiers yet. Use Add Promotion to create one.</p>
      ) : (
        <div class="cz-promo-table-wrap">
          <table class="cz-promo-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Based On</th>
                <th>Price</th>
                <th>Status</th>
                <th>Campaign</th>
                <th>Start</th>
                <th>End</th>
                <th class="cz-promo-table__center">Featured</th>
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
                    {promo.based_on
                      ? (BASED_ON_LABELS[promo.based_on] ?? promo.based_on)
                      : <span style="color:var(--admin-text-faint)">Custom</span>}
                  </td>
                  <td>
                    <span class={`cz-price-tag${promo.price !== null ? ' cz-price-tag--has-price' : ''}`}>
                      {fmtPrice(promo.price)}
                    </span>
                  </td>
                  <td>
                    <span class={statusPillClass(promo.status)}>
                      {capitalize(promo.status)}
                    </span>
                  </td>
                  <td class="cz-promo-table__muted">{promo.campaign_label || '—'}</td>
                  <td class="cz-promo-table__muted">{fmtDate(promo.starts_at)}</td>
                  <td class="cz-promo-table__muted">{fmtDate(promo.ends_at)}</td>
                  <td class="cz-promo-table__center">
                    {promo.is_featured
                      ? <span class="cz-tier-badge cz-tier-badge--popular">★</span>
                      : <span style="color:var(--admin-text-faint)">—</span>}
                  </td>
                  <td class="cz-promo-table__actions">
                    <button
                      type="button"
                      class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                      onClick={() => handleView(promo)}
                    >
                      View
                    </button>
                    {promo.status !== 'archived' && (
                      <button
                        type="button"
                        class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                        onClick={() => handleArchive(promo.id)}
                        disabled={archivingId === promo.id}
                      >
                        {archivingId === promo.id ? '…' : 'Archive'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main workstation ──────────────────────────────────────────────────────────

export function PromotionsWorkstation({ refreshKey, openAction }: Props) {
  const { data, loading, error, refetch } = useSurfacePackages();
  const { data: cbData }                  = useCostBuilder();

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  const handleNewPromotion = useCallback(() => {
    const packages    = data?.packages ?? [];
    const packagedIds = new Set(packages.flatMap((p) => p.service_refs));
    const allServices = cbData?.services_by_category.flatMap((g) => g.services) ?? [];

    openAction({
      id:             'promotion-create',
      mode:           'drawer',
      title:          'New Promotion',
      hideStepHeader: true,
      initialStepData: {
        allServices,
        packagedIds,
        packages,
        isNew: true,
      },
      steps: [
        { id: 'select-service', title: 'Select Service', component: PackageSelectServiceStep },
        { id: 'promo-view',     title: 'New Promotion',  component: PromotionViewStep        },
      ],
    });
  }, [cbData, data, openAction]);

  if (loading) {
    return (
      <div class="cz-admin-loading">
        <Spinner label="Loading promotions…" />
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

  const packages    = data?.packages ?? [];
  const totalPromos = packages.reduce((sum, p) => sum + p.promotion_tiers.length, 0);

  return (
    <div>
      <div class="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Promotions</h2>
          <p class="cz-ws-subtitle">
            {totalPromos} promotion tier{totalPromos !== 1 ? 's' : ''} across{' '}
            {packages.length} package{packages.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div class="cz-ws-header__actions">
          <button
            type="button"
            class="cz-admin-btn cz-admin-btn--primary"
            onClick={handleNewPromotion}
          >
            + New Promotion
          </button>
        </div>
      </div>

      {packages.length === 0 ? (
        <div class="cz-admin-empty">
          <p>No surface packages found. Run the MEP seed to create the first package.</p>
        </div>
      ) : (
        packages.map((pkg) => (
          <PromotionPackageCard
            key={pkg.post_id}
            pkg={pkg}
            openAction={openAction}
            onRefetch={refetch}
          />
        ))
      )}
    </div>
  );
}
