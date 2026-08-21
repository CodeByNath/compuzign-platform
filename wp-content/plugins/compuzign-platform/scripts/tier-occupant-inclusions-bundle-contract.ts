// Contract: a Bundle-backed Rate Sheet selection resolves in the Tier
// occupant's OWN live projection (`usePackageStation.tierView()`) — a
// SECOND, independent resolution of a stored selection from
// `buildRateSheetCatalogue()` (guarded separately by
// tier-rate-sheet-catalogue-bundle-contract.ts), never touched by that fix.
//
// Regression for a reported defect: the picker correctly offered and saved a
// Bundle-backed selection (buildRateSheetCatalogue() already fixed), but the
// read-mode "Default Tier Inclusions" card showed "No features" and the
// occupant's resolved price stayed null — because tierView()'s own
// resolution still looked the row up purely by its (blank, for a Bundle)
// `source_item_id` against Manager relationships, and `inclusions_override`
// filtered on `source_type === 'inclusion'`, which a Bundle-backed selection
// (no Manager source at all) can never satisfy.
//
// A later revision moved the Bundle's own supplied content OUT of this
// label (it briefly read "Bundle Name — includes: X, Y, Z") and into the
// inclusion editor's own read-only sub-list instead (PoolInclusionsEditor.tsx)
// — so the read card's chip is a bare Bundle name, rendering identically to
// any other Feature chip; the "1 vs 6 boxes" visual mismatch this caused is
// what prompted the move.
//
// Source-scanning, the same technique rate-sheet-price-option-selection-
// contract.ts uses for this file's own sibling model — `tierView()` is
// defined inline inside a hook, not a standalone exported pure function, so
// this proves the fix is present rather than mounting the whole Tier drawer.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier occupant inclusions Bundle contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const usePackageStation = readFileSync(resolve(root, 'resources/ts/package-station/usePackageStation.ts'), 'utf8');
const rateSheetLabels = readFileSync(resolve(root, 'resources/ts/package-station/rateSheetLabels.ts'), 'utf8');
const poolInclusionsEditor = readFileSync(resolve(root, 'resources/ts/package-station/drawer/editors/PoolInclusionsEditor.tsx'), 'utf8');

// Resolution itself now lives in the shared resolveRateSheetSelection()
// (rateSheetLabels.ts) — usePackageStation.tierView() and the Tier Edition
// detail model both call it instead of each carrying their own copy (the
// Edition's own copy had drifted into a weaker, buildRateSheetCatalogue-
// based resolution that dropped Bundle-backed rows entirely).
check(
  usePackageStation.includes("import { resolveRateSheetSelection } from './rateSheetLabels';"),
  'tierView() resolves each selection through the shared resolveRateSheetSelection() rule, not a second inline copy',
);
check(
  /const bundleBacked = !!rateItem && \(rateItem\.bundle_id \?\? ''\) !== '';/.test(rateSheetLabels),
  'resolveRateSheetSelection() computes bundleBacked from the resolved row\'s own bundle_id, not from any Manager relationship lookup',
);
check(
  /const resolved = bundleBacked \|\| /.test(rateSheetLabels),
  'a Bundle-backed selection resolves on its own presence — resolved is never gated on finding a Manager source for it',
);
check(
  rateSheetLabels.includes("rateItem?.label?.trim() || 'Untitled Bundle'"),
  'a Bundle-backed selection reads its OWN row label (the Bundle Name), falling back to "Untitled Bundle" — the same convention the Rate Sheet tool and buildRateSheetCatalogue() already use — never the generic "(unresolved Rate Sheet item)" string',
);
check(
  /inclusions_override = resolvedSelections\s*\n\s*\.filter\(\(item\) => item\.source_type === 'inclusion' \|\| \(rateById\.get\(item\.item_id\)\?\.bundle_id \?\? ''\) !== ''\)/.test(usePackageStation),
  'inclusions_override\'s own filter recognizes a Bundle-backed selection directly (by its row\'s bundle_id) rather than only ones with source_type === \'inclusion\', which a Bundle-backed row (no Manager source at all) can never carry',
);
check(
  !usePackageStation.includes('bundleSuppliedLabels'),
  'the Bundle\'s supplied content is no longer squished into this label string — it moved to the inclusion editor\'s own read-only sub-list, so the read card\'s chip stays a bare Bundle name like any other Feature',
);
check(
  /includes: rateItem\?\.includes,/.test(rateSheetLabels),
  'resolveRateSheetSelection() carries the row\'s own live-resolved includes[] through unchanged, so buildRateSheetCatalogue()\'s existingSelections fallback (a stored selection whose row fell out of the bound sheet) still has it available for the inclusion editor\'s sub-list',
);

check(
  /const suppliedContent = \(row\.bundle_id \?\? ''\) !== '' \? \(row\.includes \?\? \[\]\) : null;/.test(poolInclusionsEditor),
  'PoolInclusionsEditor renders a Bundle-backed row\'s own supplied content read-only, gated on the row\'s bundle_id — never for an ordinary row',
);
check(
  poolInclusionsEditor.includes('cz-ie-sub-list'),
  'the supplied-content sub-list renders directly under the selected Bundle row\'s own price option/qty/price/remove line — shared by both the Tier occupant\'s own inclusions editor and every Tier Edition\'s inclusions editor, since both call this same component',
);

console.log('Tier occupant inclusions Bundle contract: PASS');
