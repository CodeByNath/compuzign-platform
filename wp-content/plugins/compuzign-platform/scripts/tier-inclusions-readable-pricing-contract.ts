// Contract: Tier Inclusions readable pricing and Leg breakdown
// (project-work/2026-09-15-tier-inclusions-readable-pricing-legs.md).
// Phase 1 — the occupant's Default Tier Inclusions card. Phase 2 — each Tier
// Edition's own Inclusions card, through the same projection and formatter,
// fed only by that Edition's own declaration.
//
// The Tier Inclusions read card presents one priced wrapper per inclusion.
// One effective Commercial Leg is compact and unlabelled; more than one
// repeats only each Leg's own quantity/total rows beneath one header, each
// resolved from that Leg's OWN assignment — never copied from Default, merged,
// summed, or multiplied by duration. The shared `item-collection` contract is
// extended additively, so every `{ id, label }` consumer still renders chips
// (pinned byte-for-byte by scripts/mode-renderer-snapshot.mjs).
//
// Executes the real projection (buildTierInclusionLegLines) and the real
// Tier binding (tierFeaturesShell), then reads the compositions for the
// wiring that must stay unchanged.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ItemCollectionValue } from '../resources/ts/drawer-kit/schema/elements/library';
import { tierFeaturesShell } from '../resources/ts/package-station/drawer/schema/bindings/tier';
import { tierEditionInclusionsShell } from '../resources/ts/package-station/drawer/schema/bindings/tierEdition';
import { buildTierEditionDetail } from '../resources/ts/package-station/drawer/tier/tierEditionDetailModel';
import type { TierFeaturesShellData } from '../resources/ts/package-station/drawer/schema/bindings/tier';
import { buildTierInclusionLegLines } from '../resources/ts/package-station/drawer/tier/tierDetailModel';
import { resolveRateSheetSelection } from '../resources/ts/package-station/rateSheetLabels';
import type {
  PackageManagerItem,
  PackageRateSheet,
  PackageRateSheetItem,
  TierCommercialLeg,
  TierEdition,
  TierRateSheetSelection,
} from '../resources/ts/package-station/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier Inclusions readable pricing contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const suseRow = {
  item_id: 'rsi_suse', source_item_id: 'rel_suse', unit_price: 20, per: 'Per VM', quantity: 1, group_id: null,
  price_options: [{ option_id: 'opt_premium', label: 'Premium', unit_price: 25 }],
} as unknown as PackageRateSheetItem;
const backupRow = {
  item_id: 'rsi_backup', source_item_id: 'rel_backup', unit_price: 5, per: 'Per GB', quantity: 1, group_id: null, price_options: [],
} as unknown as PackageRateSheetItem;

const svc = {
  rate_sheets: [{ rate_sheet_id: 'rs_primary', title: 'Primary', items: [suseRow, backupRow] } as unknown as PackageRateSheet],
  package_relationships: [
    { item_id: 'rel_suse', source_type: 'inclusion', source_id: 'inc_suse', resolved: { label: 'SUSE Linux' }, decorated_label: null, missing: false },
    { item_id: 'rel_backup', source_type: 'inclusion', source_id: 'inc_backup', resolved: { label: 'Backups' }, decorated_label: null, missing: false },
  ] as unknown as PackageManagerItem[],
};

const legs: TierCommercialLeg[] = [
  { id: 'leg_a', platform_id: 'CZTL-0001', billing_cycle: 'monthly', from_month: 0, to_month: 12 },
  // Not yet minted: an assignment addresses it by its stable internal id.
  { id: 'leg_b', platform_id: '', billing_cycle: 'annually', from_month: 12, to_month: null },
];

const rateById = new Map(svc.rate_sheets[0].items.map((item) => [item.item_id, item]));
const sourceById = new Map(svc.package_relationships.map((item) => [item.item_id, item]));
const resolved = (selection: TierRateSheetSelection) => resolveRateSheetSelection(selection, rateById, sourceById);

function render(selections: TierRateSheetSelection[], legSet: TierCommercialLeg[] = legs): ItemCollectionValue {
  const resolvedSelections = selections.map(resolved);
  const data: TierFeaturesShellData = {
    items: resolvedSelections.map((item) => ({ id: item.item_id, label: item.label })),
    legLines: buildTierInclusionLegLines(svc, 'rs_primary', resolvedSelections, legSet),
  };
  return tierFeaturesShell.content[0].bind(data) as ItemCollectionValue;
}

