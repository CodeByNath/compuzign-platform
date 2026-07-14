import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { StatusStrip } from './StatusStrip';
import { WorkstationRouter } from './WorkstationRouter';
import { ActionShell } from './ActionShell';
import type { ActionConfig } from './ActionShell';
import type { WorkstationNavigationInterceptor } from './schema/workstations';
import type { WorkstationId } from '@/api/types/admin';

export function AdminShell() {
  const [activeWorkstation, setActiveWorkstation] = useState<WorkstationId>('overview');
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
  // unmount, so a stale guard can never block an unrelated workstation.
  const navigationInterceptorRef = useRef<WorkstationNavigationInterceptor | null>(null);
  const setNavigationInterceptor = useCallback((interceptor: WorkstationNavigationInterceptor | null) => {
    navigationInterceptorRef.current = interceptor;
  }, []);
  const navigateToWorkstation = useCallback((id: WorkstationId) => {
    const interceptor = navigationInterceptorRef.current;
    if (interceptor) interceptor(() => setActiveWorkstation(id));
    else setActiveWorkstation(id);
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
        active={activeWorkstation}
        collapsed={collapsed}
        onNavigate={navigateToWorkstation}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      <div class="cz-admin-main">
        <Topbar
          workstation={activeWorkstation}
          onToggleSidebar={() => setCollapsed((c) => !c)}
        />
        <StatusStrip />
        <div class="cz-admin-workstation-area">
          <WorkstationRouter
            active={activeWorkstation}
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
