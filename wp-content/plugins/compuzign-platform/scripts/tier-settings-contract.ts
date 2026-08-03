// Contract: the Settings lane (TierSystemSettings.tsx + FocusedTierSettings.tsx)
// — the whole-focus, read-and-launch presentation scoped to the Package Family
// Group, as distinct from Connections' narrower per-Tier scope. Split out of
// package-tier-workspace-contract.ts, which had grown into a god file spanning
// unrelated subsystems; see that file's header for the current responsibility
// map.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier Settings contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}
// Settings does not restate the engine's fixed-slot listing; this scan proves
// it across the whole lower-deck presentation directory, not just this lane's
// own two files, so a restated listing cannot grow back in a sibling file.
const workspacePresentation = sourceFiles(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace',
))
  .filter((path) => /\.tsx?$/.test(path))
  .map((path) => readFileSync(path, 'utf8')).join('\n');

// ── Settings wires no relationship ────────────────────────────────────────────
// Settings reads the WHOLE focus the Package Family Group leads. It never
// assigns a Tier to a Package Family, never offers a Family picker or a
// pre-picked candidate, never keeps a second Tier inventory beside the focused
// one, and never launches an unrelated tool. Each of those relationships is made
// in the drawer that owns the record, so removing them here removed a UI path
// and no capability.
const settingsSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx',
), 'utf8');
const focusedSectionsSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/FocusedTierSettings.tsx',
), 'utf8');
const settingsPresentation = `${settingsSource}\n${focusedSectionsSource}`;
for (const forbidden of [
  'assignInstance',
  'unassignInstance',
  'suggestConsumerForInstance',
  'eligibleFamilies',
  'TierRateSheetInventory',
  'onToolIntent',
  'onManageInstance',
  'tool.updateInstance',
  'onAllow',
  'TierRateSheetAccessDraft',
  "type: 'checkbox'",
  '<form',
  'api.',
]) {
  check(!settingsPresentation.includes(forbidden), `Settings carries no ${forbidden} relationship or mutation workflow`);
}
// ── Settings shell ────────────────────────────────────────────────────────────
// Settings uses the same TierAccordionSection contract as Connections; each
// context reset remounts it through the exact workspace scope key. The retired
// compact selector cards and nested tabs are gone from both lanes.
check(
  settingsSource.includes('<TierAccordionSection')
    && settingsSource.includes("import { TierAccordionSection } from './TierAccordionSection'")
    && settingsSource.includes('const [expanded, setExpanded]')
    && !settingsSource.includes('variant="selectors"')
    && !settingsSource.includes('variant="nested"')
    && !settingsSource.includes('TierTabSet'),
  'Settings renders its groups through the shared accordion section and owns no selector-card/nested-tab state of its own',
);
check(
  !existsSync(resolve(root, 'resources/ts/package-station/presentation/package-tier-workspace/TierSettingsNav.tsx'))
    && !existsSync(resolve(root, 'resources/ts/package-station/presentation/package-tier-workspace/DeckDisclosure.tsx')),
  'the retired parallel Settings navigation and disclosure implementations are deleted',
);
check(
  settingsSource.includes("'family-groups': true")
    && settingsSource.includes("'tier-groups':   false")
    && settingsSource.includes("'rate-sheets':   false")
    && !settingsSource.includes("'groups':"),
  'Family Groups starts open and Tier Groups/Rate Sheets start collapsed, matching Connections\' primary-section-open convention; Groups no longer exists as its own accordion entry',
);
check(
  settingsSource.includes('group.sections.map((section) =>')
    && !settingsSource.includes('selectedSection')
    && !settingsSource.includes('requestedSection'),
  'an open Settings group shows every one of its sections directly, with no inner tab selecting only one at a time',
);
check(
  settingsSource.includes('<h4 class="cz-tier-settings__leaf-title">{section.leaf}</h4>'),
  'the selected Settings leaf enters the lower deck outline at the correct heading rank',
);

