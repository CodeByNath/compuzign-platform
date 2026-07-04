import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { Spinner } from '@/components/ui/Spinner';
import type { StepContext } from '../ActionShell';
import type { ServiceItem } from '@/api/types/cost-builder';
import type {
  PromotionTier,
  PromotionTierPayload,
  InclusionItem,
  FaqItem,
} from '@/api/types/admin';
import { usePromotionStation } from '@/hooks/usePromotionStation';
import { InlineEditorShell } from '../InlineEditorShell';
import { ReadBlock } from '../ReadBlock';
import { ServiceOverviewViewCard } from '../views/ServiceOverviewViewCard';
import { decodeHtml } from './serviceDrawerShared';

// ── ServicePromotionStep ──────────────────────────────────────────────────────
// Phase 4: Service Station-owned promotion management.
// Used when a service was born after Phase 1 and has no legacy cz_surface_package post.
// Reads and writes directly to cz_service_promotion_station via service-level endpoints.
//
// Drawer shape mirrors ServiceTierStep: list (all promotions) <-> individual promotion
// detail (Details/Connections tabs), full-screen swap, Back to return. Promotion Overview,
// Included Features, and Common Questions are all real drawer modules (ReadBlock + own
// InlineEditorShell).

const BASED_ON_TIERS = [
  { id: 'basic', label: 'Basic' },
  { id: 'standard', label: 'Standard' },
  { id: 'premium', label: 'Premium' },
  { id: 'enterprise', label: 'Enterprise' },
];

// Module icons — same glyphs ServiceTierStep.tsx uses for TIER_OVERVIEW_ICON /
// TIER_FEATURES_ICON, duplicated locally per the existing per-file icon convention.
const PROMO_OVERVIEW_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="drawerModule__icon-svg" aria-hidden="true" focusable="false">
    <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM7.5 15a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 017.5 15zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H8.25z" clipRule="evenodd" />
    <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
  </svg>
);
const PROMO_FEATURES_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="drawerModule__icon-svg" aria-hidden="true" focusable="false">
    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
);
const PROMO_FAQS_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="drawerModule__icon-svg" aria-hidden="true" focusable="false">
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
  </svg>
);

type PromoDraft = Omit<PromotionTierPayload, 'new_inclusions'>;

// Promotion Overview module's own transient draft — the scalar fields owned by this
// module. Inclusions/exclusions/features/starts_at/ends_at/metadata are not part of
// this draft; they pass through unchanged from the base record on save (see
// payloadFromPromo). Mirrors TierOverviewDraft's role for Tier Overview.
type OverviewDraft = Pick<
  PromoDraft,
  'name' | 'slug' | 'status' | 'based_on' | 'headline' | 'description' |
  'price' | 'billing_label' | 'badge' | 'campaign_label' | 'priority' | 'is_featured'
>;

function overviewFromPromo(p: PromotionTier): OverviewDraft {
  return {
    name: p.name, slug: p.slug, status: p.status as 'draft' | 'active' | 'archived',
    based_on: p.based_on, headline: p.headline, description: p.description,
    price: p.price, billing_label: p.billing_label, badge: p.badge,
    campaign_label: p.campaign_label, priority: p.priority, is_featured: p.is_featured,
  };
}

function emptyOverviewDraft(): OverviewDraft {
  return {
    name: '', slug: '', status: 'draft', based_on: null,
    headline: '', description: '', price: null, billing_label: '',
    badge: '', campaign_label: '', priority: 0, is_featured: false,
  };
}

