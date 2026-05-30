import { useEffect, useState } from 'preact/hooks';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { Spinner } from '@/components/ui/Spinner';
import {
  fetchSurfacePackageDetail,
  createPromotionTier,
  savePromotionTier,
  archivePromotionTier,
} from '@/api/endpoints/admin';
import type { ActionConfig, StepContext } from '../ActionShell';
import type {
  SurfacePackageSummary,
  SurfacePackageDetailResponse,
  PromotionTier,
  PromotionStatus,
  BasedOnTier,
  InclusionItem,
  PromotionTierPayload,
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

// ── PromotionManageStep — drawer step ─────────────────────────────────────────

export function PromotionManageStep({ ctx }: { ctx: StepContext }) {
  const packageId = ctx.stepData.packageId as number;
  const promoId   = ctx.stepData.promoId as string | null;
  const initPromo = ctx.stepData.promo as PromotionTier | null;
  const isNew     = !!(ctx.stepData.isNew as boolean | undefined) || !promoId;

  const [detail, setDetail]   = useState<SurfacePackageDetailResponse | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // ── Identity ──────────────────────────────────────────────────────────────
  const [name, setName]               = useState(initPromo?.name ?? '');
  const [status, setStatus]           = useState<PromotionStatus>(initPromo?.status ?? 'draft');
  const [basedOn, setBasedOn]         = useState<string>(initPromo?.based_on ?? '');
  const [headline, setHeadline]       = useState(initPromo?.headline ?? '');
  const [description, setDescription] = useState(initPromo?.description ?? '');

  // ── Pricing ───────────────────────────────────────────────────────────────
  const [priceStr, setPriceStr]         = useState(initPromo?.price != null ? String(initPromo.price) : '');
  const [billingLabel, setBillingLabel] = useState(initPromo?.billing_label ?? '');
  const [badge, setBadge]               = useState(initPromo?.badge ?? '');

  // ── Content: Inclusions ───────────────────────────────────────────────────
  const [selInclusions, setSelInclusions] = useState<InclusionItem[]>(initPromo?.inclusions ?? []);
  const [pendingIncs, setPendingIncs]     = useState<Array<{ label: string }>>([]);
  const [showNewInc, setShowNewInc]       = useState(false);
  const [newIncLabel, setNewIncLabel]     = useState('');
  const [incSearch, setIncSearch]         = useState('');

  // ── Content: Add-ons (features) ───────────────────────────────────────────
  const [addons, setAddons]               = useState<string[]>(initPromo?.features ?? []);
  const [showNewAddon, setShowNewAddon]   = useState(false);
  const [newAddonLabel, setNewAddonLabel] = useState('');

  // ── Content: Not Included (exclusions) ───────────────────────────────────
  const [selExclusions, setSelExclusions] = useState<InclusionItem[]>(initPromo?.exclusions ?? []);
  const [exclSearch, setExclSearch]       = useState('');

  // ── Campaign ──────────────────────────────────────────────────────────────
  const [campaignLabel, setCampaignLabel] = useState(initPromo?.campaign_label ?? '');
  const [startsAt, setStartsAt]           = useState(initPromo?.starts_at?.slice(0, 10) ?? '');
  const [endsAt, setEndsAt]               = useState(initPromo?.ends_at?.slice(0, 10) ?? '');
  const [priority, setPriority]           = useState(String(initPromo?.priority ?? 0));
  const [isFeatured, setIsFeatured]       = useState(initPromo?.is_featured ?? false);

  // ── Load service detail (for inclusion pool) ──────────────────────────────
  useEffect(() => {
    ctx.setProgress('loading', 'Loading…');
    fetchSurfacePackageDetail(packageId)
      .then((res) => {
        setDetail(res);
        ctx.setProgress('idle');
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load package.';
        setLoadErr(msg);
        ctx.setProgress('error', msg);
      });
  }, [packageId]);

  // ── Derived inclusion lists ───────────────────────────────────────────────

  const servicePool = detail?.service?.inclusions ?? [];

  // Pool for Inclusions: service pool + pending new items (shown at top)
  const allForInclusions: Array<InclusionItem & { isPending?: boolean }> = [
    ...pendingIncs.map((p) => ({ id: slugify(p.label), label: p.label, isPending: true as const })),
    ...servicePool,
  ];
  const filteredIncs = allForInclusions.filter(
    (i) => i.label.toLowerCase().includes(incSearch.toLowerCase()),
  );

  // Pool for Not Included: only existing service pool items not already selected as inclusions
  const filteredForExcl = servicePool.filter(
    (i) =>
      !selInclusions.some((s) => s.id === i.id) &&
      i.label.toLowerCase().includes(exclSearch.toLowerCase()),
  );

  // ── Inclusion handlers ────────────────────────────────────────────────────

  const toggleInclusion = (inc: InclusionItem) => {
    setSelInclusions((prev) => {
      const exists = prev.some((i) => i.id === inc.id);
      return exists ? prev.filter((i) => i.id !== inc.id) : [...prev, inc];
    });
    // If an item is being included, remove it from exclusions
    setSelExclusions((prev) => prev.filter((e) => e.id !== inc.id));
  };

  const handleAddNewInclusion = () => {
    const lbl = newIncLabel.trim();
    if (!lbl) return;
    const newId = slugify(lbl);
    setPendingIncs((p) => [...p, { label: lbl }]);
    setSelInclusions((prev) => (prev.some((i) => i.id === newId) ? prev : [...prev, { id: newId, label: lbl }]));
    setNewIncLabel('');
    setShowNewInc(false);
  };

  const toggleExclusion = (inc: InclusionItem) => {
    setSelExclusions((prev) => {
      const exists = prev.some((i) => i.id === inc.id);
      return exists ? prev.filter((i) => i.id !== inc.id) : [...prev, inc];
    });
  };

  // ── Add-on handlers ───────────────────────────────────────────────────────

  const handleAddAddon = () => {
    const lbl = newAddonLabel.trim();
    if (!lbl) return;
    setAddons((prev) => [...prev, lbl]);
    setNewAddonLabel('');
    setShowNewAddon(false);
  };

  const handleUpdateAddon = (i: number, val: string) => {
    setAddons((prev) => prev.map((a, idx) => (idx === i ? val : a)));
  };

  const handleRemoveAddon = (i: number) => {
    setAddons((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── Save ──────────────────────────────────────────────────────────────────

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

  const handleSave = async () => {
    if (!name.trim()) {
      setSaveErr('Promotion name is required.');
      return;
    }
    setSaving(true);
    setSaveErr(null);
    try {
      if (isNew) {
        await createPromotionTier(packageId, buildPayload());
      } else {
        await savePromotionTier(packageId, promoId!, buildPayload());
      }
      ctx.goNext();
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (ctx.progress === 'loading') {
    return <div class="cz-action-progress"><Spinner label="Loading promotion…" /></div>;
  }
  if (loadErr) {
    return <div class="cz-admin-error-msg">{loadErr}</div>;
  }
  if (!detail) return null;

  const service = detail.service;

  return (
    <div class="cz-tf-form">

      {/* ── Section 1: Service ─────────────────────────────────────────── */}
      {service && (
        <div class="cz-tf-section">
          <p class="cz-tf-section-title">Service</p>
          <p class="cz-tf-service-title">{service.title}</p>
          {service.excerpt && <p class="cz-tf-service-desc">{service.excerpt}</p>}
        </div>
      )}

      {/* ── Section 2: Promotion Identity ─────────────────────────────── */}
      <div class="cz-tf-section">
        <p class="cz-tf-section-title">Promotion Identity</p>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Name *</label>
          <input
            type="text"
            class="cz-tf-input"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder="e.g. Black Friday Special"
          />
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Status</label>
          <select
            class="cz-tf-select"
            value={status}
            onChange={(e) => setStatus((e.target as HTMLSelectElement).value as PromotionStatus)}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Based on</label>
          <select
            class="cz-tf-select"
            value={basedOn}
            onChange={(e) => setBasedOn((e.target as HTMLSelectElement).value)}
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
            value={headline}
            onInput={(e) => setHeadline((e.target as HTMLInputElement).value)}
            placeholder="Short marketing headline"
          />
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Description</label>
          <textarea
            class="cz-tf-textarea"
            rows={3}
            value={description}
            onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
            placeholder="Longer promotional description"
          />
        </div>
      </div>

      {/* ── Section 3: Pricing ────────────────────────────────────────── */}
      <div class="cz-tf-section">
        <p class="cz-tf-section-title">Pricing</p>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Price</label>
          <input
            type="number"
            class="cz-tf-input cz-tf-input--price"
            value={priceStr}
            onInput={(e) => setPriceStr((e.target as HTMLInputElement).value)}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Billing label</label>
          <input
            type="text"
            class="cz-tf-input"
            value={billingLabel}
            onInput={(e) => setBillingLabel((e.target as HTMLInputElement).value)}
            placeholder="e.g. per endpoint / month"
          />
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Badge</label>
          <input
            type="text"
            class="cz-tf-input"
            value={badge}
            onInput={(e) => setBadge((e.target as HTMLInputElement).value)}
            placeholder="e.g. Black Friday, Save 30%"
          />
        </div>
      </div>

      {/* ── Section 4: Content ────────────────────────────────────────── */}
      <div class="cz-tf-section">
        <p class="cz-tf-section-title">Content</p>

        {/* Inclusions */}
        <div class="cz-tf-subsection">
          <div class="cz-tf-section-header">
            <p class="cz-tf-subsection-label">Inclusions</p>
            {selInclusions.length > 0 && (
              <span class="cz-tf-count">{selInclusions.length} selected</span>
            )}
          </div>
          <p class="cz-tf-hint" style="margin-bottom:var(--cz-space-3)">
            Select items from the service inclusion pool.
          </p>
          <input
            type="text"
            class="cz-tf-input"
            placeholder="Search inclusions…"
            value={incSearch}
            onInput={(e) => setIncSearch((e.target as HTMLInputElement).value)}
          />
          <div class="cz-tf-checklist">
            {filteredIncs.length === 0 && (
              <div class="cz-tf-check-item" style="cursor:default;color:var(--admin-text-faint)">
                {incSearch ? 'No matches.' : 'No inclusions in service pool.'}
              </div>
            )}
            {filteredIncs.map((inc) => {
              const checked = inc.isPending || selInclusions.some((s) => s.id === inc.id);
              return (
                <label key={inc.id} class="cz-tf-check-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={inc.isPending}
                    onChange={() => !inc.isPending && toggleInclusion(inc)}
                  />
                  <span class="cz-tf-check-item__text">{inc.label}</span>
                  {inc.isPending && <span class="cz-tf-new-badge">new</span>}
                </label>
              );
            })}
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
                <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" onClick={handleAddNewInclusion}>
                  Add to pool
                </button>
                <button type="button" class="cz-admin-btn cz-admin-btn--ghost cz-admin-btn--sm" onClick={() => { setShowNewInc(false); setNewIncLabel(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" class="cz-tf-add-btn" onClick={() => setShowNewInc(true)}>
              + Add new inclusion to service pool
            </button>
          )}
        </div>

        {/* Add-ons */}
        <div class="cz-tf-subsection">
          <div class="cz-tf-section-header">
            <p class="cz-tf-subsection-label">Add-ons</p>
            {addons.length > 0 && (
              <span class="cz-tf-count">{addons.length}</span>
            )}
          </div>
          <p class="cz-tf-hint" style="margin-bottom:var(--cz-space-3)">
            Promotion-specific extras, bonuses, or selling points — not part of the service pool.
          </p>
          {addons.map((addon, i) => (
            <div key={i} class="cz-tf-addon-row">
              <input
                type="text"
                class="cz-tf-input"
                value={addon}
                onInput={(e) => handleUpdateAddon(i, (e.target as HTMLInputElement).value)}
              />
              <button
                type="button"
                class="cz-tf-remove-btn"
                onClick={() => handleRemoveAddon(i)}
                title="Remove"
              >×</button>
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
                <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" onClick={handleAddAddon}>
                  Add
                </button>
                <button type="button" class="cz-admin-btn cz-admin-btn--ghost cz-admin-btn--sm" onClick={() => { setShowNewAddon(false); setNewAddonLabel(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" class="cz-tf-add-btn" onClick={() => setShowNewAddon(true)}>
              + Add add-on
            </button>
          )}
        </div>

        {/* Not Included */}
        <div class="cz-tf-subsection cz-tf-subsection--last">
          <div class="cz-tf-section-header">
            <p class="cz-tf-subsection-label">Not Included</p>
            {selExclusions.length > 0 && (
              <span class="cz-tf-count cz-tf-count--excluded">{selExclusions.length} selected</span>
            )}
          </div>
          <p class="cz-tf-hint" style="margin-bottom:var(--cz-space-3)">
            Service pool items explicitly excluded from this promotion.
          </p>
          <input
            type="text"
            class="cz-tf-input"
            placeholder="Search…"
            value={exclSearch}
            onInput={(e) => setExclSearch((e.target as HTMLInputElement).value)}
          />
          <div class="cz-tf-checklist cz-tf-checklist--excluded">
            {filteredForExcl.length === 0 && (
              <div class="cz-tf-check-item" style="cursor:default;color:var(--admin-text-faint)">
                {exclSearch ? 'No matches.' : servicePool.length === 0 ? 'No inclusions in service pool.' : 'All pool items are selected as inclusions.'}
              </div>
            )}
            {filteredForExcl.map((inc) => (
              <label key={inc.id} class={`cz-tf-check-item${selExclusions.some((e) => e.id === inc.id) ? ' cz-tf-check-item--excluded' : ''}`}>
                <input
                  type="checkbox"
                  checked={selExclusions.some((e) => e.id === inc.id)}
                  onChange={() => toggleExclusion(inc)}
                />
                <span class="cz-tf-check-item__text">{inc.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 5: Campaign ───────────────────────────────────────── */}
      <div class="cz-tf-section">
        <p class="cz-tf-section-title">Campaign</p>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Campaign label</label>
          <input
            type="text"
            class="cz-tf-input"
            value={campaignLabel}
            onInput={(e) => setCampaignLabel((e.target as HTMLInputElement).value)}
            placeholder="e.g. Black Friday 2026"
          />
        </div>

        <div class="cz-tf-price-row">
          <div class="cz-tf-field" style="flex:1">
            <label class="cz-tf-label">Valid from</label>
            <input
              type="date"
              class="cz-tf-input"
              value={startsAt}
              onInput={(e) => setStartsAt((e.target as HTMLInputElement).value)}
            />
          </div>
          <div class="cz-tf-field" style="flex:1">
            <label class="cz-tf-label">Valid until</label>
            <input
              type="date"
              class="cz-tf-input"
              value={endsAt}
              onInput={(e) => setEndsAt((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Sort priority</label>
          <input
            type="number"
            class="cz-tf-input"
            value={priority}
            onInput={(e) => setPriority((e.target as HTMLInputElement).value)}
            min="0"
            placeholder="0"
          />
          <p class="cz-tf-hint">Lower numbers appear first in the promotions section.</p>
        </div>

        <label class="cz-tf-check-row">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured((e.target as HTMLInputElement).checked)}
          />
          <span>Featured promotion</span>
        </label>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {saveErr && (
        <div class="cz-admin-error-msg">{saveErr}</div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div class="cz-tf-footer">
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--ghost" onClick={ctx.close} disabled={saving}>
          Cancel
        </button>
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Create Promotion' : 'Save Promotion'}
        </button>
      </div>
    </div>
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
  const isEnabled    = pkg.post_status === 'publish';
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const handleManage = (promo: PromotionTier) => {
    openAction({
      id:   `promo-manage-${pkg.post_id}-${promo.id}`,
      mode: 'drawer',
      title: `${promo.name || 'Promotion'} — ${serviceNames}`,
      initialStepData: {
        packageId:   pkg.post_id,
        promoId:     promo.id,
        promo,
        serviceName: serviceNames,
        isNew:       false,
      },
      steps: [{ id: 'promo-form', title: promo.name || 'Promotion', component: PromotionManageStep }],
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
      steps: [{ id: 'promo-form', title: 'New Promotion', component: PromotionManageStep }],
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

      {/* ── Package header ────────────────────────────────────────────── */}
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

      {/* ── Promotions section header ─────────────────────────────────── */}
      <div class="cz-sp-tiers-header">
        <p class="cz-sp-tiers-header__label">Promotion Tiers</p>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
          onClick={handleAddPromotion}
        >
          + Add Promotion
        </button>
      </div>

      {/* ── Promotions table ─────────────────────────────────────────── */}
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
                      class="cz-admin-btn cz-admin-btn--ghost cz-admin-btn--sm"
                      onClick={() => handleManage(promo)}
                    >
                      Manage
                    </button>
                    {promo.status !== 'archived' && (
                      <button
                        type="button"
                        class="cz-admin-btn cz-admin-btn--ghost cz-admin-btn--sm"
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

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

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
