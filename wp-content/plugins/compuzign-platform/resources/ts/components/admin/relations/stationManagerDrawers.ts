import type { ActionConfig } from '../ActionShell';
import type { Category, ServiceItem } from '@/api/types/cost-builder';
import type { StationSummary, SurfacePackageSummary } from '@/api/types/admin';
import { PromotionOverviewDrawerStep } from './PromotionOverviewDrawerStep';
import { ServiceTierStep } from '../workstations/ServiceTierStep';
import { ServiceViewStep } from '../workstations/ServiceViewStep';
import { buildServiceItemForStationHandoff } from '../workstations/ServiceCatalogWorkstation';

// Shared Station Manager drawer configs (Phase 1 extraction).
//
// StationManagerStep (drawer entry) and PackageManagerWorkstation (page entry)
// open the same Promotion, Service Detail, and Package Tier drawers. The
// ActionConfig assembly lives here so both hosts hand identical step data to
// the authoritative drawer components; hosts only decide WHERE the config
// renders (nested portal overlay vs. first-level ActionShell).

export interface StationManagerDrawerContext {
  service: ServiceItem;
  packages: SurfacePackageSummary[];
  allCategories: Category[];
  openAction: (config: ActionConfig) => void;
  onRefresh?: () => void;
}

export function buildPromotionDrawerConfig(serviceId: number, promotionId?: string, edit = false): ActionConfig {
  return {
    id: `promotion-overview-${promotionId ?? 'new'}`,
    mode: 'drawer', title: 'Promotion',
    initialStepData: { serviceId, promotionId, edit },
    steps: [{ id: 'overview', title: 'Promotion Overview', component: PromotionOverviewDrawerStep }],
  };
}

// View/Edit from the Package Manager Services table opens the authoritative
// Service drawer (never a group-local model); the drawer loads its own
// detail and owns all editing affordances.
export function buildServiceDetailDrawerConfig(deps: StationManagerDrawerContext, summary: StationSummary, edit = false): ActionConfig {
  return {
    id: `service-view-${summary.id}${edit ? '-edit' : ''}`,
    mode: 'drawer', title: 'Service Detail',
    initialStepData: {
      service: buildServiceItemForStationHandoff(summary),
      packages: deps.packages, openAction: deps.openAction,
      allCategories: deps.allCategories, onRefresh: deps.onRefresh,
      initialTab: 'details',
    },
    steps: [{ id: 'detail', title: 'Service Detail', component: ServiceViewStep }],
  };
}

export function buildPackageTierDrawerConfig(deps: StationManagerDrawerContext, occupantId: string, slotId: string, edit = false): ActionConfig {
  return {
    id: `package-tier-${occupantId}`,
    mode: 'drawer', title: 'Package', hideStepHeader: true,
    initialStepData: {
      serviceId: deps.service.id, service: deps.service, openAction: deps.openAction,
      onRefresh: deps.onRefresh, initialOccupantId: occupantId, initialTierId: slotId,
      initialTierSection: edit ? 'tier-overview' : undefined,
    },
    steps: [{ id: 'package-tier', title: 'Tier Overview', component: ServiceTierStep }],
  };
}
