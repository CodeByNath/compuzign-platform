// Station presentation shell — the one ordered section loop for a station's
// presentation placement.
//
// The Home presentation region renders exactly ONE of these for the active
// station. It resolves every wall bound to that station's presentation
// placement (the resolver returns them sorted by each binding's declared
// `order`) and renders each through the generic StationSurfaceHost. The host
// owns the section chrome because a disabled capability must be able to omit
// its content section while retaining an assignment control.
//
// Composition only. The shell owns section resolution and rendering sequence —
// nothing else. It never names an entity, calls no
// endpoint, and holds no business state: which sections exist, their sources,
// kits, drawers, and order all live in the binding table, so a future station
// (Package, Subscription, CRM, …) reuses this shell by adding rows there.

import type { VNode } from 'preact';
import { StationSurfaceHost } from './StationSurfaceHost';
import type { ResolvedStationIntent } from './StationSurfaceHost';
import { resolveSurfaceBindings } from './surfaceBindings';

interface Props {
  stationId: string;
  // Forwarded unchanged to every section's host: the drawer dispatch carrying
  // the resolved intent plus THAT section's own refresh handle, so a save in
  // the drawer refreshes the section it came from and no other surface.
  onDispatch: (intent: ResolvedStationIntent, refetchSurface: () => void) => void;
}

export function StationPresentationShell({ stationId, onDispatch }: Props): VNode {
  const sections = resolveSurfaceBindings(stationId, 'presentation');

  // Same neutral copy the presentation region shows when handed nothing, so a
  // station with no bound sections reads as intentionally empty, not broken.
  if (sections.length === 0) {
    return <p class="cz-station-empty">No presentation content has been provided.</p>;
  }

  return (
    <>
      {sections.map((binding) => (
        <StationSurfaceHost
          // Remount when the bound surface changes so each section's resolved
          // data source hook stays stable for the life of its own mount. The
          // data source key is part of the identity deliberately: it is the
          // thing that decides WHICH hook the host calls, so re-pointing a
          // section can never swap a hook under a live instance.
          key={`${binding.stationId}:${binding.surfaceId}:${binding.dataSourceKey}`}
          binding={binding}
          onDispatch={onDispatch}
        />
      ))}
    </>
  );
}
