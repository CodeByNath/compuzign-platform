import { useEffect } from 'preact/hooks';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { restoreService, permanentDeleteService } from '@/api/endpoints/admin';
import { AsyncLoading, AsyncError } from '@/components/admin/ui/AsyncSection';
import { EntityTable } from '../EntityTable';
import { serviceTrashedTable } from '@/components/admin/schema/tables/service';

interface Props {
  refreshKey: number;
}

// Trash travel surface on the S3b travel preset: the table (columns, travel
// pills, inline confirm) comes from serviceTrashedTable + EntityTable;
// this file owns only data flow and the transition handlers.
export function ServiceTrashWorkstation({ refreshKey }: Props) {
  const { data, loading, error, refetch } = useAdminCatalog({ platformStatus: 'trashed' });

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  if (loading) return <AsyncLoading label="Loading trash…" />;

  if (error) return <AsyncError error={error} onRetry={refetch} />;

  const stations = data?.stations ?? [];

  return (
    <div>
      <div class="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Trash</h2>
          <p class="cz-ws-subtitle">
            {stations.length} trashed service{stations.length !== 1 ? 's' : ''}
            — restore or permanently delete. Permanent delete cannot be undone.
          </p>
        </div>
      </div>

      <EntityTable
        schema={serviceTrashedTable}
        rows={stations}
        rowKey={(s) => s.id}
        frame="ws"
        handlers={{
          restore: async (s) => { await restoreService(s.id);         refetch(); },
          delete:  async (s) => { await permanentDeleteService(s.id); refetch(); },
        }}
      />
    </div>
  );
}
