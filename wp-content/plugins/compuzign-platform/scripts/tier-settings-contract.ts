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
// Pending/Disabled, defaulting to All — the full loaded Family pool, focused
// family first) plus the relocated, renamed pool launcher — a real button,
// not a second copy of the retired PoolLauncher leaf. Every other group keeps
// its unchanged bottom-of-panel PoolLauncher.
check(
  familyGroupsBlock.includes("toolbar: (")
    && familyGroupsBlock.includes("value={familyGroupFilter}")
    && settingsSource.includes("useState<FamilyGroupFilter>('all')")
    && ['focused', 'all', 'active', 'pending', 'disabled'].every((id) => settingsSource.includes(`id: '${id}'`))
    && familyGroupsBlock.includes('+ New Family')
    && !familyGroupsBlock.includes('<PoolLauncher'),
  'Family Groups\' toolbar carries the All-default status filter and the renamed + New Family action, not a PoolLauncher leaf',
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
  settingsSource.includes('projectFamilyConnectionRows,')
    && settingsSource.includes("} from '../../surface/packageTierWorkspace/connectionNavigation'")
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
    && settingsSource.includes("useState<TierGroupFilter>('all')")
    && ['focused', 'all', 'active', 'pending', 'disabled'].every((id) => settingsSource.includes(`id: '${id}'`))
    && tierGroupsBlock.includes('+ New Tier Group')
    && !tierGroupsBlock.includes('<PoolLauncher'),
  'Tier Groups\' toolbar carries the All-default status filter and the renamed + New Tier Group action, not a PoolLauncher leaf',
);

// ── Tier Groups lists the PARENT Tier Group / Tier System records ─────────────
// The section previously showed one child access row (Rate Sheet Access /
// Policy / Configured), which reported a policy rather than the records the
// section is named for. It now lists the parent systems themselves on the same
// list system Family Groups uses: whole pool by default, focused system first,
// filtered by the PARENT's own lifecycle state.
check(
  tierGroupsBlock.includes('<TierGroupPoolSummary rows={tierGroupRows}')
    && settingsSource.includes("import {\n  projectFamilyConnectionRows,\n  projectTierGroupConnectionRows,\n} from '../../surface/packageTierWorkspace/connectionNavigation'")
    && settingsSource.includes('ordered.flatMap((candidate) => projectTierGroupConnectionRows(candidate))'),
  'Tier Groups lists the parent Tier Group records through the shared projection, not a child access row',
);
// The whole loaded parent pool is the source, and every filter reads the
// PARENT's lifecycle state — `draft` is the system's Pending, so it maps rather
// than leaking the storage enum into the filter vocabulary.
check(
  settingsSource.includes('const pool = tool.instances.filter((candidate) => {')
    && settingsSource.includes("if (tierGroupFilter === 'all') return true;")
    && settingsSource.includes("if (tierGroupFilter === 'pending') return candidate.status === 'draft';")
    && settingsSource.includes('return candidate.status === tierGroupFilter;'),
  'Tier Groups filters the complete parent Tier Group pool by the parent\'s own lifecycle state',
);
// Focused-first ordering, on the same stable-sort shape Family Groups uses: the
// comparator moves only the focused system and returns 0 for every other pair,
// so the remaining systems keep their existing order.
check(
  settingsSource.includes('const focusedInstanceId = workspaceInstance?.tier_instance_id ?? null;')
    && settingsSource.includes("if (tierGroupFilter === 'focused') return candidate.tier_instance_id === focusedInstanceId;")
    && /a\.tier_instance_id === focusedInstanceId \? -1 : b\.tier_instance_id === focusedInstanceId \? 1 : 0/.test(settingsSource),
  'the focused Tier Group sorts first and the rest keep their existing stable order',
);
// The accordion summary reports the real parent pool, never an access policy.
check(
  tierGroupsBlock.includes('summary: `${activeTierGroups} active · ${tool.instances.length} in pool`')
    && settingsSource.includes("tool.instances.filter((instance) => instance.status === 'active').length"),
  'the Tier Groups summary counts real parent Tier Groups rather than reporting a Rate Sheet access policy',
);
// The retired child-access presentation is gone from the Tier Groups list: its
// row identity, policy column, and status words leave with it.
for (const retired of [
  '<RateSheetAccessSummary',
  'Rate Sheet Access',
  'Policy',
  'Configured',
  'Review',
]) {
  check(
    !tierGroupsBlock.includes(retired),
    `the Tier Groups list no longer presents ${retired}`,
  );
}
check(
  !settingsSource.includes('projectTierRateSheetAccess')
    && !settingsSource.includes('RateSheetAccessSummary'),
  'the Settings lane no longer derives or renders Rate Sheet access for the Tier Groups list',
);
check(
  tierGroupsBlock.includes('onView={onInstanceIntent}')
    && tierGroupsBlock.includes("onPoolIntent('tier')"),
  'Tier Groups opens the parent system through the existing instance dispatcher and launches the Tier pool creation',
);

