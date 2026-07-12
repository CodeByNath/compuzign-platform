import { useEffect, useMemo } from 'preact/hooks';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { Category, ServiceItem } from '@/api/types/cost-builder';
import type { SurfacePackageSummary } from '@/api/types/admin';
import { DynamicStationManager } from './DynamicStationManager';
import { PromotionOverviewDrawerStep } from './PromotionOverviewDrawerStep';
import { ServiceTierStep } from '../workstations/ServiceTierStep';
import type { StationManagerScope } from './types';

export interface StationManagerDependencies {
  service: ServiceItem;
  packages: SurfacePackageSummary[];
  allCategories: Category[];
  openAction: (config: ActionConfig) => void;
  onRefresh?: () => void;
  returnToService: () => void;
  initialProvider?: 'package' | 'promotion';
}

export function buildStationManagerConfig(deps: StationManagerDependencies): ActionConfig {
  return {
    id: `station-manager-${deps.service.id}`,
    mode: 'drawer', title: 'Station Manager', hideStepHeader: true,
    onBack: deps.returnToService,
    initialStepData: { ...deps },
    steps: [{ id: 'station-manager', title: 'Station Manager', component: StationManagerStep }],
  };
}

export function StationManagerStep({ ctx }: { ctx: StepContext }) {
  const deps = ctx.stepData as unknown as StationManagerDependencies;
  const scope = useMemo<StationManagerScope>(() => ({
    kind: 'connection-graph', stationContext: { type: 'service', id: deps.service.id },
    activeProviderKey: deps.initialProvider,
  }), [deps.service.id, deps.initialProvider]);
  useEffect(() => { ctx.setPanelMode('manager-wide'); return () => ctx.setPanelMode('standard'); }, [ctx.setPanelMode]);

  const openPromotion = (promotionId?: string, edit = false) => {
    const returnToManager = () => deps.openAction(buildStationManagerConfig({ ...deps, initialProvider: 'promotion' }));
    ctx.close();
    deps.openAction({
      id: `promotion-overview-${promotionId ?? 'new'}`,
      mode: 'drawer', title: 'Promotion', onBack: returnToManager,
      initialStepData: { serviceId: deps.service.id, promotionId, edit },
      steps: [{ id: 'overview', title: 'Promotion Overview', component: PromotionOverviewDrawerStep }],
    });
  };

  const openPackage = (tierId: string, edit = false) => {
    const returnToManager = () => deps.openAction(buildStationManagerConfig({ ...deps, initialProvider: 'package' }));
    ctx.close();
    deps.openAction({
      id: `package-tier-${tierId}`,
      mode: 'drawer', title: 'Package', onBack: returnToManager, hideStepHeader: true,
      initialStepData: {
        serviceId: deps.service.id, service: deps.service, openAction: deps.openAction,
        onRefresh: deps.onRefresh, serviceBack: returnToManager, initialTierId: tierId,
        initialTierSection: edit ? 'tier-overview' : undefined,
      },
      steps: [{ id: 'package-tier', title: 'Tier Overview', component: ServiceTierStep }],
    });
  };

  return <DynamicStationManager scope={scope} shell={ctx} onOpenPromotion={openPromotion} onOpenPackage={openPackage} />;
}
