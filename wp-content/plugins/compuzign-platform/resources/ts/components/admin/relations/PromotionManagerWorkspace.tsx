import { useMemo, useState } from 'preact/hooks';
import type { PromotionOverviewDraft, PromotionTier, PromotionTierPayload } from '@/api/types/admin';
import { usePromotionStation } from '@/hooks/usePromotionStation';
import { usePackageStation } from '@/hooks/usePackageStation';
import { useInlineConfirm } from '@/hooks/useInlineConfirm';
import { ReadBlock } from '../ReadBlock';
import { PromotionOverviewEditor } from '../editors/PromotionOverviewEditor';
import { MODULE_ICONS } from '../schema/icons';
import { TRAVEL_PILL } from '../schema/presentation';
import { TIER_LABELS } from '../workstations/serviceDrawerShared';

function overviewOf(p?: PromotionTier): PromotionOverviewDraft {
  return p ? {
    name: p.name, slug: p.slug, based_on: p.based_on, headline: p.headline,
    description: p.description, price: p.price, billing_label: p.billing_label,
    badge: p.badge, campaign_label: p.campaign_label, priority: p.priority,
    is_featured: p.is_featured,
  } : { name: '', slug: '', based_on: null, headline: '', description: '', price: null,
    billing_label: '', badge: '', campaign_label: '', priority: 0, is_featured: false };
}

function createPayload(draft: PromotionOverviewDraft): PromotionTierPayload {
  return { ...draft, status: 'draft', features: [], inclusions: [], exclusions: [],
    faq_refs: [], starts_at: null, ends_at: null, metadata: {} };
}

function presentationStatus(status: PromotionTier['status']): string {
  if (status === 'draft') return 'pending-full';
  if (status === 'archived' || status === 'trashed') return status;
  return status;
}

