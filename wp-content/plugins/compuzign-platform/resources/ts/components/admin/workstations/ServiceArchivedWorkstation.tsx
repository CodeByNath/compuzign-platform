import { useEffect, useCallback } from 'preact/hooks';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { restoreService, trashService } from '@/api/endpoints/admin';
import { AsyncLoading, AsyncError } from '@/components/admin/ui/AsyncSection';
import { useInlineConfirm } from '@/hooks/useInlineConfirm';

interface Props {
  refreshKey: number;
}

export function ServiceArchivedWorkstation({ refreshKey }: Props) {
  const { data, loading, error, refetch } = useAdminCatalog({ platformStatus: 'archived' });
  const rowConfirm = useInlineConfirm<number>(); // per-row trash confirm + restore/trash busy

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  const handleRestore = useCallback((id: number) =>
    rowConfirm.run(id, async () => {
      await restoreService(id);
      refetch();
    }), [rowConfirm.run, refetch]);

  const handleConfirmTrash = useCallback((id: number) =>
    rowConfirm.run(id, async () => {
      await trashService(id);
      refetch();
    }), [rowConfirm.run, refetch]);

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
                      <span class="cz-module-status-pill cz-module-status-pill--archived">Archived</span>
                    </td>
                    <td class="cz-sc-table__actions">
                      {rowConfirm.pendingId === station.id ? (
                        <>
                          <span class="cz-sc-table__confirm-label">Move to Trash?</span>
                          <button
                            type="button"
                            class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm"
                            disabled={rowConfirm.busyId === station.id}
                            onClick={() => handleConfirmTrash(station.id)}
                          >
                            {rowConfirm.busyId === station.id ? 'Moving…' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                            disabled={rowConfirm.busyId === station.id}
                            onClick={() => rowConfirm.cancel()}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                            disabled={rowConfirm.busyId === station.id}
                            onClick={() => handleRestore(station.id)}
                          >
                            {rowConfirm.busyId === station.id ? 'Restoring…' : 'Restore'}
                          </button>
                          <button
                            type="button"
                            class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                            disabled={rowConfirm.busyId === station.id}
                            onClick={() => rowConfirm.request(station.id)}
                          >
                            Move to Trash
                          </button>
                        </>
                      )}
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
