import { useEffect, useState } from 'preact/hooks';
import type { StepContext } from '../ActionShell';
import type { PromotionOverviewDraft, PromotionTier, PromotionTierPayload } from '@/api/types/admin';
import { usePromotionStation } from '@/hooks/usePromotionStation';
import { usePackageStation } from '@/hooks/usePackageStation';
import { PromotionOverviewEditor } from '../editors/PromotionOverviewEditor';
import { ReadBlock } from '../ReadBlock';
import { MODULE_ICONS } from '../schema/icons';
import { TIER_LABELS } from '../workstations/serviceDrawerShared';

function overview(promotion?: PromotionTier): PromotionOverviewDraft {
  return promotion ? {
    name: promotion.name, slug: promotion.slug, based_on: promotion.based_on,
    headline: promotion.headline, description: promotion.description, price: promotion.price,
    billing_label: promotion.billing_label, badge: promotion.badge,
    campaign_label: promotion.campaign_label, priority: promotion.priority,
    is_featured: promotion.is_featured,
  } : { name: '', slug: '', based_on: null, headline: '', description: '', price: null,
    billing_label: '', badge: '', campaign_label: '', priority: 0, is_featured: false };
}

function payload(draft: PromotionOverviewDraft): PromotionTierPayload {
  return { ...draft, status: 'draft', features: [], inclusions: [], exclusions: [],
    faq_refs: [], starts_at: null, ends_at: null, metadata: {} };
}

export function PromotionOverviewDrawerStep({ ctx }: { ctx: StepContext }) {
  const serviceId = Number(ctx.stepData.serviceId);
  const initialId = ctx.stepData.promotionId as string | undefined;
  const station = usePromotionStation(serviceId);
  const packages = usePackageStation(serviceId);
  const [promotionId, setPromotionId] = useState<string | null>(initialId ?? null);
  const [editing, setEditing] = useState(Boolean(ctx.stepData.edit) || !initialId);
  const [draft, setDraft] = useState<PromotionOverviewDraft>(() => overview());
  const [original, setOriginal] = useState<PromotionOverviewDraft>(() => overview());
  const [error, setError] = useState<string | null>(null);
  const current = promotionId ? station.promotionView(promotionId) : null;

  useEffect(() => {
    if (!current || editing) return;
    const next = overview(current.detail);
    setDraft(next); setOriginal(next);
  }, [current?.detail.id, editing]);

  useEffect(() => {
    ctx.setTitle('Promotion');
    ctx.setFooter(null);
    return () => ctx.setFooter(null);
  }, [ctx.setTitle, ctx.setFooter]);

  const derivedPrice = draft.based_on ? packages.tierView(draft.based_on)?.detail.price ?? null : null;
  const projected = { ...draft, price: derivedPrice };
  const dirty = JSON.stringify(projected) !== JSON.stringify(original);
  useEffect(() => {
    const protectNavigation = (event: BeforeUnloadEvent) => {
      if (!editing || !dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    ctx.setCloseGuard(editing && dirty
      ? () => window.confirm('Discard unsaved Promotion changes?')
      : null);
    window.addEventListener('beforeunload', protectNavigation);
    return () => {
      ctx.setCloseGuard(null);
      window.removeEventListener('beforeunload', protectNavigation);
    };
  }, [ctx.setCloseGuard, editing, dirty]);
  const beginEdit = () => {
    const next = overview(current?.detail);
    const price = next.based_on ? packages.tierView(next.based_on)?.detail.price ?? null : null;
    setDraft(next); setOriginal({ ...next, price }); setEditing(true); setError(null);
  };
  const save = async () => {
    if (!projected.name.trim()) { setError('Promotion name is required.'); return; }
    if (!projected.based_on) { setError('Select a shared Package Tier.'); return; }
    const response = promotionId
      ? await station.savePromotionOverview(promotionId, projected)
      : await station.createPromotion(payload(projected));
    if (!response?.success) { setError('Promotion Overview could not be saved.'); return; }
    setPromotionId(response.promo_id); setOriginal(projected); setEditing(false); setError(null);
  };
  const transition = async (action: 'publish' | 'toggle' | 'archive') => {
    if (!promotionId) return;
    if (action === 'publish') await station.publishPromotion(promotionId);
    if (action === 'toggle') await station.togglePromotion(promotionId);
    if (action === 'archive') await station.archivePromotion(promotionId);
  };

  if (!station.detailLoaded || !packages.detailLoaded) return <p class="cz-sp-tier-table__muted">Loading Promotion…</p>;
  if (editing) return <div class="cz-req-detail"><PromotionOverviewEditor draft={projected} onChange={(patch) => { const { price: _price, ...owned } = patch; setDraft((value) => ({ ...value, ...owned })); }} />{error && <p class="cz-admin-error-msg">{error}</p>}<div class="drawerModule__footer"><button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => promotionId ? setEditing(false) : ctx.close()}>Cancel</button><button type="button" class="cz-admin-btn cz-admin-btn--primary" disabled={station.saving || (!!promotionId && !dirty)} onClick={() => void save()}>{station.saving ? '…' : 'Save'}</button></div></div>;
  if (!current) return <p class="cz-admin-error-msg">Promotion not found.</p>;

  const detail = current.detail;
  const actions = [
    { id: 'edit', label: 'Edit', onSelect: beginEdit },
    current.status === 'draft'
      ? { id: 'publish', label: 'Publish', onSelect: () => void transition('publish') }
      : { id: 'toggle', label: current.status === 'active' ? 'Disable' : 'Enable', onSelect: () => void transition('toggle') },
    { id: 'archive', label: 'Archive', onSelect: () => void transition('archive') },
  ];
  return <div class="cz-req-detail"><ReadBlock title={detail.name || 'Promotion Overview'} subtitle="Promotion Overview" icon={MODULE_ICONS.overview} scopeClass="drawerOverview promotion" status={current.modules.overview.status} notes={current.modules.overview.notes} actions={actions}><div class="drawerModule__fields"><div class="drawerModule__field"><p class="drawerModule__label">Tier</p><p class="drawerModule__value">{detail.based_on ? TIER_LABELS[detail.based_on] : 'Not selected'}</p></div><div class="drawerModule__field"><p class="drawerModule__label">Pricing</p><p class="drawerModule__value">{derivedPrice == null ? 'Not configured' : `$${derivedPrice.toFixed(2)}`} · {detail.billing_label || 'Tier billing cycle'}</p></div><div class="drawerModule__field"><p class="drawerModule__label">Headline</p><p class="drawerModule__value">{detail.headline || 'Not configured'}</p></div><div class="drawerModule__field"><p class="drawerModule__label">Description</p><p class="drawerModule__value">{detail.description || 'Not configured'}</p></div><div class="drawerModule__field"><p class="drawerModule__label">Campaign</p><p class="drawerModule__value">{detail.campaign_label || 'Not configured'}</p></div><div class="drawerModule__field"><p class="drawerModule__label">Badge</p><p class="drawerModule__value">{detail.badge || 'Not configured'}</p></div></div></ReadBlock></div>;
}
