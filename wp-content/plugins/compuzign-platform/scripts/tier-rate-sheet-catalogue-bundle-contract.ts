// Contract: a Bundle-backed Rate Sheet row must resolve in
// `buildRateSheetCatalogue()` — the ONE shared resolver behind the Tier
// occupant's own "Add from Rate Sheet…" picker (PoolInclusionsEditor, via
// tierDetailModel.ts) AND the Tier Edition's own declaration editor
// (TierEditionOverviewFields.tsx) — exactly the same way an ordinary,
// Manager-sourced row does.
//
// Regression for a reported defect: a Bundle-backed row has no
// `source_item_id` (see PackageRateSheetItem.bundle_id) — it stands behind
// itself — so the resolver's Manager-relationship lookup always missed it,
// leaving `resolved: false` and a generic "(unresolved Rate Sheet item)"
// label. That made every Bundle invisible in the picker's dropdown (which
// filters on `item.resolved`) even though the backend already offers a
// Bundle's row upstream exactly like any other priced row
// (`consumableRateSheetRows()`, proven by tests/rate-sheet-bundle.php's own
// "Tier consumption" section).
//
// Direct function-call test (no DOM) — the same technique
// rate-sheet-tool-contract.ts uses for this file's sibling pure model.

import { buildRateSheetCatalogue } from '../resources/ts/package-station/drawer/tier/tierDetailModel';
import type { PackageManagerItem, PackageRateSheet } from '../resources/ts/package-station/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier Rate Sheet catalogue Bundle contract: ${message}`);
}

const relationships: PackageManagerItem[] = [{
  item_id: 'mgr_website',
  source_type: 'inclusion',
  source_id: 'website',
  resolved: { label: 'Website Design' },
  decorated_label: null,
  group_id: null,
  sort_order: 0,
  disabled: false,
  missing: false,
  module_transition: 'settled',
}];

const rateSheets: PackageRateSheet[] = [{
  rate_sheet_id: 'rs_1',
  title: 'Websites',
  status: 'active',
  groups: [],
  items: [
    // An ordinary, Manager-sourced row — the existing, already-working case.
    {
      item_id: 'rate_website', source_item_id: 'mgr_website', bundle_id: '',
      unit_price: 10, per: 'Per item', quantity: 1, group_id: null, sort_order: 0, price_options: [],
    },
    // A Bundle-backed row, named — no source_item_id, a real bundle_id and label.
    {
      item_id: 'rate_bundle_named', source_item_id: '', bundle_id: 'rsb_1', label: 'Starter Pack',
      unit_price: 50, per: 'Per item', quantity: 1, group_id: null, sort_order: 1, price_options: [],
      includes: [{ item_id: 'rate_website', source_rate_sheet_id: 'rs_1', source_item_id: 'rate_website', label: 'Website Design', quantity: 1 }],
    },
    // A Bundle-backed row, unnamed — the Bundle Name defaults blank.
    {
      item_id: 'rate_bundle_unnamed', source_item_id: '', bundle_id: 'rsb_2', label: '',
      unit_price: 25, per: 'Per item', quantity: 1, group_id: null, sort_order: 2, price_options: [],
    },
  ],
  bundles: [],
}];

const svc = { rate_sheets: rateSheets, package_relationships: relationships };
const catalogue = buildRateSheetCatalogue(svc, 'rs_1', []);

check(catalogue.length === 3, `every row of the bound sheet is offered — got ${catalogue.length}`);

const ordinary = catalogue.find((row) => row.item_id === 'rate_website');
check(ordinary?.resolved === true, 'the ordinary, Manager-sourced row still resolves exactly as before');
check(ordinary?.label === 'Website Design', 'the ordinary row still reads its Manager relationship label');

const named = catalogue.find((row) => row.item_id === 'rate_bundle_named');
check(named?.resolved === true, 'a Bundle-backed row resolves — it stands behind itself, with no Manager source to look up');
check(named?.label === 'Starter Pack', "a named Bundle-backed row shows its OWN row label (the Bundle Name), not a Manager relationship lookup");
check(named?.bundle_id === 'rsb_1', "the row's own bundle_id is carried through — the inclusion editor needs it to know a selection is Bundle-backed at all");
check(named?.includes?.length === 1 && named.includes[0].label === 'Website Design', "the row's own live-resolved supplied content (includes[]) is carried through unchanged, so the inclusion editor can show it read-only without a second lookup");

const unnamed = catalogue.find((row) => row.item_id === 'rate_bundle_unnamed');
check(unnamed?.resolved === true, 'an UNNAMED Bundle-backed row still resolves');
check(unnamed?.label === 'Untitled Bundle', 'an unnamed Bundle-backed row falls back to "Untitled Bundle" — the SAME fallback the Rate Sheet tool itself uses, never "(unresolved Rate Sheet item)"');

console.log('Tier Rate Sheet catalogue Bundle contract: PASS');
