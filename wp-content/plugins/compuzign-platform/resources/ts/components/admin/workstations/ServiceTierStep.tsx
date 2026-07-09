import { useState, useEffect, useRef } from 'preact/hooks';
import { AsyncLoading } from '@/components/admin/ui/AsyncSection';
import type { StepContext } from '../ActionShell';
import type { ServiceItem } from '@/api/types/cost-builder';
import type { InclusionItem, PricingBoardItem, TierPricingUsage } from '@/api/types/admin';
import { usePackageStation } from '@/hooks/usePackageStation';
import { statusDotClass } from '@/components/admin/utils/moduleStatus';
import { TRAVEL_PILL } from '@/components/admin/schema/presentation';
import { MODULE_ICONS } from '@/components/admin/schema/icons';
import { useInlineConfirm } from '@/hooks/useInlineConfirm';
import { ReadBlock } from '../ReadBlock';
import { DrawerTabs } from '../DrawerTabs';
import { EntityDrawer } from '../EntityDrawer';
import { TIER_ENTITY } from '@/components/admin/schema/entities/tier';
import { getTierNotes, evaluateModule, pricingBoardModule } from '@/components/admin/utils/moduleNotifications';
import { PricingBoardEditor } from '../editors/PricingBoardEditor';
import { seedTierPricingUsage } from '../editors/TierPricingEditor';
import { ModeProvider } from '@/components/admin/schema/modeContext';
import { OverviewShell } from '@/components/admin/schema/shells/overviewShell';
import { ChildShell } from '@/components/admin/schema/shells/childShell';
import { serviceOverviewShell } from '@/components/admin/schema/shells/bindings/service';
import {
  tierOverviewShell,
  tierFeaturesShell,
  tierFaqsShell,
  tierPricingShell,
} from '@/components/admin/schema/shells/bindings/tier';
import type {
  TierOverviewShellData,
  TierFeaturesShellData,
  TierFaqsShellData,
  TierPricingShellData,
} from '@/components/admin/schema/shells/bindings/tier';
import type { ShellBinding } from '@/components/admin/schema/types';
import type { TierOverviewEditDraft } from '../editors/TierOverviewEditor';
import { serviceConnectionBinding, TIER_KEYS, TIER_LABELS } from './serviceDrawerShared';

// Tier module icons come from the shared registry (schema/icons.tsx, S1b) —
// the same glyphs the Service Overview / Features / FAQs cards use.

// Travel-state pill for occupant-bin cards — bin surfaces name Archived/Trashed
// as data labels (schema/presentation.ts TRAVEL_PILL, travel surfaces only),
// matching ServicePromotionStep's bin rows.
function binPill(status: string) {
  const pill = TRAVEL_PILL[status as keyof typeof TRAVEL_PILL] ?? TRAVEL_PILL.archived;
  return (
    <span class={`cz-module-status-pill ${pill.cls}`}>
      <span class="cz-module-status-pill__marker">●</span>
      {pill.label}
    </span>
  );
}

// Whether a shell holds SETTLED content (an occupant). Client-side heuristic
// over the settled fields — the backend is authoritative and rejects with
// target_occupied / no_occupant when this misjudges an all-empty occupant.
function slotOccupied(slot: { label: string; price: number | null; contact: boolean; billing_cycle: string | null; inclusions_override: unknown[]; faq_refs: unknown[] } | undefined | null): boolean {
  return !!slot && (
    slot.price !== null
    || slot.contact
    || !!slot.billing_cycle
    || !!slot.label.trim()
    || slot.inclusions_override.length > 0
    || slot.faq_refs.length > 0
  );
}

// ── ServiceTierStep ───────────────────────────────────────────────────────────
// Phase 2 (L5): Service Station-owned tier configuration drawer.
// P5 Step 1: consumes usePackageStation (single source, draft-preferred derive,
// patch-in-place). Per-module Save persists a draft; footer Publish settles the tier.
// popular_tier is a station-level action (setPopularTier), not part of the overview draft.

// The transient overview-editor form draft (tier scalars + station-level
// popular fields) is TierOverviewEditDraft, owned by editors/TierOverviewEditor.

