import { useEffect, useState, useCallback, useMemo } from 'preact/hooks';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { restoreService, trashService, permanentDeleteService } from '@/api/endpoints/admin';
import { AsyncLoading, AsyncError } from '@/components/admin/ui/AsyncSection';
import { Workstation } from '../shell/Workstation';
import { EntityTable } from '../EntityTable';
import { serviceBinTable } from '@/components/admin/schema/tables/service';
import type { StationSummary } from '@/api/types/admin';

interface Props {
  refreshKey: number;
}

// Bin consolidates the Archived and Trashed surfaces into one table (P6A — UI/route
// consolidation only; underlying data flow and endpoints are unchanged). A row's
// platform_status is its origin: 'archived' rows move-to-trash, 'trashed' rows
// permanently delete — encoded as origin-gated row actions on the S3b travel
// preset (serviceBinTable + EntityTable). Selection/bulk-delete stays here:
// selection is surface state, bulk behaviour is workstation-owned.
type BinFilter = 'all' | 'archived' | 'trashed';

export function BinWorkstation({ refreshKey }: Props) {
  // Keep the existing per-status data flow; combine the two streams for display only.
  const archived = useAdminCatalog({ platformStatus: 'archived' });
  const trashed  = useAdminCatalog({ platformStatus: 'trashed' });

  const [filter,    setFilter]    = useState<BinFilter>('all');
  const [selected,  setSelected]  = useState<Set<number>>(new Set());
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

  // Destructive action is origin-aware: archived → move to trash, trashed → delete.
  // Row-level transitions run through EntityTable's built-in confirm; this
  // helper remains for the bulk path.
  const destroyOne = useCallback(async (station: StationSummary) => {
    if (station.platform_status === 'archived') await trashService(station.id);
    else await permanentDeleteService(station.id);
  }, []);

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

  if (loading) return <AsyncLoading label="Loading bin…" />;

  if (error) return <AsyncError error={error} onRetry={refetchAll} />;

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
            <EntityTable
              schema={serviceBinTable}
              rows={rows}
              rowKey={(s) => s.id}
              handlers={{
                restore: async (s) => { await restoreService(s.id);         refetchAll(); },
                trash:   async (s) => { await trashService(s.id);           refetchAll(); },
                delete:  async (s) => { await permanentDeleteService(s.id); refetchAll(); },
              }}
              selection={{
                isSelected:  (s) => selected.has(s.id),
                onToggle:    (s) => toggleOne(s.id),
                allSelected,
                onToggleAll: toggleAll,
                rowLabel:    (s) => `Select ${s.title}`,
              }}
            />
          </Workstation.Content>
        </>
      )}
    </Workstation>
  );
}