// The required hierarchy: one ordered accordion group per Package-owned record
// type — Family Groups, Tier Groups, Rate Sheets — not the Stations/Tools axis
// Connections uses. Groups is no longer a fourth top-level section: a Rate
// Sheet Group has no address apart from the sheet holding it, so its
// read-only count moved inside Rate Sheets. The fixed Tier slots stay the
// engine's listing, which Settings does not restate beside it.
check(
  settingsSource.indexOf("id: 'family-groups'") < settingsSource.indexOf("id: 'tier-groups'")
    && settingsSource.indexOf("id: 'tier-groups'") < settingsSource.indexOf("id: 'rate-sheets'")
    && !settingsSource.includes("id: 'groups'"),
  'Settings presents its three groups in the required order: Family Groups, Tier Groups, Rate Sheets — with no separate Groups section',
);
const familyGroupsBlock = settingsSource.slice(
  settingsSource.indexOf("id: 'family-groups'"),
  settingsSource.indexOf("id: 'tier-groups'"),
);
const tierGroupsBlock = settingsSource.slice(
  settingsSource.indexOf("id: 'tier-groups'"),
  settingsSource.indexOf("id: 'rate-sheets'"),
);
const rateSheetsBlock = settingsSource.slice(settingsSource.indexOf("id: 'rate-sheets'"));

// The Connected sub-section renders its row with no kicker, heading, or
// description above it — those three strings are removed, not merely hidden —
// and the bottom Pool leaf is gone too: its launcher moved into the top
// toolbar, so Family Groups' title/leaf regex matches now come up empty.
const familyGroupsTitles = [...familyGroupsBlock.matchAll(/title: '([^']+)'/g)].map((match) => match[1]);
check(
  familyGroupsTitles.join(',') === 'Family Groups',
  'Family Groups holds only its Connected section (heading text removed) — the Pool leaf is retired in favour of the top toolbar',
);
const familyGroupsLeaves = [...familyGroupsBlock.matchAll(/leaf: '([^']+)'/g)].map((match) => match[1]);
check(
  familyGroupsLeaves.length === 0,
  'Family Groups carries no leaf heading: Connected is unlabelled and Pool no longer exists as a separate section',
);
check(
  /id: 'connected',\s*title: '',\s*description: '',\s*leaf: '',\s*hideHeading: true,/.test(familyGroupsBlock)
    && !familyGroupsBlock.includes("note: 'The Package Family this focus is connected to"),
  'Family Groups\' Connected section and group note carry no heading text, only the connected-record content',
);
// Family Groups' toolbar: a presentational status filter (Focused/All/Active/
// Pending/Disabled, defaulting to Focused) plus the relocated, renamed pool
// launcher — a real button, not a second copy of the retired PoolLauncher
// leaf. Every other group keeps its unchanged bottom-of-panel PoolLauncher.
check(
  familyGroupsBlock.includes("toolbar: (")
    && familyGroupsBlock.includes("value={familyGroupFilter}")
    && settingsSource.includes("useState<FamilyGroupFilter>('focused')")
    && ['focused', 'all', 'active', 'pending', 'disabled'].every((id) => settingsSource.includes(`id: '${id}'`))
    && familyGroupsBlock.includes('+ New Family')
    && !familyGroupsBlock.includes('<PoolLauncher'),
  'Family Groups\' toolbar carries the Focused-default status filter and the renamed + New Family action, not a PoolLauncher leaf',
);
check(
  settingsSource.includes('{group.toolbar}')
    && familyGroupsBlock.includes('toolbar:')
    && tierGroupsBlock.includes('toolbar:')
    && rateSheetsBlock.includes('toolbar:')
    && !settingsSource.includes('PoolLauncher'),
  'every one of the three groups carries a top-of-panel toolbar; the retired PoolLauncher leaf is gone entirely',
);
// The connected Family Group is the workspace's ONE connection projection, and
// it travels the existing connection dispatcher into the drawer that owns the
// record. Settings mints no second row, target, or intent for it.
check(
  settingsSource.includes("import { projectFamilyConnectionRows } from '../../surface/packageTierWorkspace/connectionNavigation'")
    && settingsSource.includes('projectFamilyConnectionRows(family)')
    && familyGroupsBlock.includes('<ConnectedStationsSummary rows={familyRows} onIntent={onConnectionIntent} />')
    && familyGroupsBlock.includes("onPoolIntent('family')"),
  'Family Groups reports the connected Family Group from the shared projection through the shared connection dispatcher, and launches the Family pool creation',
);
const connectionNavigationSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/surface/packageTierWorkspace/connectionNavigation.ts',
), 'utf8');
check(
  (connectionNavigationSource.match(/kind:\s+'family',/g) ?? []).length === 1
    && connectionNavigationSource.includes('const familyRows = projectFamilyConnectionRows(family)'),
  'one derivation builds the connected Family row for both the Tier and the whole-focus scope',
);

