import { useState } from 'preact/hooks';
import { usePackageStation } from '@/hooks/usePackageStation';
import { ReadBlock } from '../ReadBlock';
import { MODULE_ICONS } from '../schema/icons';
import { getTierNotes } from '../utils/moduleNotifications';
import { TIER_KEYS, TIER_LABELS } from '../workstations/serviceDrawerShared';

export function PackageManagerTierCards({ serviceId, onOpen }: { serviceId: number; onOpen: (tierId: string, edit?: boolean) => void }) {
  const pkg = usePackageStation(serviceId);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  if (!pkg.detailLoaded) return <p class="cz-sp-tier-table__muted">Loading Packages…</p>;

  return (
    <section class="cz-manager-packages" aria-label="Packages">
      <div class="cz-manager-section__actions"><div><h3>Packages</h3><p>Tier packages managed by Station Manager.</p></div></div>
      <div class="cz-manager-summary-grid">
        {TIER_KEYS.map((tierId) => {
          const view = pkg.tierView(tierId);
          const detail = view?.detail;
          const price = detail?.price ?? null;
          const inclusions = detail?.inclusions_override.length ?? 0;
          const faqs = detail?.faq_refs.length ?? 0;
          return (
            <ReadBlock
              key={tierId}
              title={`Package ${detail?.label?.trim() || TIER_LABELS[tierId]}`}
              subtitle="Pricing and inclusions for this tier."
              icon={MODULE_ICONS.package}
              scopeClass="drawerOverview tier cz-manager-summary-card"
              status={view?.status ?? 'pending-dim'}
              notes={detail ? getTierNotes(detail, { platformStatus: pkg.platformStatus }) : []}
              panelOpen={openPanel === tierId}
              onTogglePanel={() => setOpenPanel((current) => current === tierId ? null : tierId)}
              actions={[
                { id: 'view', label: 'View', onSelect: () => onOpen(tierId) },
                { id: 'edit', label: 'Edit', onSelect: () => onOpen(tierId, true) },
              ]}
            >
              <div class="drawerModule__fields">
                <div class="drawerModule__field"><p class="drawerModule__label">Pricing</p><p class="drawerModule__value">{price == null ? 'Not configured' : `$${price.toFixed(2)}`} · {detail?.billing_cycle ?? 'Not available'}</p></div>
                <div class="drawerModule__field"><p class="drawerModule__label">Includes</p><p class="drawerModule__value">{inclusions} {inclusions === 1 ? 'feature' : 'features'} | {faqs} common questions</p></div>
              </div>
            </ReadBlock>
          );
        })}
      </div>
    </section>
  );
}
