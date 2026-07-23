// Contract: the Package Station Tier tool's Family-scope projection.
//
// Guards the one rule that must never drift — a Tier occupant is projected under
// a Package Family purely as a FILTER, through the same Service-provenance chain
// the backend uses for `dependents.tier_selections`, and the occupant keeps its
// own `occupant_id` identity throughout. The Family is scope, never owner.

import {
  buildRateItemServiceMap,
  occupantSupplyingServiceIds,
  projectFamilyTierWorkspace,
  type WorkspaceFamilyScope,
  type WorkspaceOccupant,
} from '../resources/ts/package-station/surface/packageTierWorkspace/projection';
import { buildFamilySummary } from '../resources/ts/package-station/surface/packageTierWorkspace/familySummary';
import {
  buildRateItemCategoryMap,
  projectTierInclusions,
  projectTierRateSheetConnections,
  projectTierDeck,
  type DeckSelection,
} from '../resources/ts/package-station/surface/packageTierWorkspace/deck';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package Tier workspace contract: ${message}`);
}

// A minimal card whose id IS the occupant id — the projection must carry it through.
function card(occupantId: string) {
  return { id: occupantId, key: occupantId, name: `Package ${occupantId}`, metrics: [], actions: [] };
}

// ── Provenance resolution ─────────────────────────────────────────────────────
// Rate rows resolve to a supplying Service via the relationship they price; rows
// with no provenance (null service) or no matching relationship resolve to none.
const relationships = [
  { item_id: 'rel_svc10', source_service_id: 10 },
  { item_id: 'rel_svc20', source_service_id: 20 },
  { item_id: 'rel_none',  source_service_id: null },
];
const rateItems = [
  { item_id: 'rate_a', source_item_id: 'rel_svc10' },
  { item_id: 'rate_b', source_item_id: 'rel_svc20' },
  { item_id: 'rate_c', source_item_id: 'rel_none' },   // no provenance
  { item_id: 'rate_d', source_item_id: 'rel_absent' }, // no such relationship
];
const rateItemServiceMap = buildRateItemServiceMap(rateItems, relationships);

check(rateItemServiceMap.get('rate_a') === 10, 'rate row resolves to its supplying Service');
check(rateItemServiceMap.get('rate_b') === 20, 'second rate row resolves independently');
check(!rateItemServiceMap.has('rate_c'), 'a row without Service provenance resolves to nothing');
check(!rateItemServiceMap.has('rate_d'), 'a row with no relationship resolves to nothing');

// ── Occupant supplying Services ───────────────────────────────────────────────
check(
  JSON.stringify(occupantSupplyingServiceIds(['rate_a', 'rate_a', 'rate_b'], rateItemServiceMap)) === JSON.stringify([10, 20]),
  'occupant Services are resolved and de-duplicated',
);
check(
  occupantSupplyingServiceIds(['rate_c', 'rate_d'], rateItemServiceMap).length === 0,
  'an occupant with only unresolved selections supplies no Services',
);

// ── Family-scope projection ───────────────────────────────────────────────────
const occupants: WorkspaceOccupant[] = [
  { occupantId: 'occ_kairos', card: card('occ_kairos'), supplyingServiceIds: [10] },
  { occupantId: 'occ_aptos',  card: card('occ_aptos'),  supplyingServiceIds: [20] },
  { occupantId: 'occ_both',   card: card('occ_both'),   supplyingServiceIds: [10, 20] },
  { occupantId: 'occ_orphan', card: card('occ_orphan'), supplyingServiceIds: [] },
];
const families: WorkspaceFamilyScope[] = [
  { id: 'KAIROS', name: 'KAIROS', description: 'IaaS', status: 'active',   relatedServiceIds: [10], dependents: { services: 1, rate_sheet_rows: 1, tier_selections: 2 } },
  { id: 'APTOS',  name: 'APTOS',  description: 'SaaS', status: 'active',   relatedServiceIds: [20], dependents: { services: 1, rate_sheet_rows: 1, tier_selections: 2 } },
  { id: 'OMNIA',  name: 'OMNIA',  description: 'Tech', status: 'disabled', relatedServiceIds: [99], dependents: { services: 0, rate_sheet_rows: 0, tier_selections: 0 } },
];

const projection = projectFamilyTierWorkspace(families, occupants);
const byId = new Map(projection.map((family) => [family.id, family]));

check(projection.length === 3, 'every Family is projected, even with no connected occupant');

const kairos = byId.get('KAIROS')!;
check(kairos.occupants.map((o) => o.id).join(',') === 'occ_kairos,occ_both', 'KAIROS projects only its connected occupants');

const aptos = byId.get('APTOS')!;
check(aptos.occupants.map((o) => o.id).join(',') === 'occ_aptos,occ_both', 'APTOS projects its own connected occupants');

// The shared occupant appears under BOTH families — it is filtered in, never owned.
check(
  kairos.occupants.some((o) => o.id === 'occ_both') && aptos.occupants.some((o) => o.id === 'occ_both'),
  'a shared occupant is a filter result under multiple families, not owned by one',
);

const omnia = byId.get('OMNIA')!;
check(omnia.occupants.length === 0, 'a Family with no connected occupant projects an empty list (its empty state)');

// Identity survives the projection: the projected card id is the occupant_id, and
// changing the selected Family never changes an occupant's identity.
check(kairos.occupants.every((o) => o.id.startsWith('occ_')), 'projected cards keep the native occupant_id as identity');

// The authoritative summary is passed through untouched — never re-derived here.
check(kairos.dependents.tier_selections === 2, 'the authoritative Family dependents summary is preserved as-is');

// ── Family summary model ──────────────────────────────────────────────────────
// The read-only summary panel shows the family's own fields only — name,
// description-as-positioning, authoritative status, and exactly the three
// authoritative dependents. This guards against a fabricated field (estimated
// margin, demand score, "last updated") ever entering the summary.
const summary = buildFamilySummary(families[0]); // KAIROS

check(summary.name === 'KAIROS', 'summary carries the family name unchanged');
check(summary.positioning === 'IaaS', 'summary positioning is the family description, shown as-is');
check(summary.status === 'active', 'summary carries the authoritative family status');
check(summary.metrics.length === 3, 'summary shows exactly three metrics — no invented figure is added');
check(
  summary.metrics.map((metric) => metric.id).join(',') === 'services,rate-sheet-rows,tier-selections',
  'summary metrics are the three authoritative dependents, in order',
);
check(summary.metrics[0].value === 1, 'connected Services is dependents.services, passed through');
check(summary.metrics[1].value === 1, 'Rate Sheet rows is dependents.rate_sheet_rows, passed through');
check(summary.metrics[2].value === 2, 'Tier selections is dependents.tier_selections, never re-derived');

// ── Focused-Tier lower deck ───────────────────────────────────────────────────
// The deck re-reads the Tier's already-resolved selections; it invents no data
// and no second price. These guard the three rules that matter: Details is the
// inclusion selections with Service category added (nothing recomputed),
// Connections is the resolved rows grouped by Rate Sheet group, and the deck is
// carried on the Family keyed by occupant_id — Tier-owned data under a Family filter.

// Category resolves via the SAME two-hop chain as Service scope, reading
// source_categories; a relationship with no categories contributes nothing.
const catRelationships = [
  { item_id: 'rel_infra', source_categories: ['Cloud Infrastructure'] },
  { item_id: 'rel_ops',   source_categories: ['Managed Services'] },
  { item_id: 'rel_bare',  source_categories: [] },
];
const catRateItems = [
  { item_id: 'rate_inc_a', source_item_id: 'rel_infra' },
  { item_id: 'rate_inc_b', source_item_id: 'rel_ops' },
  { item_id: 'rate_inc_d', source_item_id: 'rel_bare' }, // empty categories → none
];
const categoryByRateItem = buildRateItemCategoryMap(catRateItems, catRelationships);

check(
  JSON.stringify(categoryByRateItem.get('rate_inc_a')) === JSON.stringify(['Cloud Infrastructure']),
  'a Rate Sheet row resolves to its relationship source categories',
);
check(!categoryByRateItem.has('rate_inc_d'), 'a relationship with no categories contributes none');

// The focused Tier's resolved selections, exactly as tierView holds them.
const deckSelections: DeckSelection[] = [
  { item_id: 'rate_inc_a', source_type: 'inclusion', source_id: 'inc-1', quantity: 2, resolved: true,  label: 'Managed Cloud Foundation',    unit_price: 70,   per: 'Per month', line_total: 140,  group_id: 'grp_infra' },
  { item_id: 'rate_inc_b', source_type: 'inclusion', source_id: 'inc-2', quantity: 1, resolved: true,  label: 'Business Cloud Operations',   unit_price: 208,  per: 'Per month', line_total: 208,  group_id: 'grp_infra' },
  { item_id: 'rate_faq',   source_type: 'faq',       source_id: 'faq-1', quantity: 1, resolved: true,  label: 'Uptime FAQ',                  unit_price: 0,    per: 'Per month', line_total: 0,    group_id: 'grp_infra' },
  { item_id: 'rate_inc_d', source_type: 'inclusion', source_id: 'inc-4', quantity: 3, resolved: true,  label: 'Standalone Add-on',           unit_price: 10,   per: 'Per item',  line_total: 30,   group_id: null },
  { item_id: 'rate_inc_c', source_type: 'inclusion', source_id: 'inc-3', quantity: 1, resolved: false, label: '(unresolved Rate Sheet item)', unit_price: null, per: null,        line_total: null, group_id: null },
];
const deckRateSheet = { title: 'KAIROS Infrastructure Rates', groups: [{ group_id: 'grp_infra', label: 'Infrastructure', sort_order: 0 }] };

// Details: only inclusion selections, in the Tier's own order — the FAQ row is not
// an inclusion, and pricing/identity are carried through, never recomputed.
const inclusions = projectTierInclusions(deckSelections, categoryByRateItem);
check(inclusions.length === 4, 'Details shows the inclusion selections only (the FAQ selection is excluded)');
check(
  inclusions.map((row) => row.name).join('|') === 'Managed Cloud Foundation|Business Cloud Operations|Standalone Add-on|(unresolved Rate Sheet item)',
  'inclusion rows keep the Tier selection order and their Service-resolved labels',
);
check(
  inclusions[0].lineTotal === 140 && inclusions[0].unitPrice === 70 && inclusions[0].quantity === 2,
  'the inclusion carries the Rate Sheet-derived pricing through unchanged',
);
check(
  JSON.stringify(inclusions[0].categories) === JSON.stringify(['Cloud Infrastructure']),
  'the inclusion carries its resolved Service category',
);
check(inclusions[3].resolved === false && inclusions[3].lineTotal === null, 'an unresolved selection stays unresolved with no fabricated price');

// Connections: resolved rows grouped by Rate Sheet group; ungrouped rows fall under
// the sheet title; unresolved rows connect nothing; counts are Tier aggregations.
const connections = projectTierRateSheetConnections(deckSelections, deckRateSheet);
check(connections.length === 2, 'Connections groups the resolved rows into their Rate Sheet groups (grouped + ungrouped)');
check(
  connections[0].groupId === 'grp_infra' && connections[0].title === 'Infrastructure' && connections[0].connectedRows === 3 && connections[0].coverage === 4,
  'the grouped connection counts its resolved rows and summed quantity',
);
check(
  connections[1].groupId === null && connections[1].title === 'KAIROS Infrastructure Rates' && connections[1].connectedRows === 1,
  'ungrouped rows collapse into one connection titled by the Rate Sheet itself',
);
check(
  projectTierRateSheetConnections(deckSelections.filter((s) => !s.resolved), deckRateSheet).length === 0,
  'an unresolved-only Tier connects to no Rate Sheet',
);

// The whole deck: distinct sorted categories for the Details filter — never a
// taxonomy the rows do not carry.
const deck = projectTierDeck(deckSelections, categoryByRateItem, deckRateSheet);
check(
  JSON.stringify(deck.categories) === JSON.stringify(['Cloud Infrastructure', 'Managed Services']),
  'the deck exposes exactly the distinct, sorted categories its inclusions carry',
);

// Carry-through: a connected occupant's deck lands on the Family keyed by
// occupant_id; an occupant with no deck adds no entry (the earlier fixtures).
const deckOccupant: WorkspaceOccupant = { occupantId: 'occ_deck', card: card('occ_deck'), supplyingServiceIds: [10], deck };
const deckFamilies: WorkspaceFamilyScope[] = [
  { id: 'KAIROS', name: 'KAIROS', description: 'IaaS', status: 'active', relatedServiceIds: [10], dependents: { services: 1, rate_sheet_rows: 1, tier_selections: 1 } },
];
const deckProjection = projectFamilyTierWorkspace(deckFamilies, [deckOccupant]);
check(deckProjection[0].decks['occ_deck']?.inclusions.length === 4, 'a connected occupant\'s deck is carried on the Family, keyed by occupant_id');
check(Object.keys(kairos.decks).length === 0, 'occupants projected without a deck add no deck entries');

console.log('Package Tier workspace contract checks passed.');
