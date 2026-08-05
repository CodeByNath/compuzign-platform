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
    && familyGroupsBlock.includes('+ Family Group')
    && !familyGroupsBlock.includes('<PoolLauncher'),
  'Family Groups\' toolbar carries the All-default status filter and the renamed + Family Group action, not a PoolLauncher leaf',
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
    && tierGroupsBlock.includes('+ Tier Group')
    && !tierGroupsBlock.includes('<PoolLauncher'),
  'Tier Groups\' toolbar carries the All-default status filter and the renamed + Tier Group action, not a PoolLauncher leaf',
);

// ── Tier Groups lists the PARENT Tier Group / Tier System records ─────────────
// The section previously showed one child access row (Rate Sheet Access /
// Policy / Configured), which reported a policy rather than the records the
// section is named for. It now lists the parent systems themselves on the same
// list system Family Groups uses: whole pool by default, focused system first,
// filtered by the PARENT's own lifecycle state.
check(
  tierGroupsBlock.includes('<TierGroupPoolSummary rows={tierGroupRows}')
    && settingsSource.includes('projectTierGroupConnectionRows,')
    && settingsSource.includes('ordered.flatMap((candidate) => projectTierGroupConnectionRows(candidate))'),
  'Tier Groups lists the parent Tier Group records through the shared projection, not a child access row',
);
// The whole loaded parent pool is the source, and every filter reads the
// PARENT's lifecycle state — `draft` is the system's Pending, so it maps rather
// than leaking the storage enum into the filter vocabulary.
check(
  settingsSource.includes('const pool = presentableInstances.filter((candidate) => {')
    && settingsSource.includes("if (tierGroupFilter === 'all') return true;")
    && settingsSource.includes("if (tierGroupFilter === 'pending') return candidate.status === 'draft';")
    && settingsSource.includes('return candidate.status === tierGroupFilter;'),
  'Tier Groups filters the presentable parent Tier Group pool by the parent\'s own lifecycle state',
);
// ── The normal list is live records only ─────────────────────────────────────
// Archived and trashed Tier Groups are binned, not normal pool records. They are
// excluded BEFORE any filter or sort runs, so `All` cannot surface one, `Focused`
// cannot pin one first, and no travel pill can reach this list. Restoring or
// purging a binned system belongs to the dedicated archive/trash job, which this
// section does not do.
check(
  settingsSource.includes('const presentableInstances = useMemo(')
    && /candidate\.status !== 'archived' && candidate\.status !== 'trashed'/.test(settingsSource)
    && settingsSource.indexOf('presentableInstances = useMemo(')
      < settingsSource.indexOf('const pool = presentableInstances.filter'),
  'archived and trashed Tier Groups leave the pool before any filter or sort sees them',
);
// The filter list stays at the three live lifecycle states — adding an Archived
// or Trashed option would offer a filter that can never match a row.
check(
  !/{ id: 'archived'/.test(settingsSource) && !/{ id: 'trashed'/.test(settingsSource),
  'no Archived or Trashed filter option exists in the Settings toolbars',
);
// ── The Package Manager read reports its own state, in its own places ────────
// Two reads back this lane and they are not interchangeable. The Tier instance
// collection (`tool`) backs the Tier Groups list; the Package Manager read backs
// `rateSheets`. Its loading state therefore belongs to the Rate Sheets section
// alone — attaching it to Tier Groups would report the wrong read's progress —
// while its error reports in the always-visible Settings-level error area, so a
// failed read is stated whether or not that collapsed section is expanded.
check(
  rateSheetsBlock.includes('loading={settingsLoading}')
    && !tierGroupsBlock.includes('settingsLoading')
    && !familyGroupsBlock.includes('settingsLoading'),
  'the Package Manager read\'s loading state shows only on the content it actually backs',
);
check(
  settingsSource.includes('{settingsError && <p class="cz-station-empty" role="alert">{settingsError}</p>}')
    && settingsSource.includes('{tool.error && <p class="cz-station-empty" role="alert">{tool.error}</p>}'),
  'the Package Manager read\'s error is visible in the Settings-level error area, beside the Tier pool\'s own',
);
// Tier Groups keeps reading the Tier collection's own load state, not the
// Package Manager read's.
check(
  tierGroupsBlock.includes('loading={tool.loading}'),
  'the Tier Groups list reports the Tier instance collection\'s own loading state',
);
// Re-surfacing the read's state restored no dispatcher: the Tier Group row still
// travels the shared connection dispatcher, and the old instance-only prop and
// its Rate Sheet Access row stay retired.
check(
  !settingsSource.includes('onInstanceIntent')
    && !settingsSource.includes('RateSheetAccessSummary'),
  'the retired instance-only dispatcher and Rate Sheet Access row are not restored',
);

// The summary counts the same pool the list presents, so "in pool" can never
// report records the rows below it exclude.
check(
  tierGroupsBlock.includes('${presentableInstances.length} in pool')
    && settingsSource.includes("presentableInstances.filter((instance) => instance.status === 'active').length"),
  'the Tier Groups summary counts the presented pool, not the stored one',
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
  tierGroupsBlock.includes('summary: `${activeTierGroups} active · ${presentableInstances.length} in pool`'),
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
  !tierGroupsBlock.includes('RateSheetAccessSummary'),
  'the Tier Groups list no longer renders the retired child Rate Sheet Access row',
);
check(
  tierGroupsBlock.includes('onIntent={onConnectionIntent}')
    && tierGroupsBlock.includes("onPoolIntent('tier')"),
  'Tier Groups opens the parent system through the shared connection dispatcher and launches the Tier pool creation',
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
    && connectionRowSource.includes('<span class={`cz-module-status-pill ${meta.cls}`}>{meta.label}</span>')
    && connectionRowSource.includes('const meta = connectionStatus(row.status);'),
  'the Tier Group row renders its title, Platform ID and lifecycle pill through the shared row, not a bespoke layout',
);

// ── One pill, owned by the Presentation Status Contract ──────────────────────
// presentation.ts is the single place a status maps to a label and class. This
// file previously kept its own token map and derived the label by un-hyphenating
// the status, which printed the resolver's internal keys as "Pending dim" and
// "Pending full" — the dim/full split is an opacity flavour, not a state. The
// contract collapses both to Pending, so no row may name either.
check(
  connectionRowSource.includes("from '@/drawer-kit/schema/presentation'")
    && connectionRowSource.includes('PILL_META[status]')
    && !connectionRowSource.includes('CONNECTION_STATUS_TOKEN')
    && !/replace\(\/-\/g, ' '\)/.test(connectionRowSource),
  'the connected-record row delegates every status label and class to the Presentation Status Contract',
);
const workspacePresentationFiles = sourceFiles(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace',
)).filter((path) => /\.tsx?$/.test(path));
for (const dimFullLabel of ['Pending dim', 'Pending full', 'Pending-dim', 'Pending-full']) {
  check(
    !workspacePresentation.includes(dimFullLabel),
    `no workspace lane presents "${dimFullLabel}" as a status: dim/full is opacity, not a state name`,
  );
}
// One pill implementation across all three lanes — the deck's own pill class is
// retired, so Details, Connections and Settings cannot drift in size or shape.
check(
  workspacePresentationFiles.every((path) => !readFileSync(path, 'utf8').includes('cz-tier-deck__status')),
  'the retired cz-tier-deck__status pill is gone from every workspace lane',
);
const stationCss = readFileSync(resolve(root, 'resources/ts/admin-station/styles/admin-station.css'), 'utf8');
check(
  !/^\.cz-tier-deck__status/m.test(stationCss)
    && stationCss.includes('.cz-station-list__cell > .cz-module-status-pill'),
  'the retired pill\'s rules are deleted and only the shared pill\'s grid placement remains in the station sheet',
);

// ── The Tier Group row reports its registered occupants ──────────────────────
// Tiers and Add-ons are one occupant population split by selection mode, read as
// `4/1` in the same column position the other kinds use for their count — so the
// Family Group and Tier Group lists carry the same five cells and align exactly.
check(
  connectionRowSource.includes('<span class="cz-tier-deck__field-label">Tiers / Add-ons</span>')
    && connectionRowSource.includes('{row.tierCount}/{row.addonCount}'),
  'the Tier Group row reports Tiers/Add-ons in the shared count column',
);
// Registration is the fact counted, so no lifecycle status filters it, and the
// split reads the occupant's own stored selection mode rather than inferring it.
check(
  connectionNavigationSource.includes('.map((slot) => slot?.current_occupant ?? null)')
    && connectionNavigationSource.includes('occupant.is_addon === true')
    && connectionNavigationSource.includes('tierCount:  occupants.length - addonCount,')
    && !/current_occupant[\s\S]{0,200}platform_status/.test(connectionNavigationSource),
  'the Tiers/Add-ons split counts every registered occupant by its own selection mode, filtered by no status',
);
// Both list rows offer the same actions, so the shared split control renders the
// same shape in both — a single action would render a bare primary with no menu.
check(
  connectionNavigationSource.includes("actions:    ['view', 'edit'],")
    && /actions:\s+\['view', 'edit'\],/.test(connectionNavigationSource),
  'the Tier Group row offers the same view/edit actions the Family Group row does',
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
    && connectionNavigationSource.includes("target:     { kind: 'tier-instance', instanceId: instance.tier_instance_id },"),
  'a parent Tier Group row targets the system itself, not an occupant or slot',
);
check(
  workspaceSource.includes("if (target.kind === 'tier-instance') {")
    && workspaceSource.includes('dispatchTierInstanceIntent(target.instanceId, actionId);')
    && workspaceSource.includes('onIntent(encodeTierInstanceDrawerRecordId(targetInstanceId), actionId);')
    && workspaceSource.indexOf("target.kind === 'tier-instance'")
      < workspaceSource.indexOf('if (instanceId === null || selectedSlot === null) return;'),
  'the Tier Group target opens the existing whole-instance Tier drawer, carrying its action, before the slot-scoped guard',
);
// The row's Platform ID is the engine's shared scalar key, carried through
// output-only. Package owns storage and projection; the prefix vocabulary
// belongs to PlatformIdentifierPolicy, which `contract:platform-identity-schema`
// locks this file's `CZTG` reference against.
check(
  connectionNavigationSource.includes('platformId: instance.cz_platform_id,')
    && connectionNavigationSource.includes('(CZTG); empty when unassigned')
    && !connectionNavigationSource.includes('cz_platform_id ='),
  'the Tier Group row reads the engine\'s cz_platform_id output-only and mints no identity',
);
// `draft` is the parent system's Pending; the bin states keep their own names
// rather than being flattened into Disabled.
check(
  connectionNavigationSource.includes("export type TierGroupRowStatus = 'active' | 'pending' | 'disabled' | 'archived' | 'trashed'")
    && /draft:\s+'pending',/.test(connectionNavigationSource)
    && /disabled:\s+'disabled',/.test(connectionNavigationSource),
  'the Tier Group row maps the storage lifecycle onto the shared pill vocabulary',
);

// Rate Sheets lists standalone sheets through the shared connected-record row.
// Groups remain nested summaries and are authored only in the sheet editor.
const rateSheetsTitles = [...rateSheetsBlock.matchAll(/title: '([^']+)'/g)].map((match) => match[1]);
check(
  rateSheetsTitles.join(',') === 'Rate Sheets',
  'Rate Sheets holds one unlabelled pool section beneath its toolbar',
);
const rateSheetsLeaves = [...rateSheetsBlock.matchAll(/leaf: '([^']+)'/g)].map((match) => match[1]);
check(
  rateSheetsLeaves.length === 0,
  'Rate Sheets carries no redundant leaf heading',
);
check(
  /id: 'pool',\s*title: '',\s*description: '',\s*leaf: '',\s*hideHeading: true,/.test(rateSheetsBlock)
    && !rateSheetsBlock.includes("note: 'The Rate Sheet pool"),
  'Rate Sheets\' list section and group note carry no redundant heading text',
);
// Rate Sheets' toolbar matches Family Groups' and Tier Groups' exactly: one
// unified status filter (Focused/All/Active/Pending/Disabled, defaulting to
// All) plus the pool launcher — no separate search field or Tier Group
// context dropdown of its own.
check(
  rateSheetsBlock.includes("toolbar: (")
    && rateSheetsBlock.includes("value={rateSheetFilter}")
    && settingsSource.includes("useState<RateSheetFilter>('all')")
    && ['focused', 'all', 'active', 'pending', 'disabled'].every((id) => settingsSource.includes(`id: '${id}'`))
    && rateSheetsBlock.includes('+ Rate Sheet')
    && rateSheetsBlock.includes("onPoolIntent('rate-sheet')")
    && !rateSheetsBlock.includes('cz-tier-settings__search')
    && !rateSheetsBlock.includes('Tier Group context'),
  'Rate Sheets\' toolbar carries the All-default status filter and the + Rate Sheet action, matching Family Groups\' and Tier Groups\' single-control toolbar — no search field or separate Tier Group context dropdown',
);
check(
  !rateSheetsBlock.includes('onPoolIntent(\'groups\')')
    && settingsSource.includes('projectRateSheetPoolRows')
    && rateSheetsBlock.includes('<RateSheetPoolSummary rows={rateSheetRows}'),
  'standalone Rate Sheets use the shared row projection and Groups have no separate launcher',
);
// `Focused` reads the same canonical Tier Group access projection the Tier
// system's Rate Sheet Access module authors, so the two never disagree.
// `Active`/`Disabled` read the active-view presentation mapping; the model
// carries no persisted Pending state for a Rate Sheet, so `Pending` reports
// empty rather than inventing one.
check(
  settingsSource.includes("if (rateSheetFilter === 'focused') return projectRateSheetPoolRows(focusedRateSheets)")
    && settingsSource.includes("if (rateSheetFilter === 'pending') return [];")
    && settingsSource.includes('projectTierRateSheetAccess(focusedRateSheetInstance, rateSheets)')
    && settingsSource.includes("sheet.status === 'archived' ? 'disabled' : 'active'"),
  'Rate Sheets\' Focused filter reads the canonical Tier Group access projection, Pending reports empty rather than inventing a lifecycle state, and Active/Disabled read the active-view mapping',
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
    && settingsSource.includes('+ Family Group')
    && settingsSource.includes('+ Tier Group')
    && settingsSource.includes('+ Rate Sheet'),
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