// ── The Tier Group row reuses the Family Groups row system ────────────────────
// One row grammar, one status derivation, one action control. The parent Tier
// Group renders through the SAME shared connected-record row the Family Group
// list renders, so it reports the same identity/Platform ID/status-pill/
// split-action columns rather than a second row layout of its own.
const connectionRowSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierConnectionRow.tsx',
), 'utf8');
check(
  focusedSectionsSource.includes('export function TierGroupPoolSummary')
    && focusedSectionsSource.includes('<ul class="cz-station-list">')
    && /<TierConnectionRow\s+key={row\.id}\s+row={row}/.test(focusedSectionsSource),
  'the Tier Group pool renders through the shared connected-record row, on the shared station list',
);
check(
  connectionRowSource.includes('function TierGroupConnectionFields')
    && connectionRowSource.includes("row.kind === 'tier-group' ? (")
    && connectionRowSource.includes('<TierGroupConnectionFields row={row} />')
    && connectionRowSource.includes('<PlatformIdField platformId={row.platformId} />'),
  'the shared row branches into a Tier Group field set carrying the Platform ID',
);
// Title, Platform ID and the shared lifecycle pill all come from the shared row
// — the pill through the same `connectionStatus` token map every other kind uses.
check(
  connectionRowSource.includes('<TierDeckRowIdentity icon={icon} name={row.name} reference={row.reference} compact />')
    && connectionRowSource.includes('<span class="cz-tier-deck__status" data-status={meta.token}>{meta.label}</span>')
    && connectionRowSource.includes('const meta = connectionStatus(row.status);'),
  'the Tier Group row renders its title, Platform ID and lifecycle pill through the shared row, not a bespoke layout',
);
// The same split-action control the Family Group row uses, driven by the row's
// own declared actions — no second button component, no redesigned CSS.
check(
  connectionRowSource.includes('<StationSplitAction')
    && connectionRowSource.includes('actions={row.actions.map((actionId) => ({ id: actionId, label: ACTION_LABELS[actionId] }))}')
    && !focusedSectionsSource.includes('cz-tier-deck__button')
    && !/class="[^"]*"\s*>\s*View\s*</.test(focusedSectionsSource),
  'the Tier Group row uses the shared split-action control, not a plain View button of its own',
);
// The parent Tier Group's canonical target is the SYSTEM, and it resolves
// through the whole-instance drawer the workspace already registered — never an
// individual Tier occupant or fixed slot, and never a new route.
const workspaceSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx',
), 'utf8');
check(
  connectionNavigationSource.includes("| { kind: 'tier-instance'; instanceId: string }")
    && connectionNavigationSource.includes('export function projectTierGroupConnectionRows')
    && connectionNavigationSource.includes("target:     { kind: 'tier-instance', instanceId: instance.tier_instance_id },")
    && connectionNavigationSource.includes("actions:    ['view'],"),
  'a parent Tier Group row targets the system itself and offers the read-only View action',
);
check(
  workspaceSource.includes("if (target.kind === 'tier-instance') {")
    && workspaceSource.includes('dispatchTierInstanceIntent(target.instanceId);')
    && workspaceSource.includes('onIntent(encodeTierInstanceDrawerRecordId(targetInstanceId), \'view\');')
    && workspaceSource.indexOf("target.kind === 'tier-instance'")
      < workspaceSource.indexOf('if (instanceId === null || selectedSlot === null) return;'),
  'the Tier Group target opens the existing whole-instance Tier drawer and settles before the slot-scoped guard',
);
// `draft` is the parent system's Pending; the bin states keep their own names
// rather than being flattened into Disabled.
check(
  connectionNavigationSource.includes("export type TierGroupRowStatus = 'active' | 'pending' | 'disabled' | 'archived' | 'trashed'")
    && /draft:\s+'pending',/.test(connectionNavigationSource)
    && /disabled:\s+'disabled',/.test(connectionNavigationSource),
  'the Tier Group row maps the storage lifecycle onto the shared pill vocabulary',
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
