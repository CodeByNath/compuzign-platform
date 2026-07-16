// Admin Station Home — the station-agnostic body shell.
//
// Composes the two regions of the Home body and owns nothing else:
//
//   Home (centred, max-width bounded, twelve-column grid)
//   ├── Presentation region  — bounded responsive height, inner content scrolls
//   └── Station-group region — dynamic tabs + the active group panel (scrolls)
//
// Both regions are supplied through the Home contract, so the shell stays
// reusable by any future station. No station is connected yet.

import type { AdminStationGroup, AdminStationPresentation as Presentation } from './stationHome';
import { AdminStationPresentation } from './AdminStationPresentation';
import { AdminStationGroups } from './AdminStationGroups';

interface Props {
  presentation?: Presentation;
  groups?: AdminStationGroup[];
}

export function AdminStationHome({ presentation, groups }: Props) {
  return (
    <div class="cz-station-home">
      <AdminStationPresentation presentation={presentation} />
      <AdminStationGroups groups={groups ?? []} />
    </div>
  );
}
