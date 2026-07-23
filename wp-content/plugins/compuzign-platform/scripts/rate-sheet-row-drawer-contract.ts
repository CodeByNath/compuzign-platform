// Contract: the rate-sheet-row drawer registration and its dispatch identity.
//
// Guards the drawer axis of the Tier Workspace lower deck: 'rate-sheet-row' is
// a real registered template supporting View and Edit; the Tier tool's row
// actions resolve to it (never to the Tier drawer) while the Tier actions keep
// resolving to 'tier'; the Settings creation templates are registered; and none
// of the new-station files runtime-import the Command Centre host machinery.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DRAWER_TEMPLATES } from '../resources/ts/admin-station/stations/drawers/drawerRegistry';
import { SURFACE_BINDINGS } from '../resources/ts/admin-station/stations/surfaceBindings';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Rate Sheet row drawer contract: ${message}`);
}

// ── Registration ─────────────────────────────────────────────────────────────
const rowTemplate = DRAWER_TEMPLATES['rate-sheet-row'];
check(!!rowTemplate, "'rate-sheet-row' is a registered drawer template key");
check(rowTemplate.key === 'rate-sheet-row', 'the registration key matches its map key');
check(rowTemplate.supportedModes.join(',') === 'view,edit', 'the row drawer supports View and Edit');
check(typeof rowTemplate.content === 'function', 'the registration mounts a real content component');

for (const key of ['package-family-create', 'rate-sheet-setup', 'rate-sheet-group-create'] as const) {
  const template = DRAWER_TEMPLATES[key];
  check(!!template && template.key === key, `'${key}' is registered`);
  check(template.supportedModes.join(',') === 'edit', `'${key}' is an edit-only creation surface`);
}

// ── Dispatch identity through the binding table ──────────────────────────────
const tierTool = SURFACE_BINDINGS.find(
  (binding) => binding.stationId === 'packages' && binding.surfaceId === 'tier-tool',
);
check(!!tierTool, 'the Packages Tier tool binding exists');
check(tierTool.drawerTemplateKey === 'tier', "the surface's default drawer stays the Tier drawer");

// The exact resolution rule StationSurfaceHost applies per dispatched action.
const resolveTemplate = (intentId: string): string | undefined => {
  const intent = tierTool.actionIntents.find((item) => item.id === intentId);
  check(!!intent, `action intent '${intentId}' is declared`);
  return intent.drawerTemplateKey ?? tierTool.drawerTemplateKey;
};

check(resolveTemplate('view') === 'tier' && resolveTemplate('edit') === 'tier',
  'Tier card actions still open the Tier drawer');
check(resolveTemplate('rate-row-view') === 'rate-sheet-row' && resolveTemplate('rate-row-edit') === 'rate-sheet-row',
  'row actions open the rate-sheet-row drawer — never the Tier drawer');
check(
  tierTool.actionIntents.find((item) => item.id === 'rate-row-view')!.mode === 'view'
  && tierTool.actionIntents.find((item) => item.id === 'rate-row-edit')!.mode === 'edit',
  'row actions carry their own view/edit modes',
);
check(resolveTemplate('create-package-family') === 'package-family-create'
  && resolveTemplate('setup-rate-sheet') === 'rate-sheet-setup'
  && resolveTemplate('create-rate-sheet-group') === 'rate-sheet-group-create',
  'Settings creation actions resolve to their registered creation drawers');

// ── Identity honesty in the row adapter ──────────────────────────────────────
// The adapter must accept ONLY a string item_id — no coercion, no fallback row,
// no Tier drawer fallback. Asserted statically against the adapter source (the
// component itself needs a DOM host to execute).
const here = dirname(fileURLToPath(import.meta.url));
const adapterSource = readFileSync(
  join(here, '../resources/ts/admin-station/stations/packageTierWorkspace/RateSheetRowDrawerHost.tsx'),
  'utf8',
);
check(adapterSource.includes("typeof recordId !== 'string'"), 'the adapter rejects non-string (numeric) identity');
check(adapterSource.includes('This Rate Sheet row identity is invalid.'), 'invalid identity renders its honest state');
check(adapterSource.includes('This Rate Sheet row could not be found.'), 'an unknown row renders its honest state');
check(!adapterSource.includes('Number('), 'the adapter never coerces the record id');

// ── No Command Centre runtime import ─────────────────────────────────────────
const newStationFiles = [
  '../resources/ts/admin-station/stations/packageTierWorkspace/RateSheetRowDrawerHost.tsx',
  '../resources/ts/admin-station/stations/packageTierWorkspace/RateSheetSetupDrawerHost.tsx',
  '../resources/ts/admin-station/stations/packageTierWorkspace/RateSheetGroupCreateDrawerHost.tsx',
  '../resources/ts/admin-station/stations/packageTierWorkspace/rateSheetProjection.ts',
  '../resources/ts/admin-station/stations/packageFamily/PackageFamilyCreateDrawerHost.tsx',
  '../resources/ts/admin-station/presentation/package-tier-workspace/TierLowerWorkspace.tsx',
  '../resources/ts/entity-drawers/rate-sheet-row/RateSheetRowDrawerContent.tsx',
  '../resources/ts/entity-drawers/rate-sheet/RateSheetSetupContent.tsx',
  '../resources/ts/entity-drawers/rate-sheet/RateSheetGroupCreateContent.tsx',
  '../resources/ts/entity-drawers/package-family/PackageFamilyCreateContent.tsx',
  '../resources/ts/hooks/packageRateSheetRow.ts',
];
const forbidden = ['components/admin/relations', 'StepContext', 'ActionConfig', 'DynamicStationManager'];
for (const file of newStationFiles) {
  const source = readFileSync(join(here, file), 'utf8');
  // Only import statements count — prose comments may name what is excluded.
  const importLines = source.split('\n').filter((line) => /^\s*import\b|\brequire\(/.test(line));
  for (const marker of forbidden) {
    check(
      !importLines.some((line) => line.includes(marker)),
      `${file} does not import ${marker}`,
    );
  }
}

console.log('Rate Sheet row drawer contract checks passed.');
