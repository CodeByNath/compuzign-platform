import { useEffect, useMemo } from 'preact/hooks';
import type { StationManagerScope } from '../relations/types';
import { DynamicStationManager } from '../relations/DynamicStationManager';
import { usePageManagerShell } from '../relations/usePageManagerShell';
import {
  buildPackageTierDrawerConfig,
  buildPromotionDrawerConfig,
} from '../relations/packageManagerDrawers';
import { buildServiceDetailDrawerConfig } from '../relations/serviceDrawerConfig';
import type { DrawerHostContext } from '../relations/serviceDrawerConfig';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { Workstation } from '../shell/Workstation';
import { AsyncError, AsyncLoading } from '../ui/AsyncSection';
import type { WorkstationSurfaceProps } from '../schema/workstations';
import { buildServiceItemForStationHandoff, normalizeAdminCategories } from './ServiceCatalogWorkstation';

// Package Manager workstation (Phase 1).
//
// Page host for the existing coordinator and Package provider. The full
// manager-in-drawer route is retired; Phase D reduces this remaining page to
// supported Package concerns.
//
// The Package Station is global; its REST family is addressed through a
// compatibility host-Service id (any existing Service post). The host resolves
// from loaded data — a Package's first service_ref, else the first catalogue
// Service — mirroring what the drawer flow would supply.

export function PackageManagerWorkstation({ refreshKey, openAction, setNavigationInterceptor }: WorkstationSurfaceProps) {
  const { data, loading, error, refetch } = useAdminCatalog();
  const { data: surfacePkgData } = useSurfacePackages();
  const { shell, footer } = usePageManagerShell();

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  // Sidebar navigation runs through the manager's exit guard: clean state
  // passes straight through; dirty state surfaces the manager's own
  // unsaved-changes dialog, whose Discard resumes the deferred navigation.
  useEffect(() => {
    setNavigationInterceptor?.((proceed) => shell.requestExit({ kind: 'destination', target: 'workstation-navigation' }, proceed));
    return () => setNavigationInterceptor?.(null);
  }, [setNavigationInterceptor, shell.requestExit]);

  const packages = surfacePkgData?.packages ?? [];
  const stations = data?.stations ?? [];

  const hostSummary = useMemo(() => {
    const preferredId = packages[0]?.service_refs?.[0];
    return stations.find((station) => station.id === preferredId) ?? stations[0];
  }, [packages, stations]);

  const scope = useMemo<StationManagerScope | null>(() => hostSummary ? ({
    kind: 'connection-graph', stationContext: { type: 'service', id: hostSummary.id },
  }) : null, [hostSummary?.id]);

  if (loading && !data) return <AsyncLoading label="Loading Package Manager…" />;
  if (error) return <AsyncError error={error} onRetry={refetch} />;

  if (!hostSummary || !scope) {
    return (
      <div class="cz-admin-empty">
        <p><strong>Package Manager</strong> needs at least one Service in the catalogue before the Package Station can be managed.</p>
      </div>
    );
  }

  const drawerDeps: DrawerHostContext = {
    service: buildServiceItemForStationHandoff(hostSummary),
    packages,
    allCategories: normalizeAdminCategories(data?.categories ?? []),
    openAction,
    onRefresh: refetch,
  };

  return (
    <Workstation className="cz-package-manager-workstation">
      <Workstation.Header className="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Package Manager</h2>
          <p class="cz-ws-subtitle">Connected Services, source relationships, Rate Sheet, and Package tiers.</p>
        </div>
      </Workstation.Header>
      <Workstation.Content>
        {/* Keyed by the compat host so a host change remounts coordinator state. */}
        <DynamicStationManager
          key={hostSummary.id}
          scope={scope}
          shell={shell}
          onOpenPromotion={(promotionId, edit) => openAction(buildPromotionDrawerConfig(hostSummary.id, promotionId, edit))}
          onOpenService={(summary, edit) => openAction(buildServiceDetailDrawerConfig(drawerDeps, summary, edit))}
          onOpenPackage={(occupantId, slotId, edit) => openAction(buildPackageTierDrawerConfig(drawerDeps, occupantId, slotId, edit))}
        />
      </Workstation.Content>
      {footer && <div class="cz-package-manager-workstation__footer">{footer}</div>}
    </Workstation>
  );
}
