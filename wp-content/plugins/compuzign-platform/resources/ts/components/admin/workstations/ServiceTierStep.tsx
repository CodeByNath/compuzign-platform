import { useState, useEffect, useRef } from 'preact/hooks';
import { Spinner } from '@/components/ui/Spinner';
import type { StepContext } from '../ActionShell';
import type { ServiceItem } from '@/api/types/cost-builder';
import type { InclusionItem, TierOverviewDraft } from '@/api/types/admin';
import { usePackageStation } from '@/hooks/usePackageStation';
import { statusDotClass } from '@/components/admin/utils/moduleStatus';
import { InlineEditorShell } from '../InlineEditorShell';
import { ServiceOverviewViewCard } from '../views/ServiceOverviewViewCard';
import { ReadBlock } from '../ReadBlock';
import { ModuleStatusPill } from '../ui/ModuleStatusPill';
import { ModuleNotificationPanel } from '../ui/ModuleNotificationPanel';
import { getTierNotes } from '@/components/admin/utils/moduleNotifications';
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
// Phase 2 (L5): Service Station-owned tier configuration drawer.
// P5 Step 1: consumes usePackageStation (single source, draft-preferred derive,
// patch-in-place). Per-module Save persists a draft; footer Publish settles the tier.
// popular_tier is a station-level action (setPopularTier), not part of the overview draft.

