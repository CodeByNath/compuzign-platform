import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { StatusStrip } from './StatusStrip';
import { StationRouter } from './StationRouter';
import { ActionShell } from './ActionShell';
import type { ActionConfig } from './ActionShell';
import type { StationNavigationInterceptor } from './schema/stations';
import type { StationId } from '@/api/types/admin';

export function AdminShell() {
  const [activeStation, setActiveStation] = useState<StationId>('overview');
  const [collapsed, setCollapsed] = useState(() => (
    typeof window === 'undefined' ? true : !window.matchMedia('(min-width: 1921px)').matches
  ));
  const [actionConfig, setActionConfig] = useState<ActionConfig | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // The 1920px viewport breakpoint controls only the navigation rail: wide
  // displays receive the full rail, while smaller displays begin icon-only.
  // The application frame itself remains full-width and left-aligned.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1921px)');
    const syncSidebar = (event: MediaQueryListEvent | MediaQueryList) => setCollapsed(!event.matches);
    syncSidebar(query);
    query.addEventListener('change', syncSidebar);
    return () => query.removeEventListener('change', syncSidebar);
  }, []);

  // Active surface's navigation guard (e.g. Package Manager with unsaved
  // drafts). Sidebar switches route through it; the surface clears it on
  // unmount, so a stale guard can never block an unrelated station.
  const navigationInterceptorRef = useRef<StationNavigationInterceptor | null>(null);
  const setNavigationInterceptor = useCallback((interceptor: StationNavigationInterceptor | null) => {
    navigationInterceptorRef.current = interceptor;
  }, []);
  const navigateToStation = useCallback((id: StationId) => {
    const interceptor = navigationInterceptorRef.current;
    if (interceptor) interceptor(() => setActiveStation(id));
    else setActiveStation(id);
  }, []);

  const openAction = useCallback((config: ActionConfig) => {
    setActionConfig(config);
  }, []);

  const closeAction = useCallback(() => {
    setActionConfig(null);
  }, []);

  const handleActionComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setActionConfig(null);
  }, []);

  return (
    <div class={`cz-admin-root${collapsed ? ' cz-admin-root--collapsed' : ''}`}>
      <Sidebar
        active={activeStation}
        collapsed={collapsed}
        onNavigate={navigateToStation}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      <div class="cz-admin-main">
        <Topbar
          station={activeStation}
          onToggleSidebar={() => setCollapsed((c) => !c)}
        />
        <StatusStrip />
        <div class="cz-admin-workstation-area">
          <StationRouter
            active={activeStation}
            refreshKey={refreshKey}
            openAction={openAction}
            setNavigationInterceptor={setNavigationInterceptor}
          />
        </div>
      </div>

      {actionConfig && (
        <ActionShell
          key={actionConfig.id}
          config={actionConfig}
          onClose={closeAction}
          onComplete={handleActionComplete}
        />
      )}
    </div>
  );
}
