// Contract: the Tier Workspace orchestrating shell — PackageTierWorkspace.tsx
// and TierLowerDeck.tsx, which compose the Details/Connections/Settings lanes
// into one workspace and resolve the typed target union into canonical
// drawer routes. Cross-lane and orchestrator-only invariants live here; each
// lane's own internals are covered in its own contract file (see
// package-tier-workspace-contract.ts's header for the current map).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package Tier workspace shell contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}

const packageSource = sourceFiles(resolve(root, 'resources/ts/package-station'))
  .filter((path) => /\.tsx?$/.test(path))
  .map((path) => readFileSync(path, 'utf8')).join('\n');
for (const forbidden of [
  'buildRateItemServiceMap',
  'occupantSupplyingServiceIds',
  'supplyingServiceIds',
  'projectFamilyTierWorkspace',
]) {
  check(!packageSource.includes(forbidden), `obsolete provenance symbol ${forbidden} is deleted`);
}

const workspacePresentationDirectory = resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace',
);
const workspacePresentation = sourceFiles(workspacePresentationDirectory)
  .filter((path) => /\.tsx?$/.test(path))
  .map((path) => readFileSync(path, 'utf8')).join('\n');
for (const forbidden of [
  'allowed_rate_sheet_ids',
  'tool.updateInstance',
  'onAllow',
  'TierRateSheetAccessDraft',
  'TierRateSheetAccessEditor',
  "type: 'checkbox'",
]) {
  check(!workspacePresentation.includes(forbidden), `Package Home presentation owns no Rate Sheet access mutation symbol (${forbidden})`);
}
check(
  workspacePresentation.includes('is complete without a Tier assignment')
    && workspacePresentation.includes('Configure the Tier system from Settings below.'),
  'the no-assignment state keeps the Tier shell and directs setup to Settings without declaring the Family incomplete',
);
check(
  workspacePresentation.includes('No Tier system assigned')
    && workspacePresentation.includes('Register a Tier system'),
  'a Family without an assignment receives an honest setup surface instead of five implied Tier records',
);
// That surface acts, rather than sending the user somewhere else to act. It opens
// the registration drawer directly, carrying the Family the engine already has in
// hand so the drawer pre-selects it — one atomic creation, not a relayed errand.
check(
  workspacePresentation.includes('dispatchTierRegistration(tool.selectedFamily?.id ?? null)'),
  'the no-assignment state registers a Tier system for the Family it is showing',
);
check(
  workspacePresentation.includes("encodeTierRegistrationRecordId(familyId), 'register-tier'"),
  'registration is addressed on the Tier drawer, never a second Tier editor',
);
check(
  !workspacePresentation.includes('Open Tier tool'),
  'the workspace never offers a no-op Open Tier tool action',
);
// Settings' description prose is retired (Tier Groups received the same
// text-stripping the Family Groups toolbar did), so the whole-system-vs-slot
// distinction now rests on the row identity and its instance-id reference,
// not a descriptive sentence.
check(
  workspacePresentation.includes('name="Rate Sheet Access"')
    && workspacePresentation.includes('reference={record.tier_instance_id}'),
  'Rate Sheet access is identified by the whole Tier instance, never a slot',
);

