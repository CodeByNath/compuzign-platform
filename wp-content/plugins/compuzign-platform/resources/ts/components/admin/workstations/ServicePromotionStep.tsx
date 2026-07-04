import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { Spinner } from '@/components/ui/Spinner';
import type { StepContext } from '../ActionShell';
import type { ServiceItem } from '@/api/types/cost-builder';
import type {
  PromotionTier,
  PromotionTierPayload,
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
// detail (Details/Connections tabs), full-screen swap, Back to return. 'promo-all' is a
// temporary catch-all edit section (today's whole-record form, just relocated) retired
// once Promotion Overview / Included Features / Common Questions modules land.

const BASED_ON_TIERS = [
  { id: 'basic', label: 'Basic' },
  { id: 'standard', label: 'Standard' },
  { id: 'premium', label: 'Premium' },
  { id: 'enterprise', label: 'Enterprise' },
];

type PromoDraft = Omit<PromotionTierPayload, 'new_inclusions'>;

function emptyPromoDraft(): PromoDraft {
  return {
    name: '', slug: '', status: 'draft', based_on: null,
    headline: '', description: '', price: null, billing_label: '',
    features: [], inclusions: [], exclusions: [], badge: '',
    campaign_label: '', starts_at: null, ends_at: null,
    priority: 0, is_featured: false, metadata: {},
  };
}

function draftFromPromo(p: PromotionTier): PromoDraft {
  return {
    name: p.name, slug: p.slug, status: p.status as 'draft' | 'active' | 'archived',
    based_on: p.based_on, headline: p.headline, description: p.description,
    price: p.price, billing_label: p.billing_label, features: [...p.features],
    inclusions: [...p.inclusions], exclusions: [...p.exclusions],
    badge: p.badge, campaign_label: p.campaign_label,
    starts_at: p.starts_at, ends_at: p.ends_at,
    priority: p.priority, is_featured: p.is_featured, metadata: { ...(p.metadata ?? {}) },
  };
}

// Pure — no component state. Returns true when the working draft differs from
// the snapshot taken at editor-open time. Mirrors isOverviewDirty/isInclusionsDirty/
// isFaqsDirty in ServiceViewStep.tsx.
function isPromoDirty(a: PromoDraft, b: PromoDraft): boolean {
  if (
    a.name !== b.name || a.slug !== b.slug || a.status !== b.status || a.based_on !== b.based_on ||
    a.headline !== b.headline || a.description !== b.description || a.price !== b.price ||
    a.billing_label !== b.billing_label || a.badge !== b.badge || a.campaign_label !== b.campaign_label ||
    a.starts_at !== b.starts_at || a.ends_at !== b.ends_at || a.priority !== b.priority ||
    a.is_featured !== b.is_featured
  ) return true;
  if (a.features.length !== b.features.length || a.features.some((f, i) => f !== b.features[i])) return true;
  if (a.inclusions.length !== b.inclusions.length || a.inclusions.some((inc, i) => inc.id !== b.inclusions[i].id)) return true;
  if (a.exclusions.length !== b.exclusions.length || a.exclusions.some((exc, i) => exc.id !== b.exclusions[i].id)) return true;
  const aMeta = Object.entries(a.metadata ?? {});
  const bMeta = Object.entries(b.metadata ?? {});
  if (aMeta.length !== bMeta.length || aMeta.some(([k, v]) => (b.metadata ?? {})[k] !== v)) return true;
  return false;
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
  // Details/Connections tab shell (recap card). A named editingSection => that section's
  // InlineEditorShell. null editingPromoId => the promotion list.
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<'promo-all' | null>(null);
  const [detailTab,      setDetailTab]      = useState<'details' | 'connections'>('details');

  const [draft,          setDraft]          = useState<PromoDraft | null>(null);
  const [promoOriginal,  setPromoOriginal]  = useState<PromoDraft | null>(null);
  const [isNew,          setIsNew]          = useState(false);
  const [saveErr,        setSaveErr]        = useState<string | null>(null);
  const [saveOk,         setSaveOk]         = useState(false);
  // Immediate canonical pool creation (mirrors ServiceTierStep's handleCreateInclusion) —
  // a separate request from the promotion save. On success the new item's id is appended
  // into the currently open draft, exactly as if it had been picked from "Add from pool…".
  const [showAddInclusion,  setShowAddInclusion]  = useState(false);
  const [newInclusionLabel, setNewInclusionLabel] = useState('');
  const [creating,          setCreating]          = useState(false);
  const [createErr,         setCreateErr]         = useState<string | null>(null);

  useEffect(() => {
    if (!saveOk) return;
    const t = setTimeout(() => setSaveOk(false), 2500);
    return () => clearTimeout(t);
  }, [saveOk]);

  const resetAddInclusion = () => { setShowAddInclusion(false); setNewInclusionLabel(''); setCreateErr(null); };

  const openCreate = () => {
    const d = emptyPromoDraft();
    setIsNew(true);
    setEditingPromoId(null);
    setEditingSection(null);
    setDraft(d); setPromoOriginal(d);
    setSaveErr(null); setSaveOk(false); resetAddInclusion();
  };

  // List "View" — opens the full-screen promotion detail (Details/Connections tabs).
  const openViewDetail = (p: PromotionTier) => {
    setEditingPromoId(p.id);
    setEditingSection(null);
    setDetailTab('details');
    setSaveErr(null); setSaveOk(false);
  };

  // Recap card's Edit — opens the (temporary) whole-record form for the promotion
  // currently open in the detail view. Retired once Phases 2-3 land the real modules.
  const openEditAll = () => {
    const current = promo.promotions.find(p => p.id === editingPromoId);
    if (!current) return;
    const d = draftFromPromo(current);
    setIsNew(false);
    setDraft(d); setPromoOriginal(d);
    setEditingSection('promo-all');
    setSaveErr(null); setSaveOk(false); resetAddInclusion();
  };

  // Cancel the whole-record form — creating a new promotion returns to the list;
  // editing an existing one's 'promo-all' section returns to its detail recap.
  const handleCancelForm = () => {
    setDraft(null); setPromoOriginal(null); setSaveErr(null); setSaveOk(false); resetAddInclusion();
    if (isNew) {
      setIsNew(false);
    } else {
      setEditingSection(null);
    }
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

  const handleCreateInclusion = async () => {
    const label = newInclusionLabel.trim();
    if (!label) return;
    setCreateErr(null);
    setCreating(true);
    try {
      const item = await promo.createInclusion(label);
      if (!item) { setCreateErr('Failed to create feature.'); return; }
      setDraft(d => (d && !d.inclusions.find(i => i.id === item.id)) ? { ...d, inclusions: [...d.inclusions, item] } : d);
      setNewInclusionLabel('');
      setShowAddInclusion(false);
    } finally {
      setCreating(false);
    }
  };
  const cancelAddInclusion = () => resetAddInclusion();

  const handleSave = useCallback(async () => {
    if (!draft) return;
    setSaveErr(null);
    try {
      const res = isNew
        ? await promo.createPromotion(draft)
        : editingPromoId ? await promo.savePromotion(editingPromoId, draft) : null;
      if (res?.success) {
        setSaveOk(true);
        setPromoOriginal(draft);
        if (isNew) {
          setIsNew(false);
          setEditingPromoId(res.promo_id);
        }
      } else {
        setSaveErr('Save failed.');
      }
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed.');
    }
  }, [draft, isNew, editingPromoId, promo]);

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

  // ── Whole-record form (temporary "promo-all" section + New Promotion create flow) ──
  if (draft) {
    return (
      <InlineEditorShell
        title={isNew ? 'New Promotion' : (draft.name || 'Edit Promotion')}
        onSave={handleSave}
        onCancel={handleCancelForm}
        saving={promo.saving}
        saveErr={saveErr}
        isDirty={promoOriginal ? isPromoDirty(draft, promoOriginal) : false}
      >
        <div class="cz-tf-form">

          <div class="cz-tf-field">
            <label class="cz-tf-label">Name</label>
            <input type="text" class="cz-tf-input" value={draft.name}
              onInput={(e) => setDraft(d => d ? { ...d, name: (e.target as HTMLInputElement).value } : d)} />
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Status</label>
            <select class="cz-tf-select" value={draft.status}
              onChange={(e) => setDraft(d => d ? { ...d, status: (e.target as HTMLSelectElement).value as 'draft' | 'active' | 'archived' } : d)}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Based on tier</label>
            <select class="cz-tf-select" value={draft.based_on ?? ''}
              onChange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                setDraft(d => d ? { ...d, based_on: (v as 'basic' | 'standard' | 'premium' | 'enterprise') || null } : d);
              }}>
              <option value="">None</option>
              {BASED_ON_TIERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Headline</label>
            <input type="text" class="cz-tf-input" value={draft.headline}
              onInput={(e) => setDraft(d => d ? { ...d, headline: (e.target as HTMLInputElement).value } : d)} />
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Description</label>
            <textarea class="cz-tf-textarea" value={draft.description}
              onInput={(e) => setDraft(d => d ? { ...d, description: (e.target as HTMLTextAreaElement).value } : d)} />
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Price</label>
            <input type="number" class="cz-tf-input" min="0" step="0.01" value={draft.price ?? ''}
              onInput={(e) => { const v = (e.target as HTMLInputElement).value; setDraft(d => d ? { ...d, price: v === '' ? null : parseFloat(v) } : d); }} />
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Billing label</label>
            <input type="text" class="cz-tf-input" value={draft.billing_label}
              onInput={(e) => setDraft(d => d ? { ...d, billing_label: (e.target as HTMLInputElement).value } : d)} />
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Badge</label>
            <input type="text" class="cz-tf-input" value={draft.badge}
              onInput={(e) => setDraft(d => d ? { ...d, badge: (e.target as HTMLInputElement).value } : d)} />
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Inclusions</label>
            {draft.inclusions.length > 0 && (
              <div class="cz-sc-inclusion-pool" style="margin-bottom: var(--cz-space-2)">
                {draft.inclusions.map(inc => (
                  <span key={inc.id} class="cz-tf-chip">
                    {inc.label}
                    <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm cz-tf-chip__edit"
                      onClick={() => setDraft(d => d ? { ...d, inclusions: d.inclusions.filter(i => i.id !== inc.id) } : d)}>✕</button>
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
                  if (inc && !draft.inclusions.find(i => i.id === id)) {
                    setDraft(d => d ? { ...d, inclusions: [...d.inclusions, inc] } : d);
                  }
                  sel.value = '';
                }}>
                <option value="">Add from pool…</option>
                {incPool.filter(i => !draft.inclusions.find(s => s.id === i.id)).map(i => (
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

          <div class="cz-tf-field">
            <label class="cz-tf-label">Campaign label</label>
            <input type="text" class="cz-tf-input" value={draft.campaign_label}
              onInput={(e) => setDraft(d => d ? { ...d, campaign_label: (e.target as HTMLInputElement).value } : d)} />
          </div>

          <div class="cz-tf-field" style="flex-direction: row; align-items: center; gap: var(--cz-space-3)">
            <input type="checkbox" id="promo-featured" checked={draft.is_featured}
              onChange={(e) => setDraft(d => d ? { ...d, is_featured: (e.target as HTMLInputElement).checked } : d)} />
            <label class="cz-tf-label" for="promo-featured" style="margin: 0">Featured</label>
          </div>

          <div class="cz-tf-field">
            <label class="cz-tf-label">Priority</label>
            <input type="number" class="cz-tf-input" min="0" value={draft.priority}
              onInput={(e) => setDraft(d => d ? { ...d, priority: parseInt((e.target as HTMLInputElement).value, 10) || 0 } : d)} />
          </div>

          {saveOk && <p class="cz-admin-ok-msg" style="margin-top: var(--cz-space-3)">Saved.</p>}
        </div>
      </InlineEditorShell>
    );
  }

  // ── Individual promotion detail view — Details (temporary recap) | Connections ──
  const current = promotions.find(p => p.id === editingPromoId);
  if (!current) return null;

  return (
    <div class="cz-req-detail">
      {/* Drawer Tab Contract — fixed order Details | Connections. Details = this
          promotion's own fields (temporary catch-all recap, split into real modules
          in Phases 2-4); Connections = the parent service. */}
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
        <ReadBlock title="Promotion Details" subtitle="General information about this promotion." onEdit={openEditAll}>
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
            <div class="drawerModule__field">
              <p class="drawerModule__label">Inclusions</p>
              {current.inclusions.length > 0 ? (
                <div class="cz-sc-inclusion-pool">
                  {current.inclusions.map(inc => <span key={inc.id} class="cz-tf-chip">{inc.label}</span>)}
                </div>
              ) : (
                <p class="drawerModule__value">—</p>
              )}
            </div>
          </div>
        </ReadBlock>
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
