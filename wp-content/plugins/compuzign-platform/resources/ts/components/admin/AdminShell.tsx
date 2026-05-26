import { useState, useCallback } from 'preact/hooks';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { StatusStrip } from './StatusStrip';
import { WorkstationRouter } from './WorkstationRouter';
import { ActionShell } from './ActionShell';
import type { ActionConfig } from './ActionShell';
import type { WorkstationId } from '@/api/types/admin';

export function AdminShell() {
  const [activeWorkstation, setActiveWorkstation] = useState<WorkstationId>('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [actionConfig, setActionConfig] = useState<ActionConfig | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
        onNavigate={setActiveWorkstation}
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
          />
        </div>
      </div>

      {actionConfig && (
        <ActionShell
          config={actionConfig}
          onClose={closeAction}
          onComplete={handleActionComplete}
        />
      )}
    </div>
  );
}
