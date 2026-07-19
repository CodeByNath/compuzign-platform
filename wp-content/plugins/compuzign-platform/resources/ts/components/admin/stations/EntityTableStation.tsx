import { useEffect, useState } from 'preact/hooks';
import { AsyncLoading, AsyncError } from '@/drawer-kit/ui/AsyncSection';
import { Station } from '../shell/Station';
import { EntityTable } from '../EntityTable';
import { ENTITIES } from '@/components/admin/schema/entities';
import type { EntitySchema, TableSchema } from '@/drawer-kit/schema/types';
import type { EntityTravelSource, TravelScope } from './entityTravelSources';

// Generic entity-table surface (S5). The station registry declares
// { kind: 'entity-table', entity, scope, source }; this surface resolves the
// entity's TableSchema from its declaration-only manifest (ENTITIES[entity]) and
// takes its runtime row loader + transition handlers from the registration's
// `source` (entityTravelSources.ts). It holds ZERO branch on entity identity —
// every entity renders through the same code path; adding one is a registration
// entry, never an edit here.
//
// StationRouter keys this component per entity:scope, so a mounted instance
// never changes source or scope (the loader hook is fixed at mount).

interface Props {
  entity: string;
  scope: 'current' | 'archived' | 'trashed';
  source: EntityTravelSource;
  refreshKey: number;
}

export function EntityTableStation({ entity, scope, source, refreshKey }: Props) {
  const def = ENTITIES[entity];
  const schema = scope !== 'current' ? def?.placements.travel?.[scope] : undefined;

  if (!def || !schema) {
    return (
      <div class="cz-admin-empty">
        <p><strong>{entity}</strong> has no {scope} table surface registered.</p>
      </div>
    );
  }

  return (
    <TravelTableSurface
      def={def}
      source={source}
      schema={schema}
      scope={scope as TravelScope}
      refreshKey={refreshKey}
    />
  );
}

interface SurfaceProps {
  def: EntitySchema;
  source: EntityTravelSource;
  schema: TableSchema<any>;
  scope: TravelScope;
  refreshKey: number;
}

function TravelTableSurface({ def, source, schema, scope, refreshKey }: SurfaceProps) {
  const { rows, loading, error, refetch } = source.useRows(scope);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  // Wrap the registration's handlers once, generically: a rejected transition
  // (e.g. a 409 dependency guard on permanent delete) surfaces the backend
  // message here instead of escaping the table's confirm runner unhandled. This
  // is engine behaviour, not entity behaviour — it applies to every source.
  const wrap = (fn: (row: any) => Promise<void>) => async (row: unknown) => {
    setActionError(null);
    try {
      await fn(row);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The action could not be completed.');
    }
  };
  const rawHandlers = source.handlers(refetch);
  const handlers = Object.fromEntries(
    Object.entries(rawHandlers).map(([id, fn]) => [id, wrap(fn)]),
  );

  if (loading) return <AsyncLoading label={`Loading ${scope === 'archived' ? `archived ${def.label.plural.toLowerCase()}` : 'trash'}…`} />;

  if (error) return <AsyncError error={error} onRetry={refetch} />;

  const n = rows.length;
  const noun = (n === 1 ? def.label.singular : def.label.plural).toLowerCase();
  const title = scope === 'archived' ? `Archived ${def.label.plural}` : 'Trash';
  const subtitle = scope === 'archived'
    ? `${n} archived ${noun} — restore to return a ${def.label.singular.toLowerCase()} to its previous state.`
    : `${n} trashed ${noun} — restore or permanently delete. Permanent delete cannot be undone.`;

  return (
    <Station>
      <Station.Header className="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">{title}</h2>
          <p class="cz-ws-subtitle">{subtitle}</p>
        </div>
      </Station.Header>

      <Station.Content>
        {actionError && <div class="cz-admin-error-msg" style="margin-bottom:var(--cz-space-3)">{actionError}</div>}
        <EntityTable
          schema={schema}
          rows={rows}
          rowKey={(r) => def.identity.idOf(r)}
          frame="ws"
          handlers={handlers}
        />
      </Station.Content>
    </Station>
  );
}
