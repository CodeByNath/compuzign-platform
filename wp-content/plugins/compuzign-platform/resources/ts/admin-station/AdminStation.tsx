// AdminStation — the root application boundary for the new administration
// environment. It is frozen at an empty structural shell: Header, Sidebar,
// Body, and Footer, with no navigation, content, branding, or visual theme
// decided yet.

import { AdminStationLayout } from './shell/AdminStationLayout';

export function AdminStation() {
  return <AdminStationLayout />;
}
