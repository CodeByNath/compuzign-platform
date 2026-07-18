// Body — hosts the Admin Station Home shell.
//
// The presentation region is no longer hardcoded to one data source and one
// kit. It resolves the active station's presentation surface through the dynamic
// binding table (stations/surfaceBindings) and renders it through the generic
// StationSurfaceHost: destination → data source key → template kit key →
// placement → conditions → action intents. Adding or changing a presentation
// surface is now a binding row, not an edit here — the shell stays
// entity-agnostic and prints whatever kit the binding names.
//
// Active station: the resolved nav destination's station, or the Service home
// (DEFAULT_HOME_STATION) when nothing is selected — the Service Category Groups
// wall is the landing surface. A station with no presentation binding resolves
// to nothing and the region shows the Home shell's neutral empty state.
//
// Action intents are carried, not yet consumed: the dispatched record identity
// is numeric and the intent names a drawer mode, but the station drawer does not
// exist yet (Phase 3). No groups are supplied; the group region falls to the
// shell's own no-group behaviour.

import { useCallback } from 'preact/hooks';
import { AdminStationHome } from '../home/AdminStationHome';
import { useAdminStation } from '../AdminStationContext';
import { StationSurfaceHost } from '../stations/StationSurfaceHost';
import type { ResolvedStationIntent } from '../stations/StationSurfaceHost';
import { resolveSurfaceBinding, DEFAULT_HOME_STATION } from '../stations/surfaceBindings';

export function AdminStationBody() {
  const { activeDestination } = useAdminStation();

  // The station whose presentation wall shows: the active destination's station,
  // or the Service home landing surface when nothing is selected.
  const stationId = activeDestination?.stationId ?? DEFAULT_HOME_STATION;
  const presentationBinding = resolveSurfaceBinding(stationId, 'presentation');

  // The intent seam. Every dispatch carries the acted-on record's numeric id and
  // the binding's resolved intent (target + mode). The station drawer that would
  // consume it does not exist yet — the identity and mode are carried, inert,
  // ready for Phase 3 to attach the drawer here.
  const handleIntent = useCallback((_intent: ResolvedStationIntent) => {
    // Intentionally inert — awaiting the station drawer shell (Phase 3).
  }, []);

  return (
    <main class="cz-admin-station__body">
      <AdminStationHome
        presentation={{
          content: presentationBinding
            ? (
              <StationSurfaceHost
                // Remount when the bound surface changes so the resolved data
                // source hook stays stable for the life of a mount.
                key={`${presentationBinding.stationId}:${presentationBinding.surfaceId}`}
                binding={presentationBinding}
                onDispatch={handleIntent}
              />
            )
            : undefined,
        }}
      />
    </main>
  );
}
