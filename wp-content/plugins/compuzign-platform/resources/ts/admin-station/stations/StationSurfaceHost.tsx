// Station surface host — the generic composer that turns a binding into a
// rendered surface.
//
// It resolves the binding's data source key to a read hook and its template kit
// key to a presentation kit, calls the source, and hands the collection to the
// kit. It holds no entity logic and names no entity: it is the single seam where
// a declared binding becomes live UI, so the shell can print any registered
// template into a placement region without branching.
//
// Rules of Hooks: the host calls exactly one data-source hook, chosen by key.
// The caller mounts it with a `key` that changes when the binding changes, so a
// resolved source is stable for the life of a mount — the selected hook never
// swaps under a live instance.

import type { VNode } from 'preact';
import { DATA_SOURCES } from './dataSources';
import { TEMPLATE_KITS } from '../presentation/templateKits';
import { SURFACE_BINDINGS } from './surfaceBindings';
import type { AdminStationSurfaceBinding, StationActionIntent } from './surfaceBindings';
import type { StationRecordId } from './recordIdentity';

// A dispatched, resolved intent: the acted-on record's own id, the binding's
// matching action intent (its target + mode), and the drawer template the
// surface opens (carried from the binding so the drawer controller resolves it
// without re-reading the binding table).
//
// The host passes the id straight through from the kit — it neither inspects nor
// converts it, so a term_id arrives at the drawer as a number and a group_id as
// a string.
export interface ResolvedStationIntent {
  recordId:           StationRecordId;
  intent:             StationActionIntent;
  drawerTemplateKey?: string;
}

// Resolvability guard — runs once at load, here because this is the one module
// where the bindings and both registries are in scope. A binding that names a
// data source or template kit the registries do not define is a static authoring
// error that would otherwise render nothing at runtime, so it fails loudly now.
function assertBindingsResolvable(list: AdminStationSurfaceBinding[]): void {
  const problems: string[] = [];
  for (const b of list) {
    const at = `${b.stationId}::${b.surfaceId}::${b.placement}`;
    if (!(b.dataSourceKey in DATA_SOURCES)) {
      problems.push(`${at} → unknown data source '${b.dataSourceKey}'`);
    }
    if (!(b.templateKitKey in TEMPLATE_KITS)) {
      problems.push(`${at} → unknown template kit '${b.templateKitKey}'`);
    }
  }
  if (problems.length) {
    throw new Error(
      `[AdminStation] surface binding(s) do not resolve: ${problems.join('; ')}.`,
    );
  }
}

assertBindingsResolvable(SURFACE_BINDINGS);

interface Props {
  binding: AdminStationSurfaceBinding;
  // Dispatch carries the resolved intent plus THIS wall's own refresh handle, so
  // whatever the intent opens can refresh the wall it came from and nothing else.
  // The handle is passed alongside the intent rather than inside it: the intent
  // stays pure, serialisable data.
  onDispatch: (intent: ResolvedStationIntent, refetchSurface: () => void) => void;
}

export function StationSurfaceHost({ binding, onDispatch }: Props): VNode {
  const useDataSource = DATA_SOURCES[binding.dataSourceKey];
  const { items, loading, error, refetch } = useDataSource();
  const Kit = TEMPLATE_KITS[binding.templateKitKey];

  return (
    <Kit
      items={items}
      loading={loading}
      error={error}
      onIntent={(recordId, intentId) => {
        const intent = binding.actionIntents.find((i) => i.id === intentId);
        // An unmatched action dispatches nothing rather than guessing a target.
        if (intent) {
          onDispatch(
            { recordId, intent, drawerTemplateKey: binding.drawerTemplateKey },
            refetch,
          );
        }
      }}
    />
  );
}