// Tier Groups follows Family Groups' exact cleaning: its Connected
// sub-section carries no kicker, heading, or description above it, and the
// bottom Pool leaf is gone — its launcher moved into the top toolbar too.
const tierGroupsTitles = [...tierGroupsBlock.matchAll(/title: '([^']+)'/g)].map((match) => match[1]);
check(
  tierGroupsTitles.join(',') === 'Tier Groups',
  'Tier Groups holds only its Connected section (heading text removed) — the Pool leaf is retired in favour of the top toolbar',
);
const tierGroupsLeaves = [...tierGroupsBlock.matchAll(/leaf: '([^']+)'/g)].map((match) => match[1]);
check(
  tierGroupsLeaves.length === 0,
  'Tier Groups carries no leaf heading: Connected is unlabelled and Pool no longer exists as a separate section',
);
check(
  /id: 'connected',\s*title: '',\s*description: '',\s*leaf: '',\s*hideHeading: true,/.test(tierGroupsBlock)
    && !tierGroupsBlock.includes("note: 'The focused Tier system's Rate Sheet access"),
  'Tier Groups\' Connected section and group note carry no heading text, only the connected-record content',
);
check(
  tierGroupsBlock.includes("toolbar: (")
    && tierGroupsBlock.includes("value={tierGroupFilter}")
    && settingsSource.includes("useState<TierGroupFilter>('focused')")
    && tierGroupsBlock.includes('+ New Tier Group')
    && !tierGroupsBlock.includes('<PoolLauncher'),
  'Tier Groups\' toolbar carries the Focused-default status filter and the renamed + New Tier Group action, not a PoolLauncher leaf',
);
check(
  tierGroupsBlock.includes('onView={onInstanceIntent}')
    && tierGroupsBlock.includes("onPoolIntent('tier')"),
  'Tier Groups reports Rate Sheet Access as read-only View and launches the Tier pool creation',
);

// Rate Sheets follows the same cleaning Family Groups and Tier Groups
// received, and additionally absorbs Groups: a Rate Sheet Group lives inside
// `rate_sheets[].groups[]`, so it has no pool, address, or creation apart from
// the sheet holding it — there is no reason for it to stand as a fourth
// top-level section, so its read-only count reports directly inside Rate
// Sheets instead.
const rateSheetsTitles = [...rateSheetsBlock.matchAll(/title: '([^']+)'/g)].map((match) => match[1]);
check(
  rateSheetsTitles.join(',') === 'Rate Sheets',
  'Rate Sheets holds only its unlabelled group-count section (heading text removed) — the Pool leaf is retired in favour of the top toolbar',
);
const rateSheetsLeaves = [...rateSheetsBlock.matchAll(/leaf: '([^']+)'/g)].map((match) => match[1]);
check(
  rateSheetsLeaves.length === 0,
  'Rate Sheets carries no leaf heading: its group count is unlabelled and Pool no longer exists as a separate section',
);
check(
  /id: 'pool',\s*title: '',\s*description: '',\s*leaf: '',\s*hideHeading: true,/.test(rateSheetsBlock)
    && !rateSheetsBlock.includes("note: 'The Rate Sheet pool"),
  'Rate Sheets\' group-count section and group note carry no heading text, only the read-only group count',
);
check(
  rateSheetsBlock.includes("toolbar: (")
    && rateSheetsBlock.includes("value={rateSheetFilter}")
    && settingsSource.includes("useState<RateSheetFilter>('focused')")
    && rateSheetsBlock.includes('+ New Rate Sheet')
    && rateSheetsBlock.includes("onPoolIntent('rate-sheet')"),
  'Rate Sheets\' toolbar carries the Focused-default status filter and the renamed + New Rate Sheet action, not a PoolLauncher leaf',
);
check(
  !rateSheetsBlock.includes('onPoolIntent(\'groups\')')
    && rateSheetsBlock.includes('groupCount'),
  'the Rate Sheet Group count moved inside Rate Sheets stays read-only, with no creation launcher of its own',
);

