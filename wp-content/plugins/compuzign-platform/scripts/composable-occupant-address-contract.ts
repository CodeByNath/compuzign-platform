// Phase 1B — proves the composable occupant's own address (COMPOSABLE_TIER_ID)
// (1) can never enter normal Tier navigation/counting/select-one semantics,
// and (2) that the shared tierId-keyed response adapters in
// usePackageStation.ts correctly translate the composable occupant's own
// endpoint responses back into the exact shape every normal tiers[tierId]
// consumer (useTierModuleEditing, useTierBinTravel, tierDetailModel) already
// reads — the one seam that makes reusing those hooks/the schema-driven
// editor/the pinned footer/the Edition switcher unchanged actually correct,
// rather than merely compiling.
//
// This repo's contracts are fixture-driven against real exported production
// functions, not mounted DOM — draftPreferredDetail's own contract
// (tier-overview-is-addon-contract.ts) is the precedent this one follows.

import {
  TIER_KEYS,
  TIER_LABELS,
  COMPOSABLE_TIER_ID,
  COMPOSABLE_OCCUPANT_ORIGIN,
  isComposableOccupant,
} from '../resources/ts/package-station/vocabulary';
import {
  composableToLifecycle,
  composableToArchive,
  composableToRestore,
} from '../resources/ts/package-station/usePackageStation';
import type {
  ComposableOccupantLifecycleResponse,
  ComposableOccupantArchiveResponse,
  ComposableOccupantRestoreResponse,
} from '../resources/ts/package-station/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Composable occupant address contract: ${message}`);
}

// ── 1. Structural exclusion from normal Tier navigation/counting ───────────
// Every "Current (N)" count, Pricing Summary row set, and popular-tier
// selector in TierDrawerContent.tsx iterates TIER_KEYS directly — never a
// membership/allow-list check against a growing set of known ids. Proving
// the composable address is absent from TIER_KEYS is proving it structurally
// cannot appear in any of those surfaces, not merely that nothing currently
// happens to render it there.

check(!TIER_KEYS.includes(COMPOSABLE_TIER_ID as (typeof TIER_KEYS)[number]), 'COMPOSABLE_TIER_ID is never a member of TIER_KEYS — the array every normal-Tier count/table/selector iterates');
check(TIER_KEYS.length === 5, 'TIER_KEYS still names exactly the five normal Tier slots — adding the composable address never grew this array');
check(typeof TIER_LABELS[COMPOSABLE_TIER_ID] === 'string' && TIER_LABELS[COMPOSABLE_TIER_ID] !== '', 'the composable address still has a display label, so nothing renders it as a raw id if it ever reaches a TIER_LABELS lookup');
check(COMPOSABLE_TIER_ID !== COMPOSABLE_OCCUPANT_ORIGIN, 'the live-slot address and the bin origin_tier sentinel are deliberately distinct strings — a bin entry is never mistaken for the live slot address');
check(isComposableOccupant(COMPOSABLE_TIER_ID), 'isComposableOccupant recognises the composable address');
for (const tierId of TIER_KEYS) {
  check(!isComposableOccupant(tierId), `isComposableOccupant rejects the normal Tier slot "${tierId}"`);
}
check(!isComposableOccupant(null) && !isComposableOccupant(undefined), 'isComposableOccupant rejects null/undefined rather than throwing');

// ── 2. The shared adapters receive/produce the composable target correctly ─
// useTierModuleEditing/useTierBinTravel/tierDetailModel all key purely on
// `editingTierId` and read `res.tier`/`res.tier_id`/`res.drafts`/
// `res.module_status` from whatever usePackageStation's own tierId-keyed
// methods return — they never see ComposableOccupantLifecycleResponse's own
// `occupant`-shaped response at all. These adapters are the one seam that
// makes that true; proving their output shape is proving those hooks
// receive exactly what they already know how to read.

