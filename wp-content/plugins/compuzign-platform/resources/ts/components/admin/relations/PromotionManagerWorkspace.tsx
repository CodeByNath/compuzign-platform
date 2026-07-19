import { useState } from 'preact/hooks';
import { usePromotionStation } from '@/hooks/usePromotionStation';
import { usePackageStation } from '@/hooks/usePackageStation';
import { useInlineConfirm } from '@/hooks/useInlineConfirm';
import { ReadBlock } from '@/drawer-kit/ReadBlock';
import { MODULE_ICONS } from '@/drawer-kit/schema/icons';
import { TRAVEL_PILL } from '@/drawer-kit/schema/presentation';
import { TIER_LABELS } from '../stations/serviceDrawerShared';

type PromotionOpen = (promotionId?: string, edit?: boolean) => void;

function cardStatus(status: string): string {
  if (status === 'draft') return 'pending-full';
  return status === 'active' ? 'active' : 'disabled';
}

export function PromotionManagerWorkspace({ serviceId, onRefresh, onOpen }: {
  serviceId: number;
  onRefresh?: () => void;
  onOpen: PromotionOpen;
}) {
  const station = usePromotionStation(serviceId, onRefresh);
  const packages = usePackageStation(serviceId);
  const [list, setList] = useState<'current' | 'bin'>('current');
  const deleteConfirm = useInlineConfirm<string>();
  const current = station.promotions.filter((promotion) => !['archived', 'trashed'].includes(promotion.status));
  const bin = station.promotions.filter((promotion) => ['archived', 'trashed'].includes(promotion.status));

  return (
    <section class="cz-manager-promotions" aria-label="Promotions">
      <div class="cz-manager-section__actions">
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={() => onOpen(undefined, true)}>New Promotion</button>
      </div>
      <div style="display:flex;gap:var(--cz-space-2);margin-bottom:var(--cz-space-3)">
        <button type="button" class={`cz-admin-btn cz-admin-btn--sm ${list === 'current' ? 'cz-admin-btn--primary' : 'cz-admin-btn--secondary'}`} onClick={() => setList('current')}>Current ({current.length})</button>
        <button type="button" class={`cz-admin-btn cz-admin-btn--sm ${list === 'bin' ? 'cz-admin-btn--primary' : 'cz-admin-btn--secondary'}`} onClick={() => setList('bin')}>Bin ({bin.length})</button>
      </div>
      {!station.detailLoaded && <p class="cz-sp-tier-table__muted">Loading Promotions…</p>}
      {list === 'current' && <div class="cz-manager-summary-grid">
        {current.map((promotion) => {
          const view = station.promotionView(promotion.id);
          const detail = view?.detail ?? promotion;
          const price = detail.based_on ? packages.tierView(detail.based_on)?.detail.price ?? null : null;
          return <ReadBlock key={promotion.id} title={detail.name || 'Promotion'} subtitle="Pricing and presentation for this promotion." icon={MODULE_ICONS.overview} scopeClass="drawerOverview promotion cz-manager-summary-card" status={cardStatus(promotion.status)} notes={view?.modules.overview.notes ?? []} actions={[
            { id: 'view', label: 'View', onSelect: () => onOpen(promotion.id) },
            { id: 'edit', label: 'Edit', onSelect: () => onOpen(promotion.id, true) },
          ]}><div class="drawerModule__fields"><div class="drawerModule__field"><p class="drawerModule__label">Pricing</p><p class="drawerModule__value">{price == null ? 'Not configured' : `$${price.toFixed(2)}`} · {detail.billing_label || 'Tier billing cycle'}</p></div><div class="drawerModule__field"><p class="drawerModule__label">Tier</p><p class="drawerModule__value">{detail.based_on ? TIER_LABELS[detail.based_on] : 'Not selected'}</p></div></div></ReadBlock>;
        })}
        {current.length === 0 && <div class="cz-admin-empty"><p>No current Promotions.</p></div>}
      </div>}
      {list === 'bin' && <div class="cz-manager-summary-grid">
        {bin.map((promotion) => {
          const travel = TRAVEL_PILL[promotion.status as 'archived' | 'trashed'];
          const actions = promotion.status === 'archived' ? [
            { id: 'restore', label: 'Restore', onSelect: () => void station.restorePromotion(promotion.id) },
            { id: 'trash', label: 'Move to Trash', onSelect: () => void station.trashPromotion(promotion.id) },
          ] : [
            { id: 'restore', label: 'Restore', onSelect: () => void station.restorePromotion(promotion.id) },
            { id: 'delete', label: deleteConfirm.pendingId === promotion.id ? 'Confirm permanent delete' : 'Delete Permanently', onSelect: () => deleteConfirm.pendingId === promotion.id ? void station.deletePromotion(promotion.id).then(deleteConfirm.cancel) : deleteConfirm.request(promotion.id) },
          ];
          return <ReadBlock key={promotion.id} title={promotion.name || 'Promotion'} subtitle={travel.label} icon={MODULE_ICONS.overview} scopeClass="drawerOverview promotion cz-manager-summary-card" status="disabled" actions={actions}><div class="drawerModule__fields"><div class="drawerModule__field"><p class="drawerModule__label">Lifecycle</p><p class="drawerModule__value">{travel.label}</p></div></div></ReadBlock>;
        })}
        {bin.length === 0 && <div class="cz-admin-empty"><p>The Promotion bin is empty.</p></div>}
      </div>}
    </section>
  );
}
