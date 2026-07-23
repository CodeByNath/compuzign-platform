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
import {
  projectTierDetails,
  projectRateSheetConnections,
  type WorkspaceResolvedSelection,
  type WorkspaceStationContext,
} from '../resources/ts/admin-station/stations/packageTierWorkspace/rateSheetProjection';

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
  { occupantId: 'occ_kairos', card: card('occ_kairos'), supplyingServiceIds: [10],     selections: [] },
  { occupantId: 'occ_aptos',  card: card('occ_aptos'),  supplyingServiceIds: [20],     selections: [] },
  { occupantId: 'occ_both',   card: card('occ_both'),   supplyingServiceIds: [10, 20], selections: [] },
  { occupantId: 'occ_orphan', card: card('occ_orphan'), supplyingServiceIds: [],       selections: [] },
];

// The station-level read context — the ONE Rate Sheet configuration and the
// relationship provenance the lower workspace consumes. Shared, never per-Family.
const station: WorkspaceStationContext = {
  serviceId: 10,
  serviceTitle: 'Endpoint Protection',
  rateSheet: {
    title: 'MEP Rate Sheet',
    groups: [
      { group_id: 'g_core',  label: 'Core',    sort_order: 0 },
      { group_id: 'g_addon', label: 'Add-ons', sort_order: 1 },
    ],
    items: [
      { item_id: 'rate_a',     source_item_id: 'rel_svc10', unit_price: 5,  per: 'Per VM',   quantity: 2, group_id: 'g_core',  sort_order: 0 },
      { item_id: 'rate_b',     source_item_id: 'rel_svc20', unit_price: 10, per: 'Per user', quantity: 1, group_id: null,      sort_order: 1 },
      { item_id: 'rate_faq',   source_item_id: 'rel_faq',   unit_price: 0,  per: 'Per item', quantity: 1, group_id: 'g_addon', sort_order: 2 },
      { item_id: 'rate_ghost', source_item_id: 'rel_gone',  unit_price: 3,  per: 'Per GB',   quantity: 1, group_id: null,      sort_order: 3 },
    ],
  },
  relationships: [
    { item_id: 'rel_svc10', source_type: 'inclusion', source_id: 'inc_1', label: '24/7 Monitoring',  missing: false, disabled: false, source_service_id: 10, source_service_title: 'Endpoint Protection', source_categories: ['Security'] },
    { item_id: 'rel_svc20', source_type: 'inclusion', source_id: 'inc_2', label: 'Patching',         missing: false, disabled: false, source_service_id: 20, source_service_title: 'Managed Patching',    source_categories: ['Operations'] },
    { item_id: 'rel_faq',   source_type: 'faq',       source_id: 'faq_1', label: 'What is covered?', missing: false, disabled: false, source_service_id: 10, source_service_title: 'Endpoint Protection', source_categories: [] },
  ],
};
const families: WorkspaceFamilyScope[] = [
  { id: 'KAIROS', name: 'KAIROS', description: 'IaaS', status: 'active',   relatedServiceIds: [10], dependents: { services: 1, rate_sheet_rows: 1, tier_selections: 2 } },
  { id: 'APTOS',  name: 'APTOS',  description: 'SaaS', status: 'active',   relatedServiceIds: [20], dependents: { services: 1, rate_sheet_rows: 1, tier_selections: 2 } },
  { id: 'OMNIA',  name: 'OMNIA',  description: 'Tech', status: 'disabled', relatedServiceIds: [99], dependents: { services: 0, rate_sheet_rows: 0, tier_selections: 0 } },
];

const projection = projectFamilyTierWorkspace(families, occupants, station);
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

// The lower-deck carries: the SAME filter result as full occupants, and the one
// shared station context by reference — never per-Family sheet data.
check(
  kairos.connected.map((occupant) => occupant.card.id).join(',') === kairos.occupants.map((item) => item.id).join(','),
  'connected occupants are the same filter result as the projected cards',
);
check(kairos.station === station && aptos.station === station && omnia.station === station,
  'every Family row shares the one station context by reference');

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

