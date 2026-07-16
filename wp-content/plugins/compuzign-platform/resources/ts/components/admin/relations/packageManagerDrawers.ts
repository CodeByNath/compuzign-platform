import type { ActionConfig } from '../ActionShell';
import type { ServiceItem, TierId } from '@/api/types/cost-builder';
import { PromotionOverviewDrawerStep } from './PromotionOverviewDrawerStep';
import { ServiceTierStep } from '../stations/ServiceTierStep';
import { MODULE_ICONS } from '../schema/icons';
import { TIER_LABELS } from '../stations/serviceDrawerShared';

export interface PackageDrawerContext {
  service: ServiceItem;
  openAction: (config: ActionConfig) => void;
  onRefresh?: () => void;
}

export function buildPromotionDrawerConfig(serviceId: number, promotionId?: string, edit = false): ActionConfig {
  return {
    id: `promotion-overview-${promotionId ?? 'new'}`,
    mode: 'drawer', title: 'Promotion', initialStepData: { serviceId, promotionId, edit },
    steps: [{ id: 'overview', title: 'Promotion Overview', component: PromotionOverviewDrawerStep }],
  };
}

export function buildPackageTierDrawerConfig(deps: PackageDrawerContext, occupantId: string, slotId: string, edit = false): ActionConfig {
  const tierId = slotId as TierId;
  const tierLabel = deps.service.pricing.tiers[tierId]?.label?.trim() || TIER_LABELS[tierId] || 'Tier Overview';
  return {
    id: `package-tier-${occupantId}`,
    mode: 'drawer', title: tierLabel, hideStepHeader: true,
    header: {
      icon: MODULE_ICONS.package,
      subtitle: `${deps.service.title} · Package Tier`,
    },
    initialStepData: {
      serviceId: deps.service.id, service: deps.service, openAction: deps.openAction,
      onRefresh: deps.onRefresh, initialOccupantId: occupantId, initialTierId: slotId,
      initialTierSection: edit ? 'tier-overview' : undefined,
    },
    steps: [{ id: 'package-tier', title: 'Tier Overview', component: ServiceTierStep }],
  };
}
