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

console.log('Tier occupant card/drawer unification contract checks passed.');
