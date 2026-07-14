import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ExitGuard, ExitIntent } from '../ActionShell';
import type { StationManagerScope } from '../relations/types';
import { DynamicStationManager } from '../relations/DynamicStationManager';
import type { ManagerShellContext } from '../relations/DynamicStationManager';
import {
  buildPackageTierDrawerConfig,
  buildPromotionDrawerConfig,
  buildServiceDetailDrawerConfig,
} from '../relations/stationManagerDrawers';
import type { StationManagerDrawerContext } from '../relations/stationManagerDrawers';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { Workstation } from '../shell/Workstation';
import { AsyncError, AsyncLoading } from '../ui/AsyncSection';
import type { WorkstationSurfaceProps } from '../schema/workstations';
import { buildServiceItemForStationHandoff, normalizeAdminCategories } from './ServiceCatalogWorkstation';

// Package Manager workstation (Phase 1).
//
// Page host for the existing DynamicStationManager: same providers, coordinator
// state, drafts, validation, and save authority as the Station Manager drawer —
// only the shell differs. The drawer entry (StationManagerStep) remains fully
// operational; this surface adds a top-level route, it does not replace it.
//
// The Package Station is global; its REST family is addressed through a
// compatibility host-Service id (any existing Service post). The host resolves
// from loaded data — a Package's first service_ref, else the first catalogue
// Service — mirroring what the drawer flow would supply.

// Page-level ManagerShellContext: the same exit-guard / pending-exit / footer
// contract ActionShell gives drawer steps, re-implemented for a workstation
// page. The manager's own dialogs drive confirm/cancel; this adapter only
// holds the guard and the deferred continuation.
function usePageManagerShell(): { shell: ManagerShellContext; footer: ComponentChildren } {
  const exitGuardRef = useRef<ExitGuard | null>(null);
  const pendingExitRef = useRef<(() => void) | null>(null);
  const [footer, setFooterState] = useState<ComponentChildren>(null);

  const setExitGuard = useCallback((guard: ExitGuard | null) => {
    exitGuardRef.current = guard;
    if (guard === null) pendingExitRef.current = null;
  }, []);
  const requestExit = useCallback((intent: ExitIntent, continuation: () => void) => {
    const allowed = exitGuardRef.current ? exitGuardRef.current(intent) : true;
    if (!allowed) {
      pendingExitRef.current = continuation;
      return;
    }
    pendingExitRef.current = null;
    continuation();
  }, []);
  const confirmPendingExit = useCallback(() => {
    const continuation = pendingExitRef.current;
    pendingExitRef.current = null;
    continuation?.();
  }, []);
  const cancelPendingExit = useCallback(() => {
    pendingExitRef.current = null;
  }, []);
  const setFooter = useCallback((content: ComponentChildren) => setFooterState(content), []);

  const shell = useMemo<ManagerShellContext>(
    () => ({ setExitGuard, requestExit, confirmPendingExit, cancelPendingExit, setFooter }),
    [setExitGuard, requestExit, confirmPendingExit, cancelPendingExit, setFooter],
  );
  return { shell, footer };
}

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

  const drawerDeps: StationManagerDrawerContext = {
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
