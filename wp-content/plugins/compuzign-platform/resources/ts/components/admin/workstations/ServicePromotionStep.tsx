import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { AsyncLoading } from '@/components/admin/ui/AsyncSection';
import type { StepContext } from '../ActionShell';
import type { ServiceItem } from '@/api/types/cost-builder';
import type {
  PromotionTier,
  PromotionTierPayload,
  PromotionOverviewDraft,
  PromotionModuleKey,
  PromotionStatus,
  InclusionItem,
} from '@/api/types/admin';
import { usePromotionStation } from '@/hooks/usePromotionStation';
import type { PromotionView } from '@/hooks/usePromotionStation';
import { InlineEditorShell } from '../InlineEditorShell';
import { DrawerTabs } from '../DrawerTabs';
import { EntityDrawer } from '../EntityDrawer';
import { PROMOTION_ENTITY } from '@/components/admin/schema/entities/promotion';
import { PRESENTATION_PILL, TRAVEL_PILL } from '@/components/admin/schema/presentation';
import type { PillMeta } from '@/components/admin/schema/presentation';
import { MODULE_ICONS } from '@/components/admin/schema/icons';
import { useInlineConfirm } from '@/hooks/useInlineConfirm';
import { ModeProvider } from '@/components/admin/schema/modeContext';
import { OverviewShell } from '@/components/admin/schema/shells/overviewShell';
import { ChildShell } from '@/components/admin/schema/shells/childShell';
import { serviceOverviewShell } from '@/components/admin/schema/shells/bindings/service';
import {
  promotionOverviewShell,
  promotionFeaturesShell,
  promotionFaqsShell,
} from '@/components/admin/schema/shells/bindings/promotion';
import type {
  PromotionOverviewShellData,
  PromotionFeaturesShellData,
  PromotionFaqsShellData,
} from '@/components/admin/schema/shells/bindings/promotion';
import type { ShellBinding } from '@/components/admin/schema/types';
import { PromotionOverviewEditor } from '../editors/PromotionOverviewEditor';
import { serviceConnectionBinding, TIER_LABELS } from './serviceDrawerShared';

// ── ServicePromotionStep ──────────────────────────────────────────────────────
// Service Station-owned promotion management (cz_service_promotion_station),
// cut over to the station lifecycle (engine C5): module edits persist as drafts
// (per-module save), the footer Publish settles/activates, and travel state
// moves exclusively through the engine transitions (publish / enable-disable /
// archive / trash / restore / permanent delete). The whole-record save path and
// the legacy Archive/Reactivate pair are retired from this UI.
//
// Drawer shape mirrors ServiceTierStep: list (all promotions) <-> individual
// promotion detail (Details/Connections tabs), full-screen swap, Back to return.
// Promotion Overview, Included Features, and Common Questions are real drawer
// modules (ReadBlock + own InlineEditorShell) with ModuleStatusPill + notes fed
// by promotionView's evaluateModule results.

// Module icons come from the shared registry (schema/icons.tsx, S1b) — the same
// glyphs the Service and Tier module cards use. Tier labels (for "Based on
// tier") come from serviceDrawerShared's TIER_LABELS.

// The Promotion Overview module's editor draft is exactly the C2 module draft
// payload — travel status is engine-owned and deliberately not part of it.
type OverviewDraft = PromotionOverviewDraft;

// Editors open on the draft-preferred detail (promotionView), so an unsettled
// draft is picked up where it was left.
function overviewFromDetail(p: PromotionTier): OverviewDraft {
  return {
    name: p.name, slug: p.slug,
    based_on: p.based_on, headline: p.headline, description: p.description,
    price: p.price, billing_label: p.billing_label, badge: p.badge,
    campaign_label: p.campaign_label, priority: p.priority, is_featured: p.is_featured,
  };
}

function emptyOverviewDraft(): OverviewDraft {
  return {
    name: '', slug: '', based_on: null,
    headline: '', description: '', price: null, billing_label: '',
    badge: '', campaign_label: '', priority: 0, is_featured: false,
  };
}

function isOverviewDirty(a: OverviewDraft, b: OverviewDraft): boolean {
  return (
    a.name !== b.name || a.slug !== b.slug || a.based_on !== b.based_on ||
    a.headline !== b.headline || a.description !== b.description || a.price !== b.price ||
    a.billing_label !== b.billing_label || a.badge !== b.badge || a.campaign_label !== b.campaign_label ||
    a.priority !== b.priority || a.is_featured !== b.is_featured
  );
}

