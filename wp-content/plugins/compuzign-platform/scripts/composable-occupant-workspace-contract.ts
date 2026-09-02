// Phase 1C — proves the Family-first Tier Workspace surface
// (presentation/package-tier-workspace/) exposes the same subordinate
// composable occupant the Service-scoped TierDrawerContent route already
// does, without ever letting it join the five-slot model that surface
// derives from TIER_KEYS. Companion to composable-occupant-address-
// contract.ts (which proves the address/adapters), this one proves the
// workspace-specific structural exclusion and the routing-layer gaps that
// blocked reusing dispatchTierIntent for it are actually closed:
// (1) the composable model is separate from `slots`/its filters/counts and
//     available for both absent and configured occupant states;
// (2) the composable routing target decodes/dispatches without joining the
//     fixed-slot vocabulary, and normal five-slot routing is unaffected;
// (3) a generic occupant_id -> address lookup resolves the composable
//     occupant too, not only the five `tiers[tierId]` slots.
//
// Fixture-driven against real exported production functions, not mounted
// DOM — same precedent composable-occupant-address-contract.ts follows.

import { TIER_KEYS, COMPOSABLE_TIER_ID } from '../resources/ts/package-station/vocabulary';
import {
  projectWorkspaceTierSlots,
  projectComposableWorkspaceSlot,
  filterWorkspaceTierSlots,
} from '../resources/ts/package-station/surface/packageTierWorkspace/projection';
import { resolveOccupantSlotIncludingComposable } from '../resources/ts/package-station/tierOccupants';
import {
  encodeTierSlotDrawerRecordId,
  decodeTierSlotDrawerRecordId,
  encodeTierDrawerRecordId,
  decodeTierDrawerRecordId,
} from '../resources/ts/package-station/drawer/tier/tierDrawerTypes';
import type { CategoryGroupCardItem } from '../resources/ts/admin-station/presentation/category-groups/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Composable occupant workspace contract: ${message}`);
}

const card = (id: string): CategoryGroupCardItem => ({
  id, key: id, name: `Package ${id}`, metrics: [], actions: [{ id: 'view', label: 'View' }],
});

// ── 1. The composable model is separate from the five-slot shell ───────────

const normalOccupants = TIER_KEYS.map((slotId, index) => ({
  slotId, occupantId: `occ_${slotId}`, item: card(`occ_${slotId}`), isAddon: false, isPopular: index === 0,
}));
const slots = projectWorkspaceTierSlots(normalOccupants);
check(slots.length === 5, 'projectWorkspaceTierSlots still returns exactly five slots once a composable occupant exists elsewhere');
check(!slots.some((slot) => slot.slotId === COMPOSABLE_TIER_ID), 'the composable address never appears among projectWorkspaceTierSlots results');
check(filterWorkspaceTierSlots(slots, 'all').length === 5, "the 'all' filter over the five-slot shell is unaffected");
check(filterWorkspaceTierSlots(slots, 'tiers').length === 5, "the 'tiers' filter counts only the five fixed slots — none of them is the composable occupant, so none is excluded by this filter either");
check(filterWorkspaceTierSlots(slots, 'addons').length === 0, "the 'addons' filter excludes every fixed slot here (isAddon: false) and, structurally, could never admit the composable occupant since it is never IN this array");

// Absent composable occupant (not yet created).
const absentComposable = projectComposableWorkspaceSlot(null, null);
check(absentComposable.slotId === COMPOSABLE_TIER_ID, 'the composable model always addresses itself at COMPOSABLE_TIER_ID');
check(!TIER_KEYS.includes(absentComposable.slotId as (typeof TIER_KEYS)[number]), 'the composable model\'s own slotId is never one of the five fixed Tier slots');
check(absentComposable.occupantId === null && absentComposable.item === null, 'an as-yet-uncreated composable occupant projects with a null occupantId/item — the same empty pair a fixed slot gets before its first Overview Save');
check(absentComposable.isAddon === null && absentComposable.isPopular === false, 'the composable model never carries Add-on/Popular flags — those are five-slot-only concepts');

// Configured composable occupant (already created).
const configuredComposable = projectComposableWorkspaceSlot('occ_composable', card('occ_composable'));
check(configuredComposable.occupantId === 'occ_composable' && configuredComposable.item !== null, 'a created composable occupant projects with its real occupantId/item — the same shape a filled fixed slot gets');
check(configuredComposable.slotId === COMPOSABLE_TIER_ID, 'a created composable occupant still addresses itself at COMPOSABLE_TIER_ID, never at a minted/derived slot id');

// ── 2. Composable routing target decodes without joining the fixed-slot vocabulary ─

const instanceId = 'ti_kairos';
for (const tierId of TIER_KEYS) {
  const decoded = decodeTierSlotDrawerRecordId(encodeTierSlotDrawerRecordId(instanceId, tierId));
  check(decoded?.slotId === tierId && decoded.instanceId === instanceId, `normal five-slot routing for "${tierId}" still round-trips unchanged`);
}
const composableSlotDecoded = decodeTierSlotDrawerRecordId(encodeTierSlotDrawerRecordId(instanceId, COMPOSABLE_TIER_ID));
check(composableSlotDecoded?.slotId === COMPOSABLE_TIER_ID && composableSlotDecoded.instanceId === instanceId, 'an as-yet-uncreated composable occupant\'s slot-address token now decodes — the gap that blocked its first Create flow');
check(decodeTierSlotDrawerRecordId(encodeTierSlotDrawerRecordId(instanceId, 'not_a_real_slot')) === null, 'the slot-address decoder still rejects an arbitrary unknown id — accepting the composable sentinel did not turn this into an accept-anything token');

const composableOccupantDecoded = decodeTierDrawerRecordId(encodeTierDrawerRecordId(instanceId, 'occ_composable'));
check(composableOccupantDecoded?.occupantId === 'occ_composable' && composableOccupantDecoded.instanceId === instanceId, 'a created composable occupant\'s occupant-address token round-trips exactly like a normal occupant\'s — this decoder was never slot-vocabulary-restricted');

// ── 3. Generic occupant_id -> address resolution reaches the composable occupant ─

const stationFixture = {
  tiers: Object.fromEntries(TIER_KEYS.map((slotId) => [slotId, { occupant_id: `occ_${slotId}` }])),
  composable_occupant: { occupant_id: 'occ_composable' },
};
for (const tierId of TIER_KEYS) {
  check(resolveOccupantSlotIncludingComposable(stationFixture, `occ_${tierId}`) === tierId, `resolveOccupantSlotIncludingComposable still resolves the normal "${tierId}" occupant to its own slot, unchanged`);
}
check(resolveOccupantSlotIncludingComposable(stationFixture, 'occ_composable') === COMPOSABLE_TIER_ID, 'resolveOccupantSlotIncludingComposable resolves the composable occupant\'s own occupant_id to COMPOSABLE_TIER_ID — the gap that blocked opening an already-created composable occupant by identity');
check(resolveOccupantSlotIncludingComposable(stationFixture, 'occ_unknown') === null, 'resolveOccupantSlotIncludingComposable still fails closed for an occupant_id that belongs to neither the five slots nor the composable occupant');
check(resolveOccupantSlotIncludingComposable({ tiers: stationFixture.tiers, composable_occupant: null }, 'occ_composable') === null, 'with no composable occupant created yet (null), its own former occupant_id (from a fixture that no longer applies) resolves to nothing rather than a stale match');

console.log('Composable occupant workspace contract passed.');
