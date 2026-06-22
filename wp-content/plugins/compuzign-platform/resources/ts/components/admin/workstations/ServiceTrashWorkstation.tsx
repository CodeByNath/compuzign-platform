import { useEffect, useState, useCallback } from 'preact/hooks';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { restoreService, permanentDeleteService } from '@/api/endpoints/admin';
import { Spinner } from '@/components/ui/Spinner';

interface Props {
  refreshKey: number;
}

export function ServiceTrashWorkstation({ refreshKey }: Props) {
  const { data, loading, error, refetch } = useAdminCatalog({ platformStatus: 'trashed' });
  const [restoring, setRestoring]           = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting]             = useState(false);

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

  const handleConfirmDelete = useCallback(async (id: number) => {
    setDeleting(true);
    try {
      await permanentDeleteService(id);
      setPendingDeleteId(null);
      refetch();
    } finally {
      setDeleting(false);
    }
  }, [refetch]);

  if (loading) {
    return (
      <div class="cz-admin-loading">
        <Spinner label="Loading trash…" />
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
          <h2 class="cz-ws-title">Trash</h2>
          <p class="cz-ws-subtitle">
            {stations.length} trashed service{stations.length !== 1 ? 's' : ''}
            — restore or permanently delete. Permanent delete cannot be undone.
          </p>
        </div>
      </div>

      {stations.length === 0 ? (
        <div class="cz-admin-empty">
          <p>Trash is empty.</p>
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
                      <span class="cz-status-pill cz-status-pill--trashed">Trashed</span>
                    </td>
                    <td class="cz-sc-table__actions">
                      {pendingDeleteId === station.id ? (
                        <>
                          <span class="cz-sc-table__confirm-label">Are you sure?</span>
                          <button
                            type="button"
                            class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm"
                            disabled={deleting}
                            onClick={() => handleConfirmDelete(station.id)}
                          >
                            {deleting ? 'Deleting…' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                            disabled={deleting}
                            onClick={() => setPendingDeleteId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                            disabled={restoring === station.id}
                            onClick={() => handleRestore(station.id)}
                          >
                            {restoring === station.id ? 'Restoring…' : 'Restore'}
                          </button>
                          <button
                            type="button"
                            class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--icon-only cz-admin-btn--sm"
                            onClick={() => setPendingDeleteId(station.id)}
                            aria-label="Permanently delete"
                            title="Permanently delete"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              class="drawerModule__icon-svg"
                              aria-hidden="true"
                              focusable="false"
                            >
                              <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
                            </svg>
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