export function ServiceTierStep({ ctx }: { ctx: StepContext }) {
  const serviceId = ctx.stepData.serviceId as number;
  const onRefresh = ctx.stepData.onRefresh as (() => void) | undefined;
  // Full parent service (richer than the station's service stub) — read-only
  // context for the Connections tab. Passed through by handleOpenTierConfig.
  const serviceItem = ctx.stepData.service as ServiceItem | undefined;
  // Return-to-Service navigation (the same handler wired to the drawer's Back), used by
  // the service-overview connection shell's View action.
  const serviceBack = ctx.stepData.serviceBack as (() => void) | undefined;

  // Single client-side owner of the package station (package module + all tiers).
  const pkg     = usePackageStation(serviceId, onRefresh);
  const station = pkg.station;
  const svc     = pkg.service;

  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  // Single Individual Tier drawer: editingSection === null → tier view (4 module cards);
  // a named value → that section's InlineEditorShell over a transient per-module draft.
  const [editingSection, setEditingSection] = useState<'tier-overview' | 'tier-inclusions' | 'tier-faqs' | 'tier-pricing' | null>(null);
  // Per-module transient drafts (§2): seeded from the hook's draft-preferred view on open,
  // saved independently via saveTierX. Only one is active at a time (the open section).
  // The inline "+ Create new" pool affordance lives inside the pool editors (S3a).
  const [overviewDraft, setOverviewDraft] = useState<TierOverviewEditDraft | null>(null);
  const [featuresDraft, setFeaturesDraft] = useState<InclusionItem[] | null>(null);
  const [faqsDraft,     setFaqsDraft]     = useState<string[] | null>(null);
  // Tier Pricing Usage (Phase E) — same per-module transient-draft pattern as
  // above, but seeded 1:1 with the current Pricing Board (seedTierPricingUsage)
  // since there is no backend seed for usage yet.
  const [pricingUsageDraft, setPricingUsageDraft] = useState<TierPricingUsage | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk,  setSaveOk]  = useState(false);
  // Individual Tier drawer tab state is owned by EntityDrawer (S4) — keyed by
  // editingTierId so opening a tier always lands on Details.
  // Single-open accordion for the Commercial cards' notification panels,
  // keyed by module key (EntityDrawer).
  const [openTierPanel, setOpenTierPanel] = useState<string | null>(null);
  // Single-open accordion for the tier-overview summary cards' notification panels (keyed by tierId).
  const [openSummaryTier, setOpenSummaryTier] = useState<string | null>(null);
  // Package overview view: Details (tier cards + pricing) | Connections (parent service).
  const [overviewTab, setOverviewTab] = useState<'details' | 'connections'>('details');
  // ── Occupant travel chrome (engine D4) ─────────────────────────────────────
  // Overview Details filter: current (4 shells) | bin (displaced occupants).
  const [listView, setListView] = useState<'current' | 'bin'>('current');
  // Footer split-button dropdown + confirm modals (Publish settle; archive with
  // pending drafts), mirroring ServicePromotionStep's lifecycle chrome.
  const [splitOpen,    setSplitOpen]    = useState(false);
  const [confirmModal, setConfirmModal] = useState<'publish' | 'archive-discard' | null>(null);
  // Per-bin-card conflict prompt, keyed by the D3 error codes: target_occupied
  // → offer Swap / retarget; origin_unknown → retarget only; pending_drafts →
  // confirm discard then retry the same restore params.
  const [binPrompt, setBinPrompt] = useState<{
    binId:       string;
    code:        'target_occupied' | 'origin_unknown' | 'pending_drafts';
    mode?:       'swap' | 'retarget';
    targetTier?: string;
  } | null>(null);
  // Bin-card delete confirm (pending only — busy comes from pkg.saving).
  const binDeleteConfirm = useInlineConfirm<string>();

  // ── Package Pricing Board (declaration control centre, Phase D) ────────────
  // Package-level, immediate-write — a local working copy edited then committed
  // in one savePricingBoard call (Cancel discards it), same shape as every other
  // immediate-write package field. Not a draft/settle module: no drafts/module_status.
  const [pricingBoardOpen, setPricingBoardOpen] = useState(false);
  const [boardDraft, setBoardDraft] = useState<PricingBoardItem[] | null>(null);
  const [boardEnabledDraft, setBoardEnabledDraft] = useState(false);
  const [boardSaveErr, setBoardSaveErr] = useState<string | null>(null);

  useEffect(() => {
    if (!saveOk) return;
    const t = setTimeout(() => setSaveOk(false), 2500);
    return () => clearTimeout(t);
  }, [saveOk]);

  // Close split dropdown when clicking outside (only active while open) —
  // mirrors ServicePromotionStep / ServiceViewStep's splitOpen dismissal.
  useEffect(() => {
    if (!splitOpen) return;
    const handle = () => setSplitOpen(false);
    const t = setTimeout(() => document.addEventListener('click', handle), 0);
    return () => { clearTimeout(t); document.removeEventListener('click', handle); };
  }, [splitOpen]);

  const openTierEdit = (tierId: string) => {
    setEditingTierId(tierId);
    setEditingSection(null);
    setOverviewDraft(null);
    setFeaturesDraft(null);
    setFaqsDraft(null);
    setPricingUsageDraft(null);
    setSaveErr(null);
    setSaveOk(false);
    setOpenTierPanel(null);
    setSplitOpen(false);
    setConfirmModal(null);
    setPricingBoardOpen(false);
  };

  // Local working copy seeded from the hook's current pricing_board (already
  // seeded/reconciled against the live pool server-side, per getPackageStation).
  const openPricingBoard = () => {
    setEditingTierId(null);
    setEditingSection(null);
    setBoardDraft(pkg.pricingBoard.items.map((item) => ({ ...item })));
    setBoardEnabledDraft(pkg.pricingBoard.enabled);
    setBoardSaveErr(null);
    setPricingBoardOpen(true);
  };

  const closePricingBoard = () => {
    setPricingBoardOpen(false);
    setBoardDraft(null);
    setBoardSaveErr(null);
  };

  const handleSaveBoard = async () => {
    if (!boardDraft) return;
    const ok = await pkg.savePricingBoard({ enabled: boardEnabledDraft, items: boardDraft });
    if (ok) {
      closePricingBoard();
    } else {
      setBoardSaveErr('Failed to save the pricing board. Please try again.');
    }
  };

  // Section edit lifecycle — seed the section's transient draft from the hook's
  // draft-preferred view; Save persists it via the hook, Cancel discards it.
  const openSection = (section: 'tier-overview' | 'tier-inclusions' | 'tier-faqs' | 'tier-pricing') => {
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
    } else if (section === 'tier-pricing') {
      setPricingUsageDraft({
        pricing_mode: d.pricing?.pricing_mode ?? 'manual',
        usage:        seedTierPricingUsage(pkg.pricingBoard.items, d.pricing?.usage ?? []),
      });
    } else {
      setFaqsDraft([...d.faq_refs]);
    }
    setEditingSection(section);
    setSaveErr(null);
    setSaveOk(false);
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
      } else if (editingSection === 'tier-pricing' && pricingUsageDraft) {
        const r = await pkg.saveTierPricing(editingTierId, pricingUsageDraft);
        ok = !!r?.success;
      }
      if (!ok) { setSaveErr('Save failed.'); return; }
      setSaveOk(true);
      setEditingSection(null);
      setOverviewDraft(null);
      setFeaturesDraft(null);
      setFaqsDraft(null);
      setPricingUsageDraft(null);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed.');
    }
  };
  const cancelSection = () => {
    setEditingSection(null);
    setOverviewDraft(null);
    setFeaturesDraft(null);
    setFaqsDraft(null);
    setPricingUsageDraft(null);
    setSaveErr(null);
    setSaveOk(false);
  };

  // Immediate canonical pool creation (P5 Step 2) lives inside the pool
  // editors (PoolInclusionsEditor / PoolFaqsEditor); they receive
  // pkg.createInclusion / pkg.createFaq through the edit session.

  // Publish → settle the tier (commit drafts to the occupant). No-ops backend-side when
  // there is no occupant and no drafts; the footer disables Publish in that case.
  const handleSettle = async () => {
    if (!editingTierId) return;
    setSaveErr(null);
    const r = await pkg.settleTier(editingTierId);
    if (r?.success) setSaveOk(true); else setSaveErr('Publish failed.');
  };
  // Footer Publish is confirm-gated (Service modal pattern) — the modal commits
  // via the existing settle path.
  const handleConfirmPublish = async () => {
    setConfirmModal(null);
    await handleSettle();
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
  // Discard one module's pending draft (engine D1) — status re-derives from the occupant
  // (or, for pricing, from its own settled usage record — see tierModuleDefaultStatus).
  const handleRevertModule = async (module: 'overview' | 'features' | 'faqs' | 'pricing') => {
    if (!editingTierId) return;
    setSaveErr(null);
    const res = await pkg.revertTierModule(editingTierId, module);
    if (!res?.success) setSaveErr('Failed to discard changes.');
  };

  // ── Occupant travel (engine D4) ─────────────────────────────────────────────

  // Archive the open shell's settled occupant into the bin. Pending drafts come
  // back as code: pending_drafts → confirm-discard modal, then retry with the
  // override (the D2 contract).
  const handleArchive = async (discardDrafts = false) => {
    if (!editingTierId) return;
    setSplitOpen(false);
    setConfirmModal(null);
    setSaveErr(null);
    const res = await pkg.archiveTier(editingTierId, discardDrafts);
    if (res?.success) { setSaveOk(true); return; }
    if (res?.code === 'pending_drafts') setConfirmModal('archive-discard');
    else setSaveErr(res?.message ?? 'Archive failed.');
  };

  // Restore a binned occupant. Conflict codes open the per-card prompt instead
  // of surfacing as errors: target_occupied → Swap / retarget choice,
  // origin_unknown → retarget only, pending_drafts → confirm discard and retry
  // with the SAME mode/target.
  const handleRestoreBin = async (binId: string, mode?: 'swap' | 'retarget', targetTier?: string, discardDrafts = false) => {
    setSaveErr(null);
    const res = await pkg.restoreOccupant(binId, { mode, targetTier, discardDrafts });
    if (res?.success) { setBinPrompt(null); return; }
    const code = res?.code;
    if (code === 'target_occupied' || code === 'origin_unknown' || code === 'pending_drafts') {
      setBinPrompt({ binId, code, mode, targetTier });
    } else {
      setBinPrompt(null);
      setSaveErr(res?.message ?? 'Restore failed.');
    }
  };

  const handleTrashBin = async (binId: string) => {
    setSaveErr(null);
    const res = await pkg.trashBinEntry(binId);
    if (res && !res.success) setSaveErr(res.message ?? 'Move to Trash failed.');
  };

  const handleDeleteBin = async (binId: string) => {
    binDeleteConfirm.cancel();
    setSaveErr(null);
    const res = await pkg.deleteBinEntry(binId);
    if (res && !res.success) setSaveErr(res.message ?? 'Delete failed.');
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
    setSplitOpen(false);
    setConfirmModal(null);
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
  const footerRef = useRef({ handleSettle, handleToggleEnabled, handleArchive, close: ctx.close });
  footerRef.current = { handleSettle, handleToggleEnabled, handleArchive, close: ctx.close };

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
      // Occupant travel actions apply to the SETTLED occupant only — an
      // unoccupied shell (even one with pending drafts) has nothing to toggle
      // or archive.
      const occupied   = slotOccupied(station.tiers[editingTierId]);
      setFooter(
        <div class="cz-tf-footer">
          {/* Occupied shell: split button — Enable/Disable primary + chevron
              menu (Archive occupant), footer parity with Service/Promotion. */}
          {occupied && (
            <div class={`cz-footer-split${enabled ? ' cz-footer-split--danger' : ' cz-footer-split--secondary'}`}>
              <button
                type="button"
                class="cz-footer-split__btn"
                disabled={pkg.saving}
                onClick={() => a.handleToggleEnabled()}
              >
                {pkg.saving ? '…' : enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                type="button"
                class="cz-footer-split__chevron"
                disabled={pkg.saving}
                onClick={(e) => { e.stopPropagation(); setSplitOpen((o) => !o); }}
                aria-label="More actions"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
                </svg>
              </button>
              {splitOpen && (
                <div class="cz-footer-split__menu">
                  <button type="button" class="cz-footer-split__item" disabled={pkg.saving} onClick={() => a.handleArchive()}>
                    Archive
                  </button>
                </div>
              )}
            </div>
          )}
          <div class="cz-tf-footer__spacer" />
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => a.close()} disabled={pkg.saving}>Cancel</button>
          <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={() => setConfirmModal('publish')} disabled={pkg.saving || !hasContent}>
            {pkg.saving ? 'Saving…' : 'Publish'}
          </button>
        </div>,
      );
    }
    return () => setFooter(null);
  }, [pkg.detailLoaded, pkg.station, pkg.service, pkg.tierView, pkg.saving, editingSection, editingTierId, splitOpen, ctx.setFooter]);

  if (!pkg.detailLoaded) return <AsyncLoading label="Loading tiers…" />;

  // Defensive guard against incomplete migration data. The endpoint returns HTTP 200 with
  // { success:false } and no station payload when cz_service_package_station has not been
  // seeded for this service (the hook surfaces that as a null station). Fail with a clear
  // empty state instead of crashing — this is a guard only, never a fallback to legacy data.
  if (!station || !svc) {
    return (
      <div class="cz-req-detail">
        <ReadBlock
          title="Tier configuration unavailable"
          subtitle="This service has no Package Station yet."
          actions={[{ id: 'refresh', label: 'Refresh', onSelect: () => pkg.refetch() }]}
        >
          <div class="drawerModule__empty">
            <p class="drawerModule__empty-title">Package Station not found</p>
            <p class="drawerModule__empty-copy">
              This service’s pricing station has not been initialised, which can happen if
              migration has not completed for it. Refresh to try again; if the problem
              persists, contact an administrator.
            </p>
          </div>
        </ReadBlock>
      </div>
    );
  }

  // ── Package Pricing Board view (Phase D) ──────────────────────────────────
  // A local working copy (boardDraft/boardEnabledDraft), not a draft/settle
  // module — Save commits the whole board in one savePricingBoard call; Cancel
  // discards the local copy. Own inline Save/Cancel (not the shell footer,
  // which stays wired to editingTierId/editingSection only).
  if (pricingBoardOpen && boardDraft) {
    return (
      <div class="cz-req-detail">
        <div class="cz-shell-section cz-shell-section--no-border">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: var(--cz-space-3)">
            <p class="cz-shell-section__title">Pricing Board</p>
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={closePricingBoard}>
              ← Back
            </button>
          </div>

          <div class="cz-tf-field" style="flex-direction: row; align-items: center; gap: var(--cz-space-3); margin-bottom: var(--cz-space-4)">
            <input
              type="checkbox"
              id="pricing-board-enabled"
              checked={boardEnabledDraft}
              onChange={(e) => setBoardEnabledDraft((e.target as HTMLInputElement).checked)}
            />
            <label class="cz-tf-label" for="pricing-board-enabled" style="margin: 0">Pricing board enabled</label>
          </div>

          <PricingBoardEditor
            draft={{ items: boardDraft }}
            pool={svc.inclusions}
            onChange={(next) => setBoardDraft(next.items)}
          />

          {boardSaveErr && <p class="cz-admin-error-msg">{boardSaveErr}</p>}

          <div class="cz-tf-footer" style="margin-top: var(--cz-space-4)">
            <div class="cz-tf-footer__spacer" />
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={closePricingBoard} disabled={pkg.saving}>
              Cancel
            </button>
            <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={handleSaveBoard} disabled={pkg.saving}>
              {pkg.saving ? 'Saving…' : 'Save'}
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
        {/* Drawer Tab Contract — Details = this package's tier modules;
            Connections = the parent service. */}
        <DrawerTabs active={overviewTab} onSelect={setOverviewTab} />

        {overviewTab === 'details' && (
        <>
        {/* Current | Bin filter — only shown once something is binned (engine D4). */}
        {(pkg.occupantBin.length > 0 || listView === 'bin') && (
          <div style="display:flex; gap: var(--cz-space-2); margin-bottom: var(--cz-space-3)">
            <button
              type="button"
              class={`cz-admin-btn cz-admin-btn--sm ${listView === 'current' ? 'cz-admin-btn--primary' : 'cz-admin-btn--secondary'}`}
              onClick={() => { setListView('current'); setBinPrompt(null); binDeleteConfirm.cancel(); }}
            >
              Current ({TIER_KEYS.length})
            </button>
            <button
              type="button"
              class={`cz-admin-btn cz-admin-btn--sm ${listView === 'bin' ? 'cz-admin-btn--primary' : 'cz-admin-btn--secondary'}`}
              onClick={() => setListView('bin')}
            >
              Bin ({pkg.occupantBin.length})
            </button>
          </div>
        )}

        {/* ── Bin view: displaced occupants with Restore / Trash / Delete ──── */}
        {listView === 'bin' && (
          <>
            {pkg.occupantBin.length === 0 && (
              <div class="cz-admin-empty">
                <p>The bin is empty.</p>
              </div>
            )}
            {pkg.occupantBin.map((entry) => {
              const occ        = entry.occupant;
              const originKey  = entry.origin_tier;
              const originName = originKey ? (TIER_LABELS[originKey] ?? originKey) : null;
              const priceText  = occ.contact
                ? 'Contact'
                : occ.price != null ? `$${Number(occ.price).toFixed(2)}` : '—';
              const inclCount  = occ.inclusions_override?.length ?? 0;
              const faqCount   = occ.faq_refs?.length ?? 0;
              const prompt     = binPrompt?.binId === entry.bin_id ? binPrompt : null;
              // Retarget options: shells that look unoccupied (settled fields
              // empty). The backend re-rejects if this misjudges.
              const emptyTiers = TIER_KEYS.filter((k) => !slotOccupied(station.tiers[k]));
              return (
                <div key={entry.bin_id} class="drawerModule drawerOverview tier">
                  <div class="drawerModule__header">
                    <span class="drawerModule__icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="drawerModule__icon-svg" aria-hidden="true" focusable="false">
                        <path d="M12.378 1.602a.75.75 0 00-.756 0L3.366 6.39a.75.75 0 000 1.298l8.256 4.768a.75.75 0 00.756 0l8.256-4.768a.75.75 0 000-1.298L12.378 1.602zM3 9.46v7.788a.75.75 0 00.378.65l8.25 4.764V13.41L3 9.46zm9.75 13.452l8.25-4.764a.75.75 0 00.378-.65V9.46l-8.628 4.984v8.468z" />
                      </svg>
                    </span>
                    <div class="drawerModule__heading">
                      <p class="drawerModule__title">{occ.label?.trim() || (originName ? `${originName} occupant` : 'Occupant')}</p>
                      <p class="drawerModule__subtitle">
                        {originName ? `From ${originName}` : 'Origin unknown'}
                        {entry.displaced_at ? ` · ${entry.displaced_at.slice(0, 10)}` : ''}
                      </p>
                    </div>
                    <div class="drawerModule__status">
                      {binPill(entry.status)}
                    </div>
                  </div>
                  <div class="drawerModule__body">
                    <div class="drawerModule__fields">
                      <div class="drawerModule__field">
                        <p class="drawerModule__label">Pricing</p>
                        <p class="drawerModule__value">
                          <span>{priceText}</span>
                          {occ.billing_cycle ? <>{' · '}<span>{occ.billing_cycle}</span></> : null}
                        </p>
                      </div>
                      <div class="drawerModule__field">
                        <p class="drawerModule__label">Includes</p>
                        <p class="drawerModule__value">
                          {inclCount} {inclCount === 1 ? 'feature' : 'features'} | {faqCount} {faqCount === 1 ? 'common question' : 'common questions'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div class="drawerModule__footer">
                    {prompt ? (
                      prompt.code === 'pending_drafts' ? (
                        <>
                          <span class="cz-sc-table__confirm-label">Target tier has unsettled changes. Discard them?</span>
                          <button
                            type="button"
                            class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm"
                            disabled={pkg.saving}
                            onClick={() => handleRestoreBin(entry.bin_id, prompt.mode, prompt.targetTier, true)}
                          >
                            {pkg.saving ? '…' : 'Discard & Restore'}
                          </button>
                          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={pkg.saving} onClick={() => setBinPrompt(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <span class="cz-sc-table__confirm-label">
                            {prompt.code === 'target_occupied' ? `${originName ?? 'Origin tier'} is occupied.` : 'Choose a tier to restore into.'}
                          </span>
                          {prompt.code === 'target_occupied' && (
                            <button
                              type="button"
                              class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm"
                              disabled={pkg.saving}
                              onClick={() => handleRestoreBin(entry.bin_id, 'swap')}
                            >
                              {pkg.saving ? '…' : 'Swap'}
                            </button>
                          )}
                          <select
                            class="cz-tf-select"
                            style="width:auto"
                            value=""
                            disabled={pkg.saving || emptyTiers.length === 0}
                            onChange={(e) => {
                              const sel = e.target as HTMLSelectElement;
                              if (sel.value) handleRestoreBin(entry.bin_id, 'retarget', sel.value);
                              sel.value = '';
                            }}
                          >
                            <option value="">{emptyTiers.length === 0 ? 'No empty tier' : 'Restore into…'}</option>
                            {emptyTiers.map((k) => (
                              <option key={k} value={k}>{TIER_LABELS[k]}</option>
                            ))}
                          </select>
                          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={pkg.saving} onClick={() => setBinPrompt(null)}>
                            Cancel
                          </button>
                        </>
                      )
                    ) : binDeleteConfirm.pendingId === entry.bin_id ? (
                      <>
                        <span class="cz-sc-table__confirm-label">Delete permanently?</span>
                        <button type="button" class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm" disabled={pkg.saving} onClick={() => handleDeleteBin(entry.bin_id)}>
                          {pkg.saving ? '…' : 'Confirm'}
                        </button>
                        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={pkg.saving} onClick={() => binDeleteConfirm.cancel()}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={pkg.saving} onClick={() => handleRestoreBin(entry.bin_id)}>
                          Restore
                        </button>
                        {entry.status === 'archived' && (
                          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={pkg.saving} onClick={() => handleTrashBin(entry.bin_id)}>
                            Move to Trash
                          </button>
                        )}
                        {entry.status === 'trashed' && (
                          <button type="button" class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm" disabled={pkg.saving} onClick={() => binDeleteConfirm.request(entry.bin_id)}>
                            Delete Permanently
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {saveErr && <p class="cz-admin-error-msg">{saveErr}</p>}
          </>
        )}

        {listView === 'current' && (
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
            <ReadBlock
              key={tierId}
              title={`Package ${detail?.label?.trim() || TIER_LABELS[tierId]}`}
              subtitle="Pricing and inclusions for this tier."
              icon={MODULE_ICONS.package}
              scopeClass="drawerOverview tier"
              status={status}
              notes={tierNotes}
              panelOpen={openSummaryTier === tierId}
              onTogglePanel={() => setOpenSummaryTier(p => p === tierId ? null : tierId)}
              actions={[{ id: 'view', label: 'View', onSelect: () => openTierEdit(tierId) }]}
            >
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
            </ReadBlock>
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
        </>
        )}

        {overviewTab === 'connections' && (
          <ModeProvider mode="connections">
            <OverviewShell
              schema={serviceOverviewShell}
              binding={serviceConnectionBinding(serviceItem, svc, serviceBack)}
            />
            {/* Pricing Board (declaration control centre) — package-owned, but
                presented here rather than Details: it is not a tier module or
                descriptive content, it is an operational control centre this
                package is connected to, same role as the Service context card
                above. The Details|Connections tab contract is platform-wide and
                locked (AdminWorkstationDrawerPrinciples-v1 §Drawer Tab Contract) —
                no third tab is available, so Connections is the correct-by-role
                placement, not a workaround. */}
            {(() => {
              const board       = pkg.pricingBoard;
              const boardState  = evaluateModule(pricingBoardModule, board, { platformStatus: pkgStatus });
              const pricedCount = board.items.filter((i) => i.base_price !== null).length;
              return (
                <ReadBlock
                  title="Pricing Board"
                  subtitle="Base price and quantity rules for this service's inclusions."
                  icon={MODULE_ICONS.package}
                  scopeClass="drawerOverview tier"
                  status={boardState.status}
                  notes={boardState.notes}
                  panelOpen={openSummaryTier === 'pricing-board'}
                  onTogglePanel={() => setOpenSummaryTier((p) => p === 'pricing-board' ? null : 'pricing-board')}
                  actions={[{ id: 'view', label: 'View', onSelect: openPricingBoard }]}
                >
                  <div class="drawerModule__fields">
                    <div class="drawerModule__field">
                      <p class="drawerModule__label">Board</p>
                      <p class="drawerModule__value">
                        {board.enabled ? 'Enabled' : 'Disabled'} · {board.items.length} {board.items.length === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <div class="drawerModule__field">
                      <p class="drawerModule__label">Priced</p>
                      <p class="drawerModule__value">{pricedCount} of {board.items.length} priced</p>
                    </div>
                  </div>
                </ReadBlock>
              );
            })()}
          </ModeProvider>
        )}
      </div>
    );
  }

  // ── Individual Tier drawer ────────────────────────────────────────────────
  const incPool = svc.inclusions;
  const faqPool = svc.faqs;

  // Draft-preferred lifecycle view + shell bindings — Station DNA delivered to
  // the archetype shells (state comes straight from the hook's evaluateModule
  // results). Needed by both the read tabs and the edit frames.
  const view = pkg.tierView(editingTierId);
  if (!view) return null;
  const detail    = view.detail;
  const isPopular = pkg.popularTier === editingTierId;
  // Only the discard action busies out during a station write; Edit stays
  // available, matching the pre-S3a cards.
  const tierBusy = pkg.saving ? 'discard-draft' : null;

  const tierOverviewBinding: ShellBinding<TierOverviewShellData> = {
    data: {
      label:        detail.label,
      tierName:     TIER_LABELS[editingTierId],
      contact:      detail.contact,
      price:        detail.price,
      billingCycle: detail.billing_cycle,
      popular:      isPopular,
      popularLabel: pkg.popularLabel,
    },
    state:    view.modules.overview,
    hasDraft: view.drafts.overview !== null,
    handlers: {
      edit:            () => openSection('tier-overview'),
      'discard-draft': () => handleRevertModule('overview'),
    },
    busy: tierBusy,
  };

  const tierFeaturesBinding: ShellBinding<TierFeaturesShellData> = {
    data:     { items: detail.inclusions_override },
    state:    view.modules.features,
    hasDraft: view.drafts.features !== null,
    handlers: {
      edit:            () => openSection('tier-inclusions'),
      'discard-draft': () => handleRevertModule('features'),
    },
    busy: tierBusy,
  };

  const tierFaqsBinding: ShellBinding<TierFaqsShellData> = {
    data:     { refs: detail.faq_refs, pool: faqPool },
    state:    view.modules.faqs,
    hasDraft: view.drafts.faqs !== null,
    handlers: {
      edit:            () => openSection('tier-faqs'),
      'discard-draft': () => handleRevertModule('faqs'),
    },
    busy: tierBusy,
  };

  const tierPricingBinding: ShellBinding<TierPricingShellData> = {
    data: {
      pricingMode: detail.pricing?.pricing_mode ?? 'manual',
      usage:       detail.pricing?.usage ?? [],
      boardItems:  pkg.pricingBoard.items,
      preview:     detail.pricing_preview,
    },
    state:    view.modules.pricing,
    hasDraft: view.drafts.pricing !== null,
    handlers: {
      edit:            () => openSection('tier-pricing'),
      'discard-draft': () => handleRevertModule('pricing'),
    },
    busy: tierBusy,
  };

  // Edit mode — the section's shell in the `edit` viewpoint (InlineEditorShell +
  // the binding's module editor). Save persists via the hook (saveTierX /
  // setPopularTier); Cancel discards the transient draft.
  if (editingSection === 'tier-overview' && overviewDraft) {
    return (
      <ModeProvider mode="edit">
        <OverviewShell
          schema={tierOverviewShell}
          binding={tierOverviewBinding}
          editSession={{
            draft:    overviewDraft,
            patch:    (p) => setOverviewDraft(d => d ? { ...d, ...(p as Partial<TierOverviewEditDraft>) } : d),
            replace:  (next) => setOverviewDraft(next as TierOverviewEditDraft),
            onSave:   saveSection,
            onCancel: cancelSection,
            saving:   pkg.saving,
            saveErr,
            isDirty:  false,
          }}
        />
      </ModeProvider>
    );
  }

  if (editingSection === 'tier-inclusions' && featuresDraft) {
    return (
      <ModeProvider mode="edit">
        <ChildShell
          schema={tierFeaturesShell}
          binding={tierFeaturesBinding}
          editSession={{
            draft:    featuresDraft,
            replace:  (next) => setFeaturesDraft(next as InclusionItem[]),
            onSave:   saveSection,
            onCancel: cancelSection,
            saving:   pkg.saving,
            saveErr,
            isDirty:  false,
            extras:   { pool: incPool, onCreate: (label: string) => pkg.createInclusion(label) },
          }}
        />
      </ModeProvider>
    );
  }

  if (editingSection === 'tier-faqs' && faqsDraft) {
    return (
      <ModeProvider mode="edit">
        <ChildShell
          schema={tierFaqsShell}
          binding={tierFaqsBinding}
          editSession={{
            draft:    faqsDraft,
            replace:  (next) => setFaqsDraft(next as string[]),
            onSave:   saveSection,
            onCancel: cancelSection,
            saving:   pkg.saving,
            saveErr,
            isDirty:  false,
            extras:   { pool: faqPool, onCreate: (question: string, answer: string) => pkg.createFaq(question, answer) },
          }}
        />
      </ModeProvider>
    );
  }

  if (editingSection === 'tier-pricing' && pricingUsageDraft) {
    return (
      <ModeProvider mode="edit">
        <OverviewShell
          schema={tierPricingShell}
          binding={tierPricingBinding}
          editSession={{
            draft:    pricingUsageDraft,
            replace:  (next) => setPricingUsageDraft(next as TierPricingUsage),
            onSave:   saveSection,
            onCancel: cancelSection,
            saving:   pkg.saving,
            saveErr,
            isDirty:  false,
            extras:   { boardItems: pkg.pricingBoard.items, pool: incPool },
          }}
        />
      </ModeProvider>
    );
  }

  // View mode — the Individual Tier drawer body, assembled from the tier
  // manifest's drawer placements (Schema architecture S4): Details = the
  // tier's own modules; Connections = the parent service. Back-to-overview is
  // handled by the single drawer header Back (context-aware), not a second
  // control. Keyed by tier so opening a tier always lands on Details.
  return (
    <EntityDrawer
      key={editingTierId}
      entity={TIER_ENTITY}
      bindings={{
        overview: tierOverviewBinding,
        features: tierFeaturesBinding,
        faqs:     tierFaqsBinding,
        pricing:  tierPricingBinding,
        service:  serviceConnectionBinding(serviceItem, svc, serviceBack),
      }}
      openPanel={openTierPanel}
      onTogglePanel={(m) => setOpenTierPanel((p) => (p === m ? null : m))}
      trailing={{
        details: (saveErr || saveOk) && (
          <div class="cz-shell-section cz-shell-section--no-border">
            {saveErr && <p class="cz-admin-error-msg">{saveErr}</p>}
            {saveOk  && <p class="cz-admin-ok-msg">Saved.</p>}
          </div>
        ),
      }}
    >
      {/* ── Publish / Settle confirmation modal (Service drawer pattern) ────── */}
      {confirmModal === 'publish' && (
        <div
          class="cz-publish-confirm-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmModal(null); }}
        >
          <div class="cz-publish-confirm">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">
                Publish changes to {detail.label.trim() || TIER_LABELS[editingTierId]}?
              </h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">
                This commits the pending changes as the settled state for each module.
                The tier's live state is not changed by publishing.
              </p>
              <ul class="cz-publish-confirm__summary">
                <li><strong>Tier Overview:</strong> {view.drafts.overview ? 'Pending changes' : (detail.price !== null || detail.contact) && detail.billing_cycle ? 'Ready' : 'Not configured'}</li>
                <li><strong>Included Features:</strong> {view.drafts.features ? 'Pending changes' : `${detail.inclusions_override.length} added`}</li>
                <li><strong>Common Questions:</strong> {view.drafts.faqs ? 'Pending changes' : `${detail.faq_refs.length} added`}</li>
                <li><strong>Pricing Usage:</strong> {view.drafts.pricing ? 'Pending changes' : `${(detail.pricing?.usage ?? []).filter((u) => u.enabled).length} enabled`}</li>
              </ul>
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => setConfirmModal(null)} disabled={pkg.saving}>
                Cancel
              </button>
              <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={handleConfirmPublish} disabled={pkg.saving}>
                {pkg.saving ? '…' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Archive with pending drafts confirmation (engine D2 contract) ───── */}
      {confirmModal === 'archive-discard' && (
        <div
          class="cz-publish-confirm-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmModal(null); }}
        >
          <div class="cz-publish-confirm">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">
                Archive {detail.label.trim() || TIER_LABELS[editingTierId]}'s occupant?
              </h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">
                This tier has unsettled changes. Archiving moves the settled occupant
                to the bin and discards the pending changes — they cannot be recovered.
              </p>
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => setConfirmModal(null)} disabled={pkg.saving}>
                Cancel
              </button>
              <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={() => handleArchive(true)} disabled={pkg.saving}>
                {pkg.saving ? '…' : 'Discard & Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </EntityDrawer>
  );
}