// The engine keeps the slot listing this Settings section used to duplicate: it
// renders every fixed slot, reports an empty one honestly, and addresses an
// occupied slot by its occupant and an empty slot by its stored slot key.
check(
  workspacePresentation.includes('slots.map((slot, index)')
    && workspacePresentation.includes('data-status="empty">Empty'),
  'the engine still lists every fixed slot and reports an empty one as empty',
);
check(
  workspacePresentation.includes('encodeTierDrawerRecordId(instanceId, occupantId)')
    && workspacePresentation.includes('encodeTierSlotDrawerRecordId(instanceId, slotId)'),
  'the engine addresses an occupied slot by occupant and an empty slot by its stored slot key',
);
check(
  workspacePresentation.includes('scrollIntoView')
    && workspacePresentation.includes('aria-live="polite"')
    && workspacePresentation.includes('openRequestRevision'),
  'repeated Manage Tier system hand-offs remain visible through focus, scroll and a live announcement',
);
check(workspacePresentation.includes('<TierNavigation') && workspacePresentation.includes('<TierLowerDeck'), 'the Focus shell and lower deck remain mounted for empty states');
check(!workspacePresentation.includes('TierInstancePanel'), 'the standalone raw Tier-instance panel is retired');
check(!workspacePresentation.includes('drawerModule__'), 'workspace presentation never leaks drawer-only field classes');
check(!workspacePresentation.includes('cz-admin-btn'), 'workspace presentation never leaks drawer-kit button tokens');
for (const forbidden of [
  'Existing Tier selections suggest',
  'Assign to Package Family',
  'Remove Tier capability',
  'Independent Tier systems',
]) {
  check(
    !workspacePresentation.includes(forbidden),
    `the workspace offers no guessed or guided relationship workflow (${forbidden})`,
  );
}
const workspaceHook = readFileSync(resolve(
  root,
  'resources/ts/package-station/surface/packageTierWorkspace/usePackageTierWorkspace.ts',
), 'utf8');
check(workspaceHook.includes('fetchPackageStationManager'), 'Rate Sheet settings load independently from an assigned Tier instance');
check(!workspaceHook.includes('addTierCapability'), 'the workspace never auto-creates and assigns a Tier instance');
const adminStationStyles = readFileSync(resolve(
  root,
  'resources/ts/admin-station/styles/admin-station.css',
), 'utf8');
check(
  /\.cz-tier-deck\s*\{[^}]*color:\s*var\(--station-text\)/s.test(adminStationStyles),
  'the lower deck closes inherited foreground colour at its Station surface boundary',
);
const foregroundRuleStart = adminStationStyles.indexOf('/* Keep every primary data value');
const foregroundRule = foregroundRuleStart >= 0
  ? adminStationStyles.slice(foregroundRuleStart, adminStationStyles.indexOf('}', foregroundRuleStart) + 1)
  : '';
check(foregroundRule.includes('color: var(--station-text)'), 'primary deck values resolve to the Station foreground token');
for (const selector of [
  '.cz-tier-deck__identity-name',
  '.cz-tier-deck__field',
  '.cz-tier-settings__leaf-title',
]) {
  check(foregroundRule.includes(selector), `${selector} participates in the Station foreground rule`);
}
const familySource = [
  resolve(root, 'resources/ts/package-station/drawer/package-family'),
  resolve(root, 'resources/ts/package-station/surface/packageFamily'),
].flatMap(sourceFiles).filter((path) => /\.tsx?$/.test(path))
  .map((path) => readFileSync(path, 'utf8')).join('\n');
for (const forbidden of ['usePackageStation', 'tierOccupants', 'TIER_ENTITY']) {
  check(!familySource.includes(forbidden), `Family surfaces do not import obsolete Tier authority ${forbidden}`);
}
const familyCapabilityBindingSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/schema/bindings/packageFamily.tsx',
), 'utf8');
check(
  familyCapabilityBindingSource.includes("label: 'Manage Tier system'")
    && !familyCapabilityBindingSource.includes("label: 'Open Tier tool'"),
  'Family capability navigation names the visible management hand-off honestly',
);
check(
  familySource.includes('onManageTierSystem')
    && familySource.includes("navigate('packages')"),
  'the Admin host adapter carries Manage Tier system into the Packages destination',
);

// Additional lane sources this orchestrator-level file cross-checks against
// each other; each lane's own internals are covered in its own contract file.
const lowerDeckSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierLowerDeck.tsx',
), 'utf8');
const workspaceSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx',
), 'utf8');
const settingsSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx',
), 'utf8');
const connectionsSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierConnections.tsx',
), 'utf8');
const accordionSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierAccordionSection.tsx',
), 'utf8');
const connectionRowSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierConnectionRow.tsx',
), 'utf8');
const focusedSectionsSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/FocusedTierSettings.tsx',
), 'utf8');

