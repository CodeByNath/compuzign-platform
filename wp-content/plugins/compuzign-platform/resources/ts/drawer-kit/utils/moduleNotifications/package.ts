// Package module rules — the Service drawer's Package Summary card and the
// Package Station Manager's item/summary pair.

import type { SurfacePackageSummary, PackageManagerItem } from '@/api/types/admin';
import {
  resolvePackageStatus,
  resolvePackageManagerItemStatus,
  resolvePackageManagerSummary,
} from '../moduleStatus';
import type { ModuleDefinition, ModuleNote, NoteContext } from './shared';
import { evaluateModuleNotes } from './shared';

// Package Summary (whole package). A tier counts as configured via its `configured` flag.
export const packageModule: ModuleDefinition<SurfacePackageSummary | null> = {
  key:         'package',
  emptyPrompt: 'Edit and configure pricing tiers.',
  isEmpty: (pkg) => {
    const configured = pkg ? Object.values(pkg.tiers).filter(t => t?.configured).length : 0;
    return !pkg || configured === 0;
  },
  problems:      () => [],
  resolveStatus: (pkg) => resolvePackageStatus(pkg),
};

// ── Package Station Manager modules (Phase B) ─────────────────────────────────
// One operational module (item) + one presentation-only aggregate (summary) —
// never "and/or" between them (locked). The item module owns/evaluates each
// item's own module_transition; the summary owns no transition/lifecycle of
// its own and is a pure fold over already-evaluated item results (same
// two-role split as tierFeaturesModule vs. resolvePromotionSummary).

export const packageManagerItemModule: ModuleDefinition<PackageManagerItem> = {
  key: 'package-manager-item',
  problems: (item) => item.missing
    ? [{ id: `package-manager-item.${item.item_id}.missing`, message: 'Source item no longer exists in the Service pool.', type: 'info' }]
    : [],
  resolveStatus: (item, ctx) => resolvePackageManagerItemStatus(item, ctx.platformStatus),
};

export const packageManagerSummaryModule: ModuleDefinition<PackageManagerItem[]> = {
  key:         'package-manager-summary',
  emptyPrompt: 'No features or common questions to organise yet.',
  isEmpty:     (items) => items.length === 0,
  problems:    () => [],
  resolveStatus: (items, ctx) => resolvePackageManagerSummary(items, ctx.platformStatus),
};

export function getPackageNotes(pkg: SurfacePackageSummary | null, ctx: NoteContext): ModuleNote[] {
  return evaluateModuleNotes(packageModule, pkg, ctx);
}

// ── Rate Sheet row modules ────────────────────────────────────────────────────
// One Rate Sheet row of the Package Station's singleton sheet, as its drawer
// presents it. Three read axes over one data shape: the row itself (overview /
// provenance), its commercial terms, and its Tier connection state. All facts
// are authoritative fields — nothing is estimated.

export interface RateSheetRowLike {
  /** The priced relationship still resolves to a live source. */
  resolved: boolean;
  /** The relationship is administratively disabled. */
  sourceDisabled: boolean;
  unitPrice: number;
  /** How many Tiers currently select this row. */
  tierSelectionCount: number;
}

function rateSheetRowOperationalStatus(row: RateSheetRowLike, platformStatus: string): string {
  if (!row.resolved || row.sourceDisabled) return 'disabled';
  return platformStatus === 'active' ? 'active' : 'pending-full';
}

const unresolvedRowNote = (key: string): ModuleNote => ({
  id: `${key}.source.unresolved`,
  message: 'The source relationship no longer resolves; repair the sheet before relying on this row.',
  type: 'error',
});

export const rateSheetRowModule: ModuleDefinition<RateSheetRowLike> = {
  key: 'rate-sheet-row',
  problems: (row) => (row.resolved ? [] : [unresolvedRowNote('rate-sheet-row')]),
  resolveStatus: (row, ctx) => rateSheetRowOperationalStatus(row, ctx.platformStatus),
};

export const rateSheetRowCommercialModule: ModuleDefinition<RateSheetRowLike> = {
  key: 'rate-sheet-row-commercial',
  problems: (row) => (row.resolved && row.unitPrice === 0
    ? [{
        id: 'rate-sheet-row-commercial.price.unset',
        message: 'Unit price is $0.00 — confirm the price or set the commercial terms.',
        type: 'info',
      }]
    : []),
  resolveStatus: (row, ctx) => {
    if (!row.resolved || row.sourceDisabled) return 'disabled';
    if (row.unitPrice === 0) return 'pending-dim';
    return ctx.platformStatus === 'active' ? 'active' : 'pending-full';
  },
};

export const rateSheetRowConnectionModule: ModuleDefinition<RateSheetRowLike> = {
  key: 'rate-sheet-row-connection',
  emptyPrompt: 'No Tier currently selects this row.',
  isEmpty: (row) => row.tierSelectionCount === 0,
  problems: (row) => (row.resolved ? [] : [unresolvedRowNote('rate-sheet-row-connection')]),
  resolveStatus: (row, ctx) => {
    if (!row.resolved || row.sourceDisabled) return 'disabled';
    if (row.tierSelectionCount === 0) return 'pending-dim';
    return ctx.platformStatus === 'active' ? 'active' : 'pending-full';
  },
};
