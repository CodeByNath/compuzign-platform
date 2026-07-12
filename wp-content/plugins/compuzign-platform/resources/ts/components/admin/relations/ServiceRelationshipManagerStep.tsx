import { useEffect, useMemo } from 'preact/hooks';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { Category, ServiceItem } from '@/api/types/cost-builder';
import type { SurfacePackageSummary } from '@/api/types/admin';
import { ServiceTierStep } from '../workstations/ServiceTierStep';
import { DynamicStationManager } from './DynamicStationManager';
import type {
  ManagerContinuation, StationConnectionDescriptor, StationManagerScope,
} from './types';

export interface ServiceManagerDependencies {
  service: ServiceItem;
  packages: SurfacePackageSummary[];
  allCategories: Category[];
  openAction: (config: ActionConfig) => void;
  onRefresh?: () => void;
  returnToService: () => void;
}

export function buildServiceManagerConfig(
  deps: ServiceManagerDependencies,
  connection: StationConnectionDescriptor,
  continuation?: ManagerContinuation,
): ActionConfig {
  return {
    id: `service-manager-${deps.service.id}-${connection.providerKey}`,
    mode: 'drawer',
    title: 'Manager',
    onBack: deps.returnToService,
    hideStepHeader: true,
    initialStepData: { ...deps, connection, continuation },
    steps: [{ id: 'service-relationship-manager', title: 'Service relationships', component: ServiceRelationshipManagerStep }],
  };
}

export function ServiceRelationshipManagerStep({ ctx }: { ctx: StepContext }) {
  const deps = ctx.stepData as unknown as ServiceManagerDependencies & {
    connection: StationConnectionDescriptor;
    continuation?: ManagerContinuation;
  };
  const { service, connection, continuation, openAction, onRefresh } = deps;
  const scope = useMemo<StationManagerScope>(() => ({
    kind: 'connection-graph',
    stationContext: { type: 'service', id: service.id },
    activeProviderKey: continuation?.activeProviderKey ?? connection.providerKey,
    activeRelationshipKey: continuation?.activeRelationshipKey ?? connection.relationshipKey,
  }), [service.id, connection, continuation]);

  useEffect(() => {
    ctx.setPanelMode('manager-wide');
    return () => ctx.setPanelMode('standard');
  }, [ctx.setPanelMode]);

  const openDestination = (
    action: 'view-all' | 'open-current' | 'edit-current',
    nextContinuation: ManagerContinuation,
  ) => {
    const destination = nextContinuation.destination ?? nextContinuation.subject;
    const tierId = destination?.type === 'tier' ? String(destination.id) : undefined;
    const returnToManager = () => openAction(buildServiceManagerConfig(
      deps, connection, nextContinuation,
    ));

    ctx.close();
    openAction({
      id: `service-tiers-${service.id}`,
      mode: 'drawer',
      title: 'Package',
      onBack: returnToManager,
      hideStepHeader: true,
      initialStepData: {
        serviceId: service.id,
        service,
        openAction,
        onRefresh,
        serviceBack: returnToManager,
        initialTierId: action === 'open-current' || action === 'edit-current' ? tierId : undefined,
        initialTierSection: action === 'edit-current' ? 'tier-overview' : undefined,
      },
      steps: [{ id: 'service-tiers', title: 'Tier Configuration', component: ServiceTierStep }],
    });
  };

  return (
    <DynamicStationManager
      scope={scope}
      shell={ctx}
      connection={connection}
      continuation={continuation}
      onDestination={openDestination}
    />
  );
}
