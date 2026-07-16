import type { StationId } from '@/api/types/admin';
import type { ActionConfig } from './ActionShell';
import { STATION_INDEX } from './schema/stations';
import type { StationNavigationInterceptor } from './schema/stations';
import { EntityTableStation } from './stations/EntityTableStation';

interface Props {
  active: StationId;
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
  setNavigationInterceptor: (interceptor: StationNavigationInterceptor | null) => void;
}

// Registry dispatch (S5): the STATIONS registry owns the id → surface
// mapping; this router only realises the surface kind. Adding a station
// is one registry entry — this file does not change.
export function StationRouter({ active, refreshKey, openAction, setNavigationInterceptor }: Props) {
  const def = STATION_INDEX[active];

  if (!def) {
    return (
      <div class="cz-admin-empty">
        <p><strong>{active}</strong> station is not yet available.</p>
      </div>
    );
  }

  if (def.surface.kind === 'entity-table') {
    const { entity, scope } = def.surface;
    // Keyed per entity:scope — useApi fetchers are fixed at mount, so a scope
    // change must remount the surface rather than re-render it.
    return (
      <EntityTableStation
        key={`${entity}:${scope}`}
        entity={entity}
        scope={scope}
        refreshKey={refreshKey}
      />
    );
  }

  const Surface = def.surface.component();
  return <Surface refreshKey={refreshKey} openAction={openAction} setNavigationInterceptor={setNavigationInterceptor} />;
}
