import type { WorkstationId } from '@/api/types/admin';
import type { ActionConfig } from './ActionShell';
import { OverviewWorkstation } from './workstations/OverviewWorkstation';
import { ServiceCatalogWorkstation } from './workstations/ServiceCatalogWorkstation';

interface Props {
  active: WorkstationId;
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
}

function ComingSoon({ workstation }: { workstation: WorkstationId }) {
  return (
    <div class="cz-admin-empty">
      <p>
        <strong>{workstation}</strong> workstation is coming in a future phase.
      </p>
    </div>
  );
}

export function WorkstationRouter({ active, refreshKey, openAction }: Props) {
  switch (active) {
    case 'overview':
      return <OverviewWorkstation refreshKey={refreshKey} />;
    case 'service-catalog':
      return <ServiceCatalogWorkstation refreshKey={refreshKey} openAction={openAction} />;
    default:
      return <ComingSoon workstation={active} />;
  }
}
