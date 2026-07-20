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
import type { StationIntentContext, StationRecordId } from './recordIdentity';

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
  context?:           StationIntentContext;
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

export function StationSurfaceHost({ binding, onDispatch }: Props): VNode | null {
  const useDataSource = DATA_SOURCES[binding.dataSourceKey];
  const { items, loading, error, refetch, meta, capability } = useDataSource(binding.conditions);
  const Kit = TEMPLATE_KITS[binding.templateKitKey];

  const dispatch = (
    recordId: StationRecordId,
    intentId: string,
    context?: StationIntentContext,
  ) => {
    const intent = binding.actionIntents.find((candidate) => candidate.id === intentId);
    if (intent) {
      onDispatch(
        {
          recordId,
          intent,
          drawerTemplateKey: intent.drawerTemplateKey ?? binding.drawerTemplateKey,
          context,
        },
        refetch,
      );
    }
  };

  if (binding.capability) {
    const definition = binding.capability;
    if (!definition.available) return null;

    // Loading/error/disabled assignment states are host chrome, not the
    // capability section. Its registered kit and section do not mount until the
    // assignment is enabled.
    if (capability?.loading && !capability.enabled) {
      return <p class="cz-station-empty" aria-busy="true">Loading capabilities…</p>;
    }
    if (capability?.error && !capability.enabled) {
      return (
        <div class="cz-station-empty" role="alert">
          <p>{capability.error}</p>
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={refetch}>Retry</button>
        </div>
      );
    }
    if (!capability?.enabled) {
      return (
        <div class="cz-station-empty" aria-label={`${definition.label} capability`}>
          <p>{definition.label} is not enabled for {definition.ownerLabel}.</p>
          <button
            type="button"
            class="cz-admin-btn cz-admin-btn--primary"
            onClick={() => dispatch(definition.ownerId, 'manage-capability', {
              capabilityKey: definition.capabilityKey,
              authorityKey: definition.authorityKey,
              ownerType: definition.ownerType,
              ownerId: definition.ownerId,
            })}
          >
            Enable {definition.label}
          </button>
        </div>
      );
    }
  }

  return (
    <section class="cz-station-wall" aria-label={binding.title}>
      {(binding.title || binding.capability) && (
        <div class="cz-station-wall__heading">
          {binding.title && <h3 class="cz-station-wall__title">{binding.title}</h3>}
          {binding.capability && (
            <button
              type="button"
              class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
              onClick={() => dispatch(binding.capability!.ownerId, 'manage-capability', {
                capabilityKey: binding.capability!.capabilityKey,
                authorityKey: binding.capability!.authorityKey,
                ownerType: binding.capability!.ownerType,
                ownerId: binding.capability!.ownerId,
              })}
            >
              Manage capability
            </button>
          )}
        </div>
      )}
      <Kit
        items={items}
        loading={loading}
        error={error}
        meta={meta}
        onIntent={dispatch}
      />
    </section>
  );
}
