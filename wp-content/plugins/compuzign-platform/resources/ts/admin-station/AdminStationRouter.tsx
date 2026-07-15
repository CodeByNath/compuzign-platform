// The routed outlet. It mounts the component of the active destination from the
// single navigation registry. There is no separate route table — the registry
// is authoritative — so navigation and routing cannot diverge.

import { useAdminStation } from './AdminStationContext';

export function StationOutlet() {
  const { activeDestination } = useAdminStation();

  if (!activeDestination) {
    // Should not occur — the context coerces unknown destinations to the
    // default — but the outlet stays defensive rather than rendering nothing.
    return (
      <div class="cz-station-outlet__empty">
        This destination is not available yet.
      </div>
    );
  }

  const Surface = activeDestination.component;
  return <Surface />;
}
