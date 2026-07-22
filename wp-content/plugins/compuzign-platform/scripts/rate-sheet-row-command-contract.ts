// Contract: the Package Station Rate Sheet command transforms.
//
// Guards the pure half of usePackageStation's Rate Sheet commands
// (hooks/packageRateSheetRow.ts): a row patch touches EXACTLY ONE row by its
// own item_id and only the approved editable fields; identity, ordering, every
// other row, the sheet title, the sheet groups, and every persisted item
// decision survive verbatim; and the validation rules match the Package
// provider's established Rate Sheet rules. The endpoint round-trip itself
// (fresh manager load → atomic complete-configuration save → state advance)
// lives in the one hook code path these transforms feed.

import {
  applyRateSheetRowPatch,
  appendRateSheetGroup,
  initialRateSheet,
  managerItemDecisions,
} from '../resources/ts/hooks/packageRateSheetRow';
import type { PackageManagerItem, PackageRateSheet } from '../resources/ts/api/types/admin';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Rate Sheet row command contract: ${message}`);
}

const sheet: PackageRateSheet = {
  title: 'MEP Rate Sheet',
  groups: [
    { group_id: 'g_core',  label: 'Core',    sort_order: 0 },
    { group_id: 'g_addon', label: 'Add-ons', sort_order: 1 },
  ],
  items: [
    { item_id: 'rate_a', source_item_id: 'rel_1', unit_price: 5,  per: 'Per VM',   quantity: 2, group_id: 'g_core', sort_order: 0 },
    { item_id: 'rate_b', source_item_id: 'rel_2', unit_price: 10, per: 'Per user', quantity: 1, group_id: null,     sort_order: 1 },
  ],
};

// ── One row, by its own identity ─────────────────────────────────────────────
const patched = applyRateSheetRowPatch(sheet, 'rate_a', {
  unit_price: 7.5, per: 'Per GB', quantity: 4, group_id: 'g_addon',
});
check(patched.ok, 'a valid patch succeeds');
const row = patched.rateSheet.items.find((item) => item.item_id === 'rate_a')!;
check(row.unit_price === 7.5 && row.per === 'Per GB' && row.quantity === 4 && row.group_id === 'g_addon',
  'the patched row carries exactly the approved editable fields');
check(row.item_id === 'rate_a' && row.source_item_id === 'rel_1' && row.sort_order === 0,
  'item_id, source_item_id and sort_order survive the patch untouched');
check(JSON.stringify(patched.rateSheet.items.find((item) => item.item_id === 'rate_b'))
  === JSON.stringify(sheet.items[1]), 'every other row is preserved verbatim');
check(patched.rateSheet.title === 'MEP Rate Sheet'
  && JSON.stringify(patched.rateSheet.groups) === JSON.stringify(sheet.groups),
  'the sheet title and groups are preserved');
check(sheet.items[0].unit_price === 5, 'the input sheet is never mutated');

const partial = applyRateSheetRowPatch(sheet, 'rate_b', { quantity: 9 });
check(partial.ok && partial.rateSheet.items[1].quantity === 9 && partial.rateSheet.items[1].unit_price === 10,
  'a partial patch changes only the supplied field');

// ── Identity rejection — never a fallback row ────────────────────────────────
const missing = applyRateSheetRowPatch(sheet, 'rate_nope', { quantity: 2 });
check(!missing.ok && missing.code === 'row-not-found', 'an unknown row id is rejected');

const duplicated: PackageRateSheet = {
  ...sheet,
  items: [...sheet.items, { ...sheet.items[0] }],
};
const dupe = applyRateSheetRowPatch(duplicated, 'rate_a', { quantity: 2 });
check(!dupe.ok && dupe.code === 'duplicate-row', 'a duplicated row identity is rejected, not guessed');

const noSheet = applyRateSheetRowPatch(null, 'rate_a', { quantity: 2 });
check(!noSheet.ok && noSheet.code === 'no-rate-sheet', 'a missing sheet is an honest failure');

// ── Validation — the provider's established Rate Sheet rules ─────────────────
for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
  const result = applyRateSheetRowPatch(sheet, 'rate_a', { unit_price: bad });
  check(!result.ok && result.code === 'invalid-patch', `unit_price ${bad} is rejected`);
}
check(applyRateSheetRowPatch(sheet, 'rate_a', { unit_price: 0 }).ok, 'unit_price 0 is allowed');

const badUnit = applyRateSheetRowPatch(sheet, 'rate_a', { per: 'Per parsec' as never });
check(!badUnit.ok && badUnit.code === 'invalid-patch', 'an unknown unit is rejected');

for (const bad of [0, 1.5, -2]) {
  const result = applyRateSheetRowPatch(sheet, 'rate_a', { quantity: bad });
  check(!result.ok && result.code === 'invalid-patch', `quantity ${bad} is rejected`);
}

const badGroup = applyRateSheetRowPatch(sheet, 'rate_a', { group_id: 'g_ghost' });
check(!badGroup.ok && badGroup.code === 'invalid-patch', 'an unknown group is rejected');
const ungrouped = applyRateSheetRowPatch(sheet, 'rate_a', { group_id: null });
check(ungrouped.ok && ungrouped.rateSheet.items[0].group_id === null, 'null group (Ungrouped) is allowed');

const empty = applyRateSheetRowPatch(sheet, 'rate_a', {});
check(!empty.ok && empty.code === 'invalid-patch', 'an empty patch is rejected rather than saved as a no-op');

// ── Singleton sheet initialisation ───────────────────────────────────────────
const initialised = initialRateSheet(null, '  New Sheet  ');
check(initialised.ok && initialised.rateSheet.title === 'New Sheet'
  && initialised.rateSheet.groups.length === 0 && initialised.rateSheet.items.length === 0,
  'initialisation creates the empty titled singleton');
const reinit = initialRateSheet(sheet, 'Another');
check(!reinit.ok && reinit.code === 'already-configured', 'an existing sheet is never replaced or duplicated');
const untitled = initialRateSheet(null, '   ');
check(!untitled.ok && untitled.code === 'invalid-title', 'an empty title is rejected (the backend drops a fully-empty sheet)');

// ── Rate Sheet group creation ────────────────────────────────────────────────
const grouped = appendRateSheetGroup(sheet, ' Networking ');
check(grouped.ok, 'a group with a label is appended');
check(grouped.rateSheet.groups.length === 3 && grouped.rateSheet.groups[2].label === 'Networking'
  && grouped.rateSheet.groups[2].sort_order === 2, 'the new group lands last with the next sort_order');
check(grouped.rateSheet.groups[2].group_id.startsWith('rate_group_'),
  'the group id follows the mature editor\'s minting convention');
check(JSON.stringify(grouped.rateSheet.items) === JSON.stringify(sheet.items), 'rows are untouched by group creation');
const noLabel = appendRateSheetGroup(sheet, '  ');
check(!noLabel.ok && noLabel.code === 'invalid-label', 'an empty group label is rejected');
const groupNoSheet = appendRateSheetGroup(null, 'Core');
check(!groupNoSheet.ok && groupNoSheet.code === 'no-rate-sheet', 'a group cannot be added before the sheet exists');

// ── Item-decision preservation ───────────────────────────────────────────────
const items: PackageManagerItem[] = [
  {
    item_id: 'rel_1', source_type: 'inclusion', source_id: 'inc_1', resolved: { label: 'Monitoring' },
    decorated_label: 'Monitoring+', group_id: 'grp_x', sort_order: 1, disabled: false, missing: false,
    module_transition: 'settled',
  },
  {
    item_id: 'rel_2', source_type: 'faq', source_id: 'faq_1', resolved: { question: 'Q', answer: 'A' },
    decorated_label: null, group_id: null, sort_order: 0, disabled: true, missing: false,
    module_transition: 'pending',
  },
  {
    item_id: 'rel_3', source_type: 'inclusion', source_id: 'inc_2', resolved: { label: 'Fresh' },
    decorated_label: null, group_id: null, sort_order: 2, disabled: false, missing: false,
    module_transition: 'not-configured',
  },
];
const decisions = managerItemDecisions(items);
check(decisions.length === 2, 'provisional (not-configured) rows never enter the decision payload');
check(decisions.map((decision) => decision.item_id).join(',') === 'rel_1,rel_2',
  'every persisted decision is resent, deterministically ordered');
check(decisions[0].group_id === 'grp_x' && decisions[0].sort_order === 1
  && decisions[0].decorated_label === 'Monitoring+' && decisions[1].disabled === true,
  'decision fields are carried verbatim from the manager read model');

console.log('Rate Sheet row command contract checks passed.');