// Pure — shallow id-order compare, mirroring isFeaturesDirty's role wherever a
// module's draft is just an ordered set of pool refs (Tier's tier-inclusions section).
function isFeaturesDirty(a: InclusionItem[], b: InclusionItem[]): boolean {
  return a.length !== b.length || a.some((item, i) => item.id !== b[i]?.id);
}

// Pure — shallow ref-order compare, mirroring Tier's tier-faqs section (faqsDraft is a
// plain string[] of pool ids, not objects, so this is even simpler than isFeaturesDirty).
function isFaqsDirty(a: string[], b: string[]): boolean {
  return a.length !== b.length || a.some((ref, i) => ref !== b[i]);
}

// Create payload — the one remaining whole-record write: creating the instance.
// The backend ignores client status (C2); new instances always start as draft.
function createPayload(overview: OverviewDraft): PromotionTierPayload {
  return {
    ...overview,
    status: 'draft',
    features: [], inclusions: [], exclusions: [], faq_refs: [],
    starts_at: null, ends_at: null, metadata: {},
  };
}

// Status pill (list rows). Current rows render presentation states only —
// draft presents as Pending; raw travel states stay internal (Principles →
// Operational States vs Presentation States). Bin rows name Archived/Trashed
// as data labels (TRAVEL_PILL, travel surfaces only), matching
// ServiceTierStep's bin cards. Metadata delegates to the Presentation Status
// Contract chokepoint (schema/presentation.ts, S1a).
const STATUS_PILL: Record<PromotionStatus, PillMeta> = {
  draft:    PRESENTATION_PILL.pending,
  active:   PRESENTATION_PILL.active,
  disabled: PRESENTATION_PILL.disabled,
  archived: TRAVEL_PILL.archived,
  trashed:  TRAVEL_PILL.trashed,
};

function statusPill(status: PromotionStatus) {
  const pill = STATUS_PILL[status] ?? STATUS_PILL.draft;
  return (
    <span class={`cz-module-status-pill ${pill.cls}`}>
      <span class="cz-module-status-pill__marker">●</span>
      {pill.label}
    </span>
  );
}

const LIVE_STATUSES: PromotionStatus[] = ['draft', 'active', 'disabled'];
const BIN_STATUSES:  PromotionStatus[] = ['archived', 'trashed'];

