// Category table schemas (Schema architecture S6).
//
// The category station's table-mode projections: the catalog table and the
// travel preset (Archived / Trash / Bin — D8 consumes `bin`; archived/trashed
// are declared for travel-preset completeness). Cells are pure data
// projections; status pills delegate to the Presentation Status Contract
// chokepoint; behaviour arrives from the owning station as EntityTable
// handlers. Reached through CATEGORY_ENTITY.placements.table / .travel.

import type { CategoryStationItem } from '@/api/types/admin';
import { PRESENTATION_PILL, TRAVEL_PILL } from '@/drawer-kit/schema/presentation';
import type { PillMeta } from '@/drawer-kit/schema/presentation';
import type { ColumnDef, RowActionDef, TableSchema } from '@/drawer-kit/schema/types';
import { TRASH_ICON } from '@/entity-drawers/schema/tables/service';

// Station status pill — the category mirror of the service catalog's
// stationStatusLabel derivation, over the single owned module. Returns
// chokepoint metas only (Presentation Status Contract: Active/Pending/
// Disabled; never a travel label here).
function categoryStatusPill(row: CategoryStationItem): PillMeta {
  if (row.platform_status === 'disabled') {
    // Never-published (overview unsettled) reads Pending, not Disabled.
    return row.module_status.overview !== 'settled'
      ? PRESENTATION_PILL.pending
      : PRESENTATION_PILL.disabled;
  }
  const hasUnsettled = row.has_draft || row.module_status.overview === 'pending';
  return hasUnsettled
    ? { cls: PRESENTATION_PILL.active.cls, label: 'Active · changes pending' }
    : PRESENTATION_PILL.active;
}

// Description excerpt — a pure cell projection (the settled/draft-preferred
// description arrives already resolved on the row).
function excerpt(text: string, max = 80): string {
  const clean = text.trim();
  if (clean === '') return '—';
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

// ── Catalog table ─────────────────────────────────────────────────────────────

export const categoryCatalogTable: TableSchema<CategoryStationItem> = {
  columns: [
    {
      id: 'name', label: 'Category',
      className: 'cz-sc-table__service', cellClassName: 'cz-sc-table__service cz-sc-table__name',
      cell: (r) => r.name,
    },
    {
      id: 'slug', label: 'Slug',
      cell: (r) => r.slug,
    },
    {
      id: 'services', label: 'Services',
      cell: (r) => r.assigned_count,
    },
    {
      id: 'description', label: 'Description',
      cell: (r) => excerpt(r.description),
    },
    {
      id: 'status', label: 'Status',
      className: 'cz-sc-table__status',
      cell: (r) => {
        const pill = categoryStatusPill(r);
        return <span class={`cz-module-status-pill ${pill.cls}`}>{pill.label}</span>;
      },
    },
  ],
  rowActions: [
    { id: 'view', label: 'View', intent: 'secondary' },
  ],
  empty: { message: 'No categories yet.' },
  scope: 'current',
  actionsLabel: 'View',
};

// ── Travel preset (Archived / Trash / Bin) ────────────────────────────────────
// Grammar copied from the service travel schemas (busyLabel, icon-only danger,
// confirm prompts). Travel-state pills are data labels — travel surfaces only.

const TRAVEL_COLUMNS: ColumnDef<CategoryStationItem>[] = [
  {
    id: 'category', label: 'Category',
    className: 'cz-sc-table__service', cellClassName: 'cz-sc-table__service cz-sc-table__name',
    cell: (r) => r.name,
  },
  {
    id: 'services', label: 'Services',
    cell: (r) => r.assigned_count,
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

const RESTORE_ACTION: RowActionDef<CategoryStationItem> = {
  id: 'restore', label: 'Restore', intent: 'secondary', busyLabel: 'Restoring…',
};

export const categoryArchivedTable: TableSchema<CategoryStationItem> = {
  columns: TRAVEL_COLUMNS,
  rowActions: [
    RESTORE_ACTION,
    {
      id: 'trash', label: 'Move to Trash', intent: 'secondary',
      confirm: { prompt: 'Move to Trash?', confirmLabel: 'Confirm' },
      busyLabel: 'Moving…',
    },
  ],
  empty: { message: 'No archived categories.' },
  scope: 'archived',
};

export const categoryTrashedTable: TableSchema<CategoryStationItem> = {
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

// Bin consolidates both travel scopes (D8 — the consumed schema): the
// destructive action is origin-aware, and the D6 delete guard's 409 surfaces
// through the owning surface's error affordance.
export const categoryBinTable: TableSchema<CategoryStationItem> = {
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
