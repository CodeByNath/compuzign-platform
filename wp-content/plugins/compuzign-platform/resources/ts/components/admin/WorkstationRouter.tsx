import type { WorkstationId } from '@/api/types/admin';
import type { ActionConfig } from './ActionShell';
import { OverviewWorkstation } from './workstations/OverviewWorkstation';
import { ServiceCatalogWorkstation } from './workstations/ServiceCatalogWorkstation';
import { ServiceArchivedWorkstation } from './workstations/ServiceArchivedWorkstation';
import { ServiceTrashWorkstation } from './workstations/ServiceTrashWorkstation';
import { SurfacePackagesWorkstation } from './workstations/SurfacePackagesWorkstation';
import { PromotionsWorkstation } from './workstations/PromotionsWorkstation';
import { BundlesWorkstation } from './workstations/BundlesWorkstation';
import { FeaturedWorkstation } from './workstations/FeaturedWorkstation';
import { RequestsWorkstation } from './workstations/RequestsWorkstation';
import { HealthWorkstation } from './workstations/HealthWorkstation';

interface Props {
  active: WorkstationId;
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
}


export function WorkstationRouter({ active, refreshKey, openAction }: Props) {
  switch (active) {
    case 'overview':
      return <OverviewWorkstation refreshKey={refreshKey} />;
    case 'service-catalog':
      return <ServiceCatalogWorkstation refreshKey={refreshKey} openAction={openAction} />;
    case 'service-archived':
      return <ServiceArchivedWorkstation refreshKey={refreshKey} />;
    case 'service-trash':
      return <ServiceTrashWorkstation refreshKey={refreshKey} />;
    case 'surface-packages':
      return <SurfacePackagesWorkstation refreshKey={refreshKey} openAction={openAction} />;
    case 'promotions':
      return <PromotionsWorkstation refreshKey={refreshKey} openAction={openAction} />;
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