// ── 1. Single effective Leg: compact, no Leg label ───────────────────────────

{
  const [item] = render([{ item_id: 'rsi_suse', quantity: 2 }]).items;
  check(item.label === 'SUSE Linux', 'the inclusion header carries its resolved label');
  check(item.pricing?.unitPrice === '$20.00 Per VM', `single-Leg header shows the unit price and per — got ${item.pricing?.unitPrice}`);
  check(item.pricing?.lines.length === 1, 'single-Leg inclusion has exactly one line');
  const [line] = item.pricing.lines;
  check(line.label === undefined, 'single-Leg line carries no Leg label');
  check(line.quantity === 'QTY - 2' && line.total === '$40.00', `single-Leg line is QTY - 2 / $40.00 — got ${line.quantity} / ${line.total}`);
  check(line.unitPrice === undefined, 'single-Leg line does not repeat the header price');
}

// An assignment whose Leg is not in the occupant's legs[] has no Leg to present.
{
  const [item] = render([{ item_id: 'rsi_suse', quantity: 2, leg_assignments: [{ leg_platform_id: 'CZTL-GONE', quantity: 9 }] }]).items;
  check(item.pricing?.lines.length === 1 && item.pricing.lines[0].label === undefined, 'an orphan Leg assignment adds no line and keeps the compact form');
}

// ── 2. Multiple Legs: each Leg's own assignment, existing order/labels ───────

{
  const [item] = render([{
    item_id: 'rsi_suse', quantity: 2,
    // Deliberately out of legs[] order: presentation follows legs[] order.
    leg_assignments: [
      { leg_platform_id: 'leg_b', quantity: 4, price_option_id: 'opt_premium' },
      { leg_platform_id: 'CZTL-0001', quantity: 3 },
    ],
  }]).items;
  const lines = item.pricing?.lines ?? [];
  check(lines.map((line) => line.label).join('|') === 'Leg 1|Leg 2|Leg 3', `read labels are sequential over Default then legs[] order — got ${lines.map((line) => line.label).join('|')}`);
  check(lines[0].quantity === 'QTY - 2' && lines[0].total === '$40.00', 'Leg 1 (Default) uses the row\'s own quantity and price');
  check(lines[1].quantity === 'QTY - 3' && lines[1].total === '$60.00', `Leg 2 (legs[0]) uses its own assignment quantity — got ${lines[1].quantity} / ${lines[1].total}`);
  check(lines[2].quantity === 'QTY - 4' && lines[2].total === '$100.00', `Leg 3 (legs[1]) uses its own price option and quantity — got ${lines[2].quantity} / ${lines[2].total}`);
  check(item.pricing?.unitPrice === undefined, 'Legs resolving different unit prices share no header price');
  check(lines[0].unitPrice === '$20.00 Per VM' && lines[2].unitPrice === '$25.00 Per VM', 'each Leg then carries its own resolved unit price');
  check(!lines.some((line) => line.total === '$200.00'), 'Leg totals are never summed into one figure');
}

{
  const [item] = render([{ item_id: 'rsi_suse', quantity: 2, leg_assignments: [{ leg_platform_id: 'CZTL-0001', quantity: 2 }] }]).items;
  check(item.pricing?.unitPrice === '$20.00 Per VM', 'Legs sharing one unit price show it once in the header');
  check(item.pricing.lines.every((line) => line.unitPrice === undefined), 'and do not repeat it per Leg');
  check(item.pricing.lines.map((line) => line.label).join('|') === 'Leg 1|Leg 2', 'two effective Legs are both labelled, sequentially');
}

// Numbering follows the effective lines displayed, not legs[] position: an
// inclusion assigned only to the second Additional Leg reads Leg 1, Leg 2.
{
  const [item] = render([{ item_id: 'rsi_suse', quantity: 1, leg_assignments: [{ leg_platform_id: 'leg_b', quantity: 5 }] }]).items;
  const lines = item.pricing?.lines ?? [];
  check(lines.map((line) => line.label).join('|') === 'Leg 1|Leg 2', `displayed Leg labels stay sequential when legs[0] is unassigned — got ${lines.map((line) => line.label).join('|')}`);
  check(lines[1].quantity === 'QTY - 5' && lines[1].total === '$100.00', 'that displayed Leg 2 still resolves legs[1]\'s own assignment');
}

