import { createPortal } from 'preact/compat';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { ActionShell } from '../ActionShell';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { Category, ServiceItem } from '@/api/types/cost-builder';
import type { StationSummary, SurfacePackageSummary } from '@/api/types/admin';
import { DynamicStationManager } from './DynamicStationManager';
import { PromotionOverviewDrawerStep } from './PromotionOverviewDrawerStep';
import { ServiceTierStep } from '../workstations/ServiceTierStep';
import { ServiceViewStep } from '../workstations/ServiceViewStep';
import { buildServiceItemForStationHandoff } from '../workstations/ServiceCatalogWorkstation';
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
  const [overlay, setOverlay] = useState<ActionConfig | null>(null);
  const scope = useMemo<StationManagerScope>(() => ({
    kind: 'connection-graph', stationContext: { type: 'service', id: deps.service.id },
    activeProviderKey: deps.initialProvider,
  }), [deps.service.id, deps.initialProvider]);
  useEffect(() => { ctx.setPanelMode('manager-wide'); return () => ctx.setPanelMode('standard'); }, [ctx.setPanelMode]);

  const openPromotion = (promotionId?: string, edit = false) => {
    setOverlay({
      id: `promotion-overview-${promotionId ?? 'new'}`,
      mode: 'drawer', title: 'Promotion',
      initialStepData: { serviceId: deps.service.id, promotionId, edit },
      steps: [{ id: 'overview', title: 'Promotion Overview', component: PromotionOverviewDrawerStep }],
    });
  };

  // View/Edit from the Package Manager Services table opens the authoritative
  // Service drawer (never a group-local model); the drawer loads its own
  // detail and owns all editing affordances.
  const openService = (summary: StationSummary, edit = false) => {
    setOverlay({
      id: `service-view-${summary.id}${edit ? '-edit' : ''}`,
      mode: 'drawer', title: 'Service Detail',
      initialStepData: {
        service: buildServiceItemForStationHandoff(summary),
        packages: deps.packages, openAction: deps.openAction,
        allCategories: deps.allCategories, onRefresh: deps.onRefresh,
        initialTab: 'details',
      },
      steps: [{ id: 'detail', title: 'Service Detail', component: ServiceViewStep }],
    });
  };

  const openPackage = (occupantId: string, slotId: string, edit = false) => {
    setOverlay({
      id: `package-tier-${occupantId}`,
      mode: 'drawer', title: 'Package', hideStepHeader: true,
      initialStepData: {
        serviceId: deps.service.id, service: deps.service, openAction: deps.openAction,
        onRefresh: deps.onRefresh, initialOccupantId: occupantId, initialTierId: slotId,
        initialTierSection: edit ? 'tier-overview' : undefined,
      },
      steps: [{ id: 'package-tier', title: 'Tier Overview', component: ServiceTierStep }],
    });
  };

  return (
    <>
      <DynamicStationManager scope={scope} shell={ctx} onOpenPromotion={openPromotion} onOpenPackage={openPackage} onOpenService={openService} />
      {overlay && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--admin-z-action)' }}>
          <ActionShell
            key={overlay.id}
            config={overlay}
            onClose={() => setOverlay(null)}
            onComplete={() => setOverlay(null)}
          />
        </div>,
        document.querySelector('.cz-admin-root') ?? document.body,
      )}
    </>
  );
}
