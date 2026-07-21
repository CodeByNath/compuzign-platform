// Package Tier workspace — the pure Family-summary model.
//
// A companion to ./projection with the same discipline: given a Package Family
// working scope, decide EXACTLY what the read-only summary panel shows — and
// nothing else. It fetches nothing, renders nothing, and holds no state, so it
// is testable in isolation (scripts/package-tier-workspace-contract.ts) and
// cannot silently grow a fabricated field.
//
// This is the drift guard for the summary. The mockup this section adapts shows
// invented figures — estimated margin, a demand score, a "last updated" clock —
// that have NO authoritative source. Fixing the summary's shape here, and
// asserting it in the contract, is what keeps those out: the summary is the
// family's own name, its description (shown as positioning), its authoritative
// status, and its three authoritative `dependents` counts, each passed through
// as-is and never re-derived.

import type { CategoryGroupStatus } from '../../presentation/category-groups/types';
import type { WorkspaceFamilyScope } from './projection';

/** One summary count. `id` selects the presentation glyph; the value is authoritative. */
export interface FamilySummaryMetric {
  id: 'services' | 'rate-sheet-rows' | 'tier-selections';
  label: string;
  value: number;
}

/** The read-only summary panel's complete model — no field without a real source. */
export interface FamilySummaryModel {
  name: string;
  // The family's own description, shown as its positioning line. Never a second,
  // longer "positioning" text — the API supplies exactly one description.
  positioning: string;
  status: CategoryGroupStatus;
  // Exactly the three authoritative dependents, in a fixed reading order.
  metrics: FamilySummaryMetric[];
}

/**
 * Project a Package Family scope into the summary model. Every value comes
 * straight from the authoritative scope: the counts are the backend's own
 * `dependents`, shown as-is, so this panel and the Package Family card can never
 * disagree. No metric is computed, estimated, or invented here.
 */
export function buildFamilySummary(family: WorkspaceFamilyScope): FamilySummaryModel {
  return {
    name:        family.name,
    positioning: family.description,
    status:      family.status,
    metrics: [
      { id: 'services',        label: 'Connected Services', value: family.dependents.services },
      { id: 'rate-sheet-rows', label: 'Rate Sheet rows',    value: family.dependents.rate_sheet_rows },
      { id: 'tier-selections', label: 'Tier selections',    value: family.dependents.tier_selections },
    ],
  };
}
