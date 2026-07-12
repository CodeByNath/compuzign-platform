import { useState } from 'preact/hooks';
import type { PromotionTier } from '@/api/types/admin';
import { usePromotionStation } from '@/hooks/usePromotionStation';
import { usePackageStation } from '@/hooks/usePackageStation';
import { useInlineConfirm } from '@/hooks/useInlineConfirm';
import { ReadBlock } from '../ReadBlock';
import { MODULE_ICONS } from '../schema/icons';
import { TRAVEL_PILL } from '../schema/presentation';
import { TIER_LABELS } from '../workstations/serviceDrawerShared';

function presentationStatus(status: PromotionTier['status']): string {
  if (status === 'draft') return 'pending-full';
  if (status === 'archived' || status === 'trashed') return status;
  return status;
}

export function PromotionManagerWorkspace({ serviceId, onRefresh, onOpen }: { serviceId: number; onRefresh?: () => void; onOpen: (promotionId?: string) => void }) {
  const promo = usePromotionStation(serviceId, onRefresh);
  const pkg = usePackageStation(serviceId);
  const [view, setView] = useState<'current' | 'bin'>('current');
  const deleteConfirm = useInlineConfirm<string>();

  const current = promo.promotions.filter((p) => p.status !== 'archived' && p.status !== 'trashed');
  const bin = promo.promotions.filter((p) => p.status === 'archived' || p.status === 'trashed');
  return (
    <section class="cz-manager-promotions" aria-label="Promotions">
      <div class="cz-manager-section__actions">
        <div><h3>Promotions</h3><p>Campaign offers managed directly by Station Manager.</p></div>
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={() => onOpen()}>New Promotion</button>
      </div>
      <div style="display:flex; gap:var(--cz-space-2); margin-bottom:var(--cz-space-3)">
        <button type="button" class={`cz-admin-btn cz-admin-btn--sm ${view === 'current' ? 'cz-admin-btn--primary' : 'cz-admin-btn--secondary'}`} onClick={() => setView('current')}>Current ({current.length})</button>
        <button type="button" class={`cz-admin-btn cz-admin-btn--sm ${view === 'bin' ? 'cz-admin-btn--primary' : 'cz-admin-btn--secondary'}`} onClick={() => setView('bin')}>Bin ({bin.length})</button>
      </div>
      {!promo.detailLoaded && <p class="cz-sp-tier-table__muted">Loading Promotions…</p>}
      {view === 'current' && <div class="cz-manager-summary-grid">
        {current.map((p) => {
          const detail = promo.promotionView(p.id)?.detail ?? p;
          const price = detail.based_on ? pkg.tierView(detail.based_on)?.detail.price ?? null : null;
          return <ReadBlock key={p.id} title={detail.name || 'Promotion'} subtitle="Promotion Overview" icon={MODULE_ICONS.overview} scopeClass="drawerOverview promotion cz-manager-summary-card" status={presentationStatus(p.status)} notes={promo.promotionView(p.id)?.modules.overview.notes ?? []} actions={[
            { id: 'view', label: 'View', onSelect: () => onOpen(p.id) },
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