// ── 3. Unresolved pricing stays truthful ─────────────────────────────────────

{
  const [item] = render([{ item_id: 'rsi_missing', quantity: 2 }]).items;
  check(item.pricing?.unitPrice === 'Pricing unavailable', `an unresolved row reads Pricing unavailable — got ${item.pricing?.unitPrice}`);
  check(item.pricing.lines[0].total === 'Pricing unavailable', 'an unresolved row never shows a $0 total');
}

{
  const [item] = render([{
    item_id: 'rsi_backup', quantity: 1,
    leg_assignments: [{ leg_platform_id: 'CZTL-0001', quantity: 2, price_option_id: 'opt_removed' }],
  }]).items;
  const lines = item.pricing?.lines ?? [];
  check(lines[0].total === '$5.00', 'Leg 1 (Default) keeps its own resolved price');
  check(lines[1].unitPrice === 'Pricing unavailable' && lines[1].total === 'Pricing unavailable', 'a Leg whose price option no longer resolves is unavailable — never Default Price substituted');
}

// ── 4. Unchanged wiring and boundaries ───────────────────────────────────────

const tierBinding = read('resources/ts/package-station/drawer/schema/bindings/tier.tsx');
const tierModel = read('resources/ts/package-station/drawer/tier/tierDetailModel.ts');
// The sequential read labels never rename the Commercial Legs editor vocabulary.
for (const path of [
  'resources/ts/package-station/drawer/editors/PoolInclusionsEditor.tsx',
  'resources/ts/package-station/drawer/editors/TierPricingRulesEditor.tsx',
]) {
  const editor = read(path);
  check(editor.includes('Leg Default') && editor.includes('`Leg ${'), `${path} keeps its own "Leg Default" / "Leg N" editor vocabulary`);
}
check(JSON.stringify(tierFeaturesShell.footer) === JSON.stringify({ actions: ['discard-draft', 'edit'] }), 'Tier Inclusions keeps its Discard/Edit footer');
check(/<PoolInclusionsEditor[\s\S]*?legs=\{s\.extras\?\.legs/.test(tierBinding), 'Tier Inclusions still edits through PoolInclusionsEditor');
check(
  tierModel.includes('buildTierInclusionLegLines(svc, detail.rate_sheet_id, detail.rate_sheet_selections, detail.legs ?? [])'),
  'the read lines come from the occupant\'s own Default declaration (rate sheet, selections, legs) — never an Edition\'s',
);
for (const path of [
  'resources/ts/service-station/drawer/schema/bindings/service.tsx',
  'resources/ts/entity-drawers/schema/bindings/category.tsx',
]) {
  check(!/pricing\s*:/.test(read(path)), `${path} binds no item-collection pricing — its chips render unchanged`);
}

// ── 5. Phase 2 — Tier Edition Inclusions ─────────────────────────────────────
//
// The Edition binds its OWN sheet, selections and CZTEL Legs. The parent
// occupant's fixtures above deliberately use a different sheet, different
// quantities and different Leg identities, so any leak changes the output.

const editionRow = {
  item_id: 'rsi_suse_ed', source_item_id: 'rel_suse', unit_price: 30, per: 'Per VM', quantity: 1, group_id: null,
  price_options: [{ option_id: 'opt_ed_annual', label: 'Annual', unit_price: 27 }],
} as unknown as PackageRateSheetItem;
const editionSvc = {
  rate_sheets: [
    ...svc.rate_sheets,
    { rate_sheet_id: 'rs_edition', title: 'Edition sheet', items: [editionRow] } as unknown as PackageRateSheet,
  ],
  package_relationships: svc.package_relationships,
};
const editionLegs: TierCommercialLeg[] = [
  { id: 'eleg_a', platform_id: 'CZTEL-0001', billing_cycle: 'annually', from_month: 0, to_month: 12 },
];

function editionFixture(items: TierRateSheetSelection[], legSet: TierCommercialLeg[] = editionLegs): TierEdition {
  return {
    id: 'ed_2', edition_platform_id: 'CZTE-0002', title: 'Annual', admin_description: '',
    platform_status: 'active', previous_platform_status: null, module_status: { overview: 'settled' },
    drafts: { overview: null }, price: null, contact: false, billing_cycle: 'annually',
    rate_sheet_id: 'rs_edition', rate_sheet_items: items, legs: legSet, edition_catalogue_platform_id: '',
    inclusions_override: [], faq_refs: [],
  } as unknown as TierEdition;
}

const editCalls: string[] = [];
function renderEdition(edition: TierEdition): { value: ItemCollectionValue; detail: ReturnType<typeof buildTierEditionDetail> } {
  const detail = buildTierEditionDetail(edition, editionSvc, { onEdit: (tab) => editCalls.push(tab), onDiscardDraft: () => undefined });
  return { value: tierEditionInclusionsShell.content[0].bind(detail.inclusionsBinding.data) as ItemCollectionValue, detail };
}

{
  const { value } = renderEdition(editionFixture([{ item_id: 'rsi_suse_ed', quantity: 3 }]));
  const [item] = value.items;
  check(item.pricing?.unitPrice === '$30.00 Per VM', `Edition header uses the Edition's own sheet row — got ${item.pricing?.unitPrice}`);
  check(item.pricing.lines.length === 1 && item.pricing.lines[0].label === undefined, 'single-Leg Edition inclusion is compact and unlabelled');
  check(item.pricing.lines[0].quantity === 'QTY - 3' && item.pricing.lines[0].total === '$90.00', 'Edition line uses the Edition\'s own quantity and price');
}

{
  const { value } = renderEdition(editionFixture([{
    item_id: 'rsi_suse_ed', quantity: 1,
    leg_assignments: [
      { leg_platform_id: 'CZTEL-0001', quantity: 2, price_option_id: 'opt_ed_annual' },
      // The PARENT occupant's Leg identity — not one of this Edition's legs.
      { leg_platform_id: 'CZTL-0001', quantity: 9 },
    ],
  }]));
  const lines = value.items[0].pricing?.lines ?? [];
  check(lines.map((line) => line.label).join('|') === 'Leg 1|Leg 2', `Edition multi-Leg labels are sequential and ignore the parent's Leg — got ${lines.map((line) => line.label).join('|')}`);
  check(lines[0].quantity === 'QTY - 1' && lines[0].total === '$30.00', 'Edition Leg 1 is its own Default selection');
  check(lines[1].quantity === 'QTY - 2' && lines[1].total === '$54.00' && lines[1].unitPrice === '$27.00 Per VM', 'Edition Leg 2 resolves its own price option and quantity');
}

{
  // A row that exists only on the parent's sheet never resolves against the
  // Edition's bound sheet, and the parent's Legs never apply.
  const { value, detail } = renderEdition(editionFixture([{ item_id: 'rsi_suse', quantity: 2, leg_assignments: [{ leg_platform_id: 'CZTL-0001', quantity: 3 }] }], []));
  const lines = detail.inclusionsBinding.data.legLines?.rsi_suse ?? [];
  check(lines.length === 1, 'the parent\'s Legs add no Edition lines');
  check(!lines[0].line.resolved && lines[0].line.unit_price === null, 'a parent-sheet row does not resolve against the Edition\'s own sheet');
  check(!value.items.some((item) => item.pricing?.unitPrice === '$20.00 Per VM'), 'the parent\'s $20.00 row price never appears on the Edition card');
}

{
  const { detail } = renderEdition(editionFixture([{ item_id: 'rsi_suse_ed', quantity: 1 }]));
  check(JSON.stringify(tierEditionInclusionsShell.footer) === JSON.stringify({ actions: ['edit'] }), 'Edition Inclusions keeps its Edit-only footer');
  check(!('editor' in tierEditionInclusionsShell), 'Edition Inclusions still carries no editor of its own (shared TierEditionEditor session)');
  detail.inclusionsBinding.handlers.edit?.();
  check(editCalls.at(-1) === 'inclusions', 'Edition Inclusions Edit still opens the shared session on its inclusions tab');
}

const editionModel = read('resources/ts/package-station/drawer/tier/tierEditionDetailModel.ts');
check(
  editionModel.includes('buildTierInclusionLegLines(svc, edition.rate_sheet_id, resolvedSelections, edition.legs ?? [])'),
  'Edition read lines come from the Edition\'s own rate_sheet_id, resolved selections and legs',
);

console.log('Tier Inclusions readable pricing contract passed.');
