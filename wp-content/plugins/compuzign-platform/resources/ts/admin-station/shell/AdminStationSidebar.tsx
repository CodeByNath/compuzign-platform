// The Sidebar provides navigation destinations. It owns its brand mark and
// delegates the destination list to AdminStationNavigation. On narrow displays
// it becomes an overlay drawer controlled by the Admin Station's responsive
// state; on wide displays it is a persistent, collapsible rail.

import { useAdminStation } from '../AdminStationContext';
import { AdminStationNavigation } from './AdminStationNavigation';

export function AdminStationSidebar() {
  const { collapsed, mobileOpen, setMobileOpen } = useAdminStation();

  return (
    <>
      {mobileOpen && (
        <div
          class="cz-station-sidebar__scrim"
          role="presentation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        class={
          'cz-station-sidebar'
          + (collapsed ? ' cz-station-sidebar--collapsed' : '')
          + (mobileOpen ? ' cz-station-sidebar--open' : '')
        }
      >
        <div class="cz-station-sidebar__brand">
          <span class="cz-station-sidebar__brand-mark">CZ</span>
          {!collapsed && <span class="cz-station-sidebar__brand-text">Admin Station</span>}
        </div>
        <AdminStationNavigation collapsed={collapsed} />
      </aside>
    </>
  );
}
