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
import { RATE_SHEET_ROW_ENTITY } from '../resources/ts/entity-drawers/schema/entities/rateSheetRow';
import {
  countEligibleServices,
  projectEligibleSetupRows,
  resolveRateSheetSetupStage,
} from '../resources/ts/entity-drawers/rate-sheet/rateSheetSetupModel';

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

// ── The row drawer follows the drawer template kit ───────────────────────────
// View mode is a structured read composition (EntityDrawer + read modules),
// never a form of disabled inputs; Edit mode is the Commercial Terms module's
// editor alone, over exactly the four command-patchable fields.
const rowContentSource = readFileSync(
  join(here, '../resources/ts/entity-drawers/rate-sheet-row/RateSheetRowDrawerContent.tsx'),
  'utf8',
);
check(rowContentSource.includes("from '@/drawer-kit/EntityDrawer'")
  && rowContentSource.includes('RATE_SHEET_ROW_ENTITY'),
  'the row composition renders through EntityDrawer with the registered row manifest');
check(!rowContentSource.includes('readOnly') && !rowContentSource.includes('disabled='),
  'read mode is composed read modules — never readOnly/disabled form inputs');

check(RATE_SHEET_ROW_ENTITY.placements.drawer!.details.map((slot) => slot.module).join(',') === 'overview,commercial',
  'the Overview tab places the Row Overview and Commercial Terms read modules');
check(RATE_SHEET_ROW_ENTITY.placements.drawer!.connections.map((slot) => slot.module).join(',') === 'provenance,connection',
  'the Connections tab places the Source & Provenance and Connection Status modules');
const editorShells = Object.entries(RATE_SHEET_ROW_ENTITY.shells).filter(([, shell]) => !!shell.editor);
check(editorShells.length === 1 && editorShells[0][0] === 'commercial',
  'exactly one module — Commercial Terms — carries an editor');
check(RATE_SHEET_ROW_ENTITY.shells.commercial.footer.actions.includes('edit'),
  'the Commercial Terms module offers the Edit action');

const rowEditorSource = readFileSync(
  join(here, '../resources/ts/entity-drawers/editors/RateSheetRowEditor.tsx'),
  'utf8',
);
for (const field of ['unit_price', 'per', 'quantity', 'group_id'] as const) {
  check(rowEditorSource.includes(field), `the editor edits ${field}`);
}
for (const forbidden of ['item_id', 'source_item_id', 'sort_order'] as const) {
  check(!rowEditorSource.includes(forbidden), `the editor never touches ${forbidden}`);
}

// ── Rate Sheet setup honesty ─────────────────────────────────────────────────
// The setup drawer is stage-driven from the pure model: a configured sheet
// yields the passive already-configured state (a stale wall button can never
// restart setup), this open's own setup yields an explicit success state, and
// the eligibility preview holds live relationships only.
check(resolveRateSheetSetupStage(false, false) === 'form', 'an unconfigured station opens the setup form');
check(resolveRateSheetSetupStage(true, false) === 'already-configured',
  'a configured station opens the passive state — never a second setup form');
check(resolveRateSheetSetupStage(true, true) === 'success'
  && resolveRateSheetSetupStage(false, true) === 'success',
  'the setup this open performed shows its success state');

const eligible = projectEligibleSetupRows([
  { item_id: 'rel_1', label: 'Monitoring', missing: false, source_service_title: 'Endpoint Protection' },
  { item_id: 'rel_2', label: 'Gone',       missing: true,  source_service_title: 'Endpoint Protection' },
  { item_id: 'rel_3', label: 'Patching',   missing: false, source_service_title: 'Managed Patching' },
]);
check(eligible.map((row) => row.id).join(',') === 'rel_1,rel_3',
  'missing relationships never enter the setup preview');
check(countEligibleServices(eligible) === 2, 'the preview counts distinct supplying Services');

const setupSource = readFileSync(
  join(here, '../resources/ts/entity-drawers/rate-sheet/RateSheetSetupContent.tsx'),
  'utf8',
);
check(setupSource.includes('resolveRateSheetSetupStage'), 'the setup drawer resolves its surface from the pure stage model');
check(setupSource.includes('setJustConfigured(true)'), 'success is an explicit in-drawer state, not a silent close');

// ── One entity, one name ─────────────────────────────────────────────────────
// The Settings surface creates a Package Family; no workspace copy may rename
// it "Family Group".
for (const file of [
  '../resources/ts/admin-station/presentation/package-tier-workspace/TierLowerWorkspace.tsx',
  '../resources/ts/admin-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx',
  '../resources/ts/admin-station/stations/packageTierWorkspace/rateSheetProjection.ts',
]) {
  check(!readFileSync(join(here, file), 'utf8').includes('Family Group'),
    `${file} names the entity Package Family, never "Family Group"`);
}

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
  '../resources/ts/entity-drawers/rate-sheet/rateSheetSetupModel.ts',
  '../resources/ts/entity-drawers/package-family/PackageFamilyCreateContent.tsx',
  '../resources/ts/entity-drawers/schema/entities/rateSheetRow.ts',
  '../resources/ts/entity-drawers/schema/bindings/rateSheetRow.tsx',
  '../resources/ts/entity-drawers/editors/RateSheetRowEditor.tsx',
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
