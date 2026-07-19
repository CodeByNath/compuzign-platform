import { useEffect, useMemo } from 'preact/hooks';
import type { StationManagerScope } from '../relations/types';
import { DynamicStationManager } from '../relations/DynamicStationManager';
import { usePageManagerShell } from '../relations/usePageManagerShell';
import {
  buildPackageTierDrawerConfig,
  buildPromotionDrawerConfig,
} from '../relations/packageManagerDrawers';
import type { PackageDrawerContext } from '../relations/packageManagerDrawers';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { Station } from '../shell/Station';
import { AsyncError, AsyncLoading } from '@/drawer-kit/ui/AsyncSection';
import type { StationSurfaceProps } from '../schema/stations';
import { buildServiceItemForStationHandoff } from './ServiceCatalogStation';

// Package Manager station (Phase 1).
//
// Packages surface: supported Tier presentation and Promotions only. Service
// supply, connections, Commercial Groups, and Rate Sheet configuration live on
// Your Service Manager; future package capabilities are not invented here.
//
// The Package Station is global; its REST family is addressed through a
// compatibility host-Service id (any existing Service post). The host resolves
// from loaded data — a Package's first service_ref, else the first catalogue
// Service — mirroring what the drawer flow would supply.

export function PackageManagerStation({ refreshKey, openAction, setNavigationInterceptor }: StationSurfaceProps) {
  const { data, loading, error, refetch } = useAdminCatalog();
  const { data: surfacePkgData } = useSurfacePackages();
  const { shell, footer } = usePageManagerShell();

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  // Sidebar navigation runs through the manager's exit guard: clean state
  // passes straight through; dirty state surfaces the manager's own
  // unsaved-changes dialog, whose Discard resumes the deferred navigation.
  // `workstation-navigation` is a destination ID, not a symbol — kept verbatim.
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

  const drawerDeps: PackageDrawerContext = {
    service: buildServiceItemForStationHandoff(hostSummary),
    openAction,
    onRefresh: refetch,
  };

  return (
    <Station className="cz-package-manager-workstation">
      <Station.Header className="cz-ws-header">
        <div>
          <p class="cz-ws-eyebrow">Package Station</p>
          <h2 class="cz-ws-title">Packages</h2>
          <p class="cz-ws-subtitle">Package tiers, customer-facing composition, and Promotions.</p>
        </div>
      </Station.Header>
      <Station.Content>
        {/* Keyed by the compat host so a host change remounts coordinator state. */}
        <DynamicStationManager
          key={hostSummary.id}
          scope={scope}
          shell={shell}
          surface="packages"
          onOpenPromotion={(promotionId, edit) => openAction(buildPromotionDrawerConfig(hostSummary.id, promotionId, edit))}
          onOpenPackage={(occupantId, slotId, edit) => openAction(buildPackageTierDrawerConfig(drawerDeps, occupantId, slotId, edit))}
        />
      </Station.Content>
      {footer && <div class="cz-package-manager-workstation__footer">{footer}</div>}
    </Station>
  );
}
