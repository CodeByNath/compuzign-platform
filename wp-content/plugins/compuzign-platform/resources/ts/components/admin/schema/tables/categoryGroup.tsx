// Category Group table schemas (Category Group audit, Option B).
//
// Structural clone of tables/category.tsx, one level up: the catalog table and
// the travel preset (Archived / Trash / Bin — bin is the consumed schema;
// archived/trashed are declared for travel-preset completeness). Cells are pure
// data projections; status pills delegate to the Presentation Status Contract
// chokepoint; behaviour arrives from the owning workstation as EntityTable
// handlers. Reached through CATEGORY_GROUP_ENTITY.placements.table / .travel.

import type { CategoryGroupStationItem } from '@/api/types/admin';
import { PRESENTATION_PILL, TRAVEL_PILL } from '../presentation';
import type { PillMeta } from '../presentation';
import type { ColumnDef, RowActionDef, TableSchema } from '../types';
import { TRASH_ICON } from './service';

// Station status pill — the Category Group mirror of categoryStatusPill, over
// the single owned module. Returns chokepoint metas only (Presentation Status
// Contract: Active/Pending/Disabled; never a travel label here).
function categoryGroupStatusPill(row: CategoryGroupStationItem): PillMeta {
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

export const categoryGroupCatalogTable: TableSchema<CategoryGroupStationItem> = {
  columns: [
    {
      id: 'name', label: 'Category Group',
      className: 'cz-sc-table__service', cellClassName: 'cz-sc-table__service cz-sc-table__name',
      cell: (r) => r.name,
    },
    {
      id: 'slug', label: 'Slug',
      cell: (r) => r.slug,
    },
    {
      id: 'categories', label: 'Categories',
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
        const pill = categoryGroupStatusPill(r);
        return <span class={`cz-module-status-pill ${pill.cls}`}>{pill.label}</span>;
      },
    },
  ],
  rowActions: [
    { id: 'view', label: 'View', intent: 'secondary' },
  ],
  empty: { message: 'No category groups yet.' },
  scope: 'current',
  actionsLabel: 'View',
};

// ── Travel preset (Archived / Trash / Bin) ────────────────────────────────────
// Grammar copied from the category travel schemas (busyLabel, icon-only danger,
// confirm prompts). Travel-state pills are data labels — travel surfaces only.

const TRAVEL_COLUMNS: ColumnDef<CategoryGroupStationItem>[] = [
  {
    id: 'category-group', label: 'Category Group',
    className: 'cz-sc-table__service', cellClassName: 'cz-sc-table__service cz-sc-table__name',
    cell: (r) => r.name,
  },
  {
    id: 'categories', label: 'Categories',
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

const RESTORE_ACTION: RowActionDef<CategoryGroupStationItem> = {
  id: 'restore', label: 'Restore', intent: 'secondary', busyLabel: 'Restoring…',
};

export const categoryGroupArchivedTable: TableSchema<CategoryGroupStationItem> = {
  columns: TRAVEL_COLUMNS,
  rowActions: [
    RESTORE_ACTION,
    {
      id: 'trash', label: 'Move to Trash', intent: 'secondary',
      confirm: { prompt: 'Move to Trash?', confirmLabel: 'Confirm' },
      busyLabel: 'Moving…',
    },
  ],
  empty: { message: 'No archived category groups.' },
  scope: 'archived',
};

export const categoryGroupTrashedTable: TableSchema<CategoryGroupStationItem> = {
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

// Bin consolidates both travel scopes (D8 precedent — the consumed schema): the
// destructive action is origin-aware, and a non-empty-group guard failure
// surfaces through the owning surface's error affordance.
export const categoryGroupBinTable: TableSchema<CategoryGroupStationItem> = {
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