// ── Details projection (lower deck) ──────────────────────────────────────────
// The focused Tier's resolved selections, exactly as tierView emits them: two
// resolved inclusions (one outside the focused Family's scope), one resolved
// FAQ, and one selection that resolves to nothing at all.
const focusedSelections: WorkspaceResolvedSelection[] = [
  { item_id: 'rate_a',       quantity: 3, source_type: 'inclusion', source_id: 'inc_1', resolved: true,  label: '24/7 Monitoring',              unit_price: 5,    per: 'Per VM',   group_id: 'g_core',  line_total: 15 },
  { item_id: 'rate_b',       quantity: 1, source_type: 'inclusion', source_id: 'inc_2', resolved: true,  label: 'Patching',                     unit_price: 10,   per: 'Per user', group_id: null,      line_total: 10 },
  { item_id: 'rate_faq',     quantity: 1, source_type: 'faq',       source_id: 'faq_1', resolved: true,  label: 'What is covered?',             unit_price: 0,    per: 'Per item', group_id: 'g_addon', line_total: 0 },
  { item_id: 'rate_missing', quantity: 2, source_type: null,        source_id: null,    resolved: false, label: '(unresolved Rate Sheet item)', unit_price: null, per: null,       group_id: null,      line_total: null },
];

const details = projectTierDetails({
  selections: focusedSelections,
  station,
  familyRelatedServiceIds: [10], // KAIROS scope
});

check(details.map((row) => row.recordId).join(',') === 'rate_a,rate_b,rate_missing',
  'Details projects inclusion selections plus unresolved-unknown rows, and excludes FAQ selections');
check(details.every((row) => typeof row.recordId === 'string'), 'every Details identity is the row\'s own string item_id');
check(!details.some((row) => row.recordId.startsWith('occ_') || row.recordId.startsWith('rel_') || row.recordId.startsWith('inc_')),
  'no Tier, relationship, or source identity is ever substituted for the Rate Sheet row id');

const detailA = details[0];
check(detailA.tierQuantity === 3 && detailA.sheetQuantity === 2 && detailA.quantityDiffers,
  'the Tier quantity and the sheet\'s own quantity are both kept and honestly marked when different');
check(detailA.groupLabel === 'Core' && detailA.groupId === 'g_core', 'the group label resolves from the sheet\'s groups');
check(detailA.serviceTitle === 'Endpoint Protection' && detailA.categories.join(',') === 'Security',
  'Service and category provenance resolve through the row\'s relationship');
check(detailA.inFamilyScope && detailA.lineTotal === 15 && detailA.sourceId === 'inc_1',
  'family scope, line total and source provenance are carried');

const detailB = details[1];
check(!detailB.inFamilyScope, 'a row supplied by a Service outside the focused Family is marked out of scope');
check(detailB.resolved && !detailB.quantityDiffers, 'matching quantities are not flagged');

const detailMissing = details[2];
check(!detailMissing.resolved && detailMissing.sheetQuantity === null && detailMissing.unitPrice === null,
  'an unresolved selection stays visible, marked unresolved, with no invented figures');

// ── Connections projection (lower deck) ──────────────────────────────────────
const connections = projectRateSheetConnections({
  station,
  tierSelections: focusedSelections.map((selection) => ({ item_id: selection.item_id, quantity: selection.quantity })),
  familyRelatedServiceIds: [10],
});

check(connections.configured && connections.title === 'MEP Rate Sheet',
  'Connections represents the one configured Rate Sheet by its real title');
check(!('id' in connections) && !('rateSheetId' in connections),
  'no standalone Rate Sheet id is invented — the sheet is the station-owned singleton');
check(connections.rowCount === 4 && connections.resolvedCount === 3 && connections.unresolvedCount === 1,
  'row and coverage counts reflect the genuine sheet');
check(connections.tierSelectedCount === 3, 'focused-Tier-selected rows are counted from real selections');
check(connections.familyApplicableCount === 2, 'focused-Family-applicable rows follow Service provenance');
check(connections.groups.map((group) => `${group.label}:${group.rowCount}`).join(',') === 'Core:1,Add-ons:1'
  && connections.ungroupedCount === 2, 'sheet groups are represented with genuine per-group counts');
check(connections.providers.map((provider) => `${provider.serviceId}:${provider.rowCount}`).sort().join(',') === '10:2,20:1',
  'provider Service provenance is aggregated from the rows\' relationships');
check(connections.rows.map((row) => row.recordId).join(',') === 'rate_a,rate_b,rate_faq,rate_ghost',
  'Connections rows keep the sheet\'s own row identities in sheet order');
check(connections.rows[3].resolved === false && connections.rows[3].tierSelected === false,
  'a row whose relationship is gone is shown unresolved, never dropped');
check(connections.rows[2].sourceType === 'faq' && connections.rows[2].tierSelected,
  'the genuine sheet includes FAQ-backed rows, honestly typed');

const unconfigured = projectRateSheetConnections({
  station: { ...station, rateSheet: null },
  tierSelections: [],
  familyRelatedServiceIds: [10],
});
check(!unconfigured.configured && unconfigured.rows.length === 0 && unconfigured.title === null,
  'an unconfigured station projects an honest empty Connections model');

console.log('Package Tier workspace contract checks passed.');
