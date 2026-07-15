// The Layout composes the four structural regions of the Admin Station shell:
// Header, Sidebar, Body, and Footer. It owns arrangement only. No navigation,
// content, or visual decisions live here.

import { AdminStationHeader } from './AdminStationHeader';
import { AdminStationSidebar } from './AdminStationSidebar';
import { AdminStationBody } from './AdminStationBody';
import { AdminStationFooter } from './AdminStationFooter';

export function AdminStationLayout() {
  return (
    <div class="cz-admin-station">
      <AdminStationSidebar />
      <div class="cz-admin-station__frame">
        <AdminStationHeader />
        <AdminStationBody />
        <AdminStationFooter />
      </div>
    </div>
  );
}