export function ServicePromotionStep({ ctx }: { ctx: StepContext }) {
  const serviceId = ctx.stepData.serviceId as number;
  const onRefresh = ctx.stepData.onRefresh as (() => void) | undefined;
  // Full parent service (richer than the station's service stub) — read-only context for
  // the Connections tab, and the Back-to-Service navigation, mirroring ServiceTierStep.
  const serviceItem = ctx.stepData.service as ServiceItem | undefined;
  const serviceBack = ctx.stepData.serviceBack as (() => void) | undefined;

  const promo = usePromotionStation(serviceId, onRefresh);

  // Individual promotion detail view: editingPromoId set + editingSection null => the
  // Details/Connections tab shell (Promotion Overview + Included Features + Common
  // Questions modules). A named editingSection => that section's InlineEditorShell.
  // null editingPromoId => list.
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<'promo-overview' | 'promo-features' | 'promo-faqs' | null>(null);
  // Detail-view tab state is owned by EntityDrawer (S4) — keyed by
  // editingPromoId so opening a promotion always lands on Details.
  // Promotion list view: Details (promotion cards) | Connections (parent service),
  // matching ServiceTierStep's overviewTab at the package-overview level.
  const [listTab,        setListTab]        = useState<'details' | 'connections'>('details');
  // List filter: current (draft/active/disabled) | bin (archived/trashed).
  const [listView,       setListView]       = useState<'current' | 'bin'>('current');

  const [overviewDraft,    setOverviewDraft]    = useState<OverviewDraft | null>(null);
  const [overviewOriginal, setOverviewOriginal] = useState<OverviewDraft | null>(null);
  const [featuresDraft,    setFeaturesDraft]    = useState<InclusionItem[] | null>(null);
  const [featuresOriginal, setFeaturesOriginal] = useState<InclusionItem[] | null>(null);
  const [faqsDraft,        setFaqsDraft]        = useState<string[] | null>(null);
  const [faqsOriginal,     setFaqsOriginal]     = useState<string[] | null>(null);
  const [isNew,          setIsNew]          = useState(false);
  const [saveErr,        setSaveErr]        = useState<string | null>(null);
  const [saveOk,         setSaveOk]         = useState(false);
  // Lifecycle chrome: split-button dropdown, publish/delete confirm modals, the
  // open module-notification panel, and the bin card pending-delete confirm.
  const [splitOpen,       setSplitOpen]       = useState(false);
  const [confirmModal,    setConfirmModal]    = useState<'publish' | 'delete' | null>(null);
  // Single-open notification-panel accordion, keyed by module key (EntityDrawer).
  const [openPromoPanel,  setOpenPromoPanel]  = useState<string | null>(null);
  // Bin-row delete confirm (pending only — busy comes from promo.saving).
  const deleteConfirm = useInlineConfirm<string>();
  // Immediate canonical pool creation lives inside the pool editors
  // (PoolInclusionsEditor / PoolFaqsEditor); they receive
  // promo.createInclusion / promo.createFaq through the edit session.

  useEffect(() => {
    if (!saveOk) return;
    const t = setTimeout(() => setSaveOk(false), 2500);
    return () => clearTimeout(t);
  }, [saveOk]);

  // Close split dropdown when clicking outside (only active while open) —
  // mirrors ServiceViewStep's splitOpen dismissal.
  useEffect(() => {
    if (!splitOpen) return;
    const handle = () => setSplitOpen(false);
    const t = setTimeout(() => document.addEventListener('click', handle), 0);
    return () => { clearTimeout(t); document.removeEventListener('click', handle); };
  }, [splitOpen]);

  // Draft-preferred lifecycle view of the open promotion (null on the list).
  const view: PromotionView | null = editingPromoId ? promo.promotionView(editingPromoId) : null;

  // New Promotion opens directly into the Promotion Overview editor. On save, the user
  // lands in the new promotion's detail view with Included Features ready to fill in.
  const openCreate = () => {
    const d = emptyOverviewDraft();
    setIsNew(true);
    setEditingPromoId(null);
    setOverviewDraft(d); setOverviewOriginal(d);
    setEditingSection('promo-overview');
    setSaveErr(null); setSaveOk(false);
  };

  // List "View" — opens the full-screen promotion detail (Details/Connections tabs).
  const openViewDetail = (p: PromotionTier) => {
    setEditingPromoId(p.id);
    setEditingSection(null);
    setOpenPromoPanel(null);
    setSaveErr(null); setSaveOk(false);
  };

  // Module editors open on the draft-preferred detail so a pending draft is
  // resumed, not the settled state.
  const openOverviewSection = () => {
    if (!view) return;
    const d = overviewFromDetail(view.detail);
    setOverviewDraft(d); setOverviewOriginal(d);
    setEditingSection('promo-overview');
    setSaveErr(null); setSaveOk(false);
  };

  const openFeaturesSection = () => {
    if (!view) return;
    const d = [...view.detail.inclusions];
    setFeaturesDraft(d); setFeaturesOriginal(d);
    setEditingSection('promo-features');
    setSaveErr(null); setSaveOk(false);
  };

  const openFaqsSection = () => {
    if (!view) return;
    const d = [...view.detail.faq_refs];
    setFaqsDraft(d); setFaqsOriginal(d);
    setEditingSection('promo-faqs');
    setSaveErr(null); setSaveOk(false);
  };

  // Cancel the Promotion Overview editor — creating a new promotion returns to the list;
  // editing an existing one's overview returns to its detail view.
  const handleCancelOverview = () => {
    setOverviewDraft(null); setOverviewOriginal(null); setSaveErr(null); setSaveOk(false);
    if (isNew) {
      setIsNew(false);
    } else {
      setEditingSection(null);
    }
  };

  const handleCancelFeatures = () => {
    setFeaturesDraft(null); setFeaturesOriginal(null); setSaveErr(null); setSaveOk(false);
    setEditingSection(null);
  };

  const handleCancelFaqs = () => {
    setFaqsDraft(null); setFaqsOriginal(null); setSaveErr(null); setSaveOk(false);
    setEditingSection(null);
  };

  // Returns from the promotion detail view to the list.
  const handleBackToList = () => {
    setEditingPromoId(null);
    setEditingSection(null);
    setOpenPromoPanel(null);
    setSplitOpen(false);
    setConfirmModal(null);
    setSaveErr(null); setSaveOk(false);
  };

  // Context-aware header Back: while a promotion's detail view is open, the drawer's
  // single header Back returns to the promotion list; at the list it falls through to
  // the Service drawer (handled by handleOpenPromoConfig's onBack delegate). Mirrors
  // ServiceTierStep's tierBack wiring exactly.
  const promoBack = ctx.stepData.promoBack as { current: (() => void) | null } | undefined;
  const handleBackToListRef = useRef(handleBackToList);
  handleBackToListRef.current = handleBackToList;
  useEffect(() => {
    if (!promoBack) return;
    promoBack.current = editingPromoId ? () => handleBackToListRef.current() : null;
    return () => { promoBack.current = null; };
  }, [editingPromoId, promoBack]);

  // Promotion Overview Save — creating still uses the whole-record create (the
  // instance must exist first; it starts as draft). Editing persists a module
  // DRAFT via the station lifecycle; footer Publish settles it.
  const handleSaveOverview = useCallback(async () => {
    if (!overviewDraft) return;
    setSaveErr(null);
    try {
      if (isNew) {
        const res = await promo.createPromotion(createPayload(overviewDraft));
        if (res?.success) {
          setSaveOk(true);
          setIsNew(false);
          setEditingPromoId(res.promo_id);
          setEditingSection(null);
          setOverviewDraft(null); setOverviewOriginal(null);
        } else {
          setSaveErr('Save failed.');
        }
        return;
      }
      if (!editingPromoId) return;
      const res = await promo.savePromotionOverview(editingPromoId, overviewDraft);
      if (res?.success) {
        setSaveOk(true);
        setEditingSection(null);
        setOverviewDraft(null); setOverviewOriginal(null);
      } else {
        setSaveErr('Save failed.');
      }
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed.');
    }
  }, [overviewDraft, isNew, editingPromoId, promo]);

  // Included Features Save — persists the module draft (pool refs only).
  const handleSaveFeatures = useCallback(async () => {
    if (!featuresDraft || !editingPromoId) return;
    setSaveErr(null);
    try {
      const res = await promo.savePromotionFeatures(editingPromoId, featuresDraft);
      if (res?.success) {
        setSaveOk(true);
        setEditingSection(null);
        setFeaturesDraft(null); setFeaturesOriginal(null);
      } else {
        setSaveErr('Save failed.');
      }
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed.');
    }
  }, [featuresDraft, editingPromoId, promo]);

  // Common Questions Save — persists the module draft (pool refs only).
  const handleSaveFaqs = useCallback(async () => {
    if (!faqsDraft || !editingPromoId) return;
    setSaveErr(null);
    try {
      const res = await promo.savePromotionFaqs(editingPromoId, faqsDraft);
      if (res?.success) {
        setSaveOk(true);
        setEditingSection(null);
        setFaqsDraft(null); setFaqsOriginal(null);
      } else {
        setSaveErr('Save failed.');
      }
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed.');
    }
  }, [faqsDraft, editingPromoId, promo]);

  // Discard a module's pending draft — module_status re-derives from settled content.
  const handleRevert = useCallback(async (module: PromotionModuleKey) => {
    if (!editingPromoId) return;
    setSaveErr(null);
    const res = await promo.revertPromotionModule(editingPromoId, module);
    if (!res?.success) setSaveErr('Failed to discard changes.');
  }, [editingPromoId, promo]);

  // ── Engine travel transitions ───────────────────────────────────────────────

  const handleToggle = async (id: string) => {
    setSplitOpen(false);
    const res = await promo.togglePromotion(id);
    if (res && !res.success) setSaveErr(res.message ?? 'Update failed.');
  };
  const handleArchive = async (id: string) => {
    setSplitOpen(false);
    const res = await promo.archivePromotion(id);
    if (!res) setSaveErr('Archive failed.');
  };
  const handleTrash = async (id: string) => {
    setSplitOpen(false);
    const res = await promo.trashPromotion(id);
    if (res && !res.success) setSaveErr(res.message ?? 'Move to Trash failed.');
  };
  const handleRestore = async (id: string) => {
    const res = await promo.restorePromotion(id);
    if (res && !res.success) setSaveErr(res.message ?? 'Restore failed.');
  };
  const handleDelete = async (id: string) => {
    setConfirmModal(null);
    deleteConfirm.cancel();
    const ok = await promo.deletePromotion(id);
    if (!ok) setSaveErr('Delete failed.');
    else if (editingPromoId === id) handleBackToList();
  };

  // Publish/Settle confirm — active instances settle pending drafts; draft and
  // disabled instances publish (settle + activate), matching the Service pattern.
  const handleConfirmPublish = async () => {
    if (!editingPromoId || !view) return;
    setConfirmModal(null);
    const res = view.status === 'active'
      ? await promo.settlePromotion(editingPromoId)
      : await promo.publishPromotion(editingPromoId);
    if (res?.success) setSaveOk(true);
    else setSaveErr((res as { message?: string } | null)?.message ?? 'Publish failed.');
  };

  // Pin the drawer footer in the shell's footer slot (matching ServiceTierStep).
  // Edit mode leaves the slot empty — InlineEditorShell carries its own Save/Cancel
  // footer. The open promotion's lifecycle actions live here, per travel state.
  const footerRef = useRef({ openCreate, handleToggle, handleArchive, handleTrash, handleRestore, close: ctx.close });
  footerRef.current = { openCreate, handleToggle, handleArchive, handleTrash, handleRestore, close: ctx.close };

  useEffect(() => {
    const { setFooter } = ctx;
    const a = footerRef.current;
    const closeFooter = (
      <div class="cz-tf-footer">
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => a.close()}>Close</button>
      </div>
    );
    if (!promo.detailLoaded || !promo.detail) {
      setFooter(closeFooter);
    } else if (editingSection != null) {
      setFooter(null);
    } else if (!editingPromoId) {
      setFooter(
        <div class="cz-tf-footer">
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => a.close()}>Close</button>
          <div class="cz-tf-footer__spacer" />
          <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={() => a.openCreate()}>New</button>
        </div>,
      );
    } else {
      const current = promo.detail.promotions.find(p => p.id === editingPromoId);
      const v       = current ? promo.promotionView(current.id) : null;
      if (!current || !v) {
        setFooter(closeFooter);
      } else {
        const status  = current.status;
        const isLive  = status === 'active' || status === 'disabled';
        const hasPendingDrafts =
          v.drafts.overview !== null || v.drafts.features !== null || v.drafts.faqs !== null;
        // Draft/disabled publish gates on the overview being viable (named);
        // an active instance's Publish settles and gates on pending drafts.
        const canPublish = status === 'active'
          ? hasPendingDrafts
          : (status === 'draft' || status === 'disabled') && !!v.detail.name.trim();

        setFooter(
          <div class="cz-tf-footer">
            {/* Live states: split button — Enable/Disable primary + chevron menu
                (Archive / Move to Trash), mirroring the Service drawer. */}
            {isLive && (
              <div class={`cz-footer-split${status === 'active' ? ' cz-footer-split--danger' : ' cz-footer-split--secondary'}`}>
                <button
                  type="button"
                  class="cz-footer-split__btn"
                  disabled={promo.saving}
                  onClick={() => a.handleToggle(current.id)}
                >
                  {promo.saving ? '…' : status === 'active' ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  class="cz-footer-split__chevron"
                  disabled={promo.saving}
                  onClick={(e) => { e.stopPropagation(); setSplitOpen((o) => !o); }}
                  aria-label="More actions"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
                  </svg>
                </button>
                {splitOpen && (
                  <div class="cz-footer-split__menu">
                    <button type="button" class="cz-footer-split__item" disabled={promo.saving} onClick={() => a.handleArchive(current.id)}>
                      Archive
                    </button>
                    <button type="button" class="cz-footer-split__item" disabled={promo.saving} onClick={() => a.handleTrash(current.id)}>
                      Move to Trash
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Draft: authoring instances are removable without publishing
                (engine: draft → trashed legal; draft → archived is not). */}
            {status === 'draft' && (
              <button type="button" class="cz-admin-btn cz-admin-btn--danger" disabled={promo.saving} onClick={() => a.handleTrash(current.id)}>
                {promo.saving ? '…' : 'Move to Trash'}
              </button>
            )}
            {/* Bin states: Restore on the left. */}
            {(status === 'archived' || status === 'trashed') && (
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" disabled={promo.saving} onClick={() => a.handleRestore(current.id)}>
                {promo.saving ? '…' : 'Restore'}
              </button>
            )}
            <div class="cz-tf-footer__spacer" />
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => a.close()}>Close</button>
            {(isLive || status === 'draft') && <div class="cz-tf-footer__spacer" />}
            {(isLive || status === 'draft') && (
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--primary"
                onClick={() => setConfirmModal('publish')}
                disabled={!canPublish || promo.saving}
              >
                {promo.saving ? '…' : 'Publish'}
              </button>
            )}
            {status === 'archived' && <div class="cz-tf-footer__spacer" />}
            {status === 'archived' && (
              <button type="button" class="cz-admin-btn cz-admin-btn--danger" disabled={promo.saving} onClick={() => a.handleTrash(current.id)}>
                Move to Trash
              </button>
            )}
            {status === 'trashed' && <div class="cz-tf-footer__spacer" />}
            {status === 'trashed' && (
              <button type="button" class="cz-admin-btn cz-admin-btn--danger" disabled={promo.saving} onClick={() => setConfirmModal('delete')}>
                Delete Permanently
              </button>
            )}
          </div>,
        );
      }
    }
    return () => setFooter(null);
  }, [promo.detailLoaded, promo.detail, promo.saving, editingSection, editingPromoId, splitOpen, ctx.setFooter]);

  if (!promo.detailLoaded) return <AsyncLoading label="Loading promotions…" />;
  if (!promo.detail)       return <div class="cz-admin-error-msg">Promotion Station not found.</div>;

  const { promotions, service: svc } = promo.detail;

  // ── Promotion list view ───────────────────────────────────────────────────
  if (!isNew && !editingPromoId) {
    const currentList = promotions.filter(p => LIVE_STATUSES.includes(p.status));
    const binList     = promotions.filter(p => BIN_STATUSES.includes(p.status));
    const shown       = listView === 'bin' ? binList : currentList;

    return (
      <div class="cz-req-detail">
        {/* Drawer Tab Contract — Details = promotion cards; Connections = the
            parent service (matching ServiceTierStep's package-overview level). */}
        <DrawerTabs active={listTab} onSelect={setListTab} />

        {listTab === 'details' && (
          <>
            {/* Current | Bin filter — only shown once something is binned. */}
            {(binList.length > 0 || listView === 'bin') && (
              <div style="display:flex; gap: var(--cz-space-2); margin-bottom: var(--cz-space-3)">
                <button
                  type="button"
                  class={`cz-admin-btn cz-admin-btn--sm ${listView === 'current' ? 'cz-admin-btn--primary' : 'cz-admin-btn--secondary'}`}
                  onClick={() => { setListView('current'); deleteConfirm.cancel(); }}
                >
                  Current ({currentList.length})
                </button>
                <button
                  type="button"
                  class={`cz-admin-btn cz-admin-btn--sm ${listView === 'bin' ? 'cz-admin-btn--primary' : 'cz-admin-btn--secondary'}`}
                  onClick={() => setListView('bin')}
                >
                  Bin ({binList.length})
                </button>
              </div>
            )}

            {shown.length === 0 && (
              <div class="cz-admin-empty">
                <p>{listView === 'bin' ? 'The bin is empty.' : 'No promotions yet.'}</p>
              </div>
            )}

            {shown.map((p) => (
              <div key={p.id} class="drawerModule drawerOverview promotion">
                <div class="drawerModule__header">
                  <span class="drawerModule__icon">{MODULE_ICONS.overview}</span>
                  <div class="drawerModule__heading">
                    <p class="drawerModule__title">{p.name || '(unnamed)'}</p>
                    <p class="drawerModule__subtitle">
                      {p.based_on ? `Based on ${p.based_on}` : 'No base tier'}
                    </p>
                  </div>
                  <div class="drawerModule__status">
                    {statusPill(p.status)}
                  </div>
                </div>
                <div class="drawerModule__body">
                  <div class="drawerModule__fields">
                    <div class="drawerModule__field">
                      <p class="drawerModule__label">Name</p>
                      <p class="drawerModule__value">{p.name || '(unnamed)'}</p>
                    </div>
                    <div class="drawerModule__field">
                      <p class="drawerModule__label">Headline</p>
                      <p class="drawerModule__value">{p.headline || '—'}</p>
                    </div>
                    <div class="drawerModule__field">
                      <p class="drawerModule__label">Price</p>
                      <p class="drawerModule__value">{p.price !== null ? `$${p.price}` : '—'}</p>
                    </div>
                    <div class="drawerModule__field">
                      <p class="drawerModule__label">Description</p>
                      <p class="drawerModule__value">{p.description || '—'}</p>
                    </div>
                  </div>
                </div>
                <div class="drawerModule__footer">
                  {listView === 'current' ? (
                    <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => openViewDetail(p)}>View</button>
                  ) : deleteConfirm.pendingId === p.id ? (
                    <>
                      <span class="cz-sc-table__confirm-label">Delete permanently?</span>
                      <button type="button" class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm" disabled={promo.saving} onClick={() => handleDelete(p.id)}>
                        {promo.saving ? '…' : 'Confirm'}
                      </button>
                      <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={promo.saving} onClick={() => deleteConfirm.cancel()}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={promo.saving} onClick={() => handleRestore(p.id)}>
                        Restore
                      </button>
                      {p.status === 'archived' && (
                        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={promo.saving} onClick={() => handleTrash(p.id)}>
                          Move to Trash
                        </button>
                      )}
                      {p.status === 'trashed' && (
                        <button type="button" class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm" disabled={promo.saving} onClick={() => deleteConfirm.request(p.id)}>
                          Delete Permanently
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {saveErr && <p class="cz-admin-error-msg">{saveErr}</p>}
          </>
        )}

        {listTab === 'connections' && (
          <ModeProvider mode="connections">
            <OverviewShell
              schema={serviceOverviewShell}
              binding={serviceConnectionBinding(serviceItem, svc, serviceBack)}
            />
          </ModeProvider>
        )}
      </div>
    );
  }

  const incPool = svc.inclusions;
  const faqPool = svc.faqs;

  // ── Shell bindings — Station DNA delivered to the archetype shells (state
  // comes straight from promotionView's evaluateModule results). Null during
  // the New Promotion create flow, which has no instance yet. ────────────────
  const promoBusy = promo.saving ? 'discard-draft' : null;
  const shellBindings = view ? (() => {
    const d = view.detail;
    const overview: ShellBinding<PromotionOverviewShellData> = {
      data: {
        name:          d.name,
        basedOnLabel:  d.based_on ? (TIER_LABELS[d.based_on] ?? d.based_on) : 'None',
        price:         d.price,
        billingLabel:  d.billing_label,
        badge:         d.badge,
        campaignLabel: d.campaign_label,
        featured:      d.is_featured,
        priority:      d.priority,
        headline:      d.headline,
        description:   d.description,
      },
      state:    view.modules.overview,
      hasDraft: view.drafts.overview !== null,
      handlers: { edit: openOverviewSection, 'discard-draft': () => handleRevert('overview') },
      busy:     promoBusy,
    };
    const features: ShellBinding<PromotionFeaturesShellData> = {
      data:     { items: d.inclusions },
      state:    view.modules.features,
      hasDraft: view.drafts.features !== null,
      handlers: { edit: openFeaturesSection, 'discard-draft': () => handleRevert('features') },
      busy:     promoBusy,
    };
    const faqs: ShellBinding<PromotionFaqsShellData> = {
      data:     { refs: d.faq_refs, pool: faqPool },
      state:    view.modules.faqs,
      hasDraft: view.drafts.faqs !== null,
      handlers: { edit: openFaqsSection, 'discard-draft': () => handleRevert('faqs') },
      busy:     promoBusy,
    };
    return { overview, features, faqs };
  })() : null;

  // ── Promotion Overview module editor ─────────────────────────────────────────
  // New Promotion: the instance does not exist yet, so this is instance
  // creation (whole-record create), not a station module edit — it renders the
  // module editor directly inside InlineEditorShell. Editing an existing
  // promotion's overview goes through the shell's edit viewpoint below.
  if (editingSection === 'promo-overview' && overviewDraft && isNew) {
    return (
      <InlineEditorShell
        title="New Promotion"
        onSave={handleSaveOverview}
        onCancel={handleCancelOverview}
        saving={promo.saving}
        saveErr={saveErr}
        isDirty={overviewOriginal ? isOverviewDirty(overviewDraft, overviewOriginal) : false}
      >
        <PromotionOverviewEditor
          draft={overviewDraft}
          onChange={(patch) => setOverviewDraft(d => d ? { ...d, ...patch } : d)}
          saveOk={saveOk}
        />
      </InlineEditorShell>
    );
  }

  if (editingSection === 'promo-overview' && overviewDraft && shellBindings) {
    return (
      <ModeProvider mode="edit">
        <OverviewShell
          schema={promotionOverviewShell}
          binding={shellBindings.overview}
          editSession={{
            draft:    overviewDraft,
            patch:    (p) => setOverviewDraft(d => d ? { ...d, ...(p as Partial<OverviewDraft>) } : d),
            replace:  (next) => setOverviewDraft(next as OverviewDraft),
            onSave:   handleSaveOverview,
            onCancel: handleCancelOverview,
            saving:   promo.saving,
            saveErr,
            isDirty:  overviewOriginal ? isOverviewDirty(overviewDraft, overviewOriginal) : false,
            title:    overviewDraft.name || 'Promotion Overview',
            extras:   { saveOk },
          }}
        />
      </ModeProvider>
    );
  }

  // ── Included Features module editor — the shell's edit viewpoint ─────────────
  if (editingSection === 'promo-features' && featuresDraft && shellBindings) {
    return (
      <ModeProvider mode="edit">
        <ChildShell
          schema={promotionFeaturesShell}
          binding={shellBindings.features}
          editSession={{
            draft:    featuresDraft,
            replace:  (next) => setFeaturesDraft(next as InclusionItem[]),
            onSave:   handleSaveFeatures,
            onCancel: handleCancelFeatures,
            saving:   promo.saving,
            saveErr,
            isDirty:  featuresOriginal ? isFeaturesDirty(featuresDraft, featuresOriginal) : false,
            extras:   { pool: incPool, onCreate: (label: string) => promo.createInclusion(label) },
          }}
        />
      </ModeProvider>
    );
  }

  // ── Common Questions module editor — the shell's edit viewpoint ──────────────
  if (editingSection === 'promo-faqs' && faqsDraft && shellBindings) {
    return (
      <ModeProvider mode="edit">
        <ChildShell
          schema={promotionFaqsShell}
          binding={shellBindings.faqs}
          editSession={{
            draft:    faqsDraft,
            replace:  (next) => setFaqsDraft(next as string[]),
            onSave:   handleSaveFaqs,
            onCancel: handleCancelFaqs,
            saving:   promo.saving,
            saveErr,
            isDirty:  faqsOriginal ? isFaqsDirty(faqsDraft, faqsOriginal) : false,
            extras:   { pool: faqPool, onCreate: (question: string, answer: string) => promo.createFaq(question, answer) },
          }}
        />
      </ModeProvider>
    );
  }

  // ── Individual promotion detail view — Details (Promotion Overview + Included
  // Features + Common Questions modules) | Connections ─────────────────────────────
  if (!view || !shellBindings) return null;
  const detail = view.detail;

  // Drawer body assembled from the promotion manifest's drawer placements
  // (Schema architecture S4): Details = this promotion's own modules;
  // Connections = the parent service. Keyed by promotion so opening one
  // always lands on Details.
  return (
    <EntityDrawer
      key={editingPromoId}
      entity={PROMOTION_ENTITY}
      bindings={{
        overview: shellBindings.overview,
        features: shellBindings.features,
        faqs:     shellBindings.faqs,
        service:  serviceConnectionBinding(serviceItem, svc, serviceBack),
      }}
      openPanel={openPromoPanel}
      onTogglePanel={(m) => setOpenPromoPanel((p) => (p === m ? null : m))}
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
                {view.status === 'active'
                  ? `Settle changes to ${detail.name || 'this promotion'}?`
                  : `Ready to publish ${detail.name || 'this promotion'}?`}
              </h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">
                {view.status === 'active'
                  ? 'This commits the pending changes as the settled state for each module.'
                  : 'You are about to publish this promotion and make it visible to customers.'}
              </p>
              <ul class="cz-publish-confirm__summary">
                <li><strong>Promotion Overview:</strong> {view.drafts.overview ? 'Pending changes' : detail.name.trim() ? 'Ready' : 'Not configured'}</li>
                <li><strong>Included Features:</strong> {view.drafts.features ? 'Pending changes' : `${detail.inclusions.length} added`}</li>
                <li><strong>Common Questions:</strong> {view.drafts.faqs ? 'Pending changes' : `${detail.faq_refs.length} added`}</li>
              </ul>
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => setConfirmModal(null)} disabled={promo.saving}>
                Cancel
              </button>
              <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={handleConfirmPublish} disabled={promo.saving}>
                {promo.saving ? '…' : view.status === 'active' ? 'Settle' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Permanent delete confirmation modal ─────────────────────────────── */}
      {confirmModal === 'delete' && (
        <div
          class="cz-publish-confirm-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmModal(null); }}
        >
          <div class="cz-publish-confirm">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">Delete {detail.name || 'this promotion'} permanently?</h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">
                This removes the promotion completely. It cannot be restored afterwards.
              </p>
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => setConfirmModal(null)} disabled={promo.saving}>
                Cancel
              </button>
              <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={() => handleDelete(detail.id)} disabled={promo.saving}>
                {promo.saving ? '…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </EntityDrawer>
  );
}
