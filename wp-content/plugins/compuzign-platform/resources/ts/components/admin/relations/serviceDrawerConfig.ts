import type { ActionConfig } from '../ActionShell';
import type { Category, ServiceItem } from '@/api/types/cost-builder';
import type { StationSummary, SurfacePackageSummary } from '@/api/types/admin';
import { ServiceViewStep } from '../workstations/ServiceViewStep';
import { buildServiceItemForStationHandoff } from '../workstations/ServiceCatalogWorkstation';
import { MODULE_ICONS } from '../schema/icons';

export interface DrawerHostContext {
  service: ServiceItem;
  packages: SurfacePackageSummary[];
  allCategories: Category[];
  openAction: (config: ActionConfig) => void;
  onRefresh?: () => void;
}

export function buildServiceDetailDrawerConfig(deps: DrawerHostContext, summary: StationSummary, edit = false): ActionConfig {
  const pending = summary.has_drafts || summary.module_status.overview !== 'settled';
  const status = summary.platform_status === 'active'
    ? { label: pending ? 'Active · pending' : 'Active', tone: pending ? 'pending' as const : 'active' as const }
    : { label: pending ? 'Pending' : 'Disabled', tone: pending ? 'pending' as const : 'disabled' as const };
  return {
    id: `service-view-${summary.id}${edit ? '-edit' : ''}`,
    mode: 'drawer', title: summary.title, hideStepHeader: true,
    header: {
      icon: MODULE_ICONS.overview,
      subtitle: `${summary.categories.map((category) => category.name).join(', ') || 'Uncategorised'} Service`,
      status,
    },
    initialStepData: {
      service: buildServiceItemForStationHandoff(summary), packages: deps.packages,
      allCategories: deps.allCategories, onRefresh: deps.onRefresh,
      initialTab: 'details', initialEdit: edit,
    },
    steps: [{ id: 'detail', title: 'Service Detail', component: ServiceViewStep }],
  };
}