// The engine above lists every fixed slot and dispatches the occupant and slot
// drawer routes. A second slot listing in Settings addressed the SAME focused
// instance through the SAME routes, so removing it removed a duplicate view and
// no capability. These scan the whole workspace directory — the section, its
// props, and the dispatcher that existed only to feed it — so it cannot grow
// back one file at a time.
for (const retired of [
  'Fixed Tier Slots',
  'Tier Structure',
  'tier-structure',
  'FixedTierSlots',
  'onTierAction',
  'dispatchExplicitTierIntent',
]) {
  check(
    !workspacePresentation.includes(retired),
    `Package Home Settings restates no fixed Tier slot inventory (${retired})`,
  );
}
// ── Pool launches; Settings does not create ────────────────────────────────────
// Exactly the three pool creations, each a launcher into the drawer that owns
// the record rather than a form, and no fourth: a group is stored inside
// `rate_sheets[].groups[]`, so it has no pool and no address apart from the
// sheet holding it, and the Rate Sheet drawer already authors it.
// All three launchers now live in their group's toolbar and no longer use
// PoolLauncher's `label` attribute (PoolLauncher itself is retired), so they
// surface through their own literal button text instead of a label regex.
const settingsLaunchers = [...settingsSource.matchAll(/label="(Create [^"]+)"/g)].map((match) => match[1]);
check(
  settingsLaunchers.length === 0
    && settingsSource.includes('+ New Family')
    && settingsSource.includes('+ New Tier Group')
    && settingsSource.includes('+ New Rate Sheet'),
  'Settings offers exactly the three pool creations, in the required order, and no fourth — each as its group\'s own toolbar button, not a PoolLauncher leaf',
);
const settingsPoolIntents = [...settingsSource.matchAll(/onPoolIntent\('([^']+)'\)/g)].map((match) => match[1]);
check(
  settingsPoolIntents.join(',') === 'family,tier,rate-sheet',
  'every pool subject launches a drawer rather than rendering a creation form, and no fourth subject exists',
);

// The Settings lane holds no mutation authority of its own. It dispatches a
// subject or exact instance identity and owns no endpoint, draft, save, or form.
for (const forbidden of [
  'createPackageFamily',
  'createRateSheet',
  'createInstance',
  'savePackageStationManager',
  'buildManagerSavePayload',
  'toRateSheetEditorList',
  'updateInstance',
  '<form',
]) {
  check(!settingsPresentation.includes(forbidden), `the Settings lane performs no ${forbidden} of its own`);
}
check(
  !existsSync(resolve(
    root,
    'resources/ts/package-station/presentation/package-tier-workspace/PackageManagerSettings.tsx',
  )),
  'no inline Package Manager creation form survives beside the launchers',
);
check(
  focusedSectionsSource.includes('No Tier system is focused, so no Rate Sheet access is configured.'),
  'the focused section fails closed rather than inventing a system',
);
check(
  focusedSectionsSource.includes('reference={record.tier_instance_id}')
    && focusedSectionsSource.includes("actions={[{ id: 'view', label: 'View' }]}"),
  'Settings identifies access by the instance id and keeps Home access read-only',
);

console.log('Tier Settings contract checks passed.');
