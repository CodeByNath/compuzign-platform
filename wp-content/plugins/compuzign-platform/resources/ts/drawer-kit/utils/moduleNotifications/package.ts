// Package module rules — the Service drawer's Package Summary card and the
// Package Station Manager's item/summary pair.

// Targets the station's './types' module, not its public barrel: usePackageStation
// imports this file, so going through the barrel would close a cycle.
import type { SurfacePackageSummary, PackageManagerItem } from '@/package-station/types';
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