// Transient overview-editor form draft. Extends the tier-owned overview scalars with the
// station-level popular fields the editor surfaces; on save, the overview scalars go
// through saveTierOverview and popular goes through setPopularTier (station-level).
type OverviewEditDraft = TierOverviewDraft & { popular: boolean; popular_label: string };

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

  // Single client-side owner of the package station (package module + all tiers).
  const pkg     = usePackageStation(serviceId, onRefresh);
  const station = pkg.station;
  const svc     = pkg.service;

  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  // Single Individual Tier drawer: editingSection === null → tier view (3 module cards);
  // a named value → that section's InlineEditorShell over a transient per-module draft.
  const [editingSection, setEditingSection] = useState<'tier-overview' | 'tier-inclusions' | 'tier-faqs' | null>(null);
  // Per-module transient drafts (§2): seeded from the hook's draft-preferred view on open,
  // saved independently via saveTierX. Only one is active at a time (the open section).
  const [overviewDraft, setOverviewDraft] = useState<OverviewEditDraft | null>(null);
  const [featuresDraft, setFeaturesDraft] = useState<InclusionItem[] | null>(null);
  const [faqsDraft,     setFaqsDraft]     = useState<string[] | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk,  setSaveOk]  = useState(false);
  // Inline "+ Create new" affordance (P5 Step 2) — immediate canonical pool creation,
  // separate from the tier module draft/save. Only one add-form is open at a time,
  // scoped to whichever section (tier-inclusions | tier-faqs) is currently editing.
  const [showAddInclusion,   setShowAddInclusion]   = useState(false);
  const [newInclusionLabel,  setNewInclusionLabel]  = useState('');
  const [showAddFaq,         setShowAddFaq]         = useState(false);
  const [newFaqQuestion,     setNewFaqQuestion]     = useState('');
  const [newFaqAnswer,       setNewFaqAnswer]       = useState('');
  const [createErr,          setCreateErr]          = useState<string | null>(null);
  const [creating,           setCreating]           = useState(false);
  // Individual Tier drawer: Commercial (the tier's own modules) | Service (read-only
  // parent context). Commercial is the working context, so it is the default.
  const [tierTab, setTierTab] = useState<'commercial' | 'service'>('commercial');
  // Single-open accordion for the Commercial cards' notification panels.
  const [openTierPanel, setOpenTierPanel] = useState<'tier-overview' | 'tier-features' | 'tier-faqs' | null>(null);
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
    setEditingTierId(tierId);
    setEditingSection(null);
    setOverviewDraft(null);
    setFeaturesDraft(null);
    setFaqsDraft(null);
    setSaveErr(null);
    setSaveOk(false);
    setTierTab('commercial');
    setOpenTierPanel(null);
    setShowAddInclusion(false);
    setNewInclusionLabel('');
    setShowAddFaq(false);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
    setCreateErr(null);
  };

  // Section edit lifecycle — seed the section's transient draft from the hook's
  // draft-preferred view; Save persists it via the hook, Cancel discards it.
  const openSection = (section: 'tier-overview' | 'tier-inclusions' | 'tier-faqs') => {
    if (!editingTierId) return;
    const view = pkg.tierView(editingTierId);
    if (!view) return;
    const d = view.detail;
    if (section === 'tier-overview') {
      setOverviewDraft({
        label:         d.label,
        price:         d.price,
        contact:       d.contact,
        billing_cycle: d.billing_cycle ?? 'monthly',
        popular:       pkg.popularTier === editingTierId,
        popular_label: pkg.popularTier === editingTierId ? pkg.popularLabel : '',
      });
    } else if (section === 'tier-inclusions') {
      setFeaturesDraft([...d.inclusions_override]);
    } else {
      setFaqsDraft([...d.faq_refs]);
    }
    setEditingSection(section);
    setSaveErr(null);
    setSaveOk(false);
    setShowAddInclusion(false);
    setNewInclusionLabel('');
    setShowAddFaq(false);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
    setCreateErr(null);
  };

  // Per-module Save — persist-through the hook (draft + patch-in-place), then return to
  // tier view. popular is committed station-level, separate from the overview draft.
  const saveSection = async () => {
    if (!editingTierId) return;
    setSaveErr(null);
    try {
      let ok = true;
      if (editingSection === 'tier-overview' && overviewDraft) {
        const r = await pkg.saveTierOverview(editingTierId, {
          label:         overviewDraft.label,
          price:         overviewDraft.price,
          contact:       overviewDraft.contact,
          billing_cycle: overviewDraft.billing_cycle,
        });
        ok = !!r?.success;
        if (ok) {
          if (overviewDraft.popular) {
            ok = await pkg.setPopularTier(editingTierId, overviewDraft.popular_label);
          } else if (pkg.popularTier === editingTierId) {
            ok = await pkg.setPopularTier(null, '');
          }
        }
      } else if (editingSection === 'tier-inclusions' && featuresDraft) {
        const r = await pkg.saveTierFeatures(editingTierId, featuresDraft);
        ok = !!r?.success;
      } else if (editingSection === 'tier-faqs' && faqsDraft) {
        const r = await pkg.saveTierFaqs(editingTierId, faqsDraft);
        ok = !!r?.success;
      }
      if (!ok) { setSaveErr('Save failed.'); return; }
      setSaveOk(true);
      setEditingSection(null);
      setOverviewDraft(null);
      setFeaturesDraft(null);
      setFaqsDraft(null);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed.');
    }
  };
  const cancelSection = () => {
    setEditingSection(null);
    setOverviewDraft(null);
    setFeaturesDraft(null);
    setFaqsDraft(null);
    setSaveErr(null);
    setSaveOk(false);
    setShowAddInclusion(false);
    setNewInclusionLabel('');
    setShowAddFaq(false);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
    setCreateErr(null);
  };

  // Immediate canonical pool creation (P5 Step 2) — separate request from the tier
  // module save. On success the new item's id is appended into the currently open
  // draft, exactly as if it had been picked from "Add from pool…"; the user still
  // has to Save the section to persist the reference into the tier's own draft.
  const handleCreateInclusion = async () => {
    const label = newInclusionLabel.trim();
    if (!label) return;
    setCreateErr(null);
    setCreating(true);
    try {
      const item = await pkg.createInclusion(label);
      if (!item) { setCreateErr('Failed to create feature.'); return; }
      setFeaturesDraft(f => (f && !f.find(i => i.id === item.id)) ? [...f, item] : f);
      setNewInclusionLabel('');
      setShowAddInclusion(false);
    } finally {
      setCreating(false);
    }
  };
  const cancelAddInclusion = () => {
    setShowAddInclusion(false);
    setNewInclusionLabel('');
    setCreateErr(null);
  };

  const handleCreateFaq = async () => {
    const question = newFaqQuestion.trim();
    if (!question) return;
    setCreateErr(null);
    setCreating(true);
    try {
      const item = await pkg.createFaq(question, newFaqAnswer.trim());
      if (!item) { setCreateErr('Failed to create question.'); return; }
      setFaqsDraft(r => (r && !r.includes(item.id)) ? [...r, item.id] : r);
      setNewFaqQuestion('');
      setNewFaqAnswer('');
      setShowAddFaq(false);
    } finally {
      setCreating(false);
    }
  };
  const cancelAddFaq = () => {
    setShowAddFaq(false);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
    setCreateErr(null);
  };

  // Publish → settle the tier (commit drafts to the occupant). No-ops backend-side when
  // there is no occupant and no drafts; the footer disables Publish in that case.
  const handleSettle = async () => {
    if (!editingTierId) return;
    setSaveErr(null);
    const r = await pkg.settleTier(editingTierId);
    if (r?.success) setSaveOk(true); else setSaveErr('Publish failed.');
  };
  // Disable/Enable — separate lifecycle action (immediate, not draft-staged).
  const handleToggleEnabled = async () => {
    if (!editingTierId) return;
    const view = pkg.tierView(editingTierId);
    if (!view) return;
    setSaveErr(null);
    const ok = await pkg.toggleTierEnabled(editingTierId, !view.detail.enabled);
    if (ok) setSaveOk(true); else setSaveErr('Update failed.');
  };
  // Discard one module's pending draft (engine D1) — status re-derives from the occupant.
  const handleRevertModule = async (module: 'overview' | 'features' | 'faqs') => {
    if (!editingTierId) return;
    setSaveErr(null);
    const res = await pkg.revertTierModule(editingTierId, module);
    if (!res?.success) setSaveErr('Failed to discard changes.');
  };

  // Returns to the tier list — drafts are already persisted by the hook, so nothing to flush.
  const handleBack = () => {
    setEditingTierId(null);
    setEditingSection(null);
    setOverviewDraft(null);
    setFeaturesDraft(null);
    setFaqsDraft(null);
    setSaveErr(null);
    setSaveOk(false);
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
  const footerRef = useRef({ handleSettle, handleToggleEnabled, close: ctx.close });
  footerRef.current = { handleSettle, handleToggleEnabled, close: ctx.close };

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
    if (!pkg.detailLoaded || !station || !svc) {
      setFooter(closeFooter);
    } else if (editingSection != null) {
      setFooter(null);
    } else if (!editingTierId) {
      setFooter(closeFooter);
    } else {
      const view       = pkg.tierView(editingTierId);
      const enabled    = view?.detail.enabled ?? false;
      // Honour the settle no-op guard: nothing to settle when every module is
      // not-configured (no drafts, no occupant).
      const hasContent = !!view && Object.values(view.moduleStatus).some((s) => s !== 'not-configured');
      setFooter(
        <div class="cz-tf-footer">
          <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={() => a.handleToggleEnabled()} disabled={pkg.saving}>
            {enabled ? 'Disable' : 'Enable'}
          </button>
          <div class="cz-tf-footer__spacer" />
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => a.close()} disabled={pkg.saving}>Cancel</button>
          <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={() => a.handleSettle()} disabled={pkg.saving || !hasContent}>
            {pkg.saving ? 'Saving…' : 'Publish'}
          </button>
        </div>,
      );
    }
    return () => setFooter(null);
  }, [pkg.detailLoaded, pkg.station, pkg.service, pkg.tierView, pkg.saving, editingSection, editingTierId, ctx.setFooter]);

  if (!pkg.detailLoaded) return <div class="cz-admin-loading"><Spinner label="Loading tiers…" /></div>;

  // Defensive guard against incomplete migration data. The endpoint returns HTTP 200 with
  // { success:false } and no station payload when cz_service_package_station has not been
  // seeded for this service (the hook surfaces that as a null station). Fail with a clear
  // empty state instead of crashing — this is a guard only, never a fallback to legacy data.
  if (!station || !svc) {
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
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => pkg.refetch()}>
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Tier overview view — polished 4-tier summary cards + Pricing Summary ─────
  // Bound to draft-preferred tier views from usePackageStation (station.tiers is the
  // same SurfaceTierDetail shape); the View action routes via openTierEdit (station-native).
  if (!editingTierId) {
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
          const view       = pkg.tierView(tierId);
          const detail     = view?.detail;
          const status     = view ? view.status : 'not-configured';
          const showData   = !!(detail && (detail.price !== null || detail.billing_cycle || detail.contact));
          const priceText  = detail?.contact && detail.price === null
            ? 'Contact'
            : detail?.price != null ? `$${detail.price.toFixed(2)}` : '$0.00';
          const cycleText  = detail?.billing_cycle ?? 'Not available';
          const inclCount  = detail?.inclusions_override?.length ?? 0;
          const faqCount   = detail?.faq_refs?.length ?? 0;
          const featLabel  = `${inclCount} ${inclCount === 1 ? 'feature' : 'features'}`;
          const faqLabel   = `${faqCount} ${faqCount === 1 ? 'common question' : 'common questions'}`;
          const tierNotes  = detail ? getTierNotes(detail, { platformStatus: pkgStatus }) : [];
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
                  <p class="drawerModule__title">Package {detail?.label?.trim() || TIER_LABELS[tierId]}</p>
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
                  const view   = pkg.tierView(tierId);
                  const detail = view?.detail;
                  const status = view ? view.status : 'not-configured';
                  return (
                    <tr key={tierId}>
                      <td class="cz-sp-tier-table__name">
                        <div class="cz-sp-tier-table__name-inner">
                          <span class={`cz-admin-status-dot ${statusDotClass(status)}`} />
                          <span>{TIER_LABELS[tierId]}</span>
                        </div>
                      </td>
                      <td>
                        <span class={`cz-price-tag${detail?.price != null ? ' cz-price-tag--has-price' : ''}`}>
                          {detail?.price != null ? `$${detail.price.toLocaleString()}` : '—'}
                        </span>
                      </td>
                      <td class="cz-sp-tier-table__muted">{detail?.billing_cycle ?? '—'}</td>
                      <td class="cz-sp-tier-table__center cz-sp-tier-table__muted">
                        {detail?.inclusions_override?.length ? detail.inclusions_override.length : '—'}
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

  // Edit mode — InlineEditorShell over the section's transient draft. Save persists via
  // the hook (saveTierX / setPopularTier); Cancel discards the draft.
  if (editingSection === 'tier-overview' && overviewDraft) {
    return (
      <InlineEditorShell title="Tier Overview" onSave={saveSection} onCancel={cancelSection} saving={pkg.saving} saveErr={saveErr}>
        <div class="cz-tf-form">
          {/* Contact toggle */}
          <div class="cz-tf-field" style="flex-direction: row; align-items: center; gap: var(--cz-space-3)">
            <input type="checkbox" id="tier-contact" checked={overviewDraft.contact}
              onChange={(e) => setOverviewDraft(d => d ? { ...d, contact: (e.target as HTMLInputElement).checked, price: null } : d)} />
            <label class="cz-tf-label" for="tier-contact" style="margin: 0">Contact Us (no fixed price)</label>
          </div>
          {!overviewDraft.contact && (
            <div class="cz-tf-field">
              <label class="cz-tf-label">Price</label>
              <input type="number" class="cz-tf-input" min="0" step="0.01"
                value={overviewDraft.price ?? ''}
                onInput={(e) => {
                  const v = (e.target as HTMLInputElement).value;
                  setOverviewDraft(d => d ? { ...d, price: v === '' ? null : parseFloat(v) } : d);
                }} />
            </div>
          )}
          <div class="cz-tf-field">
            <label class="cz-tf-label">Billing Cycle</label>
            <select class="cz-tf-select" value={overviewDraft.billing_cycle}
              onChange={(e) => setOverviewDraft(d => d ? { ...d, billing_cycle: (e.target as HTMLSelectElement).value } : d)}>
              <option value="monthly">Monthly</option>
              <option value="annually">Annually</option>
              <option value="one-time">One-time</option>
            </select>
          </div>
          <div class="cz-tf-field">
            <label class="cz-tf-label">Display Label (optional)</label>
            <input type="text" class="cz-tf-input" value={overviewDraft.label}
              onInput={(e) => setOverviewDraft(d => d ? { ...d, label: (e.target as HTMLInputElement).value } : d)} />
          </div>
          <div class="cz-tf-field" style="flex-direction: row; align-items: center; gap: var(--cz-space-3)">
            <input type="checkbox" id="tier-popular" checked={overviewDraft.popular}
              onChange={(e) => setOverviewDraft(d => d ? { ...d, popular: (e.target as HTMLInputElement).checked } : d)} />
            <label class="cz-tf-label" for="tier-popular" style="margin: 0">Mark as popular tier</label>
          </div>
          {overviewDraft.popular && (
            <div class="cz-tf-field">
              <label class="cz-tf-label">Popular badge label</label>
              <input type="text" class="cz-tf-input" value={overviewDraft.popular_label}
                onInput={(e) => setOverviewDraft(d => d ? { ...d, popular_label: (e.target as HTMLInputElement).value } : d)} />
            </div>
          )}
        </div>
      </InlineEditorShell>
    );
  }

  if (editingSection === 'tier-inclusions' && featuresDraft) {
    return (
      <InlineEditorShell title="Included Features" onSave={saveSection} onCancel={cancelSection} saving={pkg.saving} saveErr={saveErr}>
        <div class="cz-tf-form">
          <div class="cz-tf-field">
            <label class="cz-tf-label">Inclusions</label>
            {featuresDraft.length > 0 && (
              <div class="cz-ie-list">
                {featuresDraft.map((inc) => (
                  <div key={inc.id} class="cz-ie-row">
                    <input type="text" class="cz-tf-input" value={inc.label} readOnly />
                    <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                      aria-label="Remove"
                      onClick={() => setFeaturesDraft(f => f ? f.filter(i => i.id !== inc.id) : f)}>
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
                  if (inc) {
                    setFeaturesDraft(f => (f && !f.find(i => i.id === id)) ? [...f, inc] : f);
                  }
                  sel.value = '';
                }}>
                <option value="">Add from pool…</option>
                {incPool.filter(i => !featuresDraft.find(s => s.id === i.id)).map(i => (
                  <option key={i.id} value={i.id}>{i.label}</option>
                ))}
              </select>
            )}
            {showAddInclusion ? (
              <div class="cz-tf-inline-add">
                <input type="text" class="cz-tf-input" placeholder="New feature label"
                  value={newInclusionLabel}
                  onInput={(e) => setNewInclusionLabel((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateInclusion(); } }}
                  autoFocus />
                <div class="cz-tf-inline-add__actions">
                  <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                    onClick={handleCreateInclusion} disabled={creating}>
                    {creating ? '…' : 'Create'}
                  </button>
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                    onClick={cancelAddInclusion} disabled={creating}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" class="cz-tf-add-btn" onClick={() => setShowAddInclusion(true)}>
                + Create new feature
              </button>
            )}
            {createErr && <p class="cz-admin-error-msg">{createErr}</p>}
          </div>
        </div>
      </InlineEditorShell>
    );
  }

  if (editingSection === 'tier-faqs' && faqsDraft) {
    return (
      <InlineEditorShell title="Common Questions" onSave={saveSection} onCancel={cancelSection} saving={pkg.saving} saveErr={saveErr}>
        <div class="cz-tf-form">
          <div class="cz-tf-field">
            <label class="cz-tf-label">FAQs</label>
            {faqsDraft.length > 0 && (
              <div class="cz-ie-list">
                {faqsDraft.map(ref => {
                  const faq = faqPool.find(f => f.id === ref);
                  return (
                    <div key={ref} class="cz-ie-row">
                      <input type="text" class="cz-tf-input" value={faq?.question ?? ref} readOnly />
                      <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                        aria-label="Remove"
                        onClick={() => setFaqsDraft(r => r ? r.filter(x => x !== ref) : r)}>✕</button>
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
                  setFaqsDraft(r => (r && !r.includes(id)) ? [...r, id] : r);
                  sel.value = '';
                }}>
                <option value="">Add FAQ from pool…</option>
                {faqPool.filter(f => !faqsDraft.includes(f.id)).map(f => (
                  <option key={f.id} value={f.id}>{f.question}</option>
                ))}
              </select>
            )}
            {showAddFaq ? (
              <div class="cz-tf-inline-add">
                <input type="text" class="cz-tf-input" placeholder="Question"
                  value={newFaqQuestion}
                  onInput={(e) => setNewFaqQuestion((e.target as HTMLInputElement).value)}
                  autoFocus />
                <textarea class="cz-tf-textarea" placeholder="Answer (optional)"
                  value={newFaqAnswer}
                  onInput={(e) => setNewFaqAnswer((e.target as HTMLTextAreaElement).value)}
                  rows={3} />
                <div class="cz-tf-inline-add__actions">
                  <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm"
                    onClick={handleCreateFaq} disabled={creating}>
                    {creating ? '…' : 'Create'}
                  </button>
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                    onClick={cancelAddFaq} disabled={creating}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" class="cz-tf-add-btn" onClick={() => setShowAddFaq(true)}>
                + Create new question
              </button>
            )}
            {createErr && <p class="cz-admin-error-msg">{createErr}</p>}
          </div>
        </div>
      </InlineEditorShell>
    );
  }

  // View mode — Service | Commercial tabs over the draft-preferred tier view.
  const view = pkg.tierView(editingTierId);
  if (!view) return null;
  const detail = view.detail;

  const tierPriceText = detail.contact ? 'Contact Us' : (detail.price != null ? `$${detail.price}` : '—');
  const isPopular     = pkg.popularTier === editingTierId;

  // Per-module lifecycle (5-state status + notes) owned by the hook. Tier Overview is the
  // parent; Included Features and Common Questions gate on it (pending-dim until ready).
  const overviewState = view.modules.overview;
  const featuresState = view.modules.features;
  const faqsState     = view.modules.faqs;

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
                <p class="drawerModule__value">{detail.label.trim() || TIER_LABELS[editingTierId]}</p>
              </div>
              <div class="drawerModule__field">
                <p class="drawerModule__label">Price</p>
                <p class="drawerModule__value">{tierPriceText}</p>
              </div>
              <div class="drawerModule__field">
                <p class="drawerModule__label">Billing Cycle</p>
                <p class="drawerModule__value">{detail.billing_cycle || '—'}</p>
              </div>
              {isPopular && (
                <div class="drawerModule__field">
                  <p class="drawerModule__label">Presentation</p>
                  <p class="drawerModule__value">Popular{pkg.popularLabel ? ` · ${pkg.popularLabel}` : ''}</p>
                </div>
              )}
            </div>
            {view.drafts.overview !== null && (
              <div class="drawerModule__footer">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={pkg.saving} onClick={() => handleRevertModule('overview')}>
                  Discard pending changes
                </button>
              </div>
            )}
          </ReadBlock>

          {/* Included Features */}
          <ReadBlock
            title="Included Features"
            subtitle="Features included in this tier."
            icon={TIER_FEATURES_ICON}
            iconVariant="drawerModule__icon--features"
            count={detail.inclusions_override.length}
            status={featuresState.status}
            notes={featuresState.notes}
            panelOpen={openTierPanel === 'tier-features'}
            onTogglePanel={() => setOpenTierPanel((p) => (p === 'tier-features' ? null : 'tier-features'))}
            onEdit={() => openSection('tier-inclusions')}
          >
            {detail.inclusions_override.length > 0 ? (
              <div class="cz-sc-inclusion-pool">
                {detail.inclusions_override.map((inc) => (
                  <span key={inc.id} class="cz-tf-chip">{inc.label}</span>
                ))}
              </div>
            ) : (
              <div class="drawerModule__empty">
                <p class="drawerModule__empty-title">No features</p>
                <p class="drawerModule__empty-copy">Add features included in this tier.</p>
              </div>
            )}
            {view.drafts.features !== null && (
              <div class="drawerModule__footer">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={pkg.saving} onClick={() => handleRevertModule('features')}>
                  Discard pending changes
                </button>
              </div>
            )}
          </ReadBlock>

          {/* Common Questions */}
          <ReadBlock
            title="Common Questions"
            subtitle="Questions and answers for this tier."
            icon={TIER_FAQS_ICON}
            iconVariant="drawerModule__icon--faqs"
            count={detail.faq_refs.length}
            status={faqsState.status}
            notes={faqsState.notes}
            panelOpen={openTierPanel === 'tier-faqs'}
            onTogglePanel={() => setOpenTierPanel((p) => (p === 'tier-faqs' ? null : 'tier-faqs'))}
            onEdit={() => openSection('tier-faqs')}
          >
            {detail.faq_refs.length > 0 ? (
              <div class="cz-sc-faq-list">
                {detail.faq_refs.map(ref => {
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
            {view.drafts.faqs !== null && (
              <div class="drawerModule__footer">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={pkg.saving} onClick={() => handleRevertModule('faqs')}>
                  Discard pending changes
                </button>
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
