// AdminStation — the root application boundary for the new administration
// environment. It provides application-level state (theme + active destination)
// and stamps the active theme onto `data-station-theme` on the root element,
// which scopes all token overrides. It shares only platform infrastructure with
// the existing system and imports nothing from the old admin tree.
//
// Architecture:
//   AdminStation
//   ├── Header
//   ├── Body
//   └── Footer
//   (+ a slide-menu overlay opened from the Header)

import { AdminStationProvider, useAdminStation } from './AdminStationContext';
import { AdminStationDrawerProvider } from './shell/drawer/AdminStationDrawerContext';
import { AdminStationLayout } from './shell/AdminStationLayout';

function AdminStationRoot() {
  const { theme } = useAdminStation();
  return (
    <div class="cz-admin-station" data-station-theme={theme}>
      <AdminStationLayout />
    </div>
  );
}

export function AdminStation() {
  return (
    <AdminStationProvider>
      <AdminStationDrawerProvider>
        <AdminStationRoot />
      </AdminStationDrawerProvider>
    </AdminStationProvider>
  );
}