export function PromotionManagerWorkspace({ serviceId, onRefresh }: { serviceId: number; onRefresh?: () => void }) {
  const promo = usePromotionStation(serviceId, onRefresh);
  const pkg = usePackageStation(serviceId);
  const [view, setView] = useState<'current' | 'bin'>('current');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PromotionOverviewDraft | null>(null);
  const [original, setOriginal] = useState<PromotionOverviewDraft | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deleteConfirm = useInlineConfirm<string>();

  const current = promo.promotions.filter((p) => p.status !== 'archived' && p.status !== 'trashed');
  const bin = promo.promotions.filter((p) => p.status === 'archived' || p.status === 'trashed');
  const derivedPrice = draft?.based_on ? pkg.tierView(draft.based_on)?.detail.price ?? null : null;
  const projectedDraft = draft ? { ...draft, price: derivedPrice } : null;
  const dirty = !!(projectedDraft && original && JSON.stringify(projectedDraft) !== JSON.stringify(original));

  const openExisting = (p: PromotionTier) => {
    const detail = promo.promotionView(p.id)?.detail ?? p;
    const next = overviewOf(detail);
    setEditingId(p.id); setCreating(false); setDraft(next); setOriginal({ ...next }); setError(null); setNotice(null);
  };
  const openNew = () => {
    const next = overviewOf();
    setEditingId(null); setCreating(true); setDraft(next); setOriginal({ ...next }); setError(null); setNotice(null);
  };
  const closeDrawer = () => {
    setDraft(null); setOriginal(null); setEditingId(null); setCreating(false); setError(null);
  };
  const save = async () => {
    if (!projectedDraft?.name.trim()) { setError('Promotion name is required.'); return; }
    if (!projectedDraft.based_on) { setError('Select a Package Manager Tier.'); return; }
    setError(null);
    const response = creating
      ? await promo.createPromotion(createPayload(projectedDraft))
      : editingId ? await promo.savePromotionOverview(editingId, projectedDraft) : null;
    if (!response?.success) { setError('Promotion Overview could not be saved.'); return; }
    closeDrawer(); setNotice('Promotion Overview saved.');
  };

  if (draft && projectedDraft) {
    return (
      <section class="cz-manager-promotion-drawer" aria-label="Promotion Overview">
        <div class="cz-manager-section__actions">
          <div><h3>Promotion Overview</h3><p>{creating ? 'Create a Promotion in Package Manager.' : 'Manage Promotion metadata and Tier projection.'}</p></div>
        </div>
        <PromotionOverviewEditor draft={projectedDraft} onChange={(patch) => {
          const { price: _ignored, ...owned } = patch;
          setDraft((currentDraft) => currentDraft ? { ...currentDraft, ...owned } : currentDraft);
        }} />
        <div class="drawerModule__fields">
          <div class="drawerModule__field"><p class="drawerModule__label">Derived pricing</p><p class="drawerModule__value">{derivedPrice == null ? 'Not configured' : `$${derivedPrice.toFixed(2)}`} · selected Tier Rate Sheet projection</p></div>
        </div>
        {error && <p class="cz-admin-error-msg">{error}</p>}
        <div class="drawerModule__footer">
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={closeDrawer}>Cancel</button>
          <button type="button" class="cz-admin-btn cz-admin-btn--primary" disabled={promo.saving || (!creating && !dirty)} onClick={() => void save()}>{promo.saving ? '…' : 'Save'}</button>
        </div>
      </section>
    );
  }

  return (
    <section class="cz-manager-promotions" aria-label="Promotions">
      <div class="cz-manager-section__actions">
        <div><h3>Promotions</h3><p>Campaign offers managed directly by Package Manager.</p></div>
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={openNew}>New Promotion</button>
      </div>
      <div style="display:flex; gap:var(--cz-space-2); margin-bottom:var(--cz-space-3)">
        <button type="button" class={`cz-admin-btn cz-admin-btn--sm ${view === 'current' ? 'cz-admin-btn--primary' : 'cz-admin-btn--secondary'}`} onClick={() => setView('current')}>Current ({current.length})</button>
        <button type="button" class={`cz-admin-btn cz-admin-btn--sm ${view === 'bin' ? 'cz-admin-btn--primary' : 'cz-admin-btn--secondary'}`} onClick={() => setView('bin')}>Bin ({bin.length})</button>
      </div>
      {notice && <p class="cz-admin-ok-msg">{notice}</p>}
      {!promo.detailLoaded && <p class="cz-sp-tier-table__muted">Loading Promotions…</p>}
      {view === 'current' && <div class="cz-manager-summary-grid">
        {current.map((p) => {
          const detail = promo.promotionView(p.id)?.detail ?? p;
          const price = detail.based_on ? pkg.tierView(detail.based_on)?.detail.price ?? null : null;
          return <ReadBlock key={p.id} title={detail.name || 'Promotion'} subtitle="Promotion Overview" icon={MODULE_ICONS.overview} scopeClass="drawerOverview promotion cz-manager-summary-card" status={presentationStatus(p.status)} notes={promo.promotionView(p.id)?.modules.overview.notes ?? []} actions={[
            { id: 'view', label: 'View', onSelect: () => openExisting(p) },
            p.status === 'draft' ? { id: 'publish', label: 'Publish', onSelect: () => void promo.publishPromotion(p.id) } : { id: 'toggle', label: p.status === 'active' ? 'Disable' : 'Enable', onSelect: () => void promo.togglePromotion(p.id) },
            { id: 'archive', label: 'Archive', onSelect: () => void promo.archivePromotion(p.id) },
          ]}><div class="drawerModule__fields"><div class="drawerModule__field"><p class="drawerModule__label">Tier</p><p class="drawerModule__value">{detail.based_on ? TIER_LABELS[detail.based_on] : 'Not selected'}</p></div><div class="drawerModule__field"><p class="drawerModule__label">Pricing</p><p class="drawerModule__value">{price == null ? 'Not configured' : `$${price.toFixed(2)}`}</p></div></div></ReadBlock>;
        })}
        {current.length === 0 && <div class="cz-admin-empty"><p>No current Promotions.</p></div>}
      </div>}
      {view === 'bin' && <div class="cz-manager-summary-grid">
        {bin.map((p) => {
          const pill = TRAVEL_PILL[p.status as 'archived' | 'trashed'];
          return <ReadBlock key={p.id} title={p.name || 'Promotion'} subtitle={pill.label} icon={MODULE_ICONS.overview} scopeClass="drawerOverview promotion cz-manager-summary-card" status="disabled" actions={p.status === 'archived' ? [
            { id: 'restore', label: 'Restore', onSelect: () => void promo.restorePromotion(p.id) },
            { id: 'trash', label: 'Move to Trash', onSelect: () => void promo.trashPromotion(p.id) },
          ] : [
            { id: 'restore', label: 'Restore', onSelect: () => void promo.restorePromotion(p.id) },
            { id: 'delete', label: deleteConfirm.pendingId === p.id ? 'Confirm permanent delete' : 'Delete Permanently', onSelect: () => deleteConfirm.pendingId === p.id ? void promo.deletePromotion(p.id).then(() => deleteConfirm.cancel()) : deleteConfirm.request(p.id) },
          ]}><div class="drawerModule__fields"><div class="drawerModule__field"><p class="drawerModule__label">Lifecycle</p><p class="drawerModule__value">{pill.label}</p></div></div></ReadBlock>;
        })}
        {bin.length === 0 && <div class="cz-admin-empty"><p>The Promotion bin is empty.</p></div>}
      </div>}
    </section>
  );
}
