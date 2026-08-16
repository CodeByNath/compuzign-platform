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

check(
  /const bundleBacked = !!rateItem && \(rateItem\.bundle_id \?\? ''\) !== '';/.test(usePackageStation),
  'tierView() computes bundleBacked from the resolved row\'s own bundle_id, not from any Manager relationship lookup',
);
check(
  /const resolved = bundleBacked \|\| /.test(usePackageStation),
  'a Bundle-backed selection resolves on its own presence — resolved is never gated on finding a Manager source for it',
);
check(
  usePackageStation.includes("rateItem?.label?.trim() || 'Untitled Bundle'"),
  'a Bundle-backed selection reads its OWN row label (the Bundle Name), falling back to "Untitled Bundle" — the same convention the Rate Sheet tool and buildRateSheetCatalogue() already use — never the generic "(unresolved Rate Sheet item)" string',
);
check(
  /inclusions_override = resolvedSelections\s*\n\s*\.filter\(\(item\) => item\.source_type === 'inclusion' \|\| \(rateById\.get\(item\.item_id\)\?\.bundle_id \?\? ''\) !== ''\)/.test(usePackageStation),
  'inclusions_override\'s own filter recognizes a Bundle-backed selection directly (by its row\'s bundle_id) rather than only ones with source_type === \'inclusion\', which a Bundle-backed row (no Manager source at all) can never carry',
);
check(
  usePackageStation.includes('rateItem?.includes ?? []'),
  'a Bundle-backed selection\'s label draws from the row\'s own live-resolved `includes[]` (its supplied content), not just its bare name',
);
check(
  usePackageStation.includes('` — includes: ${bundleSuppliedLabels.join(\', \')}`'),
  'the Bundle\'s supplied content is baked straight into the SAME single label string every plain Feature already carries — never a second field on the shared item-collection element — so any reader of that label (the read card, or a downstream Package/pricing preview) shows it with no extra wiring',
);

console.log('Tier occupant inclusions Bundle contract: PASS');
