import { useEffect } from 'preact/hooks';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { restoreService, trashService } from '@/api/endpoints/admin';
import { AsyncLoading, AsyncError } from '@/components/admin/ui/AsyncSection';
import { EntityTable } from '../EntityTable';
import { SERVICE_ENTITY } from '@/components/admin/schema/entities/service';

interface Props {
  refreshKey: number;
}

// Archived travel surface on the S3b travel preset, reached through the
// service manifest's travel placements (S4): the table (columns, travel
// pills, inline confirm) comes from SERVICE_ENTITY.placements.travel.archived + EntityTable;
// this file owns only data flow and the transition handlers.
export function ServiceArchivedWorkstation({ refreshKey }: Props) {
  const { data, loading, error, refetch } = useAdminCatalog({ platformStatus: 'archived' });

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  if (loading) return <AsyncLoading label="Loading archived services…" />;

  if (error) return <AsyncError error={error} onRetry={refetch} />;

  const stations = data?.stations ?? [];

  return (
    <div>
      <div class="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Archived Services</h2>
          <p class="cz-ws-subtitle">
            {stations.length} archived service{stations.length !== 1 ? 's' : ''}
            — restore to return a service to its previous state.
          </p>
        </div>
      </div>

      <EntityTable
        schema={SERVICE_ENTITY.placements.travel!.archived}
        rows={stations}
        rowKey={(s) => s.id}
        frame="ws"
        handlers={{
          restore: async (s) => { await restoreService(s.id); refetch(); },
          trash:   async (s) => { await trashService(s.id);   refetch(); },
        }}
      />
    </div>
  );
}
