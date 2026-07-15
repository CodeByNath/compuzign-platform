// AdminStation — the root application boundary for the new administration
// environment. It owns global layout, navigation state, active destination,
// responsive sidebar state, and application-level overlay hosts. It knows
// nothing about Service, Package, Tier, Promotion, or pricing.
//
// This is the independent frame described in the build plan: Header, Sidebar,
// Body, and Footer, with a single Home destination and no dependency on the
// existing manager architecture.

import { AdminStationProvider } from './AdminStationContext';
import { AdminStationLayout } from './shell/AdminStationLayout';

export function AdminStation() {
  return (
    <AdminStationProvider>
      <AdminStationLayout />
    </AdminStationProvider>
  );
}
