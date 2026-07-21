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
} from '../resources/ts/admin-station/stations/packageTierWorkspace/projection';
import { buildFamilySummary } from '../resources/ts/admin-station/stations/packageTierWorkspace/familySummary';

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

console.log('Package Tier workspace contract checks passed.');