const lifecycleSuccess: ComposableOccupantLifecycleResponse = {
  success: true,
  tier_instance_id: 'ti_a',
  module: 'overview',
  occupant: {
    occupant_id: 'occ_composable', platform_id: 'CZT-ABC', addon_platform_id: '',
    default_leg_platform_id: '', headline_leg_id: '', label: 'Build Your Own',
    ideal_for: '', audience_groups: ['personal_business', 'enterprise'],
    price: null, contact: false, billing_cycle: 'monthly',
    minimum_term_value: null, minimum_term_unit: null, from_month: null, to_month: null,
    legs: [], inclusions_override: [], rate_sheet_id: 'rs_a', rate_sheet_items: [],
    rate_sheet_selections: [], features: [], faq_refs: [], enabled: true, is_addon: false,
    is_explicitly_disabled: false, tier_editions: [], tier_edition_bin: [],
  },
  drafts: { overview: null, pricing_rules: null, features: null, faqs: null },
  module_status: { overview: 'settled', pricing_rules: 'not-configured', features: 'not-configured', faqs: 'not-configured' },
};

const lifecycleGeneric = composableToLifecycle(lifecycleSuccess, COMPOSABLE_TIER_ID);
check(lifecycleGeneric.success === true, 'a successful composable lifecycle response adapts to success: true');
check(lifecycleGeneric.tier_id === COMPOSABLE_TIER_ID, 'the adapted response carries tier_id: COMPOSABLE_TIER_ID — the exact key useTierModuleEditing/tierDetailModel already key their own state on');
check(lifecycleGeneric.tier === lifecycleSuccess.occupant, 'the adapted response exposes the composable occupant under `tier` — the same field name every tiers[tierId] response already uses, never a second field name a consumer would need to branch on');
check(lifecycleGeneric.drafts === lifecycleSuccess.drafts, 'drafts pass through unchanged');
check(lifecycleGeneric.module_status === lifecycleSuccess.module_status, 'module_status passes through unchanged');
check(lifecycleGeneric.module === 'overview', 'module passes through unchanged');

const lifecycleFailure: ComposableOccupantLifecycleResponse = { success: false, edition_id: undefined as never, message: 'Unknown module.' } as unknown as ComposableOccupantLifecycleResponse;
const lifecycleFailureGeneric = composableToLifecycle({ ...lifecycleFailure, success: false }, COMPOSABLE_TIER_ID);
check(lifecycleFailureGeneric.success === false, 'a failed composable lifecycle response adapts to success: false rather than throwing on the missing occupant/drafts/module_status fields');
check((lifecycleFailureGeneric as { tier_id?: string }).tier_id === COMPOSABLE_TIER_ID, 'even a failure response still carries tier_id, so a caller keying UI state on it never sees undefined');

const archiveSuccess: ComposableOccupantArchiveResponse = {
  success: true,
  occupant: lifecycleSuccess.occupant,
  drafts: lifecycleSuccess.drafts,
  module_status: lifecycleSuccess.module_status,
  bin_entry: { bin_id: 'bin_1', origin_tier: COMPOSABLE_OCCUPANT_ORIGIN, occupant: lifecycleSuccess.occupant as never, status: 'archived', previous_enabled: true, displaced_at: '2026-09-01 00:00:00' },
  occupant_bin: [],
};
const archiveGeneric = composableToArchive(archiveSuccess, COMPOSABLE_TIER_ID);
check(archiveGeneric.tier_id === COMPOSABLE_TIER_ID, 'archive response adapts tier_id to the composable address');
check(archiveGeneric.platform_status === undefined, 'archiving the composable occupant never reports a platform_status — that field belongs to the parent Tier Instance alone, and this occupant must never be read as changing it');
check(archiveGeneric.bin_entry?.origin_tier === COMPOSABLE_OCCUPANT_ORIGIN, 'the archived bin entry keeps the composable origin sentinel through the adapter');

const restoreSuccess: ComposableOccupantRestoreResponse = {
  success: true,
  occupant: lifecycleSuccess.occupant,
  drafts: lifecycleSuccess.drafts,
  module_status: lifecycleSuccess.module_status,
  occupant_bin: [],
};
const restoreGeneric = composableToRestore(restoreSuccess, COMPOSABLE_TIER_ID, 'bin_1');
check(restoreGeneric.tier_id === COMPOSABLE_TIER_ID, 'restore response adapts tier_id to the composable address');
check(restoreGeneric.bin_id === 'bin_1', 'restore response carries the bin_id the caller asked to restore');
check(!('mode' in restoreGeneric) && !('targetTier' in restoreGeneric), 'the adapted restore response carries no mode/targetTier field — this occupant\'s own restore endpoint accepts neither, so swap/retarget into a normal slot is structurally unreachable through this path, not merely unoffered');

console.log('Composable occupant address contract passed.');