// Pure — mirrors isPromoDirty's former shape, scoped to just the Overview module's fields.
function isOverviewDirty(a: OverviewDraft, b: OverviewDraft): boolean {
  return (
    a.name !== b.name || a.slug !== b.slug || a.status !== b.status || a.based_on !== b.based_on ||
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

function emptyPromoDraft(): PromoDraft {
  return {
    name: '', slug: '', status: 'draft', based_on: null,
    headline: '', description: '', price: null, billing_label: '',
    features: [], inclusions: [], exclusions: [], faq_refs: [], badge: '',
    campaign_label: '', starts_at: null, ends_at: null,
    priority: 0, is_featured: false, metadata: {},
  };
}

function draftFromPromo(p: PromotionTier): PromoDraft {
  return {
    name: p.name, slug: p.slug, status: p.status as 'draft' | 'active' | 'archived',
    based_on: p.based_on, headline: p.headline, description: p.description,
    price: p.price, billing_label: p.billing_label, features: [...p.features],
    inclusions: [...p.inclusions], exclusions: [...p.exclusions], faq_refs: [...p.faq_refs],
    badge: p.badge, campaign_label: p.campaign_label,
    starts_at: p.starts_at, ends_at: p.ends_at,
    priority: p.priority, is_featured: p.is_featured, metadata: { ...(p.metadata ?? {}) },
  };
}

// Builds the complete payload the (single, whole-record) backend endpoint requires:
// a module's edited slice overlaid onto every other field taken unchanged from the
// base record (or empty defaults when creating). There is no per-module save endpoint
// for promotions — every section's Save must submit the full record.
function payloadFromPromo(base: PromotionTier | null, overrides: Partial<PromoDraft>): PromoDraft {
  const rest = base ? draftFromPromo(base) : emptyPromoDraft();
  return { ...rest, ...overrides };
}

export function ServicePromotionStep({ ctx }: { ctx: StepContext }) {
  const serviceId = ctx.stepData.serviceId as number;
  const onRefresh = ctx.stepData.onRefresh as (() => void) | undefined;
  // Full parent service (richer than the station's service stub) — read-only context for
  // the Connections tab, and the Back-to-Service navigation, mirroring ServiceTierStep.
  const serviceItem = ctx.stepData.service as ServiceItem | undefined;
  const serviceBack = ctx.stepData.serviceBack as (() => void) | undefined;
  const serviceConnStatus = (serviceItem?.meta?.platform_status ?? 'disabled') === 'active' ? 'active' : 'disabled';

  const promo = usePromotionStation(serviceId, onRefresh);

  // Individual promotion detail view: editingPromoId set + editingSection null => the
  // Details/Connections tab shell (Promotion Overview + Included Features + Common
  // Questions modules). A named editingSection => that section's InlineEditorShell.
  // null editingPromoId => list.
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<'promo-overview' | 'promo-features' | 'promo-faqs' | null>(null);
  const [detailTab,      setDetailTab]      = useState<'details' | 'connections'>('details');

  const [overviewDraft,    setOverviewDraft]    = useState<OverviewDraft | null>(null);
  const [overviewOriginal, setOverviewOriginal] = useState<OverviewDraft | null>(null);
  const [featuresDraft,    setFeaturesDraft]    = useState<InclusionItem[] | null>(null);
  const [featuresOriginal, setFeaturesOriginal] = useState<InclusionItem[] | null>(null);
  const [faqsDraft,        setFaqsDraft]        = useState<string[] | null>(null);
  const [faqsOriginal,     setFaqsOriginal]     = useState<string[] | null>(null);
  const [isNew,          setIsNew]          = useState(false);
  const [saveErr,        setSaveErr]        = useState<string | null>(null);
  const [saveOk,         setSaveOk]         = useState(false);
  // Immediate canonical pool creation (mirrors ServiceTierStep's handleCreateInclusion/
  // handleCreateFaq) — a separate request from the promotion save. On success the new
  // item's id is appended into the currently open draft, exactly as if it had been
  // picked from "Add from pool…".
  const [showAddInclusion,  setShowAddInclusion]  = useState(false);
  const [newInclusionLabel, setNewInclusionLabel] = useState('');
  const [showAddFaq,        setShowAddFaq]        = useState(false);
  const [newFaqQuestion,    setNewFaqQuestion]    = useState('');
  const [newFaqAnswer,      setNewFaqAnswer]      = useState('');
  const [creating,          setCreating]          = useState(false);
  const [createErr,         setCreateErr]         = useState<string | null>(null);

  useEffect(() => {
    if (!saveOk) return;
    const t = setTimeout(() => setSaveOk(false), 2500);
    return () => clearTimeout(t);
  }, [saveOk]);

  const resetAddInclusion = () => { setShowAddInclusion(false); setNewInclusionLabel(''); setCreateErr(null); };
  const resetAddFaq = () => { setShowAddFaq(false); setNewFaqQuestion(''); setNewFaqAnswer(''); setCreateErr(null); };

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
    setDetailTab('details');
    setSaveErr(null); setSaveOk(false);
  };

  // Promotion Overview module's Edit — opens its own scoped editor for the promotion
  // currently open in the detail view.
  const openOverviewSection = () => {
    if (!editingPromoId) return;
    const current = promo.promotions.find(p => p.id === editingPromoId);
    if (!current) return;
    const d = overviewFromPromo(current);
    setOverviewDraft(d); setOverviewOriginal(d);
    setEditingSection('promo-overview');
    setSaveErr(null); setSaveOk(false);
  };

  // Included Features module's Edit — opens its own scoped editor for the promotion
  // currently open in the detail view.
  const openFeaturesSection = () => {
    if (!editingPromoId) return;
    const current = promo.promotions.find(p => p.id === editingPromoId);
    if (!current) return;
    const d = [...current.inclusions];
    setFeaturesDraft(d); setFeaturesOriginal(d);
    setEditingSection('promo-features');
    setSaveErr(null); setSaveOk(false); resetAddInclusion();
  };

  // Common Questions module's Edit — opens its own scoped editor for the promotion
  // currently open in the detail view.
  const openFaqsSection = () => {
    if (!editingPromoId) return;
    const current = promo.promotions.find(p => p.id === editingPromoId);
    if (!current) return;
    const d = [...current.faq_refs];
    setFaqsDraft(d); setFaqsOriginal(d);
    setEditingSection('promo-faqs');
    setSaveErr(null); setSaveOk(false); resetAddFaq();
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

  // Cancel the Included Features editor — always returns to the detail view (Features
  // is only reachable for an already-existing promotion, never during creation).
  const handleCancelFeatures = () => {
    setFeaturesDraft(null); setFeaturesOriginal(null); setSaveErr(null); setSaveOk(false); resetAddInclusion();
    setEditingSection(null);
  };

  // Cancel the Common Questions editor — always returns to the detail view (Common
  // Questions is only reachable for an already-existing promotion, never during creation).
  const handleCancelFaqs = () => {
    setFaqsDraft(null); setFaqsOriginal(null); setSaveErr(null); setSaveOk(false); resetAddFaq();
    setEditingSection(null);
  };

  // Returns from the promotion detail view to the list.
  const handleBackToList = () => {
    setEditingPromoId(null);
    setEditingSection(null);
    setDetailTab('details');
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

  // Immediate canonical pool creation (P5 Step 2 equivalent) — separate request from the
  // Included Features module save. On success the new item's id is appended into the
  // currently open draft, exactly as if it had been picked from "Add from pool…".
  const handleCreateInclusion = async () => {
    const label = newInclusionLabel.trim();
    if (!label) return;
    setCreateErr(null);
    setCreating(true);
    try {
      const item = await promo.createInclusion(label);
      if (!item) { setCreateErr('Failed to create feature.'); return; }
      setFeaturesDraft(f => (f && !f.find(i => i.id === item.id)) ? [...f, item] : f);
      setNewInclusionLabel('');
      setShowAddInclusion(false);
    } finally {
      setCreating(false);
    }
  };
  const cancelAddInclusion = () => resetAddInclusion();

  const handleCreateFaq = async () => {
    const question = newFaqQuestion.trim();
    if (!question) return;
    setCreateErr(null);
    setCreating(true);
    try {
      const item = await promo.createFaq(question, newFaqAnswer.trim());
      if (!item) { setCreateErr('Failed to create question.'); return; }
      setFaqsDraft(r => (r && !r.includes(item.id)) ? [...r, item.id] : r);
      setNewFaqQuestion('');
      setNewFaqAnswer('');
      setShowAddFaq(false);
    } finally {
      setCreating(false);
    }
  };
  const cancelAddFaq = () => resetAddFaq();

  // Promotion Overview module's Save — builds the complete payload (overview slice +
  // every other field carried forward unchanged from the base record) and persists
  // through the same whole-record endpoint. On success, returns to the detail view
  // (mirrors ServiceTierStep's saveSection); New Promotion additionally lands the user
  // in the newly created promotion's detail view.
  const handleSaveOverview = useCallback(async () => {
    if (!overviewDraft) return;
    setSaveErr(null);
    try {
      const current = editingPromoId ? promo.promotions.find(p => p.id === editingPromoId) ?? null : null;
      const payload = payloadFromPromo(current, overviewDraft);
      const res = isNew
        ? await promo.createPromotion(payload)
        : editingPromoId ? await promo.savePromotion(editingPromoId, payload) : null;
      if (res?.success) {
        setSaveOk(true);
        if (isNew) {
          setIsNew(false);
          setEditingPromoId(res.promo_id);
        }
        setEditingSection(null);
        setOverviewDraft(null);
        setOverviewOriginal(null);
      } else {
        setSaveErr('Save failed.');
      }
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed.');
    }
  }, [overviewDraft, isNew, editingPromoId, promo]);

  // Included Features module's Save — builds the complete payload (inclusions slice +
  // every other field carried forward unchanged) and persists through the same
  // whole-record endpoint. On success, returns to the detail view.
  const handleSaveFeatures = useCallback(async () => {
    if (!featuresDraft || !editingPromoId) return;
    setSaveErr(null);
    try {
      const current = promo.promotions.find(p => p.id === editingPromoId) ?? null;
      const payload = payloadFromPromo(current, { inclusions: featuresDraft });
      const res = await promo.savePromotion(editingPromoId, payload);
      if (res?.success) {
        setSaveOk(true);
        setEditingSection(null);
        setFeaturesDraft(null);
        setFeaturesOriginal(null);
      } else {
        setSaveErr('Save failed.');
      }
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed.');
    }
  }, [featuresDraft, editingPromoId, promo]);

  // Common Questions module's Save — builds the complete payload (faq_refs slice +
  // every other field carried forward unchanged) and persists through the same
  // whole-record endpoint. On success, returns to the detail view.
  const handleSaveFaqs = useCallback(async () => {
    if (!faqsDraft || !editingPromoId) return;
    setSaveErr(null);
    try {
      const current = promo.promotions.find(p => p.id === editingPromoId) ?? null;
      const payload = payloadFromPromo(current, { faq_refs: faqsDraft });
      const res = await promo.savePromotion(editingPromoId, payload);
      if (res?.success) {
        setSaveOk(true);
        setEditingSection(null);
        setFaqsDraft(null);
        setFaqsOriginal(null);
      } else {
        setSaveErr('Save failed.');
      }
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed.');
    }
  }, [faqsDraft, editingPromoId, promo]);

  const handleArchive    = async (id: string) => { await promo.archivePromotion(id); };
  const handleReactivate = async (id: string) => { await promo.reactivatePromotion(id); };

  if (!promo.detailLoaded) return <div class="cz-admin-loading"><Spinner label="Loading promotions…" /></div>;
  if (!promo.detail)       return <div class="cz-admin-error-msg">Promotion Station not found.</div>;

  const { promotions, service: svc } = promo.detail;

  // ── Promotion list view ───────────────────────────────────────────────────
  if (!isNew && !editingPromoId) {
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

        {promotions.map((p) => (
          <div key={p.id} class="cz-shell-section cz-shell-section--no-border">
            <div class="drawerModule">
              <div class="drawerModule__header">
                <div class="drawerModule__heading">
                  <p class="drawerModule__title">{p.name || '(unnamed)'}</p>
                  <p class="drawerModule__subtitle">
                    {p.based_on ? `Based on ${p.based_on}` : 'No base tier'}
                    {p.price !== null ? ` · $${p.price}` : ''}
                  </p>
                </div>
                <div class="drawerModule__status">
                  <span class={`cz-module-status-pill cz-module-status-pill--${p.status === 'active' ? 'active' : p.status === 'archived' ? 'inactive' : 'pending'}`}>
                    <span class="cz-module-status-pill__marker">●</span>
                    {p.status === 'active' ? 'Active' : p.status === 'archived' ? 'Archived' : 'Draft'}
                  </span>
                </div>
              </div>
              <div class="drawerModule__footer">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => openViewDetail(p)}>View</button>
                {p.status !== 'archived'
                  ? <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => handleArchive(p.id)}>Archive</button>
                  : <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => handleReactivate(p.id)}>Reactivate</button>
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

  const incPool = svc.inclusions;
  const faqPool = svc.faqs;

  // ── Promotion Overview module editor — used both for New Promotion (create) and for
  // editing an existing promotion's overview fields. ─────────────────────────────────
  if (editingSection === 'promo-overview' && overviewDraft) {
    return (
      <InlineEditorShell
        title={isNew ? 'New Promotion' : (overviewDraft.name || 'Promotion Overview')}
        onSave={handleSaveOverview}
        onCancel={handleCancelOverview}
        saving={promo.saving}
        saveErr={saveErr}
        isDirty={overviewOriginal ? isOverviewDirty(overviewDraft, overviewOriginal) : false}
      >
        <div class="cz-tf-form">

          <div class="cz-tf-field">
            <label class="cz-tf-label">Name</label>
            <input type="text" class="cz-tf-input" value={overviewDraft.name}
              onInput={(e) => setOverviewDraft(d => d ? { ...d, name: (e.target as HTMLInputElement).value } : d)} />
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Status</label>
            <select class="cz-tf-select" value={overviewDraft.status}
              onChange={(e) => setOverviewDraft(d => d ? { ...d, status: (e.target as HTMLSelectElement).value as 'draft' | 'active' | 'archived' } : d)}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Based on tier</label>
            <select class="cz-tf-select" value={overviewDraft.based_on ?? ''}
              onChange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                setOverviewDraft(d => d ? { ...d, based_on: (v as 'basic' | 'standard' | 'premium' | 'enterprise') || null } : d);
              }}>
              <option value="">None</option>
              {BASED_ON_TIERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Headline</label>
            <input type="text" class="cz-tf-input" value={overviewDraft.headline}
              onInput={(e) => setOverviewDraft(d => d ? { ...d, headline: (e.target as HTMLInputElement).value } : d)} />
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Description</label>
            <textarea class="cz-tf-textarea" value={overviewDraft.description}
              onInput={(e) => setOverviewDraft(d => d ? { ...d, description: (e.target as HTMLTextAreaElement).value } : d)} />
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Price</label>
            <input type="number" class="cz-tf-input" min="0" step="0.01" value={overviewDraft.price ?? ''}
              onInput={(e) => { const v = (e.target as HTMLInputElement).value; setOverviewDraft(d => d ? { ...d, price: v === '' ? null : parseFloat(v) } : d); }} />
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Billing label</label>
            <input type="text" class="cz-tf-input" value={overviewDraft.billing_label}
              onInput={(e) => setOverviewDraft(d => d ? { ...d, billing_label: (e.target as HTMLInputElement).value } : d)} />
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Badge</label>
            <input type="text" class="cz-tf-input" value={overviewDraft.badge}
              onInput={(e) => setOverviewDraft(d => d ? { ...d, badge: (e.target as HTMLInputElement).value } : d)} />
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Campaign label</label>
            <input type="text" class="cz-tf-input" value={overviewDraft.campaign_label}
              onInput={(e) => setOverviewDraft(d => d ? { ...d, campaign_label: (e.target as HTMLInputElement).value } : d)} />
          </div>

          <div class="cz-tf-field" style="flex-direction: row; align-items: center; gap: var(--cz-space-3)">
            <input type="checkbox" id="promo-overview-featured" checked={overviewDraft.is_featured}
              onChange={(e) => setOverviewDraft(d => d ? { ...d, is_featured: (e.target as HTMLInputElement).checked } : d)} />
            <label class="cz-tf-label" for="promo-overview-featured" style="margin: 0">Featured</label>
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Priority</label>
            <input type="number" class="cz-tf-input" min="0" value={overviewDraft.priority}
              onInput={(e) => setOverviewDraft(d => d ? { ...d, priority: parseInt((e.target as HTMLInputElement).value, 10) || 0 } : d)} />
          </div>

          {saveOk && <p class="cz-admin-ok-msg" style="margin-top: var(--cz-space-3)">Saved.</p>}
        </div>
      </InlineEditorShell>
    );
  }

  // ── Included Features module editor ───────────────────────────────────────────────
  if (editingSection === 'promo-features' && featuresDraft) {
    return (
      <InlineEditorShell
        title="Included Features"
        onSave={handleSaveFeatures}
        onCancel={handleCancelFeatures}
        saving={promo.saving}
        saveErr={saveErr}
        isDirty={featuresOriginal ? isFeaturesDirty(featuresDraft, featuresOriginal) : false}
      >
        <div class="cz-tf-form">
          <div class="cz-tf-field">
            <label class="cz-tf-label">Inclusions</label>
            {featuresDraft.length > 0 && (
              <div class="cz-sc-inclusion-pool" style="margin-bottom: var(--cz-space-2)">
                {featuresDraft.map(inc => (
                  <span key={inc.id} class="cz-tf-chip">
                    {inc.label}
                    <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-tf-chip__edit"
                      onClick={() => setFeaturesDraft(f => f ? f.filter(i => i.id !== inc.id) : f)}>✕</button>
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

  // ── Common Questions module editor ────────────────────────────────────────────────
  if (editingSection === 'promo-faqs' && faqsDraft) {
    return (
      <InlineEditorShell
        title="Common Questions"
        onSave={handleSaveFaqs}
        onCancel={handleCancelFaqs}
        saving={promo.saving}
        saveErr={saveErr}
        isDirty={faqsOriginal ? isFaqsDirty(faqsDraft, faqsOriginal) : false}
      >
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

  // ── Individual promotion detail view — Details (Promotion Overview + Included
  // Features + Common Questions modules) | Connections ─────────────────────────────
  const current = promotions.find(p => p.id === editingPromoId);
  if (!current) return null;

  return (
    <div class="cz-req-detail">
      {/* Drawer Tab Contract — fixed order Details | Connections. Details = this
          promotion's own modules; Connections = the parent service. */}
      <div class="cz-sv-tabs">
        <button
          type="button"
          class={`cz-sv-tab${detailTab === 'details' ? ' cz-sv-tab--active' : ''}`}
          onClick={() => setDetailTab('details')}
        >
          Details
        </button>
        <button
          type="button"
          class={`cz-sv-tab${detailTab === 'connections' ? ' cz-sv-tab--active' : ''}`}
          onClick={() => setDetailTab('connections')}
        >
          Connections
        </button>
      </div>

      {detailTab === 'details' && (
        <>
          {/* Promotion Overview — ReadBlock + its own InlineEditorShell, matching Tier
              Overview's shape. No status pill/notes: there is no per-field completeness/
              lifecycle data behind promotions (no drafts/module_status), so a synthesized
              status would misrepresent something that doesn't exist. */}
          <ReadBlock
            title="Promotion Overview"
            subtitle="General information about this promotion."
            icon={PROMO_OVERVIEW_ICON}
            iconVariant="drawerModule__icon--overview"
            scopeClass="drawerOverview"
            onEdit={openOverviewSection}
          >
            <div class="drawerModule__fields">
              <div class="drawerModule__field">
                <p class="drawerModule__label">Name</p>
                <p class="drawerModule__value">{current.name || '(unnamed)'}</p>
              </div>
              <div class="drawerModule__field">
                <p class="drawerModule__label">Status</p>
                <p class="drawerModule__value">{current.status === 'active' ? 'Active' : current.status === 'archived' ? 'Archived' : 'Draft'}</p>
              </div>
              <div class="drawerModule__field">
                <p class="drawerModule__label">Based on tier</p>
                <p class="drawerModule__value">{current.based_on ? BASED_ON_TIERS.find(t => t.id === current.based_on)?.label ?? current.based_on : 'None'}</p>
              </div>
              <div class="drawerModule__field">
                <p class="drawerModule__label">Price</p>
                <p class="drawerModule__value">{current.price !== null ? `$${current.price}` : '—'}</p>
              </div>
              <div class="drawerModule__field">
                <p class="drawerModule__label">Billing label</p>
                <p class="drawerModule__value">{current.billing_label || '—'}</p>
              </div>
              <div class="drawerModule__field">
                <p class="drawerModule__label">Badge</p>
                <p class="drawerModule__value">{current.badge || '—'}</p>
              </div>
              <div class="drawerModule__field">
                <p class="drawerModule__label">Campaign label</p>
                <p class="drawerModule__value">{current.campaign_label || '—'}</p>
              </div>
              <div class="drawerModule__field">
                <p class="drawerModule__label">Featured</p>
                <p class="drawerModule__value">{current.is_featured ? 'Yes' : 'No'}</p>
              </div>
              <div class="drawerModule__field">
                <p class="drawerModule__label">Priority</p>
                <p class="drawerModule__value">{current.priority}</p>
              </div>
              <div class="drawerModule__field">
                <p class="drawerModule__label">Headline</p>
                <p class="drawerModule__value">{current.headline || '—'}</p>
              </div>
              <div class="drawerModule__field">
                <p class="drawerModule__label">Description</p>
                <p class="drawerModule__value">{current.description || '—'}</p>
              </div>
            </div>
          </ReadBlock>

          {/* Included Features — ReadBlock + its own InlineEditorShell, matching Tier
              Included Features' shape. No status pill/notes, same reasoning as above. */}
          <ReadBlock
            title="Included Features"
            subtitle="Features included in this promotion."
            icon={PROMO_FEATURES_ICON}
            iconVariant="drawerModule__icon--features"
            count={current.inclusions.length}
            onEdit={openFeaturesSection}
          >
            {current.inclusions.length > 0 ? (
              <div class="cz-sc-inclusion-pool">
                {current.inclusions.map(inc => <span key={inc.id} class="cz-tf-chip">{inc.label}</span>)}
              </div>
            ) : (
              <div class="drawerModule__empty">
                <p class="drawerModule__empty-title">No features</p>
                <p class="drawerModule__empty-copy">Add features included in this promotion.</p>
              </div>
            )}
          </ReadBlock>

          {/* Common Questions — ReadBlock + its own InlineEditorShell, matching Tier
              Common Questions' shape. No status pill/notes, same reasoning as above. */}
          <ReadBlock
            title="Common Questions"
            subtitle="Questions and answers for this promotion."
            icon={PROMO_FAQS_ICON}
            iconVariant="drawerModule__icon--faqs"
            count={current.faq_refs.length}
            onEdit={openFaqsSection}
          >
            {current.faq_refs.length > 0 ? (
              <div class="cz-sc-faq-list">
                {current.faq_refs.map(ref => {
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
                <p class="drawerModule__empty-copy">Add common questions for this promotion.</p>
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

      {detailTab === 'connections' && (
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
