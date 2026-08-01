// Body — hosts the Admin Station Home shell.
//
// The Body decides WHICH station is live and wires drawer intents; everything
// the presentation region shows arrives through ONE StationPresentationShell
// for that station. The shell resolves the station's section bindings
// (Station Manager surface bindings), already sorted by their declared order, and
// renders each through the generic StationSurfaceHost:
//
//   station → presentation shell → ordered sections → source + kit per section
//
// Adding, reordering, or removing a section is a binding row — not an edit
// here or in the shell. Both stay entity-agnostic and print whatever kits the
// bindings name.
//
// Active station: the resolved nav destination's station, or the Service home
// (defaultHomeStation()) when nothing is selected. A station with no
// presentation binding renders the shell's neutral empty state.
//
// Action intents open the shared drawer: the dispatch carries the record's own
// id (numeric or string, per entity), the intent naming a drawer template + tab,
// and the ORIGINATING section's refresh handle — so a save inside the drawer
// refreshes that section and no other surface.

import { AdminStationHome } from '../home/AdminStationHome';
import { useAdminStation } from '../AdminStationContext';
import { useAdminStationDrawer } from './drawer/AdminStationDrawerContext';
import { StationPresentationShell } from '../presentation/StationPresentationShell';
import { defaultHomeStation } from '@/station-manager/registry/surfaceBindings';
import { PlatformIdentifierMigrationNotice } from './PlatformIdentifierMigrationNotice';

export function AdminStationBody() {
  const { activeDestination } = useAdminStation();
  const { openFromIntent } = useAdminStationDrawer();

  // The station whose presentation sections show: the active destination's
  // station, or the Service home landing surface when nothing is selected.
  const stationId = activeDestination?.stationId ?? defaultHomeStation();

  return (
    <main class="cz-admin-station__body">
      <PlatformIdentifierMigrationNotice />
      <AdminStationHome
        presentation={{
          content: (
            <StationPresentationShell stationId={stationId} onDispatch={openFromIntent} />
          ),
        }}
      />
    </main>
  );
}
