import { useState, useEffect, useCallback } from 'preact/hooks';
import { Spinner } from '@/components/ui/Spinner';
import type { StepContext } from '../ActionShell';
import type {
  PromotionTier,
  PromotionTierPayload,
} from '@/api/types/admin';
import { usePromotionStation } from '@/hooks/usePromotionStation';
import { InlineEditorShell } from '../InlineEditorShell';

// ── ServicePromotionStep ──────────────────────────────────────────────────────
// Phase 4: Service Station-owned promotion management.
// Used when a service was born after Phase 1 and has no legacy cz_surface_package post.
// Reads and writes directly to cz_service_promotion_station via service-level endpoints.

const BASED_ON_TIERS = [
  { id: 'basic', label: 'Basic' },
  { id: 'standard', label: 'Standard' },
  { id: 'premium', label: 'Premium' },
  { id: 'enterprise', label: 'Enterprise' },
];

type PromoDraft = Omit<PromotionTierPayload, 'new_inclusions'> & {
  new_inclusions: Array<{ label: string }>;
};

function emptyPromoDraft(): PromoDraft {
  return {
    name: '', slug: '', status: 'draft', based_on: null,
    headline: '', description: '', price: null, billing_label: '',
    features: [], inclusions: [], exclusions: [], badge: '',
    campaign_label: '', starts_at: null, ends_at: null,
    priority: 0, is_featured: false, metadata: {},
    new_inclusions: [],
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
    new_inclusions: [],
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

  const promo = usePromotionStation(serviceId, onRefresh);

  const [draft,          setDraft]          = useState<PromoDraft | null>(null);
  const [promoOriginal,  setPromoOriginal]  = useState<PromoDraft | null>(null);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [isNew,          setIsNew]          = useState(false);
  const [saveErr,        setSaveErr]        = useState<string | null>(null);
  const [saveOk,         setSaveOk]         = useState(false);

  useEffect(() => {
    if (!saveOk) return;
    const t = setTimeout(() => setSaveOk(false), 2500);
    return () => clearTimeout(t);
  }, [saveOk]);

  const openCreate = () => { const d = emptyPromoDraft(); setIsNew(true); setEditingPromoId(null); setDraft(d); setPromoOriginal(d); setSaveErr(null); setSaveOk(false); };
  const openEdit   = (p: PromotionTier) => { const d = draftFromPromo(p); setIsNew(false); setEditingPromoId(p.id); setDraft(d); setPromoOriginal(d); setSaveErr(null); setSaveOk(false); };
  const handleBack = () => { setDraft(null); setPromoOriginal(null); setEditingPromoId(null); setIsNew(false); setSaveErr(null); setSaveOk(false); };

  const handleSave = useCallback(async () => {
    if (!draft) return;
    setSaveErr(null);
    try {
      const res = isNew
        ? await promo.createPromotion(draft)
        : editingPromoId ? await promo.savePromotion(editingPromoId, draft) : null;
      if (res?.success) { setSaveOk(true); setPromoOriginal(draft); }
      else setSaveErr('Save failed.');
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
  if (!draft) {
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

        {promotions.map((promo) => (
          <div key={promo.id} class="cz-shell-section cz-shell-section--no-border">
            <div class="drawerModule">
              <div class="drawerModule__header">
                <div class="drawerModule__heading">
                  <p class="drawerModule__title">{promo.name || '(unnamed)'}</p>
                  <p class="drawerModule__subtitle">
                    {promo.based_on ? `Based on ${promo.based_on}` : 'No base tier'}
                    {promo.price !== null ? ` · $${promo.price}` : ''}
                  </p>
                </div>
                <div class="drawerModule__status">
                  <span class={`cz-module-status-pill cz-module-status-pill--${promo.status === 'active' ? 'active' : promo.status === 'archived' ? 'inactive' : 'pending'}`}>
                    <span class="cz-module-status-pill__marker">●</span>
                    {promo.status === 'active' ? 'Active' : promo.status === 'archived' ? 'Archived' : 'Draft'}
                  </span>
                </div>
              </div>
              <div class="drawerModule__footer">
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => openEdit(promo)}>Edit</button>
                {promo.status !== 'archived'
                  ? <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => handleArchive(promo.id)}>Archive</button>
                  : <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => handleReactivate(promo.id)}>Reactivate</button>
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

  // ── Promotion edit form ───────────────────────────────────────────────────
  const incPool = svc.inclusions;

  return (
    <InlineEditorShell
      title={isNew ? 'New Promotion' : (draft.name || 'Edit Promotion')}
      onSave={handleSave}
      onCancel={handleBack}
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
