// Pure contract for the Package-owned Tier-instance tool.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  eligibleConsumers,
  selectableRateSheets,
  tierRateSheetInventory,
  tierInstanceRows,
  tierSlotStates,
} from '../resources/ts/package-station/surface/tierInstance/tierInstanceModel';
import {
  decodeTierDrawerRecordId,
  decodeTierSlotDrawerRecordId,
  encodeTierDrawerRecordId,
  encodeTierSlotDrawerRecordId,
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
// A slot carries the occupant's OWN stored label, status and Rate Sheet binding.
// An empty slot carries none of them rather than a value derived from the key.
const occupiedSlots = tierSlotStates(unassigned);
check(
  occupiedSlots[0].occupantId === 'occ_a'
    && occupiedSlots[0].occupantStatus === 'active'
    && occupiedSlots[0].occupantLabel === null
    && occupiedSlots[0].rateSheetId === null,
  'an occupied slot reports exactly the occupant fields the record stores',
);
check(
  occupiedSlots.slice(2).every((slot) =>
    slot.occupantId === null
      && slot.occupantLabel === null
      && slot.occupantStatus === null
      && slot.rateSheetId === null),
  'an empty slot fabricates no occupant identity, status, or Rate Sheet binding',
);

// A consumer is knowable only from a stored assignment. The model derives no
// candidate from Tier selections, Rate Sheet provenance, or any other proximity
// signal, so no surface can offer a pre-picked Family to confirm.
const modelSource = readFileSync(
  resolve(import.meta.dirname, '..', 'resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts'),
  'utf8',
);
for (const forbidden of ['suggestConsumerForInstance', 'suggestConsumer', 'suggested']) {
  check(!modelSource.includes(forbidden), `the Tier model exposes no consumer suggestion (${forbidden})`);
}
check(
  tierInstanceRows([unassigned], [], families)[0].consumerId === null,
  'an instance with no assignment reports no consumer rather than a likely one',
);

const routingToken = encodeTierDrawerRecordId('ti_unassigned', 'occ_a');
check(
  JSON.stringify(decodeTierDrawerRecordId(routingToken)) === JSON.stringify({ instanceId: 'ti_unassigned', occupantId: 'occ_a' }),
  'drawer routing carries the instance id without changing the occupant id',
);
check(decodeTierDrawerRecordId('occ_a') === null, 'legacy occupant-only identity remains distinguishable');

const slotRoutingToken = encodeTierSlotDrawerRecordId('ti_unassigned', 'basic');
check(
  JSON.stringify(decodeTierSlotDrawerRecordId(slotRoutingToken)) === JSON.stringify({ instanceId: 'ti_unassigned', slotId: 'basic' }),
  'empty-slot routing carries instance and fixed slot identity without an occupant id',
);
check(decodeTierSlotDrawerRecordId(encodeTierSlotDrawerRecordId('ti_unassigned', 'custom')) === null, 'non-fixed slots are rejected');
check(decodeTierDrawerRecordId(slotRoutingToken) === null, 'slot routing can never be mistaken for occupant routing');

const sharedA = instance('ti_shared_a', ['occ_shared_a']);
const sharedB = instance('ti_shared_b', ['occ_shared_b']);
sharedA.tiers.basic.current_occupant!.rate_sheet_id = 'rs_a';
sharedB.tiers.basic.current_occupant!.rate_sheet_id = 'rs_a';
const sharedAssignments: TierAssignment[] = [
  { assignment_id: 'tasg_shared_a', consumer_type: 'package_family', consumer_id: 'kairos', tier_instance_id: 'ti_shared_a' },
  { assignment_id: 'tasg_shared_b', consumer_type: 'package_family', consumer_id: 'aptos', tier_instance_id: 'ti_shared_b' },
];
const inventory = tierRateSheetInventory(sheets, [sharedA, sharedB], sharedAssignments, families);
const sharedSheet = inventory.find((sheet) => sheet.rateSheetId === 'rs_a')!;
check(sharedSheet.availableTo.length === 2 && sharedSheet.usedBy.length === 2, 'a Rate Sheet may be available to and used by multiple instances');
check(
  sharedSheet.usedBy.map((scope) => scope.familyName).join(',') === 'KAIROS,APTOS',
  'Rate Sheet users receive Family labels only through explicit assignments',
);
check(
  sharedSheet.usedBy.every((scope) => scope.slotIds.join(',') === 'basic'),
  'current usage reports the exact fixed slots bound to the sheet',
);

console.log('Tier instance tool contract passed.');
