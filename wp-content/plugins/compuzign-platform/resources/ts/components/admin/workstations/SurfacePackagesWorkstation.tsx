import { useEffect, useState, useCallback } from 'preact/hooks';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { Spinner } from '@/components/ui/Spinner';
import {
  fetchSurfacePackageDetail,
  saveSurfaceTier,
  disableSurfacePackage,
  enableSurfacePackage,
  toggleSurfaceTierEnabled,
} from '@/api/endpoints/admin';
import type { ActionConfig, StepContext } from '../ActionShell';
import type {
  SurfacePackageSummary,
  SurfacePackageDetailResponse,
  InclusionItem,
  FaqItem,
  TierSavePayload,
} from '@/api/types/admin';

interface Props {
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIERS = ['basic', 'standard', 'premium', 'enterprise'] as const;
type TierId = typeof TIERS[number];

const TIER_LABELS: Record<string, string> = {
  basic: 'Basic', standard: 'Standard', premium: 'Premium', enterprise: 'Enterprise',
};

const BILLING_CYCLES = ['monthly', 'annually', 'one-time'];

const POPULAR_HIERARCHY = ['premium', 'enterprise', 'standard', 'basic'] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(v: number | null): string {
  return v !== null ? `$${v.toLocaleString()}` : 'Contact';
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function resolvePopularTier(pkg: SurfacePackageSummary): string | null {
  const isTierEnabled = (id: string): boolean => pkg.tiers[id]?.enabled ?? true;
  const candidate = pkg.popular_tier ?? null;
  if (candidate !== null && isTierEnabled(candidate)) return candidate;
  for (const fallback of POPULAR_HIERARCHY) {
    if (isTierEnabled(fallback)) return fallback;
  }
  return null;
}

// ── TierManageStep — drawer step ──────────────────────────────────────────────

export function TierManageStep({ ctx }: { ctx: StepContext }) {
  const packageId      = ctx.stepData.packageId as number;
  const initialTierId  = ctx.stepData.tierId as TierId | null;
  const isNew          = ctx.stepData.isNew as boolean;
  const currentEnabled = ctx.stepData.currentEnabled as boolean ?? true;

  const [detail, setDetail]   = useState<SurfacePackageDetailResponse | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const [tierId, setTierId]                     = useState<string>(initialTierId ?? 'basic');
  const [label, setLabel]                       = useState('');
  const [priceIsContact, setPriceIsContact]     = useState(false);
  const [priceStr, setPriceStr]                 = useState('');
  const [billingCycle, setBillingCycle]         = useState('monthly');
  const [isPopular, setIsPopular]               = useState(false);
  const [popularLabel, setPopularLabel]         = useState('');

  const [selExistingIncs, setSelExistingIncs]   = useState<InclusionItem[]>([]);
  const [pendingIncs, setPendingIncs]           = useState<Array<{ label: string }>>([]);
  const [showNewInc, setShowNewInc]             = useState(false);
  const [newIncLabel, setNewIncLabel]           = useState('');
  const [incSearch, setIncSearch]               = useState('');

  const [pendingFaqs, setPendingFaqs]           = useState<Array<{ question: string; answer: string }>>([]);
  const [showNewFaq, setShowNewFaq]             = useState(false);
  const [newFaqQ, setNewFaqQ]                   = useState('');
  const [newFaqA, setNewFaqA]                   = useState('');
  const [faqSearch, setFaqSearch]               = useState('');

  const populateFromTier = useCallback(
    (res: SurfacePackageDetailResponse, id: string) => {
      const tier = res.package.tiers[id];
      if (!tier) return;
      setLabel(tier.label ?? '');
      if (tier.price === null) {
        setPriceIsContact(true);
        setPriceStr('');
      } else {
        setPriceIsContact(false);
        setPriceStr(String(tier.price));
      }
      setBillingCycle(tier.billing_cycle ?? 'monthly');
      setSelExistingIncs(tier.inclusions_override ?? []);
      setIsPopular(res.package.popular_tier === id);
      setPopularLabel(res.package.popular_label ?? '');
    },
    [],
  );

  useEffect(() => {
    ctx.setProgress('loading', 'Loading…');
    fetchSurfacePackageDetail(packageId)
      .then((res) => {
        setDetail(res);
        ctx.setProgress('idle');
        if (!isNew && initialTierId) {
          populateFromTier(res, initialTierId);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load package.';
        setLoadErr(msg);
        ctx.setProgress('error', msg);
      });
  }, [packageId]);

  const handleTierChange = (id: string) => {
    setTierId(id);
    if (detail) populateFromTier(detail, id);
    setPendingIncs([]);
    setPendingFaqs([]);
  };

  const handleAddInclusion = () => {
    const lbl = newIncLabel.trim();
    if (!lbl) return;
    setPendingIncs((p) => [...p, { label: lbl }]);
    setNewIncLabel('');
    setShowNewInc(false);
  };

  const handleAddFaq = () => {
    const q = newFaqQ.trim();
    if (!q) return;
    setPendingFaqs((p) => [...p, { question: q, answer: newFaqA.trim() }]);
    setNewFaqQ('');
    setNewFaqA('');
    setShowNewFaq(false);
  };

  const toggleInclusion = (inc: InclusionItem) => {
    setSelExistingIncs((prev) => {
      const exists = prev.some((i) => i.id === inc.id);
      return exists ? prev.filter((i) => i.id !== inc.id) : [...prev, inc];
    });
  };

  const buildPayload = (enabled: boolean): TierSavePayload => ({
    label,
    price: priceIsContact ? null : (parseFloat(priceStr) || null),
    contact: priceIsContact,
    billing_cycle: billingCycle,
    inclusions_override: selExistingIncs,
    popular: isPopular,
    popular_label: popularLabel,
    enabled,
    new_inclusions: pendingIncs,
    new_faqs: pendingFaqs,
  });

  const handleSave = async () => {
    setSaving(true);
    setSaveErr(null);
    try {
      await saveSurfaceTier(packageId, tierId, buildPayload(true));
      ctx.goNext();
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async () => {
    setSaving(true);
    setSaveErr(null);
    try {
      await toggleSurfaceTierEnabled(packageId, tierId, !currentEnabled);
      ctx.goNext();
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Toggle failed.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (ctx.progress === 'loading') {
    return <div class="cz-action-progress"><Spinner label="Loading tier data…" /></div>;
  }

  if (loadErr) {
    return <div class="cz-admin-error-msg">{loadErr}</div>;
  }

  if (!detail) return null;

  const service = detail.service;

  const allInclusions: Array<InclusionItem & { isPending?: boolean }> = [
    ...pendingIncs.map((p) => ({ id: slugify(p.label), label: p.label, isPending: true })),
    ...(service?.inclusions ?? []),
  ];
  const allFaqs: Array<FaqItem & { isPending?: boolean }> = [
    ...pendingFaqs.map((p) => ({ id: slugify(p.question), question: p.question, answer: p.answer, isPending: true })),
    ...(service?.faqs ?? []),
  ];

  const filteredIncs = allInclusions.filter((i) => i.label.toLowerCase().includes(incSearch.toLowerCase()));
  const filteredFaqs = allFaqs.filter((f) => f.question.toLowerCase().includes(faqSearch.toLowerCase()));
  const selIncCount  = selExistingIncs.length + pendingIncs.length;

  const displayContexts = detail.package.display_contexts ?? ['cost-builder'];

  return (
    <div class="cz-tf-form">

      {/* ── Section 1: Service ─────────────────────────────────────────── */}
      {service && (
        <div class="cz-tf-section">
          <p class="cz-tf-section-title">Service</p>
          <p class="cz-tf-service-title">{service.title}</p>
          {service.excerpt && (
            <p class="cz-tf-service-desc">{service.excerpt}</p>
          )}
        </div>
      )}

      {/* ── Section 2: Tier Basics ─────────────────────────────────────── */}
      <div class="cz-tf-section">
        <p class="cz-tf-section-title">Tier Basics</p>

        {isNew && (
          <div class="cz-tf-field">
            <label class="cz-tf-label">Tier *</label>
            <select
              class="cz-tf-select"
              value={tierId}
              onChange={(e) => handleTierChange((e.target as HTMLSelectElement).value)}
            >
              {TIERS.map((t) => <option key={t} value={t}>{TIER_LABELS[t]}</option>)}
            </select>
          </div>
        )}

        <div class="cz-tf-field">
          <label class="cz-tf-label">Display label</label>
          <input
            type="text"
            class="cz-tf-input"
            value={label}
            onInput={(e) => setLabel((e.target as HTMLInputElement).value)}
            placeholder={TIER_LABELS[tierId] ?? tierId}
          />
          <p class="cz-tf-hint">Override the default name. Leave blank to use the default.</p>
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Price</label>
          <div class="cz-tf-price-row">
            <input
              type="number"
              class="cz-tf-input cz-tf-input--price"
              value={priceStr}
              disabled={priceIsContact}
              onInput={(e) => setPriceStr((e.target as HTMLInputElement).value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            <label class="cz-tf-check-row cz-tf-check-row--inline">
              <input
                type="checkbox"
                checked={priceIsContact}
                onChange={(e) => {
                  const checked = (e.target as HTMLInputElement).checked;
                  setPriceIsContact(checked);
                  if (checked) setPriceStr('');
                }}
              />
              <span>Contact / no fixed price</span>
            </label>
          </div>
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Billing cycle</label>
          <select
            class="cz-tf-select"
            value={billingCycle}
            onChange={(e) => setBillingCycle((e.target as HTMLSelectElement).value)}
          >
            {BILLING_CYCLES.map((c) => (
              <option key={c} value={c}>{capitalize(c)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Section 3: Inclusions ──────────────────────────────────────── */}
      <div class="cz-tf-section">
        <div class="cz-tf-section-header">
          <p class="cz-tf-section-title">Inclusions</p>
          {selIncCount > 0 && (
            <span class="cz-tf-count">{selIncCount} selected</span>
          )}
        </div>

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
            const checked = inc.isPending || selExistingIncs.some((s) => s.id === inc.id);
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
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddInclusion(); } }}
              autoFocus
            />
            <div class="cz-tf-inline-add__actions">
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                onClick={handleAddInclusion}
              >
                Add to pool
              </button>
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                onClick={() => { setShowNewInc(false); setNewIncLabel(''); }}
              >
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

      {/* ── Section 4: FAQs ────────────────────────────────────────────── */}
      <div class="cz-tf-section">
        <p class="cz-tf-section-title">FAQs</p>
        <p class="cz-tf-service-desc">These questions apply to all tiers for this service.</p>

        <input
          type="text"
          class="cz-tf-input"
          placeholder="Search FAQs…"
          value={faqSearch}
          onInput={(e) => setFaqSearch((e.target as HTMLInputElement).value)}
        />

        <div class="cz-tf-checklist">
          {filteredFaqs.length === 0 && (
            <div class="cz-tf-check-item" style="cursor:default;color:var(--admin-text-faint)">
              {faqSearch ? 'No matches.' : 'No FAQs in service pool yet.'}
            </div>
          )}
          {filteredFaqs.map((faq) => (
            <div key={faq.id} class="cz-tf-check-item" style="cursor:default">
              <div class="cz-tf-check-item__text">
                <span class="cz-tf-check-item__question">{faq.question}</span>
                {faq.answer && (
                  <span class="cz-tf-check-item__answer">{faq.answer}</span>
                )}
              </div>
              {faq.isPending && <span class="cz-tf-new-badge">new</span>}
            </div>
          ))}
        </div>

        {showNewFaq ? (
          <div class="cz-tf-inline-add">
            <input
              type="text"
              class="cz-tf-input"
              placeholder="Question"
              value={newFaqQ}
              onInput={(e) => setNewFaqQ((e.target as HTMLInputElement).value)}
              autoFocus
            />
            <textarea
              class="cz-tf-textarea"
              placeholder="Answer (optional)"
              value={newFaqA}
              onInput={(e) => setNewFaqA((e.target as HTMLTextAreaElement).value)}
              rows={3}
            />
            <div class="cz-tf-inline-add__actions">
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                onClick={handleAddFaq}
              >
                Add to pool
              </button>
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                onClick={() => { setShowNewFaq(false); setNewFaqQ(''); setNewFaqA(''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" class="cz-tf-add-btn" onClick={() => setShowNewFaq(true)}>
            + Add new FAQ to service pool
          </button>
        )}
      </div>

      {/* ── Section 5: Presentation ────────────────────────────────────── */}
      <div class="cz-tf-section">
        <p class="cz-tf-section-title">Presentation</p>

        <div class="cz-tf-field">
          <label class="cz-tf-check-row">
            <input
              type="checkbox"
              checked={isPopular}
              onChange={(e) => setIsPopular((e.target as HTMLInputElement).checked)}
            />
            <span>Show as the recommended tier</span>
          </label>
          {isPopular && (
            <>
              <label class="cz-tf-label">Badge label</label>
              <input
                type="text"
                class="cz-tf-input"
                value={popularLabel}
                onInput={(e) => setPopularLabel((e.target as HTMLInputElement).value)}
                placeholder="Best"
              />
              <p class="cz-tf-hint">Text shown on the popular badge. Defaults to "Best".</p>
            </>
          )}
        </div>

        {displayContexts.length > 0 && (
          <div class="cz-tf-field">
            <label class="cz-tf-label">Where it appears</label>
            <div class="cz-tf-chips">
              {displayContexts.map((c) => (
                <span key={c} class="cz-tf-chip">{c}</span>
              ))}
            </div>
            <p class="cz-tf-hint">These placements are configured at the package level.</p>
          </div>
        )}
      </div>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {saveErr && (
        <div class="cz-admin-error-msg">{saveErr}</div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div class="cz-tf-footer">
        {!isNew && (
          <button
            type="button"
            class={`cz-admin-btn ${currentEnabled ? 'cz-admin-btn--danger' : 'cz-admin-btn--primary'}`}
            onClick={handleToggleEnabled}
            disabled={saving}
          >
            {currentEnabled ? 'Disable Tier' : 'Enable Tier'}
          </button>
        )}
        <div class="cz-tf-footer__spacer" />
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary"
          onClick={ctx.close}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Publish Tier'}
        </button>
      </div>
    </div>
  );
}

// ── PackageCard ───────────────────────────────────────────────────────────────

interface PackageCardProps {
  pkg: SurfacePackageSummary;
  openAction: (config: ActionConfig) => void;
  onRefetch: () => void;
}

function PackageCard({ pkg, openAction, onRefetch }: PackageCardProps) {
  const [disabling, setDisabling]         = useState(false);
  const [togglingTier, setTogglingTier]   = useState<string | null>(null);

  const serviceNames        = pkg.services.map((s) => s.title).join(', ') || '(no service linked)';
  const isEnabled           = pkg.post_status === 'publish';
  const resolvedPopularTierId = resolvePopularTier(pkg);

  const handleManageTier = (tierId: TierId) => {
    const tier = pkg.tiers[tierId];
    openAction({
      id:   `tier-${pkg.post_id}-${tierId}`,
      mode: 'drawer',
      title: `${TIER_LABELS[tierId]} — ${serviceNames}`,
      initialStepData: {
        packageId:      pkg.post_id,
        tierId,
        isNew:          false,
        currentEnabled: tier?.enabled ?? true,
      },
      steps: [{ id: 'tier-form', title: `${TIER_LABELS[tierId]} Tier`, component: TierManageStep }],
    });
  };

  const handleCreateTier = () => {
    openAction({
      id:   `tier-create-${pkg.post_id}`,
      mode: 'drawer',
      title: `Create Tier — ${serviceNames}`,
      initialStepData: {
        packageId:      pkg.post_id,
        tierId:         null,
        isNew:          true,
        currentEnabled: true,
      },
      steps: [{ id: 'tier-form', title: 'New Tier', component: TierManageStep }],
    });
  };

  const handleToggleTierEnabled = async (tierId: string, currentlyEnabled: boolean) => {
    setTogglingTier(tierId);
    try {
      await toggleSurfaceTierEnabled(pkg.post_id, tierId, !currentlyEnabled);
      onRefetch();
    } finally {
      setTogglingTier(null);
    }
  };

  const handleTogglePackage = async () => {
    setDisabling(true);
    try {
      if (isEnabled) {
        await disableSurfacePackage(pkg.post_id);
      } else {
        await enableSurfacePackage(pkg.post_id);
      }
      onRefetch();
    } finally {
      setDisabling(false);
    }
  };

  return (
    <div class={`cz-ws-card${!isEnabled ? ' cz-ws-card--disabled' : ''}`}>

      {/* ── Package header ────────────────────────────────────────────── */}
      <div class="cz-sp-pkg-header">
        <div class="cz-sp-pkg-header__left">
          <p class="cz-sp-pkg-header__title">
            {pkg.title}
            {!isEnabled && (
              <span class="cz-status-pill cz-status-pill--inactive">Disabled</span>
            )}
            {pkg.migration_complete && isEnabled && (
              <span class="cz-status-pill cz-status-pill--active">Migrated</span>
            )}
          </p>
          <p class="cz-sp-pkg-header__service">{serviceNames}</p>
        </div>
        <div class="cz-sp-pkg-header__actions">
          <button
            type="button"
            class={`cz-admin-btn cz-admin-btn--sm ${isEnabled ? 'cz-admin-btn--danger' : 'cz-admin-btn--primary'}`}
            onClick={handleTogglePackage}
            disabled={disabling}
          >
            {disabling ? '…' : isEnabled ? 'Disable Package' : 'Enable Package'}
          </button>
        </div>
      </div>

      {/* ── Tiers section heading + create button ─────────────────────── */}
      <div class="cz-sp-tiers-header">
        <p class="cz-sp-tiers-header__label">Existing Tiers</p>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
          onClick={handleCreateTier}
        >
          + Create Tier
        </button>
      </div>

      {/* ── Tier table ────────────────────────────────────────────────── */}
      {TIERS.every((t) => !pkg.tiers[t]) ? (
        <p class="cz-sp-empty-tiers">No tiers available for this service.</p>
      ) : (
        <div class="cz-sp-tier-table-wrap">
          <table class="cz-sp-tier-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Price</th>
                <th>Cycle</th>
                <th class="cz-sp-tier-table__center">Inclusions</th>
                <th class="cz-sp-tier-table__center">Popular</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((tierId) => {
                const tier        = pkg.tiers[tierId];
                const tierEnabled = tier?.enabled ?? true;
                const isPopular   = resolvedPopularTierId === tierId;
                const isBusy      = togglingTier === tierId;
                const displayLabel = (tier?.label && tier.label !== '')
                  ? tier.label
                  : TIER_LABELS[tierId];

                return (
                  <tr key={tierId} class={!tierEnabled ? 'cz-sp-tier-row--disabled' : ''}>
                    <td class="cz-sp-tier-table__name">
                      <div class="cz-sp-tier-table__name-inner">
                        <span>{displayLabel}</span>
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
                        {tier ? fmtPrice(tier.price) : '—'}
                      </span>
                    </td>
                    <td class="cz-sp-tier-table__muted">
                      {tier?.billing_cycle ?? '—'}
                    </td>
                    <td class="cz-sp-tier-table__center cz-sp-tier-table__muted">
                      {tier ? tier.inclusion_count : '—'}
                    </td>
                    <td class="cz-sp-tier-table__center">
                      {isPopular
                        ? <span class="cz-tier-badge cz-tier-badge--popular">★</span>
                        : <span style="color:var(--admin-text-faint)">—</span>}
                    </td>
                    <td class="cz-sp-tier-table__actions">
                      <button
                        type="button"
                        class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                        onClick={() => handleManageTier(tierId as TierId)}
                      >
                        Manage
                      </button>
                      <button
                        type="button"
                        class={`cz-admin-btn cz-admin-btn--sm ${tierEnabled ? 'cz-admin-btn--danger' : 'cz-admin-btn--secondary'}`}
                        onClick={() => handleToggleTierEnabled(tierId, tierEnabled)}
                        disabled={isBusy}
                      >
                        {isBusy ? '…' : tierEnabled ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main workstation ──────────────────────────────────────────────────────────

export function SurfacePackagesWorkstation({ refreshKey, openAction }: Props) {
  const { data, loading, error, refetch } = useSurfacePackages();

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  if (loading) {
    return (
      <div class="cz-admin-loading">
        <Spinner label="Loading surface packages…" />
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

  const packages = data?.packages ?? [];

  return (
    <div>
      <div class="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Surface Packages</h2>
          <p class="cz-ws-subtitle">
            {packages.length} package{packages.length !== 1 ? 's' : ''} — tier configurations overlaid on Service Core
          </p>
        </div>
      </div>

      {packages.length === 0 ? (
        <div class="cz-admin-empty">
          <p>No surface packages found. Run the MEP seed to create the first package.</p>
        </div>
      ) : (
        packages.map((pkg) => (
          <PackageCard
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
