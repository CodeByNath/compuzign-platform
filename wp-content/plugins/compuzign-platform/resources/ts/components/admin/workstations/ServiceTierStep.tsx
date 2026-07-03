import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { Spinner } from '@/components/ui/Spinner';
import type { StepContext } from '../ActionShell';
import type { ServiceItem } from '@/api/types/cost-builder';
import { fetchServicePackageStation, saveServicePackageStationTier } from '@/api/endpoints/admin';
import type { ServicePackageStationResponse, SurfaceTierDetail, InclusionItem } from '@/api/types/admin';
import { useApi } from '@/hooks/useApi';
import { resolveTierStatus, statusDotClass } from '@/components/admin/utils/moduleStatus';
import { InlineEditorShell } from '../InlineEditorShell';
import { ServiceOverviewViewCard } from '../views/ServiceOverviewViewCard';
import { ReadBlock } from '../ReadBlock';
import { ModuleStatusPill } from '../ui/ModuleStatusPill';
import { ModuleNotificationPanel } from '../ui/ModuleNotificationPanel';
import { getTierNotes, evaluateModule, tierOverviewModule, tierFeaturesModule, tierFaqsModule } from '@/components/admin/utils/moduleNotifications';
import { decodeHtml, TIER_KEYS, TIER_LABELS } from './serviceDrawerShared';

