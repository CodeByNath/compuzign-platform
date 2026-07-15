// The Body is where the selected area is mounted. It owns content positioning,
// scrolling, width, and responsive padding only — never business logic. The
// active surface arrives through the routed StationOutlet.

import { StationOutlet } from '../AdminStationRouter';

export function AdminStationBody() {
  return (
    <main class="cz-station-body" tabIndex={-1}>
      <div class="cz-station-body__inner">
        <StationOutlet />
      </div>
    </main>
  );
}
