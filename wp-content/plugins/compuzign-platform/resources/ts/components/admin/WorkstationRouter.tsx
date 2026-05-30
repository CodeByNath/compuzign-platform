import type { WorkstationId } from '@/api/types/admin';
import type { ActionConfig } from './ActionShell';
import { OverviewWorkstation } from './workstations/OverviewWorkstation';
import { ServiceCatalogWorkstation } from './workstations/ServiceCatalogWorkstation';
import { SurfacePackagesWorkstation } from './workstations/SurfacePackagesWorkstation';
import { BundlesWorkstation } from './workstations/BundlesWorkstation';
import { FeaturedWorkstation } from './workstations/FeaturedWorkstation';
import { RequestsWorkstation } from './workstations/RequestsWorkstation';
import { HealthWorkstation } from './workstations/HealthWorkstation';

interface Props {
  active: WorkstationId;
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
}

function PromotionsStub() {
  return (
    <div>
      <div class="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Promotions</h2>
          <p class="cz-ws-subtitle">Discount codes, time-limited offers, and tier promotions</p>
        </div>
      </div>
      <div class="cz-ws-card">
        <p class="cz-ws-card__title">Upcoming — Phase D</p>
        <p style="margin:0 0 12px;color:var(--admin-text-muted);font-size:13px;line-height:1.7">
          The Promotions workstation will manage discount campaigns across the service catalog.
          It requires a <strong>promotions river</strong> — a new data layer for storing
          promotion rules, validity windows, and applicable service/tier targeting.
        </p>
        <div class="cz-coming-soon-checklist">
          <div class="cz-coming-soon-checklist__item cz-coming-soon-checklist__item--pending">New <code>cz_promotion</code> post type</div>
          <div class="cz-coming-soon-checklist__item cz-coming-soon-checklist__item--pending">Promotions river / REST contracts</div>
          <div class="cz-coming-soon-checklist__item cz-coming-soon-checklist__item--pending">Discount engine in PricingBuilder</div>
          <div class="cz-coming-soon-checklist__item cz-coming-soon-checklist__item--pending">Frontend discount application in cost builder</div>
        </div>
      </div>
    </div>
  );
}

export function WorkstationRouter({ active, refreshKey, openAction }: Props) {
  switch (active) {
    case 'overview':
      return <OverviewWorkstation refreshKey={refreshKey} />;
    case 'service-catalog':
      return <ServiceCatalogWorkstation refreshKey={refreshKey} openAction={openAction} />;
    case 'surface-packages':
      return <SurfacePackagesWorkstation refreshKey={refreshKey} openAction={openAction} />;
    case 'promotions':
      return <PromotionsStub />;
    case 'bundles':
      return <BundlesWorkstation refreshKey={refreshKey} />;
    case 'featured':
      return <FeaturedWorkstation refreshKey={refreshKey} />;
    case 'requests':
      return <RequestsWorkstation refreshKey={refreshKey} openAction={openAction} />;
    case 'health':
      return <HealthWorkstation refreshKey={refreshKey} />;
    default:
      return (
        <div class="cz-admin-empty">
          <p><strong>{active}</strong> workstation is not yet available.</p>
        </div>
      );
  }
}
