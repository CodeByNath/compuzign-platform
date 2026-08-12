import { toPackageFamilyCard } from '../resources/ts/package-station/surface/packageFamily/cardAdapter';
import { buildFamilySummary } from '../resources/ts/package-station/surface/packageTierWorkspace/familySummary';
import type { PackageFamilyItem, TierGroupComposition } from '../resources/ts/package-station/types';

// Focused contract for the Package Family summary card's metrics (Service Home
// wall). The card reports what the Family's assigned Tier Group composes, so
// this guards four regressions specifically: the card drifting back onto the
// `dependents` guard counts or `active_tier_slots` (both of which answer a
// different question and would print a confident wrong number), an absent
// composition being zero-filled instead of shown as unavailable, the four
// metrics or their order changing on one screen only, and the wall disagreeing
// with the Tier Workspace panel about the same Family.

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package Family card metrics contract: ${message}`);
}

function family(overrides: Partial<PackageFamilyItem> = {}): PackageFamilyItem {
  return {
    platform_id: '', group_id: 'pcg_kairos', label: 'KAIROS', description: '',
    platform_status: 'active', previous_platform_status: null,
    module_status: { overview: 'settled' }, has_draft: false,
    sort_order: 0, assigned_service_count: 3,
    // Deliberately large, deliberately unlike the composition below: every one
    // of these is a number the card must NOT print.
    dependents: { services: 3, rate_sheet_rows: 7, tier_selections: 41 },
    active_tier_slots: { occupied: 2, capacity: 5 },
    ...overrides,
  };
}

const composition: TierGroupComposition = {
  tiers: 5, service_categories: 6, services: 17, inclusions: 26,
};

// ── The four metrics, their identity, order, and values ────────────────────

const card = toPackageFamilyCard(family({ composition }));
check(card.metrics.length === 4, 'the card shows exactly four metrics');
check(
  card.metrics.map((metric) => metric.id).join(',') === 'tiers,service-categories,services,inclusions',
  'metric identity and order are fixed: Tiers, Service Categories, Services, Inclusions',
);
check(
  card.metrics.map((metric) => metric.label).join(',') === 'Tiers,Service Categories,Services,Inclusions',
  'metric labels are unchanged',
);

const valueById = new Map(card.metrics.map((metric) => [metric.id, metric.value]));
check(valueById.get('tiers') === 5, 'Tiers is the composition\'s registered-Tier count');
check(valueById.get('service-categories') === 6, 'Service Categories is the composition\'s distinct CZC count');
check(valueById.get('services') === 17, 'Services is the composition\'s distinct CZS count');
check(valueById.get('inclusions') === 26, 'Inclusions is the composition\'s deduplicated row count');

// ── The guard counts must never resurface as metrics ───────────────────────
// Every fixture number below is a value the card would print if it regressed
// onto the old source, so an exact-value assertion is the whole test.
const printed = card.metrics.map((metric) => metric.value);
check(!printed.includes(41), 'Tiers never reads dependents.tier_selections');
check(!printed.includes(7), 'Inclusions never reads dependents.rate_sheet_rows');
check(!printed.includes(3), 'Services never reads dependents.services');
check(!printed.includes(2), 'Tiers never reads active_tier_slots.occupied, which counts only ACTIVE occupants');
check(card.metrics.every((metric) => metric.icon !== undefined), 'every metric carries its glyph');

// ── Unavailable composition fails closed on every metric ───────────────────

for (const absent of [toPackageFamilyCard(family()), toPackageFamilyCard(family({ composition: null }))]) {
  check(
    absent.metrics.length === 4 && absent.metrics.every((metric) => metric.value === '—'),
    'an absent composition reads — on all four metrics, never 0 and never a locally recomputed substitute',
  );
}

// A real zero stays a real zero: a Tier Group that genuinely composes nothing
// is a different fact from one that could not be read, and they must not
// render alike.
const emptyCard = toPackageFamilyCard(family({
  composition: { tiers: 0, service_categories: 0, services: 0, inclusions: 0 },
}));
check(
  emptyCard.metrics.every((metric) => metric.value === 0),
  'a composition of genuine zeroes prints 0, staying visibly distinct from unavailable',
);

// ── The wall and the Tier Workspace panel cannot drift apart ───────────────
// Both screens project the same Family through the same shared model, so the
// same composition must produce identical ids, labels, and values.

const panel = buildFamilySummary(
  { id: 'pcg_kairos', name: 'KAIROS', description: '', status: 'active',
    dependents: { services: 3, rate_sheet_rows: 7, tier_selections: 41 }, platformId: '' },
  composition,
);
check(
  JSON.stringify(panel.metrics) === JSON.stringify(
    card.metrics.map((metric) => ({ id: metric.id, label: metric.label, value: metric.value })),
  ),
  'the Family card wall and the Tier Workspace panel report one Family identically',
);

// ── Card presentation flag ─────────────────────────────────────────────────
// The reduced-emphasis typography is scoped to the Package Family card via
// this data flag, never a shared/global style change (Service cards and Tier
// occupant cards render the same CategoryGroupCardItem contract and must
// keep the card kit's default large/bold metric value).
check(card.compactMetrics === true, 'the Package Family card opts into compact (small, regular-weight) metric values');

console.log('Package Family card metrics contract passed.');
