// Pure contract for the Package-owned Tier-instance tool.

import {
  eligibleConsumers,
  selectableRateSheets,
  suggestConsumerForInstance,
  tierInstanceRows,
  tierSlotStates,
} from '../resources/ts/package-station/surface/tierInstance/tierInstanceModel';
import {
  decodeTierDrawerRecordId,
  encodeTierDrawerRecordId,
} from '../resources/ts/package-station/drawer/tier/tierDrawerTypes';
import { TIER_KEYS } from '../resources/ts/package-station/vocabulary';
import type {
  PackageFamilyListItem,
  PackageRateSheet,
  TierAssignment,
  TierInstanceRecord,
} from '../resources/ts/package-station/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier instance tool contract: ${message}`);
}

function family(
  id: string,
  status: PackageFamilyListItem['platform_status'],
  tierSelections = 0,
): PackageFamilyListItem {
  return {
    group_id: id,
    label: id.toUpperCase(),
    description: '',
    platform_status: status,
    previous_platform_status: null,
    module_status: { overview: 'settled' },
    has_draft: false,
    sort_order: 0,
    assigned_service_count: 0,
    dependents: { services: 0, rate_sheet_rows: 0, tier_selections: tierSelections },
    related_service_ids: [],
  };
}

function instance(id: string, occupantIds: string[] = []): TierInstanceRecord {
  const tiers = Object.fromEntries(TIER_KEYS.map((slotId, index) => [
    slotId,
    {
      current_occupant: occupantIds[index]
        ? { id: occupantIds[index], platform_status: 'active' }
        : null,
      drafts: { overview: null, features: null, faqs: null },
      module_status: {},
      history: [],
    },
  ]));
  return {
    tier_instance_id: id,
    title: id,
    status: occupantIds.length > 0 ? 'active' : 'disabled',
    allowed_rate_sheet_ids: [],
    popular_tier: null,
    popular_label: '',
    tiers,
    occupant_bin: [],
  };
}

const families = [
  family('kairos', 'active', 2),
  family('aptos', 'disabled', 0),
  family('archive', 'archived', 4),
  family('trash', 'trashed', 3),
];
const assigned: TierAssignment = {
  assignment_id: 'tasg_assigned',
  consumer_type: 'package_family',
  consumer_id: 'aptos',
  tier_instance_id: 'ti_assigned',
};

const eligible = eligibleConsumers(families, [assigned]);
check(eligible.map((item) => item.group_id).join(',') === 'kairos', 'eligible consumers exclude assigned and binned Families');

const unassigned = instance('ti_unassigned', ['occ_a', 'occ_b']);
unassigned.occupant_bin = [{
  bin_id: 'bin_a', origin_tier: 'basic', status: 'archived', previous_enabled: true,
  displaced_at: null, occupant: { id: 'occ_bin' },
}];
const rows = tierInstanceRows([unassigned], [], families);
check(rows[0].readiness === 'unassigned' && rows[0].operable, 'unassigned instance is operable, not an error');
check(rows[0].occupantCount === 2 && rows[0].binCount === 1, 'row counts come from the loaded instance envelopes');

const sheets: PackageRateSheet[] = [
  { rate_sheet_id: 'rs_a', title: 'A', status: 'active', groups: [], items: [] },
  { rate_sheet_id: 'rs_b', title: 'B', status: 'active', groups: [], items: [] },
  { rate_sheet_id: 'rs_old', title: 'Old', status: 'archived', groups: [], items: [] },
];
check(
  selectableRateSheets(sheets, ['rs_a'], 'rs_old').map((sheet) => sheet.rate_sheet_id).join(',') === 'rs_a,rs_old',
  'allow-list narrowing includes only allowed active sheets plus the bound archived sheet',
);
check(
  selectableRateSheets(sheets, [], 'rs_old').map((sheet) => sheet.rate_sheet_id).join(',') === 'rs_a,rs_b,rs_old',
  'empty allow-list exposes every active sheet plus the bound archived sheet',
);

check(
  tierSlotStates(instance('ti_slots')).map((slot) => slot.slotId).join(',') === TIER_KEYS.join(','),
  'slot display is always all five fixed keys in vocabulary order',
);

check(
  suggestConsumerForInstance(unassigned, families, [assigned])?.group_id === 'kairos',
  'exactly one eligible Family with Tier selections produces an explicit suggestion',
);
check(
  suggestConsumerForInstance(unassigned, [...families, family('omnia', 'active', 1)], [assigned]) === null,
  'multiple candidates produce no default pick',
);
check(
  suggestConsumerForInstance(unassigned, families.map((item) => ({
    ...item, dependents: { ...item.dependents, tier_selections: 0 },
  })), [assigned]) === null,
  'zero candidates produce no suggestion',
);

const routingToken = encodeTierDrawerRecordId('ti_unassigned', 'occ_a');
check(
  JSON.stringify(decodeTierDrawerRecordId(routingToken)) === JSON.stringify({ instanceId: 'ti_unassigned', occupantId: 'occ_a' }),
  'drawer routing carries the instance id without changing the occupant id',
);
check(decodeTierDrawerRecordId('occ_a') === null, 'legacy occupant-only identity remains distinguishable');

console.log('Tier instance tool contract passed.');
