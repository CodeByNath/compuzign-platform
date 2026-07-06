// Service table schemas (Schema architecture S3b).
//
// The service station's table-mode projections: the catalog table and the
// travel preset (Archived / Trash / Bin). Cells are pure data projections;
// status pills delegate to the Presentation Status Contract chokepoint
// (stationStatusLabel / TRAVEL_PILL); behaviour arrives from the owning
// workstation as EntityTable handlers. Since S4 these are reached through the
// service manifest's placements (SERVICE_ENTITY.placements.table / .travel) —
// this file is their definition home, the manifest is their address.

import type { StationSummary } from '@/api/types/admin';
import { ModuleStatusPill } from '@/components/admin/ui/ModuleStatusPill';
import { stationStatusLabel } from '@/components/admin/utils/moduleStatus';
import type { StationCommercialSummary } from '@/components/admin/utils/moduleStatus';
import { TRAVEL_PILL } from '../presentation';
import type { ColumnDef, RowActionDef, TableSchema } from '../types';
import { TIER_KEYS, TIER_LABELS } from '../../workstations/serviceDrawerShared';

// ── Catalog table ─────────────────────────────────────────────────────────────
// Rows are assembled by the workstation as station + pre-resolved commercial
// summary (the summary needs the surface-package list, which is row-external).

export interface ServiceCatalogRow {
  station: StationSummary;
  summary: StationCommercialSummary;
}

export const serviceCatalogTable: TableSchema<ServiceCatalogRow> = {
  columns: [
    {
      id: 'service', label: 'Service Title',
      className: 'cz-sc-table__service', cellClassName: 'cz-sc-table__service cz-sc-table__name',
      cell: (r) => r.station.title,
    },
    ...TIER_KEYS.map((tierId): ColumnDef<ServiceCatalogRow> => ({
      id: `tier-${tierId}`, label: TIER_LABELS[tierId],
      className: 'cz-sc-table__tier',
      cell: (r) => <ModuleStatusPill status={r.summary.tiers[tierId]} notes={[]} />,
    })),
    {
      id: 'promotions', label: 'Promotions',
      className: 'cz-sc-table__tier',
      cell: (r) => <ModuleStatusPill status={r.summary.promoStatus} notes={[]} />,
    },
    {
      id: 'status', label: 'Service Status',
      className: 'cz-sc-table__status',
      cell: (r) => {
        const pill = stationStatusLabel(r.station);
        return <span class={`cz-module-status-pill ${pill.cls}`}>{pill.label}</span>;
      },
    },
  ],
  rowActions: [
    { id: 'view', label: 'View', intent: 'secondary' },
  ],
  empty: { message: 'No services match the current filter.' },
  scope: 'current',
  actionsLabel: 'View',
};

// ── Travel preset (Archived / Trash / Bin) ────────────────────────────────────

// Trash glyph shared by the destructive travel actions (previously duplicated
// inline in the Bin and Trash workstations).
const TRASH_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="drawerModule__icon-svg" aria-hidden="true" focusable="false">
    <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
  </svg>
);

// Shared travel columns: title + travel-state pill (data labels — travel
// surfaces only, per the Presentation Status Contract).
const TRAVEL_COLUMNS: ColumnDef<StationSummary>[] = [
  {
    id: 'service', label: 'Service',
    className: 'cz-sc-table__service', cellClassName: 'cz-sc-table__service cz-sc-table__name',
    cell: (r) => r.title,
  },
  {
    id: 'status', label: 'Status',
    className: 'cz-sc-table__status',
    cell: (r) => {
      const pill = TRAVEL_PILL[r.platform_status as 'archived' | 'trashed'] ?? TRAVEL_PILL.archived;
      return <span class={`cz-module-status-pill ${pill.cls}`}>{pill.label}</span>;
    },
  },
];

const RESTORE_ACTION: RowActionDef<StationSummary> = {
  id: 'restore', label: 'Restore', intent: 'secondary', busyLabel: 'Restoring…',
};

export const serviceArchivedTable: TableSchema<StationSummary> = {
  columns: TRAVEL_COLUMNS,
  rowActions: [
    RESTORE_ACTION,
    {
      id: 'trash', label: 'Move to Trash', intent: 'secondary',
      confirm: { prompt: 'Move to Trash?', confirmLabel: 'Confirm' },
      busyLabel: 'Moving…',
    },
  ],
  empty: { message: 'No archived services.' },
  scope: 'archived',
};

export const serviceTrashedTable: TableSchema<StationSummary> = {
  columns: TRAVEL_COLUMNS,
  rowActions: [
    RESTORE_ACTION,
    {
      id: 'delete', label: 'Permanently delete', intent: 'danger', icon: TRASH_ICON,
      confirm: { prompt: 'Are you sure?', confirmLabel: 'Confirm' },
      busyLabel: 'Deleting…',
    },
  ],
  empty: { message: 'Trash is empty.' },
  scope: 'trashed',
};

// Bin consolidates both travel scopes: the destructive action is
// origin-aware — archived rows move to trash, trashed rows delete.
export const serviceBinTable: TableSchema<StationSummary> = {
  columns: TRAVEL_COLUMNS,
  rowActions: [
    RESTORE_ACTION,
    {
      id: 'trash', label: 'Move to Trash', intent: 'danger', icon: TRASH_ICON,
      when: (r) => r.platform_status === 'archived',
      confirm: { prompt: 'Move to Trash?', confirmLabel: 'Confirm' },
      busyLabel: 'Working…',
    },
    {
      id: 'delete', label: 'Permanently delete', intent: 'danger', icon: TRASH_ICON,
      when: (r) => r.platform_status === 'trashed',
      confirm: { prompt: 'Delete permanently?', confirmLabel: 'Confirm' },
      busyLabel: 'Working…',
    },
  ],
  empty: { message: 'Nothing matches the current filter.' },
};
