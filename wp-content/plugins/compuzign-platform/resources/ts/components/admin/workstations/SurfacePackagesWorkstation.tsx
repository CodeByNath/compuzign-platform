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

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(v: number | null): string {
  return v !== null ? `$${v.toLocaleString()}` : 'Contact';
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ── TierManageStep — drawer step ──────────────────────────────────────────────

function TierManageStep({ ctx }: { ctx: StepContext }) {
  const packageId      = ctx.stepData.packageId as number;
  const initialTierId  = ctx.stepData.tierId as TierId | null;
  const isNew          = ctx.stepData.isNew as boolean;
  const currentEnabled = ctx.stepData.currentEnabled as boolean ?? true;

  const [detail, setDetail]       = useState<SurfacePackageDetailResponse | null>(null);
  const [loadErr, setLoadErr]     = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saveErr, setSaveErr]     = useState<string | null>(null);

  // Tier selector (create mode)
  const [tierId, setTierId]     = useState<string>(initialTierId ?? 'basic');

  // Form fields
  const [label, setLabel]                   = useState('');
  const [priceIsContact, setPriceIsContact] = useState(false);
  const [priceStr, setPriceStr]             = useState('');
  const [billingCycle, setBillingCycle]     = useState('monthly');
  const [isPopular, setIsPopular]           = useState(false);

  // Inclusion selection: existing pool items vs pending new
  const [selExistingIncs, setSelExistingIncs]   = useState<InclusionItem[]>([]);
  const [pendingIncs, setPendingIncs]           = useState<Array<{ label: string }>>([]);
  const [showNewInc, setShowNewInc]             = useState(false);
  const [newIncLabel, setNewIncLabel]           = useState('');
  const [incSearch, setIncSearch]               = useState('');

  // FAQ selection
  const [selFaqRefs, setSelFaqRefs]   = useState<string[]>([]);
  const [pendingFaqs, setPendingFaqs] = useState<Array<{ question: string; answer: string }>>([]);
  const [showNewFaq, setShowNewFaq]   = useState(false);
  const [newFaqQ, setNewFaqQ]         = useState('');
  const [newFaqA, setNewFaqA]         = useState('');
  const [faqSearch, setFaqSearch]     = useState('');

  // Populate form from tier data
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
      setSelFaqRefs(tier.faq_refs ?? []);
      setIsPopular(res.package.popular_tier === id);
    },
    [],
  );

  // Load package detail on mount
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

  // Tier selector change in create mode — pre-fill with any existing slot data
  const handleTierChange = (id: string) => {
    setTierId(id);
    if (detail) populateFromTier(detail, id);
    setPendingIncs([]);
    setPendingFaqs([]);
  };

  // Add new inclusion locally (adds to pending + immediately selected)
  const handleAddInclusion = () => {
    const lbl = newIncLabel.trim();
    if (!lbl) return;
    setPendingIncs((p) => [...p, { label: lbl }]);
    setNewIncLabel('');
    setShowNewInc(false);
  };

  // Add new FAQ locally
  const handleAddFaq = () => {
    const q = newFaqQ.trim();
    if (!q) return;
    const id = slugify(q);
    setPendingFaqs((p) => [...p, { question: q, answer: newFaqA.trim() }]);
    setSelFaqRefs((r) => (r.includes(id) ? r : [...r, id]));
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

  const toggleFaqRef = (id: string) => {
    setSelFaqRefs((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  // Build save payload — pending new items go in new_* fields; existing selected items in overrides
  const buildPayload = (enabled: boolean): TierSavePayload => ({
    label,
    price: priceIsContact ? null : (parseFloat(priceStr) || null),
    billing_cycle: billingCycle,
    inclusions_override: selExistingIncs,
    faq_refs: selFaqRefs.filter((ref) => !pendingFaqs.some((p) => slugify(p.question) === ref)),
    popular: isPopular,
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
    const newEnabled = !currentEnabled;
    setSaving(true);
    setSaveErr(null);
    try {
      await toggleSurfaceTierEnabled(packageId, tierId, newEnabled);
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
    return <div class="cz-admin-error-msg" style="margin:20px">{loadErr}</div>;
  }

  if (!detail) return null;

  const service = detail.service;

  // Build full inclusion pool: service pool + pending new items (shown at top, always selected)
  const allInclusions: Array<InclusionItem & { isPending?: boolean }> = [
    ...pendingIncs.map((p) => ({ id: slugify(p.label), label: p.label, isPending: true })),
    ...(service?.inclusions ?? []),
  ];

  // Build full FAQ pool: service FAQs + pending new
  const allFaqs: Array<FaqItem & { isPending?: boolean }> = [
    ...pendingFaqs.map((p) => ({ id: slugify(p.question), question: p.question, answer: p.answer, isPending: true })),
    ...(service?.faqs ?? []),
  ];

  const filteredIncs  = allInclusions.filter((i) => i.label.toLowerCase().includes(incSearch.toLowerCase()));
  const filteredFaqs  = allFaqs.filter((f) => f.question.toLowerCase().includes(faqSearch.toLowerCase()));

  const displayContexts = detail.package.display_contexts ?? ['cost-builder'];

  return (
    <div class="cz-tier-form">

      {/* ── Service info (read-only) ────────────────────────────────────── */}
      {service && (
        <div class="cz-req-detail__section">
          <p class="cz-req-detail__section-title">Service</p>
          <p style="margin:0;font-size:14px;font-weight:500;color:var(--admin-text)">{service.title}</p>
          {service.excerpt && (
            <p style="margin:4px 0 0;font-size:12px;color:var(--admin-text-muted);line-height:1.6">{service.excerpt}</p>
          )}
        </div>
      )}

      {/* ── Tier selector (create mode only) ───────────────────────────── */}
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

      {/* ── Label ──────────────────────────────────────────────────────── */}
      <div class="cz-tf-field">
        <label class="cz-tf-label">Tier label</label>
        <input
          type="text"
          class="cz-tf-input"
          value={label}
          onInput={(e) => setLabel((e.target as HTMLInputElement).value)}
          placeholder={TIER_LABELS[tierId] ?? tierId}
        />
        <p class="cz-tf-hint">Override the default display name. Leave blank to use the default.</p>
      </div>

      {/* ── Price ──────────────────────────────────────────────────────── */}
      <div class="cz-tf-field">
        <label class="cz-tf-label">Price</label>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <input
            type="number"
            class="cz-tf-input"
            style="width:120px"
            value={priceStr}
            disabled={priceIsContact}
            onInput={(e) => setPriceStr((e.target as HTMLInputElement).value)}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;color:var(--admin-text)">
            <input
              type="checkbox"
              checked={priceIsContact}
              onChange={(e) => {
                const checked = (e.target as HTMLInputElement).checked;
                setPriceIsContact(checked);
                if (checked) setPriceStr('');
              }}
            />
            Contact (no fixed price)
          </label>
        </div>
      </div>

      {/* ── Billing cycle ──────────────────────────────────────────────── */}
      <div class="cz-tf-field">
        <label class="cz-tf-label">Billing cycle</label>
        <select
          class="cz-tf-select"
          value={billingCycle}
          onChange={(e) => setBillingCycle((e.target as HTMLSelectElement).value)}
        >
          {BILLING_CYCLES.map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* ── Inclusions ─────────────────────────────────────────────────── */}
      <div class="cz-tf-field">
        <label class="cz-tf-label">
          Inclusions
          <span style="font-weight:400;color:var(--admin-text-muted);margin-left:6px">
            ({selExistingIncs.length + pendingIncs.length} selected)
          </span>
        </label>

        <input
          type="text"
          class="cz-tf-input cz-tf-input--search"
          placeholder="Search inclusions…"
          value={incSearch}
          onInput={(e) => setIncSearch((e.target as HTMLInputElement).value)}
        />

        <div class="cz-tf-checklist">
          {filteredIncs.length === 0 && (
            <p style="font-size:12px;color:var(--admin-text-faint);padding:6px 0">
              {incSearch ? 'No matches.' : 'No inclusions in service pool.'}
            </p>
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
                <span style="flex:1">{inc.label}</span>
                {inc.isPending && (
                  <span class="cz-tf-new-badge">new</span>
                )}
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
            <div style="display:flex;gap:6px;margin-top:6px">
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--primary"
                style="padding:5px 12px;font-size:12px"
                onClick={handleAddInclusion}
              >
                Add
              </button>
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--ghost"
                style="padding:5px 12px;font-size:12px"
                onClick={() => { setShowNewInc(false); setNewIncLabel(''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            class="cz-tf-add-link"
            onClick={() => setShowNewInc(true)}
          >
            + Add new inclusion to service pool
          </button>
        )}
      </div>

      {/* ── FAQs ───────────────────────────────────────────────────────── */}
      <div class="cz-tf-field">
        <label class="cz-tf-label">
          FAQs
          <span style="font-weight:400;color:var(--admin-text-muted);margin-left:6px">
            ({selFaqRefs.length} selected)
          </span>
        </label>

        <input
          type="text"
          class="cz-tf-input cz-tf-input--search"
          placeholder="Search FAQs…"
          value={faqSearch}
          onInput={(e) => setFaqSearch((e.target as HTMLInputElement).value)}
        />

        <div class="cz-tf-checklist">
          {filteredFaqs.length === 0 && (
            <p style="font-size:12px;color:var(--admin-text-faint);padding:6px 0">
              {faqSearch ? 'No matches.' : 'No FAQs in service pool.'}
            </p>
          )}
          {filteredFaqs.map((faq) => {
            const checked = selFaqRefs.includes(faq.id);
            return (
              <label key={faq.id} class="cz-tf-check-item cz-tf-check-item--faq">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleFaqRef(faq.id)}
                />
                <span style="flex:1">
                  <span style="display:block;font-size:13px">{faq.question}</span>
                  {faq.answer && (
                    <span style="display:block;font-size:11px;color:var(--admin-text-muted);margin-top:2px;line-height:1.5">
                      {faq.answer}
                    </span>
                  )}
                </span>
                {faq.isPending && <span class="cz-tf-new-badge">new</span>}
              </label>
            );
          })}
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
            <div style="display:flex;gap:6px;margin-top:6px">
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--primary"
                style="padding:5px 12px;font-size:12px"
                onClick={handleAddFaq}
              >
                Add
              </button>
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--ghost"
                style="padding:5px 12px;font-size:12px"
                onClick={() => { setShowNewFaq(false); setNewFaqQ(''); setNewFaqA(''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            class="cz-tf-add-link"
            onClick={() => setShowNewFaq(true)}
          >
            + Add new FAQ to service pool
          </button>
        )}
      </div>

      {/* ── Popular ────────────────────────────────────────────────────── */}
      <div class="cz-tf-field">
        <label class="cz-tf-check-item" style="cursor:pointer;display:flex;align-items:center;gap:8px">
          <input
            type="checkbox"
            checked={isPopular}
            onChange={(e) => setIsPopular((e.target as HTMLInputElement).checked)}
          />
          <span style="font-size:13px;color:var(--admin-text)">Mark as Popular tier</span>
        </label>
      </div>

      {/* ── Display contexts (package-level, read-only) ─────────────────── */}
      <div class="cz-tf-field">
        <label class="cz-tf-label">Display contexts</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          {displayContexts.map((c) => (
            <span key={c} style="font-size:11px;background:var(--admin-surface-2,#f3f4f6);border-radius:4px;padding:2px 7px;color:var(--admin-text-muted)">
              {c}
            </span>
          ))}
        </div>
        <p class="cz-tf-hint">Package-level — managed separately.</p>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {saveErr && (
        <div class="cz-admin-error-msg" style="margin:0 20px 12px">{saveErr}</div>
      )}

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <div class="cz-action-shell__footer">
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Publish Tier'}
        </button>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--ghost"
          onClick={ctx.close}
          disabled={saving}
        >
          Cancel
        </button>
        {!isNew && (
          <button
            type="button"
            class={`cz-admin-btn ${currentEnabled ? 'cz-admin-btn--secondary' : 'cz-admin-btn--primary'}`}
            onClick={handleToggleEnabled}
            disabled={saving}
            style="margin-left:auto"
          >
            {saving ? '…' : currentEnabled ? 'Disable Tier' : 'Enable Tier'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── PackageCard — list view card ──────────────────────────────────────────────

interface PackageCardProps {
  pkg: SurfacePackageSummary;
  openAction: (config: ActionConfig) => void;
  onRefetch: () => void;
}

function PackageCard({ pkg, openAction, onRefetch }: PackageCardProps) {
  const [disabling, setDisabling] = useState(false);
  const [togglingTier, setTogglingTier] = useState<string | null>(null);

  const serviceNames = pkg.services.map((s) => s.title).join(', ') || '(no service linked)';
  const isEnabled = pkg.post_status === 'publish';

  const handleManageTier = (tierId: TierId) => {
    const tier = pkg.tiers[tierId];
    openAction({
      id: `tier-${pkg.post_id}-${tierId}`,
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
      id: `tier-create-${pkg.post_id}`,
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
    <div class={`cz-ws-card${!isEnabled ? ' cz-ws-card--disabled' : ''}`} style="margin-bottom:20px">

      {/* ── Card header ─────────────────────────────────────────────── */}
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px">
            <p class="cz-ws-card__title" style="margin:0">{pkg.title}</p>
            {!isEnabled && (
              <span class="cz-status-pill cz-status-pill--inactive" style="font-size:11px">Disabled</span>
            )}
            {pkg.migration_complete && isEnabled && (
              <span class="cz-status-pill cz-status-pill--active" style="font-size:11px">Migrated</span>
            )}
          </div>
          <p style="margin:0;font-size:12px;color:var(--admin-text-muted)">{serviceNames}</p>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button
            type="button"
            class={`cz-admin-btn ${isEnabled ? 'cz-admin-btn--secondary' : 'cz-admin-btn--ghost'}`}
            style="padding:5px 12px;font-size:12px"
            onClick={handleTogglePackage}
            disabled={disabling}
          >
            {disabling ? '…' : isEnabled ? 'Disable Package' : 'Enable Package'}
          </button>
        </div>
      </div>

      {/* ── Create tier button ───────────────────────────────────────── */}
      <div style="margin-bottom:14px">
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary"
          style="padding:6px 14px;font-size:12px"
          onClick={handleCreateTier}
        >
          + Create Tier
        </button>
      </div>

      {/* ── Tier rows ───────────────────────────────────────────────── */}
      <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--admin-text-muted)">
        Existing Tiers
      </p>

      {TIERS.every((t) => !pkg.tiers[t]) ? (
        <p style="font-size:13px;color:var(--admin-text-faint);padding:8px 0">
          No tiers available for this service.
        </p>
      ) : (
        <div class="cz-tier-rows">
          {TIERS.map((tierId) => {
            const tier       = pkg.tiers[tierId];
            const tierEnabled = tier?.enabled ?? true;
            const isPopular  = pkg.popular_tier === tierId;
            const isBusy     = togglingTier === tierId;

            return (
              <div
                key={tierId}
                class={`cz-tier-row${!tierEnabled ? ' cz-tier-row--disabled' : ''}`}
              >
                <div class="cz-tier-row__name">
                  <span class="cz-tier-row__label">
                    {(tier?.label && tier.label !== '') ? tier.label : TIER_LABELS[tierId]}
                  </span>
                  {isPopular && (
                    <span class="cz-tier-badge cz-tier-badge--popular" style="font-size:10px">Popular</span>
                  )}
                  {!tierEnabled && (
                    <span class="cz-status-pill cz-status-pill--inactive" style="font-size:10px">Off</span>
                  )}
                </div>

                <div class="cz-tier-row__meta">
                  {tier ? (
                    <>
                      <span class="cz-price-tag cz-price-tag--has-price">
                        {fmtPrice(tier.price)}
                      </span>
                      <span style="font-size:11px;color:var(--admin-text-muted)">
                        /{tier.billing_cycle ?? '—'}
                      </span>
                      <span style="font-size:11px;color:var(--admin-text-muted);margin-left:6px">
                        {tier.inclusion_count} inc
                      </span>
                    </>
                  ) : (
                    <span style="font-size:12px;color:var(--admin-text-faint)">not configured</span>
                  )}
                </div>

                <div class="cz-tier-row__actions">
                  <button
                    type="button"
                    class="cz-admin-btn cz-admin-btn--ghost"
                    style="padding:4px 10px;font-size:12px"
                    onClick={() => handleManageTier(tierId as TierId)}
                  >
                    Manage
                  </button>
                  <button
                    type="button"
                    class="cz-admin-btn cz-admin-btn--ghost"
                    style="padding:4px 10px;font-size:12px"
                    onClick={() => handleToggleTierEnabled(tierId, tierEnabled)}
                    disabled={isBusy}
                  >
                    {isBusy ? '…' : tierEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            );
          })}
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
