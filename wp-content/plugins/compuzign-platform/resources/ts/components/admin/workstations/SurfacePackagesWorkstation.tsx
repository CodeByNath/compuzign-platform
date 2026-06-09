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
import { InlineEditorShell } from '../InlineEditorShell';
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

const MAX_TIERS = 4;

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

function decodeHtml(s: string): string {
  if (typeof document === 'undefined') return s;
  const el = document.createElement('textarea');
  el.innerHTML = s;
  return el.value;
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

  const [tab, setTab] = useState<'commercial' | 'service'>('commercial');
  const [editingSection, setEditingSection] = useState<'overview' | 'inclusions' | 'faqs' | null>(null);

  // ── Tier fields ──────────────────────────────────────────────────────────
  const [tierId, setTierId]                 = useState<string>(initialTierId ?? 'basic');
  const [label, setLabel]                   = useState('');
  const [priceIsContact, setPriceIsContact] = useState(false);
  const [priceStr, setPriceStr]             = useState('');
  const [billingCycle, setBillingCycle]     = useState('monthly');
  const [isPopular, setIsPopular]           = useState(false);
  const [popularLabel, setPopularLabel]     = useState('');

  // ── Tier Overview draft (local — applied on Publish Tier) ────────────────
  const [overviewDraft, setOverviewDraft] = useState<{
    label: string;
    priceIsContact: boolean;
    priceStr: string;
    billingCycle: string;
    isPopular: boolean;
    popularLabel: string;
  } | null>(null);

  // ── Inclusions ───────────────────────────────────────────────────────────
  const [selExistingIncs, setSelExistingIncs] = useState<InclusionItem[]>([]);
  const [pendingIncs, setPendingIncs]         = useState<Array<{ label: string }>>([]);
  const [showNewInc, setShowNewInc]           = useState(false);
  const [newIncLabel, setNewIncLabel]         = useState('');

  // ── FAQs ─────────────────────────────────────────────────────────────────
  const [selExistingFaqs, setSelExistingFaqs] = useState<FaqItem[]>([]);
  const [pendingFaqs, setPendingFaqs]         = useState<Array<{ question: string; answer: string }>>([]);
  const [showNewFaq, setShowNewFaq]           = useState(false);
  const [newFaqQ, setNewFaqQ]                 = useState('');
  const [newFaqA, setNewFaqA]                 = useState('');

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
      const faqPool = res.service?.faqs ?? [];
      setSelExistingFaqs(faqPool.filter((f) => (tier.faq_refs ?? []).includes(f.id)));
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
    setSelExistingIncs([]);
    setSelExistingFaqs([]);
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

  const toggleFaq = (faq: FaqItem) => {
    setSelExistingFaqs((prev) => {
      const exists = prev.some((f) => f.id === faq.id);
      return exists ? prev.filter((f) => f.id !== faq.id) : [...prev, faq];
    });
  };

  const buildPayload = (enabled: boolean): TierSavePayload => ({
    label,
    price:               priceIsContact ? null : (parseFloat(priceStr) || null),
    contact:             priceIsContact,
    billing_cycle:       billingCycle,
    inclusions_override: selExistingIncs,
    faq_refs:            selExistingFaqs.map((f) => f.id),
    popular:             isPopular,
    popular_label:       popularLabel,
    enabled,
    new_inclusions:      pendingIncs,
    new_faqs:            pendingFaqs,
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

  const openOverviewEditor = useCallback(() => {
    setOverviewDraft({ label, priceIsContact, priceStr, billingCycle, isPopular, popularLabel });
    setEditingSection('overview');
  }, [label, priceIsContact, priceStr, billingCycle, isPopular, popularLabel]);

  const handleSaveOverview = useCallback(async () => {
    if (!overviewDraft) return;
    setLabel(overviewDraft.label);
    setPriceIsContact(overviewDraft.priceIsContact);
    setPriceStr(overviewDraft.priceStr);
    setBillingCycle(overviewDraft.billingCycle);
    setIsPopular(overviewDraft.isPopular);
    setPopularLabel(overviewDraft.popularLabel);
    setEditingSection(null);
    setOverviewDraft(null);
  }, [overviewDraft]);

  const handleSaveInclusions = useCallback(async () => {
    setEditingSection(null);
  }, []);

  const handleSaveFaqs = useCallback(async () => {
    setEditingSection(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  if (ctx.progress === 'loading') {
    return <div class="cz-action-progress"><Spinner label="Loading tier data…" /></div>;
  }

  if (loadErr) {
    return <div class="cz-admin-error-msg">{loadErr}</div>;
  }

  if (!detail) return null;

  const service = detail.service;

  const selIncCount = selExistingIncs.length + pendingIncs.length;
  const selFaqCount = selExistingFaqs.length + pendingFaqs.length;

  const selIncIds = new Set(selExistingIncs.map((i) => i.id));
  const selFaqIds = new Set(selExistingFaqs.map((f) => f.id));
  const poolOnlyIncs = (service?.inclusions ?? []).filter((i) => !selIncIds.has(i.id));
  const poolOnlyFaqs = (service?.faqs ?? []).filter((f) => !selFaqIds.has(f.id));

  return (
    <>
    <div class="cz-req-detail">

      {/* ── Tier selector (create mode only) ──────────────────────────────── */}
      {isNew && (
        <div class="cz-req-detail__section cz-sv-section--no-border">
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
        </div>
      )}

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div class="cz-sv-tabs">
        <button
          type="button"
          class={`cz-sv-tab${tab === 'commercial' ? ' cz-sv-tab--active' : ''}`}
          onClick={() => setTab('commercial')}
        >
          Commercial
        </button>
        <button
          type="button"
          class={`cz-sv-tab${tab === 'service' ? ' cz-sv-tab--active' : ''}`}
          onClick={() => setTab('service')}
        >
          Service
        </button>
      </div>

      {/* ── Commercial Tab ─────────────────────────────────────────────────── */}
      {tab === 'commercial' && (
        <>

          {/* Tier Overview — read-only with hover Edit */}
          <div class="cz-req-detail__section cz-sv-section--no-border">
            <p class="cz-req-detail__section-title">Tier Overview</p>
            <div class="cz-sv-overview-block">
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-sv-overview-block__edit"
                onClick={openOverviewEditor}
              >
                ✎ Edit
              </button>
              <div class="cz-sv-overview-block__identity">
                <p class="cz-sv-overview-block__name">{label || (TIER_LABELS[tierId] ?? tierId)}</p>
              </div>
              <div class="cz-sv-overview-block__meta">
                <span class="cz-req-contact-grid__label">Price</span>
                <span class="cz-sv-overview-block__value">
                  {priceIsContact ? 'Contact' : (priceStr ? `$${parseFloat(priceStr).toLocaleString()}` : '—')}
                </span>
              </div>
              <div class="cz-sv-overview-block__meta">
                <span class="cz-req-contact-grid__label">Billing Cycle</span>
                <span class="cz-sv-overview-block__value">{capitalize(billingCycle)}</span>
              </div>
              {isPopular && (
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Presentation</span>
                  <span class="cz-sv-overview-block__value">
                    <span class="cz-tier-badge cz-tier-badge--popular">{popularLabel || 'Best'}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Included Features — read-only, hover to edit */}
          <div class="cz-req-detail__section cz-sv-section--no-border">
            <p class="cz-req-detail__section-title">
              Included Features
              {selIncCount > 0 && (
                <span style="font-weight:400;color:var(--admin-text-faint);margin-left:6px">{selIncCount}</span>
              )}
            </p>
            <div class="cz-sv-overview-block">
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-sv-overview-block__edit"
                onClick={() => setEditingSection('inclusions')}
              >
                ✎ Edit
              </button>
              {selIncCount > 0 ? (
                <div class="cz-sc-inclusion-pool">
                  {pendingIncs.map((p) => (
                    <span key={p.label} class="cz-tf-chip">
                      {p.label}
                      <span class="cz-tf-new-badge">new</span>
                    </span>
                  ))}
                  {selExistingIncs.map((inc) => (
                    <span key={inc.id} class="cz-tf-chip">{inc.label}</span>
                  ))}
                </div>
              ) : (
                <p style="margin:0;font-size:var(--admin-fs-s-label);color:var(--admin-text-faint)">
                  No features selected for this tier.
                </p>
              )}
              <p class="cz-tf-hint">Features are managed at the service level. This tier can choose which features to include.</p>
            </div>
          </div>

          {/* Common Questions — read-only, hover to edit */}
          <div class="cz-req-detail__section">
            <p class="cz-req-detail__section-title">
              Common Questions
              {selFaqCount > 0 && (
                <span style="font-weight:400;color:var(--admin-text-faint);margin-left:6px">{selFaqCount}</span>
              )}
            </p>
            <div class="cz-sv-overview-block">
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-sv-overview-block__edit"
                onClick={() => setEditingSection('faqs')}
              >
                ✎ Edit
              </button>
              {selFaqCount > 0 ? (
                <div class="cz-sc-faq-list">
                  {pendingFaqs.map((p) => (
                    <div key={p.question} class="cz-sc-faq-item">
                      <p class="cz-sc-faq-item__q">{p.question}</p>
                      {p.answer && <p class="cz-sc-faq-item__a">{p.answer}</p>}
                      <span class="cz-tf-new-badge" style="position:absolute;top:var(--cz-space-2);right:var(--cz-space-2)">new</span>
                    </div>
                  ))}
                  {selExistingFaqs.map((faq) => (
                    <div key={faq.id} class="cz-sc-faq-item">
                      <p class="cz-sc-faq-item__q">{faq.question}</p>
                      {faq.answer && <p class="cz-sc-faq-item__a">{faq.answer}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p style="margin:0;font-size:var(--admin-fs-s-label);color:var(--admin-text-faint)">
                  No questions selected for this tier.
                </p>
              )}
              <p class="cz-tf-hint">FAQs are managed at the service level. This tier can choose which questions to display.</p>
            </div>
          </div>

          {saveErr && <div class="cz-admin-error-msg">{saveErr}</div>}

          {/* Commercial Tab Footer */}
          <div class="cz-tf-footer">
            {!isNew && (
              <button
                type="button"
                class={`cz-admin-btn ${currentEnabled ? 'cz-admin-btn--danger' : 'cz-admin-btn--secondary'}`}
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
        </>
      )}

      {/* ── Service Tab ────────────────────────────────────────────────────── */}
      {tab === 'service' && (
        <>
          {service ? (
            <div class="cz-sv-commercial-block">
              <div class="cz-sv-commercial-block__header">
                <span class="cz-sv-commercial-block__label">{decodeHtml(service.title)}</span>
                <div class="cz-sv-commercial-block__status">
                  <span class="cz-admin-status-dot" style="color:var(--admin-success)" />
                  <span class="cz-status-pill cz-status-pill--active">Linked</span>
                </div>
              </div>
              {service.excerpt && (
                <p
                  class="cz-sv-commercial-block__count"
                  style="overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical"
                >
                  {service.excerpt}
                </p>
              )}
              {service.categories && service.categories.length > 0 && (
                <div class="cz-sv-overview-block__meta" style="margin-top:var(--cz-space-2)">
                  <span class="cz-req-contact-grid__label">Category</span>
                  <span class="cz-sv-overview-block__value">
                    {service.categories.map((c) => decodeHtml(c.name)).join(', ')}
                  </span>
                </div>
              )}
              {service.content && (
                <div class="cz-sv-overview-block__meta">
                  <span class="cz-req-contact-grid__label">Description</span>
                  <p
                    class="cz-sv-overview-block__desc"
                    style="overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical"
                  >
                    {service.content}
                  </p>
                </div>
              )}
              <div class="cz-sv-commercial-block__footer">
                <button
                  type="button"
                  class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                  onClick={ctx.close}
                >
                  View
                </button>
              </div>
            </div>
          ) : (
            <div class="cz-req-detail__section">
              <p class="cz-sc-pkg-block__empty-msg">No service linked to this package.</p>
            </div>
          )}

          {/* Pricing Summary with status dots */}
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
                  {TIERS.map((t) => {
                    const tierData      = detail.package.tiers[t];
                    const isCurrentTier = t === tierId;
                    const isTierActive  = tierData ? (tierData.enabled !== false) : false;
                    const dotColor      = isCurrentTier
                      ? 'var(--admin-accent)'
                      : isTierActive ? 'var(--admin-success)' : 'var(--admin-text-faint)';

                    return (
                      <tr key={t}>
                        <td class="cz-sp-tier-table__name">
                          <div class="cz-sp-tier-table__name-inner">
                            <span class="cz-admin-status-dot" style={`color:${dotColor}`} />
                            <span>{TIER_LABELS[t]}</span>
                          </div>
                        </td>
                        <td>
                          <span class={`cz-price-tag${tierData?.price != null ? ' cz-price-tag--has-price' : ''}`}>
                            {tierData ? fmtPrice(tierData.price) : '—'}
                          </span>
                        </td>
                        <td class="cz-sp-tier-table__muted">{tierData?.billing_cycle ?? '—'}</td>
                        <td class="cz-sp-tier-table__center cz-sp-tier-table__muted">
                          {tierData?.inclusions_override?.length ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Service Tab Footer: Cancel only */}
          <div class="cz-tf-footer">
            <div class="cz-tf-footer__spacer" />
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={ctx.close}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>

    {/* ── Tier Overview Inline Editor ──────────────────────────────────────── */}
    {editingSection === 'overview' && overviewDraft && (
      <InlineEditorShell
        title="Edit Tier Overview"
        onSave={handleSaveOverview}
        onCancel={() => { setEditingSection(null); setOverviewDraft(null); }}
        saving={false}
        saveErr={null}
      >
        <div class="cz-tf-form">
          <div class="cz-tf-field">
            <label class="cz-tf-label">Display label</label>
            <input
              type="text"
              class="cz-tf-input"
              value={overviewDraft.label}
              onInput={(e) => setOverviewDraft((d) => d ? { ...d, label: (e.target as HTMLInputElement).value } : d)}
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
                value={overviewDraft.priceStr}
                disabled={overviewDraft.priceIsContact}
                onInput={(e) => setOverviewDraft((d) => d ? { ...d, priceStr: (e.target as HTMLInputElement).value } : d)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <label class="cz-tf-check-row cz-tf-check-row--inline">
                <input
                  type="checkbox"
                  checked={overviewDraft.priceIsContact}
                  onChange={(e) => {
                    const v = (e.target as HTMLInputElement).checked;
                    setOverviewDraft((d) => d ? { ...d, priceIsContact: v, priceStr: v ? '' : d.priceStr } : d);
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
              value={overviewDraft.billingCycle}
              onChange={(e) => setOverviewDraft((d) => d ? { ...d, billingCycle: (e.target as HTMLSelectElement).value } : d)}
            >
              {BILLING_CYCLES.map((c) => <option key={c} value={c}>{capitalize(c)}</option>)}
            </select>
          </div>
          <div class="cz-tf-field">
            <label class="cz-tf-check-row">
              <input
                type="checkbox"
                checked={overviewDraft.isPopular}
                onChange={(e) => setOverviewDraft((d) => d ? { ...d, isPopular: (e.target as HTMLInputElement).checked } : d)}
              />
              <span>Show as the recommended tier</span>
            </label>
            {overviewDraft.isPopular && (
              <>
                <label class="cz-tf-label" style="margin-top:var(--cz-space-2)">Badge label</label>
                <input
                  type="text"
                  class="cz-tf-input"
                  value={overviewDraft.popularLabel}
                  onInput={(e) => setOverviewDraft((d) => d ? { ...d, popularLabel: (e.target as HTMLInputElement).value } : d)}
                  placeholder="Best"
                />
                <p class="cz-tf-hint">Text shown on the popular badge. Defaults to "Best".</p>
              </>
            )}
          </div>
        </div>
      </InlineEditorShell>
    )}

    {/* ── Included Features Inline Editor ──────────────────────────────────── */}
    {editingSection === 'inclusions' && (
      <InlineEditorShell
        title="Edit Included Features"
        onSave={handleSaveInclusions}
        onCancel={() => setEditingSection(null)}
        saving={false}
        saveErr={null}
      >
        <div class="cz-tf-form">

          {/* Section 1: Included in this tier */}
          <div class="cz-tf-section">
            <span class="cz-tf-label">Included in this tier</span>
            {selIncCount > 0 ? (
              <div class="cz-tf-checklist">
                {pendingIncs.map((p, i) => (
                  <label key={`pending-inc-${i}`} class="cz-tf-check-item">
                    <input
                      type="checkbox"
                      checked
                      onChange={() => setPendingIncs((prev) => prev.filter((_, idx) => idx !== i))}
                    />
                    <span class="cz-tf-check-item__text">{p.label}</span>
                    <span class="cz-tf-new-badge">new</span>
                  </label>
                ))}
                {selExistingIncs.map((inc) => (
                  <label key={inc.id} class="cz-tf-check-item">
                    <input
                      type="checkbox"
                      checked
                      onChange={() => toggleInclusion(inc)}
                    />
                    <span class="cz-tf-check-item__text">{inc.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p class="cz-tf-hint">No items selected for this tier.</p>
            )}
          </div>

          {/* Section 2: Available from service pool */}
          <div class="cz-tf-section">
            <span class="cz-tf-label">Available from service pool</span>
            {poolOnlyIncs.length > 0 ? (
              <div class="cz-tf-checklist">
                {poolOnlyIncs.map((inc) => (
                  <label key={inc.id} class="cz-tf-check-item">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => toggleInclusion(inc)}
                    />
                    <span class="cz-tf-check-item__text">{inc.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p class="cz-tf-hint">All service-pool items are already included in this tier.</p>
            )}
          </div>

          {/* Add new Water-layer item */}
          {showNewInc ? (
            <div class="cz-tf-inline-add">
              <input
                type="text"
                class="cz-tf-input"
                placeholder="Feature label"
                value={newIncLabel}
                onInput={(e) => setNewIncLabel((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddInclusion(); } }}
                autoFocus
              />
              <div class="cz-tf-inline-add__actions">
                <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" onClick={handleAddInclusion}>
                  Add inclusion
                </button>
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => { setShowNewInc(false); setNewIncLabel(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" class="cz-tf-add-btn" onClick={() => setShowNewInc(true)}>
              + Add inclusion
            </button>
          )}
        </div>
      </InlineEditorShell>
    )}

    {/* ── Common Questions Inline Editor ───────────────────────────────────── */}
    {editingSection === 'faqs' && (
      <InlineEditorShell
        title="Edit Common Questions"
        onSave={handleSaveFaqs}
        onCancel={() => setEditingSection(null)}
        saving={false}
        saveErr={null}
      >
        <div class="cz-tf-form">

          {/* Section 1: Included in this tier */}
          <div class="cz-tf-section">
            <span class="cz-tf-label">Included in this tier</span>
            {selFaqCount > 0 ? (
              <div class="cz-tf-checklist">
                {pendingFaqs.map((p, i) => (
                  <label key={`pending-faq-${i}`} class="cz-tf-check-item">
                    <input
                      type="checkbox"
                      checked
                      onChange={() => setPendingFaqs((prev) => prev.filter((_, idx) => idx !== i))}
                    />
                    <div class="cz-tf-check-item__text">
                      <span class="cz-tf-check-item__question">{p.question}</span>
                      {p.answer && <span class="cz-tf-check-item__answer">{p.answer}</span>}
                    </div>
                    <span class="cz-tf-new-badge">new</span>
                  </label>
                ))}
                {selExistingFaqs.map((faq) => (
                  <label key={faq.id} class="cz-tf-check-item">
                    <input
                      type="checkbox"
                      checked
                      onChange={() => toggleFaq(faq)}
                    />
                    <div class="cz-tf-check-item__text">
                      <span class="cz-tf-check-item__question">{faq.question}</span>
                      {faq.answer && <span class="cz-tf-check-item__answer">{faq.answer}</span>}
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p class="cz-tf-hint">No items selected for this tier.</p>
            )}
          </div>

          {/* Section 2: Available from service pool */}
          <div class="cz-tf-section">
            <span class="cz-tf-label">Available from service pool</span>
            {poolOnlyFaqs.length > 0 ? (
              <div class="cz-tf-checklist">
                {poolOnlyFaqs.map((faq) => (
                  <label key={faq.id} class="cz-tf-check-item">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => toggleFaq(faq)}
                    />
                    <div class="cz-tf-check-item__text">
                      <span class="cz-tf-check-item__question">{faq.question}</span>
                      {faq.answer && <span class="cz-tf-check-item__answer">{faq.answer}</span>}
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p class="cz-tf-hint">All service-pool items are already included in this tier.</p>
            )}
          </div>

          {/* Add new Water-layer item */}
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
                <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" onClick={handleAddFaq}>
                  Add FAQ
                </button>
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => { setShowNewFaq(false); setNewFaqQ(''); setNewFaqA(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" class="cz-tf-add-btn" onClick={() => setShowNewFaq(true)}>
              + Add FAQ
            </button>
          )}
        </div>
      </InlineEditorShell>
    )}
    </>
  );
}

// ── PackageCard ───────────────────────────────────────────────────────────────

interface PackageCardProps {
  pkg: SurfacePackageSummary;
  openAction: (config: ActionConfig) => void;
  onRefetch: () => void;
}

function PackageCard({ pkg, openAction, onRefetch }: PackageCardProps) {
  const [disabling, setDisabling] = useState(false);

  const serviceNames          = pkg.services.map((s) => s.title).join(', ') || '(no service linked)';
  const isEnabled             = pkg.post_status === 'publish';
  const resolvedPopularTierId = resolvePopularTier(pkg);
  const tierCount             = TIERS.filter((t) => pkg.tiers[t]).length;
  const atTierLimit           = tierCount >= MAX_TIERS;

  const handleViewTier = (tierId: TierId) => {
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

  const handleAddTier = () => {
    if (atTierLimit) return;
    openAction({
      id:   `tier-create-${pkg.post_id}`,
      mode: 'drawer',
      title: `Add Tier — ${serviceNames}`,
      initialStepData: {
        packageId:      pkg.post_id,
        tierId:         null,
        isNew:          true,
        currentEnabled: true,
      },
      steps: [{ id: 'tier-form', title: 'New Tier', component: TierManageStep }],
    });
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

      {/* ── Package header ────────────────────────────────────────────────── */}
      <div class="cz-sp-pkg-header">
        <div class="cz-sp-pkg-header__left">
          <p class="cz-sp-pkg-header__title">
            {pkg.title}
            {!isEnabled && (
              <span class="cz-status-pill cz-status-pill--inactive">Disabled</span>
            )}
          </p>
          <p class="cz-sp-pkg-header__service">{serviceNames}</p>
        </div>
        {pkg.migration_complete && isEnabled && (
          <div class="cz-sp-pkg-header__actions">
            <span class="cz-admin-status-dot" style="color:var(--admin-success)" />
            <span class="cz-status-pill cz-status-pill--active">Active</span>
          </div>
        )}
      </div>

      {/* ── Tiers section heading + add button ───────────────────────────── */}
      <div class="cz-sp-tiers-header">
        <p class="cz-sp-tiers-header__label">Existing Tiers</p>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
          onClick={handleAddTier}
          disabled={atTierLimit}
          title={atTierLimit ? 'This package already contains the maximum of 4 tiers.' : undefined}
        >
          + Add Tier
        </button>
      </div>

      {/* ── Tier table ──────────────────────────────────────────────────────── */}
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
                if (!tier) return null;
                const tierEnabled  = tier.enabled ?? true;
                const isPopular    = resolvedPopularTierId === tierId;
                const displayLabel = (tier.label && tier.label !== '') ? tier.label : TIER_LABELS[tierId];
                const dotColor     = `var(--admin-${tierEnabled ? 'success' : 'text-faint'})`;

                return (
                  <tr key={tierId} class={!tierEnabled ? 'cz-sp-tier-row--disabled' : ''}>
                    <td class="cz-sp-tier-table__name">
                      <div class="cz-sp-tier-table__name-inner">
                        <span class="cz-admin-status-dot" style={`color:${dotColor}`} />
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
                      <span class={`cz-price-tag${tier.price != null ? ' cz-price-tag--has-price' : ''}`}>
                        {fmtPrice(tier.price)}
                      </span>
                    </td>
                    <td class="cz-sp-tier-table__muted">{tier.billing_cycle ?? '—'}</td>
                    <td class="cz-sp-tier-table__center cz-sp-tier-table__muted">
                      {tier.inclusion_count}
                    </td>
                    <td class="cz-sp-tier-table__center">
                      {isPopular
                        ? <span class="cz-tier-badge cz-tier-badge--popular">★</span>
                        : <span style="color:var(--admin-text-faint)">—</span>}
                    </td>
                    <td class="cz-sp-tier-table__actions">
                      <button
                        type="button"
                        class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                        onClick={() => handleViewTier(tierId as TierId)}
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
      )}

      {/* ── Package danger zone ──────────────────────────────────────────────── */}
      <div class="cz-sp-pkg-footer">
        <button
          type="button"
          class={`cz-admin-btn cz-admin-btn--sm ${isEnabled ? 'cz-admin-btn--danger' : 'cz-admin-btn--secondary'}`}
          onClick={handleTogglePackage}
          disabled={disabling}
        >
          {disabling ? '…' : isEnabled ? 'Disable Package' : 'Enable Package'}
        </button>
      </div>
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
