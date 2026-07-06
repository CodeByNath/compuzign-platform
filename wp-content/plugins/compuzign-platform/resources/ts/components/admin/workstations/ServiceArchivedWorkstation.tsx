import { useEffect } from 'preact/hooks';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { restoreService, trashService } from '@/api/endpoints/admin';
import { AsyncLoading, AsyncError } from '@/components/admin/ui/AsyncSection';
import { EntityTable } from '../EntityTable';
import { serviceArchivedTable } from '@/components/admin/schema/tables/service';

interface Props {
  refreshKey: number;
}

// Archived travel surface on the S3b travel preset: the table (columns, travel
// pills, inline confirm) comes from serviceArchivedTable + EntityTable;
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
        schema={serviceArchivedTable}
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
