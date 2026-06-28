import { useEffect, useState, useCallback, useMemo } from 'preact/hooks';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { restoreService, trashService, permanentDeleteService } from '@/api/endpoints/admin';
import { Spinner } from '@/components/ui/Spinner';
import { Workstation } from '../shell/Workstation';
import type { StationSummary } from '@/api/types/admin';

interface Props {
  refreshKey: number;
}

// Bin consolidates the Archived and Trashed surfaces into one table (P6A — UI/route
// consolidation only; underlying data flow and endpoints are unchanged). A row's
// platform_status is its origin: 'archived' rows move-to-trash, 'trashed' rows
// permanently delete. P6B will harden this into a shared schema + table actions.
type BinFilter = 'all' | 'archived' | 'trashed';

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="drawerModule__icon-svg" aria-hidden="true" focusable="false">
    <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
  </svg>
);

export function BinWorkstation({ refreshKey }: Props) {
  // Keep the existing per-status data flow; combine the two streams for display only.
  const archived = useAdminCatalog({ platformStatus: 'archived' });
  const trashed  = useAdminCatalog({ platformStatus: 'trashed' });

  const [filter,    setFilter]    = useState<BinFilter>('all');
  const [selected,  setSelected]  = useState<Set<number>>(new Set());
  const [pendingId, setPendingId] = useState<number | null>(null); // per-row destructive confirm
  const [busyId,    setBusyId]    = useState<number | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkBusy,    setBulkBusy]    = useState(false);

  const loading = archived.loading || trashed.loading;
  const error   = archived.error || trashed.error;

  const refetchAll = useCallback(() => {
    archived.refetch();
    trashed.refetch();
  }, [archived.refetch, trashed.refetch]);

  useEffect(() => {
    if (refreshKey > 0) refetchAll();
  }, [refreshKey]);

  const rows = useMemo<StationSummary[]>(() => {
    const all = [...(archived.data?.stations ?? []), ...(trashed.data?.stations ?? [])];
    return filter === 'all' ? all : all.filter((s) => s.platform_status === filter);
  }, [archived.data, trashed.data, filter]);

  // Drop selections that are no longer visible (filter change / refetch).
  useEffect(() => {
    setSelected((prev) => {
      const visible = new Set(rows.map((r) => r.id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }, [allSelected, rows]);

  const toggleOne = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleRestore = useCallback(async (id: number) => {
    setBusyId(id);
    try {
      await restoreService(id);
      refetchAll();
    } finally {
      setBusyId(null);
    }
  }, [refetchAll]);

  // Destructive action is context-aware: archived → move to trash, trashed → delete.
  const destroyOne = useCallback(async (station: StationSummary) => {
    if (station.platform_status === 'archived') await trashService(station.id);
    else await permanentDeleteService(station.id);
  }, []);

  const handleConfirmDestroy = useCallback(async (station: StationSummary) => {
    setBusyId(station.id);
    try {
      await destroyOne(station);
      setPendingId(null);
      refetchAll();
    } finally {
      setBusyId(null);
    }
  }, [destroyOne, refetchAll]);

  const handleBulkDelete = useCallback(async () => {
    setBulkBusy(true);
    try {
      for (const station of rows.filter((r) => selected.has(r.id))) {
        await destroyOne(station);
      }
      setSelected(new Set());
      setBulkConfirm(false);
      refetchAll();
    } finally {
      setBulkBusy(false);
    }
  }, [rows, selected, destroyOne, refetchAll]);

  if (loading) {
    return (
      <div class="cz-admin-loading">
        <Spinner label="Loading bin…" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div class="cz-admin-error-msg">{error}</div>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={refetchAll}>
          Retry
        </button>
      </div>
    );
  }

  const archivedCount = archived.data?.stations?.length ?? 0;
  const trashedCount  = trashed.data?.stations?.length ?? 0;
  const total = archivedCount + trashedCount;

  return (
    <Workstation>
      <Workstation.Header className="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Bin</h2>
          <p class="cz-ws-subtitle">
            {archivedCount} archived · {trashedCount} trashed — restore a service, or remove it.
            Permanent delete cannot be undone.
          </p>
        </div>
      </Workstation.Header>

      {total === 0 ? (
        <Workstation.Content>
          <div class="cz-admin-empty">
            <p>Bin is empty.</p>
          </div>
        </Workstation.Content>
      ) : (
        <>
          <Workstation.Toolbar className="cz-sc-filters">
            <div class="cz-tf-field cz-sc-filters__field">
              <label class="cz-tf-label">Show</label>
              <select
                class="cz-tf-select"
                value={filter}
                onChange={(e) => setFilter((e.target as HTMLSelectElement).value as BinFilter)}
              >
                <option value="all">All</option>
                <option value="archived">Archived</option>
                <option value="trashed">Trashed</option>
              </select>
            </div>
          </Workstation.Toolbar>

          <Workstation.Actions className="cz-sc-section__actions">
            {selected.size > 0 && (
              bulkConfirm ? (
                <div class="cz-bin-bulk">
                  <span class="cz-bin-bulk__count">Delete {selected.size} selected?</span>
                  <button
                    type="button"
                    class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm"
                    disabled={bulkBusy}
                    onClick={handleBulkDelete}
                  >
                    {bulkBusy ? 'Deleting…' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                    disabled={bulkBusy}
                    onClick={() => setBulkConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div class="cz-bin-bulk">
                  <span class="cz-bin-bulk__count">{selected.size} selected</span>
                  <button
                    type="button"
                    class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm"
                    onClick={() => setBulkConfirm(true)}
                  >
                    Delete selected
                  </button>
                </div>
              )
            )}
          </Workstation.Actions>

          <Workstation.Content>
            {rows.length === 0 ? (
              <div class="cz-admin-empty">
                <p>Nothing matches the current filter.</p>
              </div>
            ) : (
              <div class="cz-shell-table-card">
                <div class="cz-shell-table-scroll">
                  <table class="cz-sc-table">
                    <thead>
                      <tr>
                        <th class="cz-sc-table__select">
                          <input
                            type="checkbox"
                            aria-label="Select all"
                            checked={allSelected}
                            onChange={toggleAll}
                          />
                        </th>
                        <th class="cz-sc-table__service">Service</th>
                        <th class="cz-sc-table__status">Status</th>
                        <th class="cz-sc-table__actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((station) => {
                        const isArchived = station.platform_status === 'archived';
                        const busy = busyId === station.id;
                        return (
                          <tr key={station.id}>
                            <td class="cz-sc-table__select">
                              <input
                                type="checkbox"
                                aria-label={`Select ${station.title}`}
                                checked={selected.has(station.id)}
                                onChange={() => toggleOne(station.id)}
                              />
                            </td>
                            <td class="cz-sc-table__service cz-sc-table__name">{station.title}</td>
                            <td class="cz-sc-table__status">
                              <span class={`cz-module-status-pill cz-module-status-pill--${station.platform_status}`}>
                                {isArchived ? 'Archived' : 'Trashed'}
                              </span>
                            </td>
                            <td class="cz-sc-table__actions">
                              {pendingId === station.id ? (
                                <>
                                  <span class="cz-sc-table__confirm-label">
                                    {isArchived ? 'Move to Trash?' : 'Delete permanently?'}
                                  </span>
                                  <button
                                    type="button"
                                    class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm"
                                    disabled={busy}
                                    onClick={() => handleConfirmDestroy(station)}
                                  >
                                    {busy ? 'Working…' : 'Confirm'}
                                  </button>
                                  <button
                                    type="button"
                                    class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                                    disabled={busy}
                                    onClick={() => setPendingId(null)}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                                    disabled={busy}
                                    onClick={() => handleRestore(station.id)}
                                  >
                                    {busy ? 'Restoring…' : 'Restore'}
                                  </button>
                                  <button
                                    type="button"
                                    class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--icon-only cz-admin-btn--sm"
                                    disabled={busy}
                                    onClick={() => setPendingId(station.id)}
                                    aria-label={isArchived ? 'Move to Trash' : 'Permanently delete'}
                                    title={isArchived ? 'Move to Trash' : 'Permanently delete'}
                                  >
                                    <TrashIcon />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Workstation.Content>
        </>
      )}
    </Workstation>
  );
}
