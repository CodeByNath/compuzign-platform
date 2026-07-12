import { useEffect, useState } from 'preact/hooks';
import type { StepContext } from '../ActionShell';
import type { PromotionOverviewDraft, PromotionTier, PromotionTierPayload } from '@/api/types/admin';
import { usePromotionStation } from '@/hooks/usePromotionStation';
import { usePackageStation } from '@/hooks/usePackageStation';
import { PromotionOverviewEditor } from '../editors/PromotionOverviewEditor';
import { ReadBlock } from '../ReadBlock';
import { MODULE_ICONS } from '../schema/icons';
import { TIER_LABELS } from '../workstations/serviceDrawerShared';

function overviewOf(p?: PromotionTier): PromotionOverviewDraft {
  return p ? { name: p.name, slug: p.slug, based_on: p.based_on, headline: p.headline,
    description: p.description, price: p.price, billing_label: p.billing_label,
    badge: p.badge, campaign_label: p.campaign_label, priority: p.priority, is_featured: p.is_featured }
    : { name: '', slug: '', based_on: null, headline: '', description: '', price: null,
      billing_label: '', badge: '', campaign_label: '', priority: 0, is_featured: false };
}

function createPayload(draft: PromotionOverviewDraft): PromotionTierPayload {
  return { ...draft, status: 'draft', features: [], inclusions: [], exclusions: [], faq_refs: [], starts_at: null, ends_at: null, metadata: {} };
}

export function PromotionOverviewDrawerStep({ ctx }: { ctx: StepContext }) {
  const serviceId = Number(ctx.stepData.serviceId);
  const initialId = ctx.stepData.promotionId as string | undefined;
  const promo = usePromotionStation(serviceId);
  const pkg = usePackageStation(serviceId);
  const [promotionId, setPromotionId] = useState<string | null>(initialId ?? null);
  const [editing, setEditing] = useState(!initialId);
  const [draft, setDraft] = useState<PromotionOverviewDraft>(() => overviewOf());
  const [original, setOriginal] = useState<PromotionOverviewDraft>(() => overviewOf());
  const [error, setError] = useState<string | null>(null);
  const view = promotionId ? promo.promotionView(promotionId) : null;

  useEffect(() => {
    if (!view || editing) return;
    const next = overviewOf(view.detail); setDraft(next); setOriginal(next);
  }, [view?.detail.id, editing]);

  useEffect(() => {
    ctx.setTitle('Promotion');
    ctx.setFooter(editing ? null : <div class="cz-tf-footer"><div class="cz-tf-footer__spacer" /><button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={ctx.close}>Close</button></div>);
    return () => ctx.setFooter(null);
  }, [ctx.setFooter, ctx.close, editing]);

  const derivedPrice = draft.based_on ? pkg.tierView(draft.based_on)?.detail.price ?? null : null;
  const projected = { ...draft, price: derivedPrice };
  const dirty = JSON.stringify(projected) !== JSON.stringify(original);
  const beginEdit = () => {
    const next = overviewOf(view?.detail); setDraft(next); setOriginal({ ...next, price: next.based_on ? pkg.tierView(next.based_on)?.detail.price ?? null : null }); setEditing(true); setError(null);
  };
  const save = async () => {
    if (!projected.name.trim()) { setError('Promotion name is required.'); return; }
    if (!projected.based_on) { setError('Select a shared Package Tier.'); return; }
    const response = promotionId
      ? await promo.savePromotionOverview(promotionId, projected)
      : await promo.createPromotion(createPayload(projected));
    if (!response?.success) { setError('Promotion Overview could not be saved.'); return; }
    setPromotionId(response.promo_id); setOriginal(projected); setEditing(false); setError(null);
  };

  if (!promo.detailLoaded || !pkg.detailLoaded) return <p class="cz-sp-tier-table__muted">Loading Promotion…</p>;
  if (editing) return <div class="cz-req-detail"><PromotionOverviewEditor draft={projected} onChange={(patch) => { const { price: _price, ...owned } = patch; setDraft((current) => ({ ...current, ...owned })); }} />{error && <p class="cz-admin-error-msg">{error}</p>}<div class="drawerModule__footer"><button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => promotionId ? setEditing(false) : ctx.close()}>Cancel</button><button type="button" class="cz-admin-btn cz-admin-btn--primary" disabled={promo.saving || (!!promotionId && !dirty)} onClick={() => void save()}>{promo.saving ? '…' : 'Save'}</button></div></div>;
  if (!view) return <p class="cz-admin-error-msg">Promotion not found.</p>;
  const detail = view.detail;
  return <div class="cz-req-detail"><ReadBlock title={detail.name || 'Promotion Overview'} subtitle="Promotion Overview" icon={MODULE_ICONS.overview} scopeClass="drawerOverview promotion" status={view.modules.overview.status} notes={view.modules.overview.notes} actions={[{ id: 'edit', label: 'Edit', onSelect: beginEdit }]}><div class="drawerModule__fields"><div class="drawerModule__field"><p class="drawerModule__label">Tier</p><p class="drawerModule__value">{detail.based_on ? TIER_LABELS[detail.based_on] : 'Not selected'}</p></div><div class="drawerModule__field"><p class="drawerModule__label">Pricing</p><p class="drawerModule__value">{derivedPrice == null ? 'Not configured' : `$${derivedPrice.toFixed(2)}`}</p></div><div class="drawerModule__field"><p class="drawerModule__label">Headline</p><p class="drawerModule__value">{detail.headline || 'Not configured'}</p></div><div class="drawerModule__field"><p class="drawerModule__label">Campaign</p><p class="drawerModule__value">{detail.campaign_label || 'Not configured'}</p></div></div></ReadBlock></div>;
}
