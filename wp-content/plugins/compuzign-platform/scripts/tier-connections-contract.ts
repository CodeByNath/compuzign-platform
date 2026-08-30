// Contract: the Connections lane (TierConnections.tsx, TierConnectionRow.tsx,
// TierAccordionSection.tsx, TierTabSet.tsx) — what the focused Tier is
// connected TO, and the routing/drawer addressing that backs it. Split out of
// package-tier-workspace-contract.ts, which had grown into a god file spanning
// unrelated subsystems; see that file's header for the current responsibility
// map.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  decodeTierRateSheetDrawerRecordId,
  encodeTierRateSheetDrawerRecordId,
  encodeTierRateSheetGroupDrawerRecordId,
} from '../resources/ts/package-station/drawer/tier-rate-sheet/tierRateSheetDrawerTypes';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier Connections contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');

const settingsSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx',
), 'utf8');
const focusedSectionsSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/FocusedTierSettings.tsx',
), 'utf8');
const connectionNavigationSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/surface/packageTierWorkspace/connectionNavigation.ts',
), 'utf8');
const adminStationStyles = readFileSync(resolve(
  root,
  'resources/ts/admin-station/styles/admin-station.css',
), 'utf8');

// ── Connections routing tokens ────────────────────────────────────────────────
// Every Connections action addresses its target by the identities Package
// Station stores, and a malformed address resolves to nothing rather than to a
// default instance, slot, or sheet.
const sheetToken = encodeTierRateSheetDrawerRecordId('ti_kairos', 'basic', 'rs_kairos');
const sheetTarget = decodeTierRateSheetDrawerRecordId(sheetToken);
check(
  sheetTarget !== null
    && sheetTarget.instanceId === 'ti_kairos'
    && sheetTarget.slotId === 'basic'
    && sheetTarget.rateSheetId === 'rs_kairos'
    && sheetTarget.scope.kind === 'sheet',
  'the Rate Sheet connection token round-trips instance, slot, and stored sheet id',
);
const groupToken = encodeTierRateSheetGroupDrawerRecordId('ti_kairos', 'premium', 'rs_kairos', 'rate_group_1');
const groupTarget = decodeTierRateSheetDrawerRecordId(groupToken);
check(
  groupTarget !== null
    && groupTarget.rateSheetId === 'rs_kairos'
    && groupTarget.scope.kind === 'group'
    && groupTarget.scope.groupId === 'rate_group_1',
  'the group connection token round-trips the stored group id inside its stored sheet',
);
check(
  decodeTierRateSheetDrawerRecordId(groupToken)?.scope.kind === 'group'
    && decodeTierRateSheetDrawerRecordId(sheetToken)?.scope.kind === 'sheet',
  'the group grammar is never mistaken for the sheet grammar',
);
for (const malformed of [
  'tier-rate-sheet:ti_kairos:not-a-slot:rs_kairos',
  'tier-rate-sheet:ti_kairos:basic:',
  'tier-rate-sheet:ti_kairos:basic:rs_kairos:extra',
  'tier-rate-sheet-group:ti_kairos:basic:rs_kairos',
  'tier-rate-sheet-group::basic:rs_kairos:rate_group_1',
  'occ_kairos_basic',
]) {
  check(
    decodeTierRateSheetDrawerRecordId(malformed) === null,
    `a malformed connection address resolves to nothing: ${malformed}`,
  );
}
// The Connections lane never re-opens the Tier drawer: every Connections intent
// declares its own drawer key, and none of them is `tier`.
const adminRegister = readFileSync(
  resolve(import.meta.dirname, '..', 'resources/ts/admin-station/register.ts'),
  'utf8',
);
for (const [intentId, templateKey] of [
  ['view-family', 'package-family'],
  ['edit-family', 'package-family'],
  ['view-connected-group', 'tier-rate-sheet-group'],
  ['edit-connected-group', 'tier-rate-sheet-group'],
  ['view-connected-rate-sheet', 'tier-rate-sheet'],
  ['edit-connected-rate-sheet', 'tier-rate-sheet'],
]) {
  const declaration = new RegExp(`id: '${intentId}'[^}]*drawerTemplateKey: '${templateKey}'`);
  check(
    declaration.test(adminRegister),
    `the ${intentId} Connections intent routes to the ${templateKey} drawer, never to the Tier drawer`,
  );
}
const packageRegister = readFileSync(
  resolve(import.meta.dirname, '..', 'resources/ts/package-station/register.ts'),
  'utf8',
);
check(
  !adminRegister.includes("drawerTemplateKey: 'tier-rate-sheet-access'")
    && !packageRegister.includes("key: 'tier-rate-sheet-access'"),
  'Rate Sheet access reuses the registered Tier drawer instead of adding a template or surface intent',
);
// ── Connections card / tab / row composition ────────────────────────────────────
const lowerDeckSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierLowerDeck.tsx',
), 'utf8');
const tabSetSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierTabSet.tsx',
), 'utf8');
// Tab behaviour and accessibility are the shared station primitive's; the
// Package file above keeps only the deck skin each variant wears.
const stationTabSetSource = readFileSync(resolve(
  root,
  'resources/ts/admin-station/presentation/StationTabSet.tsx',
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
check(
  lowerDeckSource.includes('<TierTabSet') && settingsSource.includes('<TierAccordionSection'),
  'the deck lanes render through the shared tab contract, and Settings renders its groups through the shared accordion section',
);
// Live defect (round 4): a Bundle-supplied row's null lineTotal rendered as
// the bare `money()` dash, reading as a missing/broken price rather than
// explaining the Bundle's own pricing provenance.
check(
  lowerDeckSource.includes("!inclusion.addressable")
    && lowerDeckSource.includes("'Included in bundle'"),
  'a Bundle-supplied (non-addressable) row\'s Price cell explains its provenance ("Included in bundle") rather than reading as a missing price',
);
check(
  tabSetSource.includes('<StationTabSet')
    && !/role="tab(list|panel)?"/.test(tabSetSource)
    && !tabSetSource.includes('event.key ==='),
  'the workspace tab contract delegates tab semantics and keyboard movement to the shared primitive',
);
check(
  stationTabSetSource.includes('role="tablist"')
    && stationTabSetSource.includes('role="tab"')
    && stationTabSetSource.includes('aria-selected={selected}')
    && stationTabSetSource.includes('aria-controls={panelId(item.id)}')
    && stationTabSetSource.includes('id={panelId(item.id)}')
    && stationTabSetSource.includes('role="tabpanel"')
    && stationTabSetSource.includes('aria-labelledby={tabId(item.id)}')
    && stationTabSetSource.includes('tabIndex={selected ? 0 : -1}')
    && stationTabSetSource.includes('hidden={item.id !== selectedId}'),
  'every workspace tab level has matching tab/panel ids and a roving tab stop',
);
check(
  stationTabSetSource.includes("event.key === 'ArrowLeft'")
    && stationTabSetSource.includes("event.key === 'ArrowUp'")
    && stationTabSetSource.includes("event.key === 'Home'")
    && stationTabSetSource.includes("event.key === 'End'")
    && stationTabSetSource.includes("'ArrowRight', 'ArrowDown'"),
  'the shared tab contract supports Arrow, Home, and End keyboard navigation',
);
// The deck skin stays Package-owned: the shared primitive must never name a
// Tier class. The retired nested/selector variants are gone from the skin
// entirely, not merely unused, now that Connections and Settings both render
// through TierAccordionSection instead.
check(
  !stationTabSetSource.includes('cz-tier-')
    && tabSetSource.includes('const DECK_CLASSES: StationTabSetClasses = {')
    && !tabSetSource.includes("selectors: {")
    && !tabSetSource.includes("nested: {")
    && !tabSetSource.includes('TierTabVariant'),
  'the shared tab primitive carries no Tier class, and the Package deck skin carries no retired selector/nested variant',
);
check(
  connectionsSource.includes('navigation: ConnectionNavigationCategory[]')
    && connectionsSource.includes('section.rows.length === 0')
    && connectionsSource.includes('{section.emptyState}')
    && connectionRowSource.includes('row.target'),
  'Connections renders the typed projection rows and honest empty state, then dispatches the canonical target',
);
check(
  !connectionsSource.includes('projectConnectionNavigation')
    && !connectionsSource.includes('NotConfiguredRow')
    && !connectionsSource.includes('family: WorkspaceFamilyScope')
    && !connectionsSource.includes('groups: DeckRateSheetGroupConnection')
    && !connectionsSource.includes('rateSheet: DeckRateSheetConnection'),
  'Connections owns no domain derivation, raw domain collections, or placeholder entity rows',
);

// ── Connections: one continuous browser, not the retired card/tab layer ────────
// The Stations/Tools selector cards and their nested Family Groups/Groups/Rate
// Sheets tabs are gone from Connections: it renders the same rows through one
// filter bar and three ordered accordion sections instead. The authoritative
// projection still supplies every row — flattenConnectionSections only reshapes
// the existing category/tab arrays it already returns.
check(
  connectionsSource.includes('flattenConnectionSections(navigation)')
    && !connectionsSource.includes('<TierTabSet')
    && !connectionsSource.includes('variant="selectors"')
    && !connectionsSource.includes('variant="nested"')
    && !connectionsSource.includes('cz-tier-deck__selector')
    && !connectionsSource.includes('AppsIcon')
    && !connectionsSource.includes('PackagesIcon'),
  'Connections renders one continuous browser through the flattened three-section projection, never the retired Stations/Tools selector-card and nested-tab layer',
);
check(
  connectionNavigationSource.includes("export type ConnectionSectionId = 'family-group' | 'groups' | 'rate-sheet'")
    && connectionNavigationSource.includes('export function flattenConnectionSections')
    && connectionNavigationSource.indexOf("id: 'family-group'") < connectionNavigationSource.indexOf("id: 'groups'")
    && connectionNavigationSource.indexOf("id: 'groups'") < connectionNavigationSource.indexOf("id: 'rate-sheet'"),
  'the flattened three sections are exposed by the authoritative connection projection, always in the fixed Family Group, Groups, Rate Sheet order',
);
check(
  connectionsSource.includes("'family-group': true")
    && /groups:\s*false/.test(connectionsSource)
    && /'rate-sheet':\s*false/.test(connectionsSource),
  'Family Group starts open and Groups/Rate Sheet start collapsed',
);
check(
  connectionsSource.includes('placeholder="Search connections…"')
    && connectionsSource.includes('aria-label="Search connections"')
    && connectionsSource.includes("label: 'All connections'")
    && connectionsSource.includes("label: 'Family Group'")
    && connectionsSource.includes("label: 'Groups'")
    && connectionsSource.includes("label: 'Rate Sheet'")
    && connectionsSource.includes('aria-label="Filter by status"'),
  'the filter bar offers Search connections…, the Browse options in the required order, and a Status filter',
);
check(
  connectionsSource.includes('connectionStatus(row.status).label')
    && connectionRowSource.includes('export function connectionStatus'),
  'the Status dropdown is populated from the statuses present in the projected rows, reusing the one status label formatter rather than a second inventory',
);
// The accordion header/panel wiring lives once, in the shared
// TierAccordionSection both Connections and Settings render — not
// re-implemented per lane, and not decorative: a decorative-only accordion
// (one that rotates the chevron but always renders its rows) is the defect
// this guards against, so the collapsed state must gate the actual panel
// content, not only the chevron's CSS transform.
check(
  accordionSource.includes('aria-expanded={isOpen}')
    && accordionSource.includes('aria-controls={panelId}')
    && accordionSource.includes('id={panelId}')
    && accordionSource.includes('{isOpen && children}')
    && accordionSource.includes('hidden={!isOpen}'),
  'the shared accordion section is a real button with aria-expanded/aria-controls addressing a stable panel id, and a collapsed panel renders no children — not just a rotated chevron',
);
check(
  connectionsSource.includes('<TierAccordionSection')
    && connectionsSource.includes("import { TierAccordionSection } from './TierAccordionSection'")
    && !connectionsSource.includes('aria-expanded=')
    && settingsSource.includes('<TierAccordionSection')
    && !settingsSource.includes('aria-expanded='),
  'Connections and Settings each delegate to the shared accordion section rather than re-implementing its header/panel wiring',
);
check(
  /\.cz-tier-deck__accordion-panel\[hidden\]\s*\{[^}]*display:\s*none/s.test(adminStationStyles),
  'the accordion panel explicitly restates display: none under [hidden], since the base rule\'s display: flex sits at the same specificity as the UA hidden rule and would otherwise silently win',
);
check(
  !/\.cz-tier-deck__selector-/.test(adminStationStyles)
    && !adminStationStyles.includes('.cz-tier-deck__connection-panel')
    && !adminStationStyles.includes('.cz-tier-deck__tabs--nested')
    && !adminStationStyles.includes('.cz-tier-deck__tabpanel {'),
  'the retired selector-card, connection-panel, and nested-tab CSS is deleted rather than left dead beside the accordion system',
);
check(
  connectionsSource.includes('No connections match the current filters.'),
  'a section with source rows but no filter matches shows the local filtered-empty message, distinct from the authoritative source empty state it replaces only when filters exclude every row',
);
check(
  connectionRowSource.includes('StationSplitAction')
    && connectionRowSource.includes("view: 'View'")
    && connectionRowSource.includes('cz-station-list__row--connection')
    && connectionRowSource.includes('TierDeckRowIdentity'),
  'connection rows retain canonical identity, primary View, supported secondary actions, and Station split actions',
);
// Family Group, Group, and Rate Sheet connections no longer share one generic
// label/value layout: each gets its own field set built from the shared row
// shell, every one of them showing the owning record's own Platform ID.
check(
  connectionRowSource.includes('function FamilyGroupConnectionFields')
    && connectionRowSource.includes('function GroupConnectionFields')
    && connectionRowSource.includes('function RateSheetConnectionFields')
    && connectionRowSource.includes('function PlatformIdField'),
  'Family Group, Group, and Rate Sheet connections render their own column fields rather than one generic layout',
);
check(
  connectionRowSource.includes("<span class=\"cz-tier-deck__field-label\">Platform ID</span>")
    && connectionRowSource.includes("<span class=\"cz-tier-deck__field-label\">Services</span>")
    && connectionRowSource.includes("<span class=\"cz-tier-deck__field-label\">Inclusions</span>")
    && !connectionRowSource.includes('Assigned Services')
    && !connectionRowSource.includes('Connected inclusions')
    && !connectionRowSource.includes('Connected rows')
    && !connectionRowSource.includes('Coverage'),
  'the required Platform ID / Services / Inclusions columns replace the retired generic Assigned Services, Connected rows, and Coverage cells',
);
check(
  connectionRowSource.includes("const PLATFORM_ID_FALLBACK = 'Not assigned'")
    && connectionRowSource.includes('platformId || PLATFORM_ID_FALLBACK'),
  'a missing Platform ID renders the project\'s established "Not assigned" fallback, never an empty cell',
);
check(
  connectionRowSource.includes('row.assignedServices ?? 0')
    && connectionRowSource.includes('row.connectedInclusions ?? 0'),
  'missing Services/Inclusions counts render as 0, never blank or a dash',
);
// A connected record reads the same at both scopes, so exactly one component
// renders it. Neither lane may re-author those cells beside it.
check(
  connectionsSource.includes('<TierConnectionRow')
    && focusedSectionsSource.includes('<TierConnectionRow')
    && (connectionRowSource.match(/cz-station-list__row--connection/g) ?? []).length === 1,
  'the focused-Tier and whole-focus lanes render one connected-record row component',
);
// Settings keeps its own one-field Rate Sheet Access row — that record is not a
// connection — but neither lane re-authors the connected record's cells.
for (const [name, source] of [
  ['Connections', connectionsSource],
  ['Settings', focusedSectionsSource],
] as const) {
  for (const cell of ['Assigned Services', 'Connected inclusions', 'Connected rows']) {
    check(
      !source.includes(`>${cell}<`),
      `${name} re-authors none of the connected-record row cells (${cell})`,
    );
  }
}

const scopedDrawerSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/rate-sheet-tool/TierRateSheetDrawer.tsx',
), 'utf8');
check(
  scopedDrawerSource.includes('RateSheetGridRead') && scopedDrawerSource.includes('RateSheetGridEditor'),
  'the focused-Tier Rate Sheet drawer reuses the shared readable and editable grid',
);
check(
  !scopedDrawerSource.includes('RateSheetSheetEditor') && !scopedDrawerSource.includes('RateSheetCollectionEditor'),
  'the focused-Tier Rate Sheet drawer duplicates no Rate Sheet editor',
);
const sheetScopeBranch = scopedDrawerSource.slice(scopedDrawerSource.indexOf('// Rate Sheet scope:'));
check(
  !sheetScopeBranch.includes('RateSheetGroups'),
  'the Rate Sheet scope shows only the grid — the Groups section belongs to the group scope',
);


console.log('Tier Connections contract checks passed.');
