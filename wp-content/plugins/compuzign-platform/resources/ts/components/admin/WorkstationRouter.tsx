import type { WorkstationId } from '@/api/types/admin';
import type { ActionConfig } from './ActionShell';
import { WORKSTATION_INDEX } from './schema/workstations';
import type { WorkstationNavigationInterceptor } from './schema/workstations';
import { EntityTableWorkstation } from './workstations/EntityTableWorkstation';

interface Props {
  active: WorkstationId;
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
  setNavigationInterceptor: (interceptor: WorkstationNavigationInterceptor | null) => void;
}

// Registry dispatch (S5): the WORKSTATIONS registry owns the id → surface
// mapping; this router only realises the surface kind. Adding a workstation
// is one registry entry — this file does not change.
export function WorkstationRouter({ active, refreshKey, openAction, setNavigationInterceptor }: Props) {
  const def = WORKSTATION_INDEX[active];

  if (!def) {
    return (
      <div class="cz-admin-empty">
        <p><strong>{active}</strong> workstation is not yet available.</p>
      </div>
    );
  }

  if (def.surface.kind === 'entity-table') {
    const { entity, scope } = def.surface;
    // Keyed per entity:scope — useApi fetchers are fixed at mount, so a scope
    // change must remount the surface rather than re-render it.
    return (
      <EntityTableWorkstation
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
