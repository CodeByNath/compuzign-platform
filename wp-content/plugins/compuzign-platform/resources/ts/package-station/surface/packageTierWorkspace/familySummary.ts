// Package Tier workspace — the pure Family-summary model.
//
// A companion to ./projection with the same discipline: given a Package Family
// record and the composition its assigned Tier Group reported, decide EXACTLY
// what the read-only summary panel shows — and nothing else. It fetches nothing,
// renders nothing, and holds no state, so it is testable in isolation
// (scripts/package-tier-workspace-contract.ts) and cannot silently grow a
// fabricated field.
//
// This is the drift guard for the summary. The mockup this section adapts shows
// invented figures — estimated margin, a demand score, a "last updated" clock —
// that have NO authoritative source. Fixing the summary's shape here, and
// asserting it in the contract, is what keeps those out.
//
// ── The Family card expression ────────────────────────────────────────────────
//
// The Family knows ONE thing: which Tier Group it is assigned. It asks that
// group, by the group's own durable Platform ID, what it composes:
//
//   Package Family
//     └─ assignment ledger ──> assigned Tier Group CZTG
//                                └─ canonical Tier Group read
//                                     └─ the group's OWN derived composition
//
// The Tier Group resolves its own downstream structure (Tiers → occupants →
// selected inclusions → Rate Sheet rows → the CZS/CZC provenance those rows
// carry) and returns four numbers. This module does not walk occupants, decks,
// Rate Sheet rows, Services, or Categories — the Family has no relationship to
// any of them and must not reproduce the Tier Group's internals to find out.
//
// Nothing here is persisted onto the Family, and nothing is re-derived: the
// counts are passed through exactly as the owning Tier Group reported them.

import type { CategoryGroupStatus } from '@/admin-station/presentation/category-groups/types';
import type { TierGroupComposition } from '../../types';
import type { WorkspaceFamilyScope } from './projection';

/**
 * One summary count. `id` selects the presentation glyph; the value is
 * authoritative. `value` is a string only for the honest unavailable state —
 * never a formatted or abbreviated number.
 */
export interface FamilySummaryMetric {
  id: 'tiers' | 'service-categories' | 'services' | 'inclusions';
  label: string;
  value: number | string;
}

/** The read-only summary panel's complete model — no field without a real source. */
export interface FamilySummaryModel {
  name: string;
  // The family's own description, shown as its positioning line. Never a second,
  // longer "positioning" text — the API supplies exactly one description.
  positioning: string;
  status: CategoryGroupStatus;
  // Exactly the four counts the assigned Tier Group reported, in a fixed order.
  metrics: FamilySummaryMetric[];
  // Whether those counts are real. False when no composition was supplied — the
  // Family is unassigned, its Tier Group carries no usable CZTG, or the
  // canonical read has not resolved.
  composed: boolean;
}

/**
 * What an uncomposed card shows. NOT zero: zero is a real answer meaning "this
 * Family's Tier Group reaches nothing", and claiming it while the composition is
 * merely unavailable would be a confident lie. The platform already prefers an
 * explicit token over a misleading number here — `formatActiveTierSlots` reads
 * "Not assigned" rather than 0 for a Family with no Tier system.
 */
const UNAVAILABLE = '—';

const METRIC_ORDER: readonly {
  id: FamilySummaryMetric['id'];
  label: string;
  of: keyof TierGroupComposition;
}[] = [
  { id: 'tiers',              label: 'Tiers',              of: 'tiers' },
  { id: 'service-categories', label: 'Service Categories', of: 'service_categories' },
  { id: 'services',           label: 'Services',           of: 'services' },
  { id: 'inclusions',         label: 'Inclusions',         of: 'inclusions' },
];

/**
 * Project a Package Family scope plus the composition its assigned Tier Group
 * reported into the summary model.
 *
 * `composition` is null whenever there is no usable answer to show: no
 * assignment, a Tier Group carrying no CZTG to address it by, or a read that has
 * not resolved. Every one of those fails closed to the unavailable state — there
 * is deliberately no native-id fallback and no zero-filling, because a confident
 * wrong number is worse than a visibly absent one.
 */
export function buildFamilySummary(
  family: WorkspaceFamilyScope,
  composition: TierGroupComposition | null = null,
): FamilySummaryModel {
  return {
    name:        family.name,
    positioning: family.description,
    status:      family.status,
    composed:    composition !== null,
    metrics: METRIC_ORDER.map((metric) => ({
      id:    metric.id,
      label: metric.label,
      value: composition === null ? UNAVAILABLE : composition[metric.of],
    })),
  };
}
