import type { ActionConfig } from '../ActionShell';
import type { Category, ServiceItem } from '@/api/types/cost-builder';
import type { StationSummary, SurfacePackageSummary } from '@/api/types/admin';
import { ServiceViewStep } from '../workstations/ServiceViewStep';
import { buildServiceItemForStationHandoff } from '../workstations/ServiceCatalogWorkstation';

export interface DrawerHostContext {
  service: ServiceItem;
  packages: SurfacePackageSummary[];
  allCategories: Category[];
  openAction: (config: ActionConfig) => void;
  onRefresh?: () => void;
}

export function buildServiceDetailDrawerConfig(deps: DrawerHostContext, summary: StationSummary, edit = false): ActionConfig {
  return {
    id: `service-view-${summary.id}${edit ? '-edit' : ''}`,
    mode: 'drawer', title: 'Service Detail',
    initialStepData: {
      service: buildServiceItemForStationHandoff(summary), packages: deps.packages,
      allCategories: deps.allCategories, onRefresh: deps.onRefresh,
      initialTab: 'details', initialEdit: edit,
    },
    steps: [{ id: 'detail', title: 'Service Detail', component: ServiceViewStep }],
  };
}
