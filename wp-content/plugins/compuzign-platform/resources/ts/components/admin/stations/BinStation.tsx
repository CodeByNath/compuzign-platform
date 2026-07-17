import { useEffect, useState, useCallback, useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import {
  fetchAdminCategories, restoreCategory, updateCategoryStatus, permanentDeleteCategory,
  fetchAdminServiceCategoryGroups, restoreServiceCategoryGroup, updateServiceCategoryGroupStatus, permanentDeleteServiceCategoryGroup,
} from '@/api/endpoints/admin';
import { restoreService, trashService, permanentDeleteService } from '@/admin-station/stations/service';
import { AsyncLoading, AsyncError } from '@/components/admin/ui/AsyncSection';
import { Station } from '../shell/Station';
import { EntityTable } from '../EntityTable';
import { SERVICE_ENTITY } from '@/components/admin/schema/entities/service';
import { CATEGORY_ENTITY } from '@/components/admin/schema/entities/category';
import { SERVICE_CATEGORY_GROUP_ENTITY } from '@/components/admin/schema/entities/serviceCategoryGroup';
import type { ServiceCategoryGroupStationItem, CategoryStationItem } from '@/api/types/admin';
import type { ServiceSummary } from '@/admin-station/stations/service';

interface Props {
  refreshKey: number;
}

// Bin consolidates the Archived and Trashed surfaces into one table (P6A — UI/route
// consolidation only; underlying data flow and endpoints are unchanged). A row's
// platform_status is its origin: 'archived' rows move-to-trash, 'trashed' rows
// permanently delete — encoded as origin-gated row actions on the S3b travel
// preset (SERVICE_ENTITY.placements.travel.bin + EntityTable, S4). Selection/bulk-delete stays here:
// selection is surface state, bulk behaviour is station-owned.
//
// S6: the Category station joins as a second pane (D8 — no hidden category-archived/
// category-trash routes; the Bin is the sole travel surface). Its rows render
// through CATEGORY_ENTITY.placements.travel.bin; delete surfaces the D6 409 guard.
//
// Category Group audit (Option B): the Category Group station joins as a third
// pane, same shape as Category one level up — rows render through
// SERVICE_CATEGORY_GROUP_ENTITY.placements.travel.bin; delete surfaces the group-side
// assigned-category-count guard.
type BinFilter = 'all' | 'archived' | 'trashed';

export function BinStation({ refreshKey }: Props) {
  // Keep the existing per-status data flow; combine the two streams for display only.
  const archived = useAdminCatalog({ platformStatus: 'archived' });
  const trashed  = useAdminCatalog({ platformStatus: 'trashed' });

  // Category bin streams — same two-scope shape as the service catalog.
  const catArchived = useApi(() => fetchAdminCategories('archived'));
  const catTrashed  = useApi(() => fetchAdminCategories('trashed'));

  // Service Category Group bin streams — same two-scope shape, one level up.
  const groupArchived = useApi(() => fetchAdminServiceCategoryGroups('archived'));
  const groupTrashed  = useApi(() => fetchAdminServiceCategoryGroups('trashed'));

  const [filter,    setFilter]    = useState<BinFilter>('all');
  const [selected,  setSelected]  = useState<Set<number>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkBusy,    setBulkBusy]    = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);

  const loading = archived.loading || trashed.loading || catArchived.loading || catTrashed.loading
    || groupArchived.loading || groupTrashed.loading;
  const error   = archived.error || trashed.error;

  const refetchAll = useCallback(() => {
    archived.refetch();
    trashed.refetch();
    catArchived.refetch();
    catTrashed.refetch();
    groupArchived.refetch();
    groupTrashed.refetch();
  }, [archived.refetch, trashed.refetch, catArchived.refetch, catTrashed.refetch, groupArchived.refetch, groupTrashed.refetch]);

  useEffect(() => {
    if (refreshKey > 0) refetchAll();
  }, [refreshKey]);

  const rows = useMemo<ServiceSummary[]>(() => {
    const all = [...(archived.data?.stations ?? []), ...(trashed.data?.stations ?? [])];
    return filter === 'all' ? all : all.filter((s) => s.platform_status === filter);
  }, [archived.data, trashed.data, filter]);

  const categoryRows = useMemo<CategoryStationItem[]>(() => {
    const all = [...(catArchived.data?.categories ?? []), ...(catTrashed.data?.categories ?? [])];
    return filter === 'all' ? all : all.filter((c) => c.platform_status === filter);
  }, [catArchived.data, catTrashed.data, filter]);

  const groupRows = useMemo<ServiceCategoryGroupStationItem[]>(() => {
    const all = [...(groupArchived.data?.category_groups ?? []), ...(groupTrashed.data?.category_groups ?? [])];
    return filter === 'all' ? all : all.filter((g) => g.platform_status === filter);
  }, [groupArchived.data, groupTrashed.data, filter]);

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
  const destroyOne = useCallback(async (station: ServiceSummary) => {
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

  // Category delete: the D6 guard returns HTTP 409 (apiClient throws). Catch it
  // and surface the assigned-count message through the pane's error affordance
  // rather than letting the rejection escape EntityTable's confirm runner.
  const handleCategoryDelete = useCallback(async (row: CategoryStationItem) => {
    setCategoryError(null);
    try {
      await permanentDeleteCategory(row.id);
      refetchAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const m   = msg.match(/assigned_count"?\s*:\s*(\d+)/);
      setCategoryError(m
        ? `Cannot delete “${row.name}”: ${m[1]} service${m[1] === '1' ? '' : 's'} still assigned. Unassign them first.`
        : `“${row.name}” could not be deleted.`);
    }
  }, [refetchAll]);

  // Service Category Group delete: the group-side guard returns HTTP 409, same parsing
  // contract as handleCategoryDelete — one level up (assigned_count = child
  // categories, not services).
  const handleGroupDelete = useCallback(async (row: ServiceCategoryGroupStationItem) => {
    setGroupError(null);
    try {
      await permanentDeleteServiceCategoryGroup(row.id);
      refetchAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const m   = msg.match(/assigned_count"?\s*:\s*(\d+)/);
      setGroupError(m
        ? `Cannot delete “${row.name}”: ${m[1]} categor${m[1] === '1' ? 'y' : 'ies'} still assigned. Move them out first.`
        : `“${row.name}” could not be deleted.`);
    }
  }, [refetchAll]);

  if (loading) return <AsyncLoading label="Loading bin…" />;

  if (error) return <AsyncError error={error} onRetry={refetchAll} />;

  const archivedCount = archived.data?.stations?.length ?? 0;
  const trashedCount  = trashed.data?.stations?.length ?? 0;
  const catCount      = (catArchived.data?.categories?.length ?? 0) + (catTrashed.data?.categories?.length ?? 0);
  const groupCount    = (groupArchived.data?.category_groups?.length ?? 0) + (groupTrashed.data?.category_groups?.length ?? 0);
  const total = archivedCount + trashedCount + catCount + groupCount;

  return (
    <Station>
      <Station.Header className="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Bin</h2>
          <p class="cz-ws-subtitle">
            {archivedCount} archived · {trashedCount} trashed{catCount > 0 ? ` · ${catCount} categor${catCount !== 1 ? 'ies' : 'y'}` : ''}{groupCount > 0 ? ` · ${groupCount} categor${groupCount !== 1 ? 'y groups' : 'y group'}` : ''} — restore an item, or remove it.
            Permanent delete cannot be undone.
          </p>
        </div>
      </Station.Header>

      {total === 0 ? (
        <Station.Content>
          <div class="cz-admin-empty">
            <p>Bin is empty.</p>
          </div>
        </Station.Content>
      ) : (
        <>
          <Station.Toolbar className="cz-sc-filters">
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
          </Station.Toolbar>

          <Station.Actions className="cz-sc-section__actions">
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
          </Station.Actions>

          <Station.Content>
            {rows.length > 0 && (
              <>
                <p class="cz-shell-section__title">Services</p>
                <EntityTable
                  schema={SERVICE_ENTITY.placements.travel!.bin!}
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
              </>
            )}

            {categoryRows.length > 0 && (
              <>
                <p class="cz-shell-section__title" style="margin-top:var(--cz-space-5)">Categories</p>
                {categoryError && <div class="cz-admin-error-msg" style="margin-bottom:var(--cz-space-3)">{categoryError}</div>}
                <EntityTable
                  schema={CATEGORY_ENTITY.placements.travel!.bin!}
                  rows={categoryRows}
                  rowKey={(c) => c.id}
                  handlers={{
                    restore: async (c) => { await restoreCategory(c.id);              refetchAll(); },
                    trash:   async (c) => { await updateCategoryStatus(c.id, 'trashed'); refetchAll(); },
                    delete:  handleCategoryDelete,
                  }}
                />
              </>
            )}

            {groupRows.length > 0 && (
              <>
                <p class="cz-shell-section__title" style="margin-top:var(--cz-space-5)">Service Category Groups</p>
                {groupError && <div class="cz-admin-error-msg" style="margin-bottom:var(--cz-space-3)">{groupError}</div>}
                <EntityTable
                  schema={SERVICE_CATEGORY_GROUP_ENTITY.placements.travel!.bin!}
                  rows={groupRows}
                  rowKey={(g) => g.id}
                  handlers={{
                    restore: async (g) => { await restoreServiceCategoryGroup(g.id);              refetchAll(); },
                    trash:   async (g) => { await updateServiceCategoryGroupStatus(g.id, 'trashed'); refetchAll(); },
                    delete:  handleGroupDelete,
                  }}
                />
              </>
            )}
          </Station.Content>
        </>
      )}
    </Station>
  );
}
