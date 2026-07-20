// Admin Station Home — the station-agnostic body shell.
//
// Composes the two regions of the Home body and owns nothing else:
//
//   Home (centred, max-width bounded, twelve-column grid)
//   ├── Presentation region  — natural content height
//   └── Station-group region — dynamic tabs (sticky below the header) + panel
//
// Neither region scrolls on its own: both are part of the single page scroll
// the whole Admin Station shares, with the Header and the group tabs sticking
// to the top of it. Both regions are supplied through the Home contract, so
// the shell stays reusable by any future station.
//
// The station-group region is optional: it renders only when a station actually
// supplies groups. No station supplies any today, so the region is intentionally
// unused — omitting it (rather than rendering an empty "No station groups have
// been configured" placeholder) keeps a station whose content lives entirely in
// its presentation walls, like the Package Station, from reading as broken.

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
      {groups && groups.length > 0 && <AdminStationGroups groups={groups} />}
    </div>
  );
}
