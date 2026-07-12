import { useEffect, useState } from 'preact/hooks';
import type { StepContext } from '../ActionShell';
import type { PromotionOverviewDraft, PromotionTier, PromotionTierPayload } from '@/api/types/admin';
import { usePromotionStation } from '@/hooks/usePromotionStation';
import { usePackageStation } from '@/hooks/usePackageStation';
import { PromotionOverviewEditor } from '../editors/PromotionOverviewEditor';
import { EntityDrawer } from '../EntityDrawer';
import { InlineEditorShell } from '../InlineEditorShell';
import { PROMOTION_ENTITY } from '../schema/entities/promotion';
import type { PromotionOverviewShellData } from '../schema/entities/promotion';
import type { ShellBinding } from '../schema/types';
import { serviceConnectionBinding } from '../workstations/serviceDrawerShared';
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
  }, [ctx.setTitle]);

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
  useEffect(() => {
    if (editing || !current) {
      ctx.setFooter(null);
      return () => ctx.setFooter(null);
    }
    ctx.setFooter(
      <div class="cz-tf-footer">
        {current.status === 'draft' ? (
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" disabled={station.saving} onClick={() => void transition('publish')}>Publish</button>
        ) : (
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" disabled={station.saving} onClick={() => void transition('toggle')}>{current.status === 'active' ? 'Disable' : 'Enable'}</button>
        )}
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" disabled={station.saving} onClick={() => void transition('archive')}>Archive</button>
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={ctx.close}>Close</button>
      </div>,
    );
    return () => ctx.setFooter(null);
  }, [ctx.setFooter, ctx.close, editing, current?.status, promotionId, station.saving]);

  if (!station.detailLoaded || !packages.detailLoaded) return <p class="cz-sp-tier-table__muted">Loading Promotion…</p>;
  if (editing) return <InlineEditorShell title="Promotion Overview" onSave={save} onCancel={() => promotionId ? setEditing(false) : ctx.close()} saving={station.saving} saveErr={error} isDirty={dirty}><PromotionOverviewEditor draft={projected} onChange={(patch) => { const { price: _price, ...owned } = patch; setDraft((value) => ({ ...value, ...owned })); }} /></InlineEditorShell>;
  if (!current) return <p class="cz-admin-error-msg">Promotion not found.</p>;

  const detail = current.detail;
  const overviewBinding: ShellBinding<PromotionOverviewShellData> = {
    data: {
      name: detail.name,
      tier: detail.based_on ? TIER_LABELS[detail.based_on] : 'Not selected',
      pricing: `${derivedPrice == null ? 'Not configured' : `$${derivedPrice.toFixed(2)}`} · ${detail.billing_label || 'Tier billing cycle'}`,
      headline: detail.headline,
      description: detail.description,
      campaign: detail.campaign_label,
      badge: detail.badge,
    },
    state: current.modules.overview,
    hasDraft: current.drafts.overview !== null,
    handlers: { edit: beginEdit },
  };
  return <EntityDrawer key={promotionId} entity={PROMOTION_ENTITY} bindings={{
    overview: overviewBinding,
    service: packages.service ? serviceConnectionBinding(undefined, packages.service) : undefined,
  }} />;
}
