// Body — hosts the Admin Station Home shell.
//
// The presentation region is not hardcoded to a data source, a kit, or even to a
// single surface. It resolves EVERY wall bound to the active station's
// presentation placement through the dynamic binding table
// (stations/surfaceBindings) and renders each through the generic
// StationSurfaceHost: destination → data source key → template kit key →
// placement → conditions → action intents.
//
//   placement → multiple bindings → multiple walls
//
// So the Service home stacks the Package Families wall and the Service Category
// Groups wall, each with its own source, kit, actions, and drawer. Adding,
// reordering, or removing a wall is a binding row — not an edit here. The shell
// stays entity-agnostic and prints whatever kits the bindings name.
//
// Active station: the resolved nav destination's station, or the Service home
// (DEFAULT_HOME_STATION) when nothing is selected. A station with no presentation
// binding resolves to an empty list and the region shows the Home shell's
// neutral empty state.
//
// Action intents open the shared drawer: the dispatch carries the record's own
// id (numeric or string, per entity), the intent naming a drawer template + tab,
// and the ORIGINATING wall's refresh handle — so a save inside the drawer
// refreshes that wall and no other surface.

import type { VNode } from 'preact';
import { AdminStationHome } from '../home/AdminStationHome';
import { useAdminStation } from '../AdminStationContext';
import { useAdminStationDrawer } from './drawer/AdminStationDrawerContext';
import { StationSurfaceHost } from '../stations/StationSurfaceHost';
import { resolveSurfaceBindings, DEFAULT_HOME_STATION } from '../stations/surfaceBindings';

export function AdminStationBody() {
  const { activeDestination } = useAdminStation();
  const { openFromIntent } = useAdminStationDrawer();

  // The station whose presentation walls show: the active destination's station,
  // or the Service home landing surface when nothing is selected.
  const stationId = activeDestination?.stationId ?? DEFAULT_HOME_STATION;
  const presentationBindings = resolveSurfaceBindings(stationId, 'presentation');

  const walls: VNode[] = presentationBindings.map((binding) => (
    <section
      // Remount when the bound surface changes so each wall's resolved data
      // source hook stays stable for the life of its own mount. The data source
      // key is part of the identity deliberately: it is the thing that decides
      // WHICH hook the host calls, so re-pointing a wall can never swap a hook
      // under a live instance.
      key={`${binding.stationId}:${binding.surfaceId}:${binding.dataSourceKey}`}
      class="cz-station-wall"
      aria-label={binding.title}
    >
      {binding.title && <h3 class="cz-station-wall__title">{binding.title}</h3>}
      <StationSurfaceHost
        binding={binding}
        // Each wall dispatches its OWN refresh handle alongside the intent; the
        // drawer controller remembers whichever wall opened it.
        onDispatch={openFromIntent}
      />
    </section>
  ));

  return (
    <main class="cz-admin-station__body">
      <AdminStationHome
        presentation={{
          content: walls.length > 0 ? <>{walls}</> : undefined,
        }}
      />
    </main>
  );
}
