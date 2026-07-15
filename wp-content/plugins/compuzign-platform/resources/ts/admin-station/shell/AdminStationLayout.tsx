// The Layout composes the global frame: Header, Sidebar, Body, and Footer. It
// owns arrangement only — the responsive grid — and defers all navigation and
// content decisions to its children.

import { useAdminStation } from '../AdminStationContext';
import { AdminStationHeader } from './AdminStationHeader';
import { AdminStationSidebar } from './AdminStationSidebar';
import { AdminStationBody } from './AdminStationBody';
import { AdminStationFooter } from './AdminStationFooter';

export function AdminStationLayout() {
  const { collapsed } = useAdminStation();

  return (
    <div class={`cz-admin-station${collapsed ? ' cz-admin-station--collapsed' : ''}`}>
      <AdminStationSidebar />
      <div class="cz-admin-station__frame">
        <AdminStationHeader />
        <AdminStationBody />
        <AdminStationFooter />
      </div>
    </div>
  );
}
