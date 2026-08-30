// Phase 4 of the Tier Occupant Lifecycle Repair Blueprint: proves the drawer's
// package-overview list and the Tier/Add-on occupant cards render the SAME
// canonical status/notes for a given occupant — no second evaluator, no
// reduced-context re-evaluation. Both consumers call resolveTierStatus /
// getTierNotes against the occupant's own is_explicitly_disabled/enabled
// fields (see usePackageStation.tierView and tierOccupantCard.ts); this
// contract exercises that shared pipeline directly, across every lifecycle
// state, for both a normal Tier and an Add-on occupant.

import { resolveTierStatus } from '../resources/ts/drawer-kit/utils/moduleStatus';
import type { TierLike } from '../resources/ts/drawer-kit/utils/moduleStatus';
import { getTierNotes } from '../resources/ts/drawer-kit/utils/moduleNotifications/tier';
import { toTierOccupantCard, toTierCardStatus } from '../resources/ts/package-station/surface/tierSurface/tierOccupantCard';
import type { PackageStationTierView } from '../resources/ts/package-station/usePackageStation';
import type { SurfaceTierDetail } from '../resources/ts/package-station/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier occupant card/drawer unification contract: ${message}`);
}

function detail(over: Partial<SurfaceTierDetail>, isAddon: boolean): SurfaceTierDetail {
  return {
    occupant_id: 'occ_unify', platform_id: '', addon_platform_id: '',
    label: 'Standard', ideal_for: '', price: 25, contact: false, billing_cycle: 'monthly',
    rate_sheet_id: null, inclusions_override: [], rate_sheet_items: [], rate_sheet_selections: [],
    features: [], faq_refs: [], enabled: true, is_explicitly_disabled: false, is_addon: isAddon,
    ...over,
  };
}

// Mirrors exactly what usePackageStation.tierView constructs — the ONE place
// TierLike is derived from a SurfaceTierDetail for the whole-tier pill.
function tierLikeFrom(d: SurfaceTierDetail): TierLike {
  return { enabled: d.enabled, is_explicitly_disabled: !!d.is_explicitly_disabled, price: d.price, billing_cycle: d.billing_cycle, contact: d.contact };
}

function viewFrom(d: SurfaceTierDetail): PackageStationTierView {
  return {
    detail: d,
    status: resolveTierStatus(tierLikeFrom(d), { pkgStatus: 'active' }),
    drafts: { overview: null, features: null, faqs: null },
    moduleStatus: { overview: 'settled', features: 'settled', faqs: 'settled' },
    modules: {
      overview: { status: 'active', notes: [] },
      features: { status: 'active', notes: [] },
      faqs: { status: 'active', notes: [] },
    },
  };
}

const scenarios: Array<[string, Partial<SurfaceTierDetail>]> = [
  ['unconfigured shell',            { price: null, billing_cycle: null, enabled: false }],
  ['ready, unpublished, unmasked (Enable)', { enabled: false, is_explicitly_disabled: false }],
  ['published (Publish)',           { enabled: true, is_explicitly_disabled: false }],
  ['explicitly Disabled',           { enabled: true, is_explicitly_disabled: true }],
];

for (const isAddon of [false, true]) {
  for (const [name, over] of scenarios) {
    const d = detail(over, isAddon);
    const view = viewFrom(d);

    const card = toTierOccupantCard({ occupantId: 'occ_unify', slotId: 'standard', view, platformStatus: 'active' });

    const expectedStatus = toTierCardStatus(view.status);
    const expectedNotes = getTierNotes(d, { platformStatus: d.enabled ? 'active' : 'disabled', disabled: d.is_explicitly_disabled });

    check(card.status === expectedStatus, `${isAddon ? 'Add-on' : 'Tier'} card status for "${name}" matches the drawer's resolveTierStatus output`);
    check(
      JSON.stringify(card.notifications) === JSON.stringify(expectedNotes),
      `${isAddon ? 'Add-on' : 'Tier'} card notes for "${name}" match the drawer's getTierNotes output`,
    );
    check(card.kind === (isAddon ? 'Package Add-on' : 'Package Tier'), `card kind reflects is_addon for "${name}" without altering status/notes derivation`);
  }
}

// Live defect (round 5): the card's "Included features" metric and the
// focused Tier detail panel (TierDetailPanel.tsx, which renders this SAME
// card item) both counted `inclusions_override.length` — the occupant's
// OWN raw commercial selection rows, where a Bundle-backed selection is
// one row. A Tier whose only selection is a Bundle compiling 3 real
// inclusions showed "1 included feature" everywhere, while Details >
// Focused inclusions (the accepted display projection) correctly showed
// the 3 real rows. The metric must count the SAME deduped real Inclusion
// projection Details uses — never the raw selection list, never a
// hardcoded number.
const bundleOnlyDetail = detail({
  rate_sheet_id: 'rs_omnia',
  rate_sheet_selections: [{
    item_id: 'row_bundle', quantity: 1, resolved: true, label: 'Foundation Bundle',
    unit_price: 300, per: 'Per Module', line_total: 300, group_id: null,
    bundle_id: 'rsb_1',
    includes: [
      { item_id: 'row_a', source_rate_sheet_id: 'rs_omnia', source_item_id: 'rel_a', label: 'Website Revamp', quantity: 1 },
      { item_id: 'row_b', source_rate_sheet_id: 'rs_omnia', source_item_id: 'rel_b', label: 'Online Banking', quantity: 1 },
      { item_id: 'row_c', source_rate_sheet_id: 'rs_omnia', source_item_id: 'rel_c', label: 'Wire Transfer', quantity: 1 },
    ],
  }],
}, false);
const bundleOnlyCard = toTierOccupantCard({
  occupantId: 'occ_bundle', slotId: 'basic', view: viewFrom(bundleOnlyDetail), platformStatus: 'active',
});
check(
  bundleOnlyCard.metrics.find((metric) => metric.id === 'features')?.value === 3,
  'a Tier whose only selection is a Bundle compiling 3 real rows reports 3 included features, not 1 (the raw commercial selection count) and not a hardcoded number',
);

const directOnlyDetail = detail({
  rate_sheet_id: 'rs_kairos',
  rate_sheet_selections: [
    { item_id: 'row_x', quantity: 1, resolved: true, label: 'Compute', source_type: 'inclusion', source_id: 'inc-x', unit_price: 10, per: 'Per month', line_total: 10, group_id: null },
    { item_id: 'row_y', quantity: 1, resolved: true, label: 'Storage', source_type: 'inclusion', source_id: 'inc-y', unit_price: 5, per: 'Per month', line_total: 5, group_id: null },
  ],
}, false);
const directOnlyCard = toTierOccupantCard({
  occupantId: 'occ_direct', slotId: 'basic', view: viewFrom(directOnlyDetail), platformStatus: 'active',
});
check(
  directOnlyCard.metrics.find((metric) => metric.id === 'features')?.value === 2,
  'a Tier with only ordinary direct selections still reports the real count (2) — the fix does not regress the already-correct non-Bundle case',
);

const emptyDetail = detail({ rate_sheet_id: null, rate_sheet_selections: [] }, false);
const emptyCard = toTierOccupantCard({
  occupantId: 'occ_empty', slotId: 'basic', view: viewFrom(emptyDetail), platformStatus: 'active',
});
check(
  emptyCard.metrics.find((metric) => metric.id === 'features')?.value === 0,
  'a Tier with no selections reports a genuine 0, never a fabricated count',
);

console.log('Tier occupant card/drawer unification contract checks passed.');