// Tier module icons — the same glyphs the Service Overview / Features / FAQs cards use,
// reused by the individual-tier ReadBlock cards (restored refined tier presentation).
const TIER_OVERVIEW_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="drawerModule__icon-svg" aria-hidden="true" focusable="false">
    <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
    <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
  </svg>
);
const TIER_FEATURES_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="drawerModule__icon-svg" aria-hidden="true" focusable="false">
    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
);
const TIER_FAQS_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="drawerModule__icon-svg" aria-hidden="true" focusable="false">
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
  </svg>
);

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
  // context for the Connections tab. Passed through by handleOpenTierConfig.
  const serviceItem = ctx.stepData.service as ServiceItem | undefined;
  // Return-to-Service navigation (the same handler wired to the drawer's Back), used by
  // the service-overview connection card's View action.
  const serviceBack = ctx.stepData.serviceBack as (() => void) | undefined;
  // Parent service lifecycle status for the connection card's pill (active vs disabled).
  const serviceConnStatus = (serviceItem?.meta?.platform_status ?? 'disabled') === 'active' ? 'active' : 'disabled';

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
  // Single-open accordion for the tier-overview summary cards' notification panels (keyed by tierId).
  const [openSummaryTier, setOpenSummaryTier] = useState<string | null>(null);
  // Package overview view: Details (tier cards + pricing) | Connections (parent service).
  const [overviewTab, setOverviewTab] = useState<'details' | 'connections'>('details');

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
      const res = await saveServicePackageStationTier(serviceId, editingTierId, draft);
      // Re-seed the working copy from the saved tier so newly created features/FAQs —
      // now attached to inclusions_override / faq_refs by the backend — appear in the
      // still-open drawer, and new_inclusions / new_faqs are cleared. Drawer stays open.
      const savedTier = res?.station?.tiers?.[editingTierId];
      if (res?.success && savedTier) {
        setDraft(tierDraftFromDetail(
          savedTier,
          res.station.popular_tier,
          editingTierId,
          res.station.popular_label,
        ));
      }
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

  // Context-aware header Back: while a tier is open, the drawer's single header Back
  // returns to the package overview; at the overview it falls through to the Service
  // drawer (handled by handleOpenTierConfig's onBack delegate).
  const tierBack = ctx.stepData.tierBack as { current: (() => void) | null } | undefined;
  const handleBackRef = useRef(handleBack);
  handleBackRef.current = handleBack;
  useEffect(() => {
    if (!tierBack) return;
    tierBack.current = editingTierId ? () => handleBackRef.current() : null;
    return () => { tierBack.current = null; };
  }, [editingTierId, tierBack]);

  // Footer handlers via ref — latest closures without re-subscribing the footer effect.
  const footerRef = useRef({ handleSave, handleToggleEnabled, close: ctx.close });
  footerRef.current = { handleSave, handleToggleEnabled, close: ctx.close };

  // Pin the drawer footer in the shell's footer slot (matching the Service Overview
  // drawer) instead of rendering it inline inside the scrolling body. Edit mode leaves
  // the slot empty — InlineEditorShell carries its own Save/Cancel footer.
  useEffect(() => {
    const { setFooter } = ctx;
    const a = footerRef.current;
    const closeFooter = (
      <div class="cz-tf-footer">
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => a.close()}>Close</button>
      </div>
    );
    if (loading || error || !data || !data.success || !data.station) {
      setFooter(closeFooter);
    } else if (editingSection != null) {
      setFooter(null);
    } else if (!editingTierId || !draft) {
      setFooter(closeFooter);
    } else {
      setFooter(
        <div class="cz-tf-footer">
          <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={() => a.handleToggleEnabled()} disabled={saving}>
            {draft.enabled ? 'Disable' : 'Enable'}
          </button>
          <div class="cz-tf-footer__spacer" />
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => a.close()} disabled={saving}>Cancel</button>
          <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={() => a.handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Publish'}
          </button>
        </div>,
      );
    }
    return () => setFooter(null);
  }, [loading, error, data, editingSection, editingTierId, draft, saving, ctx.setFooter]);

  if (loading) return <div class="cz-admin-loading"><Spinner label="Loading tiers…" /></div>;
  if (error)   return <div class="cz-admin-error-msg">Failed to load tier data: {error}</div>;
  if (!data)   return null;

  // Defensive guard against incomplete migration data. The endpoint returns HTTP 200 with
  // { success:false } and no station payload when cz_service_package_station has not been
  // seeded for this service. Fail with a clear empty state instead of crashing on an
  // undefined station — this is a guard only, never a fallback to legacy package data.
  if (!data.success || !data.station) {
    return (
      <div class="cz-req-detail">
        <div class="drawerModule">
          <div class="drawerModule__header">
            <div class="drawerModule__heading">
              <p class="drawerModule__title">Tier configuration unavailable</p>
              <p class="drawerModule__subtitle">This service has no Package Station yet.</p>
            </div>
          </div>
          <div class="drawerModule__body">
            <div class="drawerModule__empty">
              <p class="drawerModule__empty-title">Package Station not found</p>
              <p class="drawerModule__empty-copy">
                This service’s pricing station has not been initialised, which can happen if
                migration has not completed for it. Refresh to try again; if the problem
                persists, contact an administrator.
              </p>
            </div>
          </div>
          <div class="drawerModule__footer">
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => refetch()}>
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { station, service: svc } = data;

  // ── Tier overview view — polished 4-tier summary cards + Pricing Summary ─────
  // Presentation ported from the retired PackageDetailStep (final polished form at
  // commit 2ac771e). Bound to Package Station data only (station.tiers is the same
  // SurfaceTierDetail shape); the View action routes via openTierEdit (station-native).
  // No legacy fetch (fetchSurfacePackageDetail) or legacy routing is reintroduced.
  if (!editingTierId || !draft) {
    const pkgStatus = station.platform_status ?? 'disabled';
    return (
      <div class="cz-req-detail">
        {/* Drawer Tab Contract — fixed order Details | Connections. Details = this
            package's tier modules; Connections = the parent service. */}
        <div class="cz-sv-tabs">
          <button
            type="button"
            class={`cz-sv-tab${overviewTab === 'details' ? ' cz-sv-tab--active' : ''}`}
            onClick={() => setOverviewTab('details')}
          >
            Details
          </button>
          <button
            type="button"
            class={`cz-sv-tab${overviewTab === 'connections' ? ' cz-sv-tab--active' : ''}`}
            onClick={() => setOverviewTab('connections')}
          >
            Connections
          </button>
        </div>

        {overviewTab === 'details' && (
        <>
        {TIER_KEYS.map((tierId) => {
          const tier       = station.tiers[tierId];
          const status     = resolveTierStatus(tier, { pkgStatus });
          const showData   = !!(tier && (tier.price !== null || tier.billing_cycle || tier.contact));
          const priceText  = tier?.contact && tier.price === null
            ? 'Contact'
            : tier?.price != null ? `$${tier.price.toFixed(2)}` : '$0.00';
          const cycleText  = tier?.billing_cycle ?? 'Not available';
          const inclCount  = tier?.inclusions_override?.length ?? 0;
          const faqCount   = tier?.faq_refs?.length ?? 0;
          const featLabel  = `${inclCount} ${inclCount === 1 ? 'feature' : 'features'}`;
          const faqLabel   = `${faqCount} ${faqCount === 1 ? 'common question' : 'common questions'}`;
          const tierNotes  = getTierNotes(tier, { platformStatus: pkgStatus });
          return (
            <div key={tierId} class="drawerModule drawerOverview tier">
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
                  <p class="drawerModule__title">Package {tier?.label?.trim() || TIER_LABELS[tierId]}</p>
                  <p class="drawerModule__subtitle">Pricing and inclusions for this tier.</p>
                </div>
                <div class={`drawerModule__status${status === 'pending-dim' ? ' drawerModule__status--dim' : ''}`}>
                  <ModuleStatusPill
                    status={status}
                    notes={tierNotes}
                    onOpen={() => setOpenSummaryTier(p => p === tierId ? null : tierId)}
                  />
                </div>
              </div>
              {openSummaryTier === tierId && tierNotes.length > 0 && (
                <ModuleNotificationPanel notes={tierNotes} />
              )}
              <div class="drawerModule__body">
                <div class="drawerModule__fields">
                  <div class="drawerModule__field">
                    <p class="drawerModule__label">Pricing</p>
                    {showData ? (
                      <p class="drawerModule__value">
                        <span>{priceText}</span>
                        {' · '}
                        <span>{cycleText}</span>
                      </p>
                    ) : (
                      <p class="drawerModule__value">View Tier Overview and manage pricing.</p>
                    )}
                  </div>
                  <div class="drawerModule__field">
                    <p class="drawerModule__label">Includes</p>
                    <p class="drawerModule__value">{featLabel} | {faqLabel}</p>
                  </div>
                </div>
              </div>
              <div class="drawerModule__footer">
                <button
                  type="button"
                  class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                  onClick={() => openTierEdit(tierId)}
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
                  const tier   = station.tiers[tierId];
                  const status = resolveTierStatus(tier, { pkgStatus });
                  return (
                    <tr key={tierId}>
                      <td class="cz-sp-tier-table__name">
                        <div class="cz-sp-tier-table__name-inner">
                          <span class={`cz-admin-status-dot ${statusDotClass(status)}`} />
                          <span>{TIER_LABELS[tierId]}</span>
                        </div>
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

        {overviewTab === 'connections' && (
          <ServiceOverviewViewCard
            mode="connection"
            status={serviceConnStatus}
            notes={[]}
            displayTitle={decodeHtml(serviceItem?.title ?? svc.title) || 'Untitled service'}
            displayContent={serviceItem?.content ? decodeHtml(serviceItem.content) : ''}
            displayCategory={
              serviceItem && serviceItem.categories.length > 0
                ? serviceItem.categories.map((c) => decodeHtml(c.name)).join(', ')
                : 'Not selected'
            }
            includesLabel={`${svc.inclusions?.length ?? 0} features | ${svc.faqs?.length ?? 0} common questions`}
            onView={serviceBack}
          />
        )}
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
            {(draft.inclusions_override.length > 0 || draft.new_inclusions.length > 0) && (
              <div class="cz-ie-list">
                {draft.inclusions_override.map((inc) => (
                  <div key={inc.id} class="cz-ie-row">
                    <input type="text" class="cz-tf-input" value={inc.label} readOnly />
                    <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                      aria-label="Remove"
                      onClick={() => setDraft(d => d ? { ...d, inclusions_override: d.inclusions_override.filter(i => i.id !== inc.id) } : d)}>
                      ✕
                    </button>
                  </div>
                ))}
                {draft.new_inclusions.map((inc, idx) => (
                  <div key={`new-inc-${idx}`} class="cz-ie-row">
                    <input type="text" class="cz-tf-input" value={inc.label} readOnly />
                    <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                      aria-label="Remove"
                      onClick={() => setDraft(d => d ? { ...d, new_inclusions: d.new_inclusions.filter((_, i) => i !== idx) } : d)}>
                      ✕
                    </button>
                  </div>
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
            <div class="cz-tf-inline-add">
              <input type="text" class="cz-tf-input" placeholder="New inclusion label"
                value={newIncLabel}
                onInput={(e) => setNewIncLabel((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' || !newIncLabel.trim()) return;
                  e.preventDefault();
                  setDraft(d => d ? { ...d, new_inclusions: [...d.new_inclusions, { label: newIncLabel.trim() }] } : d);
                  setNewIncLabel('');
                }} />
              <div class="cz-tf-inline-add__actions">
                <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                  onClick={() => {
                    if (!newIncLabel.trim()) return;
                    setDraft(d => d ? { ...d, new_inclusions: [...d.new_inclusions, { label: newIncLabel.trim() }] } : d);
                    setNewIncLabel('');
                  }}>Add</button>
              </div>
            </div>
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
            {(draft.faq_refs.length > 0 || draft.new_faqs.length > 0) && (
              <div class="cz-ie-list">
                {draft.faq_refs.map(ref => {
                  const faq = faqPool.find(f => f.id === ref);
                  return (
                    <div key={ref} class="cz-ie-row">
                      <input type="text" class="cz-tf-input" value={faq?.question ?? ref} readOnly />
                      <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                        aria-label="Remove"
                        onClick={() => setDraft(d => d ? { ...d, faq_refs: d.faq_refs.filter(r => r !== ref) } : d)}>✕</button>
                    </div>
                  );
                })}
                {draft.new_faqs.map((f, idx) => (
                  <div key={`new-faq-${idx}`} class="cz-ie-row">
                    <input type="text" class="cz-tf-input" value={f.question} readOnly />
                    <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                      aria-label="Remove"
                      onClick={() => setDraft(d => d ? { ...d, new_faqs: d.new_faqs.filter((_, i) => i !== idx) } : d)}>✕</button>
                  </div>
                ))}
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
            {/* Add new — parity with Included Features: create a new FAQ and add it
                to the service pool (anchor/consumer model; new_faqs already carried
                by the tier draft and persisted on Publish). Matches the Service FAQ
                editor's inline-add (question + answer). */}
            <div class="cz-tf-inline-add">
              <input type="text" class="cz-tf-input" placeholder="New question"
                value={newFaqQ}
                onInput={(e) => setNewFaqQ((e.target as HTMLInputElement).value)} />
              <textarea class="cz-tf-textarea" placeholder="Answer (optional)" rows={2}
                value={newFaqA}
                onInput={(e) => setNewFaqA((e.target as HTMLTextAreaElement).value)} />
              <div class="cz-tf-inline-add__actions">
                <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                  onClick={() => {
                    if (!newFaqQ.trim()) return;
                    setDraft(d => d ? { ...d, new_faqs: [...d.new_faqs, { question: newFaqQ.trim(), answer: newFaqA.trim() }] } : d);
                    setNewFaqQ('');
                    setNewFaqA('');
                  }}>Add</button>
              </div>
            </div>
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

  return (
    <div class="cz-req-detail">
      {/* Drawer Tab Contract — fixed order Details | Connections. Back-to-overview is
          handled by the single drawer header Back (context-aware), not a second control. */}
      <div class="cz-sv-tabs">
        <button
          type="button"
          class={`cz-sv-tab${tierTab === 'commercial' ? ' cz-sv-tab--active' : ''}`}
          onClick={() => setTierTab('commercial')}
        >
          Details
        </button>
        <button
          type="button"
          class={`cz-sv-tab${tierTab === 'service' ? ' cz-sv-tab--active' : ''}`}
          onClick={() => setTierTab('service')}
        >
          Connections
        </button>
      </div>

      {/* ── Commercial tab: the tier's own modules ───────────────────────────── */}
      {tierTab === 'commercial' && (
        <>
          {/* Tier Overview */}
          <ReadBlock
            title="Tier Overview"
            subtitle="Pricing and presentation for this tier."
            icon={TIER_OVERVIEW_ICON}
            iconVariant="drawerModule__icon--overview"
            scopeClass="drawerOverview tier"
            status={overviewState.status}
            notes={overviewState.notes}
            panelOpen={openTierPanel === 'tier-overview'}
            onTogglePanel={() => setOpenTierPanel((p) => (p === 'tier-overview' ? null : 'tier-overview'))}
            onEdit={() => openSection('tier-overview')}
          >
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
          </ReadBlock>

          {/* Included Features */}
          <ReadBlock
            title="Included Features"
            subtitle="Features included in this tier."
            icon={TIER_FEATURES_ICON}
            iconVariant="drawerModule__icon--features"
            count={draft.inclusions_override.length}
            status={featuresState.status}
            notes={featuresState.notes}
            panelOpen={openTierPanel === 'tier-features'}
            onTogglePanel={() => setOpenTierPanel((p) => (p === 'tier-features' ? null : 'tier-features'))}
            onEdit={() => openSection('tier-inclusions')}
          >
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
          </ReadBlock>

          {/* Common Questions */}
          <ReadBlock
            title="Common Questions"
            subtitle="Questions and answers for this tier."
            icon={TIER_FAQS_ICON}
            iconVariant="drawerModule__icon--faqs"
            count={draft.faq_refs.length}
            status={faqsState.status}
            notes={faqsState.notes}
            panelOpen={openTierPanel === 'tier-faqs'}
            onTogglePanel={() => setOpenTierPanel((p) => (p === 'tier-faqs' ? null : 'tier-faqs'))}
            onEdit={() => openSection('tier-faqs')}
          >
            {draft.faq_refs.length > 0 ? (
              <div class="cz-sc-faq-list">
                {draft.faq_refs.map(ref => {
                  const faq = faqPool.find(f => f.id === ref);
                  return (
                    <div key={ref} class="cz-sc-faq-item">
                      <p class="cz-sc-faq-item__q">{faq?.question ?? ref}</p>
                      {faq?.answer && <p class="cz-sc-faq-item__a">{faq.answer}</p>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div class="drawerModule__empty">
                <p class="drawerModule__empty-title">No questions added</p>
                <p class="drawerModule__empty-copy">Add common questions for this tier.</p>
              </div>
            )}
          </ReadBlock>

          {(saveErr || saveOk) && (
            <div class="cz-shell-section cz-shell-section--no-border">
              {saveErr && <p class="cz-admin-error-msg">{saveErr}</p>}
              {saveOk  && <p class="cz-admin-ok-msg">Saved.</p>}
            </div>
          )}
        </>
      )}

      {/* ── Connections tab: parent service (same service-overview connection card
             as the package overview's Connections tab). ─────────────────────────── */}
      {tierTab === 'service' && (
        <ServiceOverviewViewCard
          mode="connection"
          status={serviceConnStatus}
          notes={[]}
          displayTitle={decodeHtml(serviceItem?.title ?? svc.title) || 'Untitled service'}
          displayContent={serviceItem?.content ? decodeHtml(serviceItem.content) : ''}
          displayCategory={
            serviceItem && serviceItem.categories.length > 0
              ? serviceItem.categories.map((c) => decodeHtml(c.name)).join(', ')
              : 'Not selected'
          }
          includesLabel={`${svc.inclusions?.length ?? 0} features | ${svc.faqs?.length ?? 0} common questions`}
          onView={serviceBack}
        />
      )}
    </div>
  );
}
