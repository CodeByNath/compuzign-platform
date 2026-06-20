import { useEffect, useState, useCallback } from 'preact/hooks';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { restoreService } from '@/api/endpoints/admin';
import { Spinner } from '@/components/ui/Spinner';

interface Props {
  refreshKey: number;
}

export function ServiceArchivedWorkstation({ refreshKey }: Props) {
  const { data, loading, error, refetch } = useAdminCatalog({ platformStatus: 'archived' });
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  const handleRestore = useCallback(async (id: number) => {
    setRestoring(id);
    try {
      await restoreService(id);
      refetch();
    } finally {
      setRestoring(null);
    }
  }, [refetch]);

  if (loading) {
    return (
      <div class="cz-admin-loading">
        <Spinner label="Loading archived services…" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div class="cz-admin-error-msg">{error}</div>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

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

      {stations.length === 0 ? (
        <div class="cz-admin-empty">
          <p>No archived services.</p>
        </div>
      ) : (
        <div class="cz-ws-card" style="padding:0;overflow:hidden">
          <div class="cz-sc-table-wrap">
            <table class="cz-sc-table">
              <thead>
                <tr>
                  <th class="cz-sc-table__service">Service</th>
                  <th class="cz-sc-table__status">Status</th>
                  <th class="cz-sc-table__actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((station) => (
                  <tr key={station.id}>
                    <td class="cz-sc-table__service cz-sc-table__name">{station.title}</td>
                    <td class="cz-sc-table__status">
                      <span class="cz-status-pill cz-status-pill--archived">Archived</span>
                    </td>
                    <td class="cz-sc-table__actions">
                      <button
                        type="button"
                        class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                        disabled={restoring === station.id}
                        onClick={() => handleRestore(station.id)}
                      >
                        {restoring === station.id ? 'Restoring…' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
