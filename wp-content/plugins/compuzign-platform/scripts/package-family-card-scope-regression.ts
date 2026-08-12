// Regression: the Package Family card can only aggregate what it reaches
// through ITS OWN Tiers and their occupants.
//
// The card is a composition of existing atomic relations —
//
//   Family Platform ID → Family → Tier → Tier occupant → inclusion (Rate Sheet row)
//
// — and the row itself was built by the Rate Sheet Engine from an existing
// Service Category → Service structure. The Family owns none of those
// downstream entities, so the only thing standing between "collating" and
// "claiming ownership" is scope. This file drives the exact chain the workspace
// drives (resolveFamilyTierAssignment → projectResolvedInstanceOccupants →
// projectTierDeck → collateFamilyTierComposition → buildFamilySummary) against a
// deliberately SHARED pool and proves the scope holds.
//
// The pool is shared on purpose: one Rate Sheet holds rows supplied by both
// Families' Services, and both Families' occupants are present in the station.
// Any implementation that reached for the Rate Sheet, the relationship pool, or
// `dependents` instead of walking this Family's own Tiers would over-count here.

import {
  projectResolvedInstanceOccupants,
  resolveFamilyTierAssignment,
  summarizeTierInstance,
  type WorkspaceFamilyScope,
} from '../resources/ts/package-station/surface/packageTierWorkspace/projection';
import {
  buildRateItemProvenanceMap,
  projectTierDeck,
  type DeckRateSheet,
  type DeckSelection,
} from '../resources/ts/package-station/surface/packageTierWorkspace/deck';
import {
  buildFamilySummary,
  collateFamilyTierComposition,
  EMPTY_FAMILY_TIER_COMPOSITION,
} from '../resources/ts/package-station/surface/packageTierWorkspace/familySummary';
import type { TierAssignment, TierInstanceRecord } from '../resources/ts/package-station/types';
import { TIER_KEYS } from '../resources/ts/package-station/vocabulary';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package Family card scope regression: ${message}`);
}

// ── The shared downstream world ───────────────────────────────────────────────
// One Rate Sheet, whose rows the Rate Sheet Engine built from four Services
// across three Service Categories. Nothing here belongs to a Family.

const relationships = [
  { item_id: 'rel_compute', source_categories: ['Cloud Infrastructure'], source_service_platform_id: 'CZS_COMPUTE', source_category_platform_ids: ['CZC_CLOUD'] },
  { item_id: 'rel_storage', source_categories: ['Cloud Infrastructure'], source_service_platform_id: 'CZS_STORAGE', source_category_platform_ids: ['CZC_CLOUD'] },
  { item_id: 'rel_soc',     source_categories: ['Security'],            source_service_platform_id: 'CZS_SOC',     source_category_platform_ids: ['CZC_SECURITY'] },
  { item_id: 'rel_desk',    source_categories: ['Managed Services'],    source_service_platform_id: 'CZS_DESK',    source_category_platform_ids: ['CZC_MANAGED'] },
  // A Service whose owner carries no Platform ID yet. Its rows are real
  // Inclusions but contribute no identity — never a name-keyed bucket.
  { item_id: 'rel_pilot',   source_categories: ['Pilot'],               source_service_platform_id: '',            source_category_platform_ids: [] },
];

const rateItems = [
  { item_id: 'row_compute', source_item_id: 'rel_compute' },
  { item_id: 'row_storage', source_item_id: 'rel_storage' },
  { item_id: 'row_soc',     source_item_id: 'rel_soc' },
  { item_id: 'row_desk',    source_item_id: 'rel_desk' },
  { item_id: 'row_pilot',   source_item_id: 'rel_pilot' },
];

const rateSheet: DeckRateSheet = {
  rate_sheet_id: 'rs_shared',
  platform_id: 'CZPRC_SHARED',
  title: 'Shared Rates',
  status: 'active',
  groups: [{ group_id: 'grp_core', label: 'Core', sort_order: 0, platform_id: 'CZPRCG_CORE' }],
};

const provenanceByRateItem = buildRateItemProvenanceMap(rateItems, relationships);

function selection(itemId: string): DeckSelection {
  return {
    item_id: itemId, source_type: 'inclusion', source_id: `src_${itemId}`,
    quantity: 1, resolved: true, label: itemId, unit_price: 10, per: 'Per month',
    line_total: 10, group_id: 'grp_core',
  };
}

// ── Two Families, two Tier systems, four occupants ────────────────────────────

function family(id: string): WorkspaceFamilyScope {
  return {
    id,
    name: id.toUpperCase(),
    description: `${id} positioning`,
    status: 'active',
    // Deliberately large and wrong for this card: these are the Family's OWN
    // direct Service/Rate-Sheet edges. If any of them reached a metric, every
    // expectation below would fail.
    dependents: { services: 99, rate_sheet_rows: 99, tier_selections: 99 },
    platformId: `CZPG_${id.toUpperCase()}`,
  };
}

const kairos = family('kairos');
const aptos  = family('aptos');
const omnia  = family('omnia'); // assigned no Tier system at all

/** Occupant selections keyed by slot — the occupant relation this card walks. */
const OCCUPANT_SELECTIONS: Record<string, string[]> = {
  // KAIROS: two occupants, two Services, one shared Category between them,
  // plus a repeated row proving Inclusions counts rows and not identities.
  occ_kairos_basic: ['row_compute', 'row_storage'],
  occ_kairos_pro:   ['row_compute', 'row_soc'],
  // APTOS: entirely different Services and Categories, drawn from the SAME sheet.
  occ_aptos_basic:  ['row_desk', 'row_pilot'],
};

function instance(instanceId: string, occupantIds: readonly string[]): TierInstanceRecord {
  return {
    tier_instance_id: instanceId,
    title: `${instanceId} Tiers`,
    status: 'active',
    allowed_rate_sheet_ids: [rateSheet.rate_sheet_id],
    popular_tier: 'basic',
    popular_label: 'Popular',
    tiers: Object.fromEntries(TIER_KEYS.map((slotId, index) => [slotId, {
      current_occupant: index < occupantIds.length
        ? { id: occupantIds[index], platform_status: 'active', rate_sheet_items: [] }
        : null,
      history: [],
      drafts: { overview: null, features: null, faqs: null },
      module_status: {},
    }])),
    occupant_bin: [],
  } as TierInstanceRecord;
}

const kairosRecord = instance('ti_kairos', ['occ_kairos_basic', 'occ_kairos_pro']);
const aptosRecord  = instance('ti_aptos',  ['occ_aptos_basic']);
const summaries = [kairosRecord, aptosRecord].map(summarizeTierInstance);

const OCCUPANTS_BY_INSTANCE: Record<string, string[]> = {
  ti_kairos: ['occ_kairos_basic', 'occ_kairos_pro'],
  ti_aptos:  ['occ_aptos_basic'],
};

const assignments: TierAssignment[] = [
  { assignment_id: 'tasg_kairos', consumer_type: 'package_family', consumer_id: kairos.id, tier_instance_id: 'ti_kairos' },
  { assignment_id: 'tasg_aptos',  consumer_type: 'package_family', consumer_id: aptos.id,  tier_instance_id: 'ti_aptos' },
];

// ── The exact chain the workspace walks ───────────────────────────────────────

function cardFor(scope: WorkspaceFamilyScope, ledger: readonly TierAssignment[] = assignments) {
  const resolved = resolveFamilyTierAssignment(scope, ledger, summaries);
  const occupantIds = projectResolvedInstanceOccupants(
    resolved,
    resolved === null ? [] : OCCUPANTS_BY_INSTANCE[resolved.tier_instance_id] ?? [],
  );
  // Tiers comes from the resolved Tier system's OWN record (`occupant_count`,
  // via summarizeTierInstance); the occupant decks are only the inclusion
  // bridge. Two separate hops, exactly as the workspace supplies them.
  const composition = resolved === null
    ? EMPTY_FAMILY_TIER_COMPOSITION
    : collateFamilyTierComposition(
      resolved.occupant_count,
      occupantIds.map((occupantId) => projectTierDeck(
        (OCCUPANT_SELECTIONS[occupantId] ?? []).map(selection),
        provenanceByRateItem,
        rateSheet,
      )),
    );
  const summary = buildFamilySummary(scope, composition);
  return Object.fromEntries(summary.metrics.map((metric) => [metric.id, metric.value])) as Record<string, number>;
}

const kairosCard = cardFor(kairos);
const aptosCard  = cardFor(aptos);
const omniaCard  = cardFor(omnia);

// ── KAIROS reports only what its own Tiers reach ──────────────────────────────

check(kairosCard.tiers === 2, 'KAIROS reports the two Tiers registered on its own assigned Tier system');
check(kairosCard.inclusions === 4, 'KAIROS totals the four inclusion rows its own occupants hold, counting the row both Tiers repeat twice');
check(kairosCard.services === 3, 'KAIROS resolves three distinct Service Platform IDs (compute counted once across two Tiers)');
check(kairosCard['service-categories'] === 2, 'KAIROS resolves two distinct Category Platform IDs, deduplicated across its Tiers');

// ── APTOS is a different world reached through the same Rate Sheet ────────────

check(aptosCard.tiers === 1, 'APTOS reports the single Tier registered on its own assigned Tier system');

// Tiers is the direct Family → Tier system relation, so it survives a
// downstream bridge that reaches nothing: a Tier registered on the assigned
// system still counts even when its occupant contributes no inclusion rows.
const emptyBridge = buildFamilySummary(kairos, collateFamilyTierComposition(2, []));
check(
  emptyBridge.metrics.find((metric) => metric.id === 'tiers')?.value === 2
  && emptyBridge.metrics.find((metric) => metric.id === 'inclusions')?.value === 0,
  'a registered Tier is not un-counted by an empty inclusion bridge — Tiers never re-derives from occupants',
);
check(aptosCard.inclusions === 2, 'APTOS totals only its own occupant rows');
check(aptosCard.services === 1, 'the Platform-ID-less pilot Service adds an Inclusion to APTOS but no Service identity');
check(aptosCard['service-categories'] === 1, 'the Platform-ID-less pilot row adds no Category identity to APTOS either');

// ── Nothing crosses ───────────────────────────────────────────────────────────

check(
  kairosCard.services + aptosCard.services === 4,
  'the two Families resolve four Service identities between them — neither absorbs the other\'s',
);
check(
  kairosCard.inclusions + aptosCard.inclusions === 6 && kairosCard.inclusions !== 6 && aptosCard.inclusions !== 6,
  'neither Family reports every row on the shared Rate Sheet, only the rows its own occupants hold',
);
check(
  kairosCard.tiers + aptosCard.tiers === 3 && kairosCard.tiers !== 3,
  'a Family never counts another Family\'s Tier occupants',
);

// APTOS's Services and Categories are absent from KAIROS entirely: rebuilding
// KAIROS's card with APTOS's occupant deliberately swapped in is the only way
// those numbers change, which is exactly what scope must prevent.
const leakedCard = buildFamilySummary(kairos, collateFamilyTierComposition(
  3,
  [...OCCUPANTS_BY_INSTANCE.ti_kairos, ...OCCUPANTS_BY_INSTANCE.ti_aptos].map((occupantId) => projectTierDeck(
    (OCCUPANT_SELECTIONS[occupantId] ?? []).map(selection),
    provenanceByRateItem,
    rateSheet,
  )),
));
const leaked = Object.fromEntries(leakedCard.metrics.map((metric) => [metric.id, metric.value]));
check(
  leaked.services === 4 && leaked['service-categories'] === 3 && leaked.inclusions === 6 && leaked.tiers === 3,
  'the leaked shape is genuinely different, so the scoped assertions above are meaningful and not coincidental',
);

// ── Fail-closed cases keep the card at zero, never at `dependents` ────────────

check(
  omniaCard.tiers === 0 && omniaCard.services === 0 && omniaCard['service-categories'] === 0 && omniaCard.inclusions === 0,
  'a Family assigned no Tier system reports zeros, never its own Family→Service/Rate Sheet dependents (99)',
);
check(
  Object.values(cardFor(kairos, [
    assignments[0],
    { ...assignments[0], assignment_id: 'tasg_dupe', tier_instance_id: 'ti_aptos' },
  ])).every((value) => value === 0),
  'duplicate Family assignments fail closed to zeros rather than collating a second Family\'s Tiers',
);
check(
  Object.values(cardFor(kairos, [{ ...assignments[0], tier_instance_id: 'ti_missing' }])).every((value) => value === 0),
  'a dangling assignment fails closed rather than falling through to another instance',
);

console.log('Package Family card scope regression passed.');