// The whole-instance token still travels, but the ACTION travels with it: a
// Tier Group row offers View and Edit like every other record row, and the
// binding's `tier` drawer declares both modes, so a hardcoded 'view' would have
// opened Edit readable. Settings no longer needs an instance-only dispatcher —
// the row carries a canonical `tier-instance` target through the same
// connection dispatcher the Family Group row uses.
check(
  workspaceSource.includes('onIntent(encodeTierInstanceDrawerRecordId(targetInstanceId), actionId)')
    && workspaceSource.includes("dispatchTierInstanceIntent(target.instanceId, actionId)")
    && settingsSource.includes('onIntent={onConnectionIntent}')
    && !settingsSource.includes('onInstanceIntent'),
  'Settings dispatches the exact whole-instance token, with its action, into the registered Tier drawer',
);

// ── One list system ───────────────────────────────────────────────────────────
// Details, Connections and Settings are the SAME record list as the Service
// Catalogue, in the markup shape a header-less list needs. The surface is
// declared once in admin-station.css and named by both shapes; the deck's former
// parallel family is retired, and no deck row may re-author a list surface here.
for (const [name, source] of [
  ['Details', lowerDeckSource],
  ['Connections', connectionRowSource],
  ['Settings', focusedSectionsSource],
] as const) {
  check(
    source.includes('cz-station-list__row') && source.includes('cz-station-list__cell'),
    `${name} rows are rows of the one station list system`,
  );
  check(!source.includes('<table'), `${name} stays a list and brings across no table`);
}
for (const retired of [
  'cz-tier-deck__list',
  'cz-tier-deck__row"',
  'cz-tier-deck__row ',
  'cz-tier-deck__row--',
  'cz-tier-settings__row',
  'cz-tier-deck__field--hide-sm',
]) {
  check(
    !workspacePresentation.includes(retired),
    `the retired parallel deck list family is gone (${retired})`,
  );
}
check(
  lowerDeckSource.includes('key={connectionScopeKey}')
    && workspaceSource.includes("tool.selectedFamily?.id ?? 'unassigned'")
    && workspaceSource.includes("instanceId ?? 'no-instance'")
    && workspaceSource.includes("selectedSlot?.slotId ?? 'no-slot'")
    && workspaceSource.includes("selectedSlot?.occupantId ?? 'empty'"),
  'connection selection state resets on the exact Family, instance, slot, and occupant scope',
);
check(
  lowerDeckSource.includes('<TierSystemSettings\n              key={connectionScopeKey}')
    && accordionSource.includes('<span class="cz-tier-deck__lane-title">{label}</span>')
    && connectionsSource.includes('label={section.label}')
    && settingsSource.includes('label={group.title}'),
  'Settings resets on the same exact context, and each accordion section preserves the lower-deck heading outline through the shared component',
);
check(
  workspaceSource.includes("target.kind === 'package-family'")
    && workspaceSource.includes("target.kind === 'rate-sheet-group'")
    && workspaceSource.includes('target.rateSheetId')
    && workspaceSource.includes('target.groupId'),
  'the orchestrator resolves the typed target union through the existing canonical drawer routes',
);
check(
  /encodeTierRateSheetGroupDrawerRecordId\(\s*instanceId,\s*selectedSlot\.slotId,\s*target\.rateSheetId,\s*target\.groupId,\s*\)/s.test(workspaceSource)
    && workspaceSource.includes('encodeTierRateSheetDrawerRecordId(instanceId, selectedSlot.slotId, target.rateSheetId)'),
  'group and Rate Sheet routes preserve the canonical instance, slot, sheet, then nested-group argument order',
);


console.log('Package Tier workspace shell contract checks passed.');
