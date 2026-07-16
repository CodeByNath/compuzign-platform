import { useEffect } from 'preact/hooks';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { restoreService, trashService, permanentDeleteService } from '@/admin-station/stations/service';
import { AsyncLoading, AsyncError } from '@/components/admin/ui/AsyncSection';
import { Station } from '../shell/Station';
import { EntityTable } from '../EntityTable';
import { ENTITIES } from '@/components/admin/schema/entities';
import type { EntitySchema, TableSchema } from '@/components/admin/schema/types';

// Generic entity-table surface (S5). The station registry declares
// { kind: 'entity-table', entity, scope }; this surface resolves the entity's
// TableSchema from its station manifest and renders it on the S3b travel
// preset. Data flow and transition handlers stay HERE, renderer-side — the
// registry and manifests declare intent only (Station DNA boundary).
//
// StationRouter keys this component per entity:scope, so a mounted
// instance never changes source or scope (useApi fetchers are fixed at mount).

type TravelScope = 'archived' | 'trashed';

interface TravelRows {
  rows: unknown[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface TravelSource {
  useRows: (scope: TravelScope) => TravelRows;
  handlers: (refetch: () => void) => Record<string, (row: any) => Promise<void>>;
}

const TRAVEL_SOURCES: Record<string, TravelSource> = {
  service: {
    useRows(scope) {
      const { data, loading, error, refetch } = useAdminCatalog({ platformStatus: scope });
      return { rows: data?.stations ?? [], loading, error, refetch };
    },
    handlers(refetch) {
      return {
        restore: async (s) => { await restoreService(s.id);         refetch(); },
        trash:   async (s) => { await trashService(s.id);           refetch(); },
        delete:  async (s) => { await permanentDeleteService(s.id); refetch(); },
      };
    },
  },
};

interface Props {
  entity: string;
  scope: 'current' | 'archived' | 'trashed';
  refreshKey: number;
}

export function EntityTableStation({ entity, scope, refreshKey }: Props) {
  const def = ENTITIES[entity];
  const source = TRAVEL_SOURCES[entity];
  const schema = scope !== 'current' ? def?.placements.travel?.[scope] : undefined;

  if (!def || !source || !schema) {
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
  source: TravelSource;
  schema: TableSchema<any>;
  scope: TravelScope;
  refreshKey: number;
}

function TravelTableSurface({ def, source, schema, scope, refreshKey }: SurfaceProps) {
  const { rows, loading, error, refetch } = source.useRows(scope);

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

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
        <EntityTable
          schema={schema}
          rows={rows}
          rowKey={(r) => def.identity.idOf(r)}
          frame="ws"
          handlers={source.handlers(refetch)}
        />
      </Station.Content>
    </Station>
  );
}
