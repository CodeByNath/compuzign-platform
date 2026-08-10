// Contract: Rate Sheet Price Option selection (TierRateSheetSelection's
// optional price_option_id) stays wired end-to-end across the frontend seams
// — the model, the shared catalogue builder, the shared PoolInclusionsEditor,
// and the quantity-only save path that must never drop it. Source-scanning,
// the same technique tier-edition-admin-contract.ts uses for its own wiring
// — no mounted DOM needed to prove these seams exist and are shaped right.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Rate Sheet Price Option selection contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

const types = read('resources/ts/package-station/types.ts');
const tierDetailModel = read('resources/ts/package-station/drawer/tier/tierDetailModel.ts');
const poolEditor = read('resources/ts/package-station/drawer/editors/PoolInclusionsEditor.tsx');
const inclusionController = read('resources/ts/package-station/drawer/inclusion/useTierInclusionDrawerController.ts');
const usePackageStation = read('resources/ts/package-station/usePackageStation.ts');
const schema = read('src/Modules/SurfacePackages/Support/PackageSchema.php');
const managerSchema = read('src/Modules/SurfacePackages/Support/PackageManagerSchema.php');

// ── Model: TierRateSheetSelection carries the optional field ────────────────

check(
  /export interface TierRateSheetSelection \{[^}]*price_option_id\?:/s.test(types),
  'TierRateSheetSelection declares an optional price_option_id',
);
check(
  !/item_id: string;\n\s*quantity: number;\n\}/.test(types),
  'TierRateSheetSelection is not still the bare {item_id, quantity} shape (price_option_id must be a real member, not dropped by a stale interface)',
);

// ── buildRateSheetCatalogue exposes each row's own price_options[] ──────────

check(
  tierDetailModel.includes('price_options: item.price_options'),
  'buildRateSheetCatalogue carries each row\'s price_options[] through to the resolved catalogue row, so the editor can offer a selector without a second lookup',
);

// ── PoolInclusionsEditor: a Price Option selector, never a silent fallback ──

check(
  poolEditor.includes('priceOptions.length > 0') && poolEditor.includes('price_option_id'),
  'PoolInclusionsEditor renders a Price Option selector only for rows that have price_options, and writes selection.price_option_id',
);
check(
  poolEditor.includes('optionUnresolved'),
  'PoolInclusionsEditor computes an explicit unresolved state for a price_option_id that no longer matches the row\'s own price_options — never silently falls back to Default Price for display',
);
check(
  !/selections\.map\(\(item, itemIndex\) => itemIndex === index \? \{ item_id: item\.item_id, quantity:/.test(poolEditor),
  'PoolInclusionsEditor\'s quantity/option edits never reconstruct a selection as a bare {item_id, quantity}, which would silently drop price_option_id',
);

// ── useTierInclusionDrawerController.saveQuantity preserves every field ─────

check(
  /const refs: TierRateSheetSelection\[\] = selections\.map\(\(selection\) => \(\{\s*\.\.\.selection,/.test(inclusionController),
  'saveQuantity() spreads the existing selection (preserving price_option_id and any other field) rather than reconstructing only {item_id, quantity}',
);
check(
  !inclusionController.includes('item_id:  selection.item_id,\n      quantity:'),
  'saveQuantity() no longer rebuilds refs from a narrow {item_id, quantity} literal',
);

// ── usePackageStation's client-side live projection mirrors the same rule ───

check(
  usePackageStation.includes('selectedOption.unit_price') && usePackageStation.includes('optionUnresolved'),
  'usePackageStation.tierView() resolves the SAME price_option_id semantics (option price when resolved, null when not) for its own live/optimistic price, not just the backend',
);

// ── Backend: sanitizer preserves the field; projector resolves it ───────────

check(
  schema.includes("'price_option_id' => $optionId") || schema.includes("'price_option_id'      => $optionId"),
  'PackageSchema::sanitizeTierRateSheetSelections preserves price_option_id through every Tier and Edition persistence path',
);
check(
  managerSchema.includes('price_option_unresolved'),
  'PackageManagerSchema::projectTierRateSheetWith reports an unresolved price_option_id via health_reasons rather than defaulting silently',
);
check(
  managerSchema.includes('$unitPriceForPricing = $row[\'unit_price\'];'),
  'projectTierRateSheetWith feeds the resolved effective unit price (Default Price or the selected option) into the shared pricing engine, not just into line_total display',
);

// ── option_selections (the separate legacy pricing contract) is not reused ──

check(
  !managerSchema.includes("'price_option_id' => \$row['option_selections']")
  && !schema.includes('option_selections'),
  'Price Option selection never reuses the unrelated option_selections pricing contract',
);

console.log('Rate Sheet Price Option selection contract: PASS');
