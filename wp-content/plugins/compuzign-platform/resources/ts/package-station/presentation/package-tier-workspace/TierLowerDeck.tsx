// Tier Workspace Engine — the focused-Tier lower deck.
//
// The deck beneath the engine, scoped to the ONE Package Family and Tier already
// selected in the engine above (it takes them as props and owns NO second
// selector). It presents that Tier through the mockup's three lanes:
//
//   Details      — the Tier's inclusion rows: Service-owned identity/category and
//                  Rate Sheet-derived pricing, filterable by search/category/status.
//   Connections  — what the focused Tier is connected TO, in two disclosures:
//                  Stations (the Package Family it is assigned to, and the Rate
//                  Sheet groups its selections draw from) and Tools (the Rate
//                  Sheet it binds). Each summary reports its own stored identity
//                  and opens the drawer that owns THAT record, never the Tier
//                  drawer.
//   Settings     — explicit Tier-system operations, the Package Manager tools,
//                  and Rate Sheet availability/current-use inventory.
//
// It is presentation-only: it receives derived workspace models plus intent
// dispatchers and fetches nothing.
//
// Four intent scopes, deliberately separate — a row dispatches the scope it
// actually addresses, and every one of them carries a stored id, never a label:
//   - Tier-scoped   (`onIntent`) — the focused Tier as a whole, keyed by the
//     focused occupant_id the orchestrator supplies. It is NOT used by the
//     Connections lane.
//   - Inclusion-scoped (`onInclusionIntent`) — a Details row addresses ONE
//     inclusion, so it forwards its own `item_id` (the Tier's Rate Sheet
//     selection key) and the orchestrator routes it to the registered
//     `tier-inclusion` drawer.
//   - Family-scoped (`onFamilyIntent`) — the Connections lane's Family Groups
//     subsection forwards the Package Family's own `group_id` to the mature
//     `package-family` drawer. It introduces no second Family editor.
//   - Connection-scoped (`onGroupIntent` / `onRateSheetIntent`) — a Groups row
//     forwards its `(rate_sheet_id, group_id)` and a Rate Sheets row its
//     `rate_sheet_id`; the orchestrator scopes both to the focused instance and
//     slot for the `tier-rate-sheet-group` / `tier-rate-sheet` drawers.
//
// All land inside the Package Station boundary that owns Tier selections,
// quantities, Family assignment and Rate Sheet connections. This deck still
// invents no drawer.

import { useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren, VNode } from 'preact';
import type {
  TierDeck,
  DeckInclusion,
  DeckRateSheetConnection,
  DeckRateSheetGroupConnection,
} from '../../surface/packageTierWorkspace/deck';
import type { PackageRateSheet, TierInstanceSummary } from '../../types';
import type { WorkspaceFamilyScope } from '../../surface/packageTierWorkspace/projection';
import type { TierInstancesToolState } from '../../surface/tierInstance/useTierInstances';
import type { TierRateSheetInventoryRow } from '../../surface/tierInstance/tierInstanceModel';
import { StationSplitAction } from '@/admin-station/presentation/StationSplitAction';
import {
  AppsIcon,
  PackagesIcon,
  RateSheetIcon,
  SearchIcon,
  ServicesIcon,
  TiersIcon,
} from '@/admin-station/shell/icons';
import { ConnectionDisclosure } from './ConnectionDisclosure';
import { TierSystemSettings } from './TierSystemSettings';

// ── SECTION: contract ─────────────────────────────────────────────────────────

interface Props {
  familyName: string;
  tierName:   string;
  deck:       TierDeck;
  activeTab:  DeckTab;
  hasFocusedTier: boolean;
  tierTool: TierInstancesToolState;
  family: WorkspaceFamilyScope | null;
  assignedInstance: TierInstanceSummary | null;
  workspaceInstance: TierInstanceSummary | null;
  rateSheets: PackageRateSheet[];
  rateSheetInventory: TierRateSheetInventoryRow[];
  settingsLoading: boolean;
  settingsError: string | null;
  // Dispatches a registered action id ('view' | 'edit') for the focused Tier. The
  // orchestrator binds it to the occupant_id, so this deck never handles identity.
  onIntent:   (actionId: string) => void;
  // Dispatches a registered action id for ONE inclusion the focused Tier
  // selects. `itemId` is the Tier's Rate Sheet selection key, carried straight
  // from the row; the orchestrator scopes it to the instance and slot.
  onInclusionIntent: (itemId: string, actionId: 'view' | 'edit') => void;
  // Dispatches a registered action id for the connected Package Family. The row
  // forwards the Family's own group_id; the orchestrator routes it to the mature
  // `package-family` drawer.
  onFamilyIntent: (familyId: string, actionId: 'view' | 'edit') => void;
  // Dispatches a registered action id for ONE Rate Sheet group the focused Tier
  // connects to, carrying the stored (rate_sheet_id, group_id) pair.
  onGroupIntent: (rateSheetId: string, groupId: string, actionId: 'view' | 'edit') => void;
  // Dispatches a registered action id for the Rate Sheet the focused Tier binds.
  onRateSheetIntent: (rateSheetId: string, actionId: 'view' | 'edit') => void;
  onToolIntent: (actionId: string) => void;
  onManageInstance: (instanceId: string) => void;
  onTierAction: (
    instanceId: string,
    slotId: string,
    occupantId: string | null,
    actionId: 'view' | 'edit',
  ) => void;
  onTabChange: (tab: DeckTab) => void;
}

export type DeckTab = 'details' | 'connections' | 'settings';

const TABS: { id: DeckTab; label: string }[] = [
  { id: 'details',     label: 'Details' },
  { id: 'connections', label: 'Connections' },
  { id: 'settings',    label: 'Settings' },
];

// The two honest inclusion states, from the selection's own resolution. Not the
// mockup's Active/Draft — a Tier selection has no draft lifecycle of its own.
const STATUS_META = {
  active:     { label: 'Active',     token: 'active' },
  unresolved: { label: 'Unresolved', token: 'pending' },
} as const;
type StatusToken = keyof typeof STATUS_META;

function inclusionStatus(inclusion: DeckInclusion): StatusToken {
  return inclusion.resolved ? 'active' : 'unresolved';
}

// A connected record's own stored status, mapped onto the deck's pill tokens.
// Every value here is one a Package Station record actually stores; nothing is
// derived and nothing is invented for a record that stores no status.
const CONNECTION_STATUS_TOKEN: Record<string, string> = {
  active:         'active',
  archived:       'inactive',
  disabled:       'inactive',
  'pending-dim':  'pending',
  'pending-full': 'pending',
};

function connectionStatus(status: string): { label: string; token: string } {
  return {
    label: status.replace(/-/g, ' ').replace(/^./, (first) => first.toUpperCase()),
    token: CONNECTION_STATUS_TOKEN[status] ?? 'pending',
  };
}

function money(value: number | null): string {
  return value == null ? '—' : `$${value.toFixed(2)}`;
}

const ROW_ACTIONS = [
  { id: 'view', label: 'View' },
  { id: 'edit', label: 'Edit' },
];

const DISABLED_ROW_ACTIONS = ROW_ACTIONS.map((action) => ({ ...action, disabled: true }));

// ── SECTION: shell ────────────────────────────────────────────────────────────

export function TierLowerDeck({
  familyName,
  tierName,
  deck,
  activeTab,
  hasFocusedTier,
  tierTool,
  family,
  assignedInstance,
  workspaceInstance,
  rateSheets,
  rateSheetInventory,
  settingsLoading,
  settingsError,
  onIntent,
  onInclusionIntent,
  onFamilyIntent,
  onGroupIntent,
  onRateSheetIntent,
  onToolIntent,
  onManageInstance,
  onTierAction,
  onTabChange,
}: Props): VNode {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow/Home/End move focus and selection together — the WAI-ARIA tab pattern,
  // the same interaction the engine's own tab strip uses.
  const onTabKeyDown = (event: KeyboardEvent, index: number) => {
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    if (next !== null) {
      event.preventDefault();
      onTabChange(TABS[next].id);
      tabRefs.current[next]?.focus();
    }
  };

  return (
    <section class="cz-tier-deck" aria-label={`${tierName} lower deck`}>
      <div class="cz-tier-deck__bar">
        <div class="cz-tier-deck__context">
          <span class="cz-tier-deck__context-icon" aria-hidden="true"><TiersIcon /></span>
          <div>
            <h3 class="cz-tier-deck__context-name">{tierName}</h3>
            <p class="cz-tier-deck__context-scope">
              {workspaceInstance ? `Focused from ${familyName}` : `Setting up ${familyName}`}
            </p>
          </div>
        </div>
        <span class="cz-tier-deck__scope-note">
          {hasFocusedTier
            ? 'Auto-scoped from the Tier Engine'
            : workspaceInstance
              ? 'No focused Tier'
              : 'No Tier system assigned'}
        </span>
      </div>

      <div class="cz-tier-deck__tabs" role="tablist" aria-label="Focused Tier sections">
        {TABS.map((entry, index) => {
          const selected = activeTab === entry.id;
          return (
            <button
              key={entry.id}
              ref={(el) => { tabRefs.current[index] = el; }}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              class={`cz-tier-deck__tab${selected ? ' cz-tier-deck__tab--active' : ''}`}
              onClick={() => onTabChange(entry.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      <div class="cz-tier-deck__panel" role="tabpanel">
        {activeTab === 'details' && (
          <DetailsLane deck={deck} hasFocusedTier={hasFocusedTier} onInclusionIntent={onInclusionIntent} />
        )}
        {activeTab === 'connections' && (
          <ConnectionsLane
            family={family}
            groups={deck.groups}
            rateSheet={deck.rateSheet}
            hasFocusedTier={hasFocusedTier}
            onFamilyIntent={onFamilyIntent}
            onGroupIntent={onGroupIntent}
            onRateSheetIntent={onRateSheetIntent}
          />
        )}
        {activeTab === 'settings' && (
          <TierSystemSettings
            tool={tierTool}
            family={family}
            assignedInstance={assignedInstance}
            workspaceInstance={workspaceInstance}
            rateSheets={rateSheets}
            inventory={rateSheetInventory}
            loading={settingsLoading}
            error={settingsError}
            onToolIntent={onToolIntent}
            onManageInstance={onManageInstance}
            onTierAction={onTierAction}
          />
        )}
      </div>
    </section>
  );
}

// ── SECTION: Details lane ─────────────────────────────────────────────────────

function DetailsLane({
  deck,
  hasFocusedTier,
  onInclusionIntent,
}: {
  deck: TierDeck;
  hasFocusedTier: boolean;
  onInclusionIntent: (itemId: string, actionId: 'view' | 'edit') => void;
}): VNode {
  const [query, setQuery]       = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus]     = useState('');

  // The status options are only those the loaded rows actually present.
  const statuses = useMemo(() => {
    const present = new Set(deck.inclusions.map((inclusion) => inclusionStatus(inclusion)));
    return (['active', 'unresolved'] as StatusToken[]).filter((token) => present.has(token));
  }, [deck.inclusions]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return deck.inclusions.filter((inclusion) => {
      const haystack = `${inclusion.name} ${inclusion.sourceId ?? ''} ${inclusion.itemId}`.toLowerCase();
      return (
        (!needle || haystack.includes(needle)) &&
        (!category || inclusion.categories.includes(category)) &&
        (!status || inclusionStatus(inclusion) === status)
      );
    });
  }, [deck.inclusions, query, category, status]);

  return (
    <>
      <div class="cz-tier-deck__lane-head">
        <div>
          <h4 class="cz-tier-deck__lane-title">Focused inclusions</h4>
          <p class="cz-tier-deck__lane-note">
            Inclusions this Tier selects, resolved from Service identity and priced from the Rate Sheet rows it uses.
          </p>
        </div>
      </div>

      {hasFocusedTier && <div class="cz-tier-deck__toolbar">
        <span class="cz-tier-deck__search">
          <SearchIcon class="cz-tier-deck__search-icon" />
          <input
            class="cz-tier-deck__control cz-tier-deck__control--search"
            type="search"
            placeholder="Search focused inclusions…"
            value={query}
            aria-label="Search focused inclusions"
            onInput={(event) => setQuery((event.currentTarget as HTMLInputElement).value)}
          />
        </span>
        <select
          class="cz-tier-deck__control"
          value={category}
          aria-label="Filter by category"
          disabled={deck.categories.length === 0}
          onChange={(event) => setCategory((event.currentTarget as HTMLSelectElement).value)}
        >
          <option value="">All categories</option>
          {deck.categories.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
        </select>
        <select
          class="cz-tier-deck__control"
          value={status}
          aria-label="Filter by status"
          disabled={statuses.length === 0}
          onChange={(event) => setStatus((event.currentTarget as HTMLSelectElement).value)}
        >
          <option value="">All statuses</option>
          {statuses.map((token) => <option key={token} value={token}>{STATUS_META[token].label}</option>)}
        </select>
      </div>}

      {!hasFocusedTier ? (
        <p class="cz-station-empty">Focus a configured Tier to see its inclusions. Tier setup remains available in Settings.</p>
      ) : deck.inclusions.length === 0 ? (
        <p class="cz-station-empty">This Tier selects no inclusions.</p>
      ) : rows.length === 0 ? (
        <p class="cz-station-empty">No focused inclusions match these filters.</p>
      ) : (
        <ul class="cz-tier-deck__list">
          {rows.map((inclusion) => (
            <InclusionRow
              key={inclusion.itemId}
              inclusion={inclusion}
              onInclusionIntent={onInclusionIntent}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function InclusionRow({ inclusion, onInclusionIntent }: {
  inclusion: DeckInclusion;
  onInclusionIntent: (itemId: string, actionId: 'view' | 'edit') => void;
}): VNode {
  const meta = STATUS_META[inclusionStatus(inclusion)];
  const priceLine = inclusion.resolved
    ? `${money(inclusion.lineTotal)}${inclusion.per ? ` · ${inclusion.per}` : ''}`
    : 'Pricing unavailable';

  return (
    <li class="cz-tier-deck__row">
      <div class="cz-tier-deck__identity">
        <span class="cz-tier-deck__identity-icon" aria-hidden="true"><PackagesIcon /></span>
        <div class="cz-tier-deck__identity-copy">
          <strong class="cz-tier-deck__identity-name">{inclusion.name}</strong>
          <small class="cz-tier-deck__identity-ref">{inclusion.sourceId ?? inclusion.itemId}</small>
        </div>
      </div>
      <div class="cz-tier-deck__field">
        <span class="cz-tier-deck__field-label">Category</span>
        {inclusion.categories.length > 0 ? inclusion.categories.join(' · ') : '—'}
      </div>
      <div class="cz-tier-deck__field">
        <span class="cz-tier-deck__field-label">Price</span>
        <span class="cz-tier-deck__money">{priceLine}</span>
      </div>
      <div class="cz-tier-deck__field cz-tier-deck__field--hide-sm">
        <span class="cz-tier-deck__field-label">Quantity</span>
        {inclusion.quantity}
      </div>
      <span class="cz-tier-deck__status" data-status={meta.token}>{meta.label}</span>
      <div class="cz-tier-deck__row-actions">
        {/* The row closes over its OWN selection key, so the dispatched intent
            addresses this inclusion rather than the focused Tier. */}
        <StationSplitAction
          actions={ROW_ACTIONS}
          controlLabel={inclusion.name}
          onAction={(actionId) => onInclusionIntent(inclusion.itemId, actionId as 'view' | 'edit')}
        />
      </div>
    </li>
  );
}

// ── SECTION: Connections lane ─────────────────────────────────────────────────

/**
 * What the focused Tier is connected TO, grouped by which side of the platform
 * owns the connected record:
 *
 *   Stations — the Package Family the Tier's instance is assigned to (Family
 *              Groups) and the Rate Sheet groups its selections draw from
 *              (Groups). Both are Package Station records.
 *   Tools    — the Rate Sheet the Tier binds, the authoring tool it prices from.
 *
 * The two are top-level disclosures; the connected records are named subsections
 * inside them, never siblings of them. Every row still reports the record's own
 * stored identity and status and opens the drawer that owns that record. No
 * action opens the Tier drawer, and the disclosures hold presentation state only.
 */
function ConnectionsLane({
  family,
  groups,
  rateSheet,
  hasFocusedTier,
  onFamilyIntent,
  onGroupIntent,
  onRateSheetIntent,
}: {
  family:    WorkspaceFamilyScope | null;
  groups:    DeckRateSheetGroupConnection[];
  rateSheet: DeckRateSheetConnection | null;
  hasFocusedTier: boolean;
  onFamilyIntent:    (familyId: string, actionId: 'view' | 'edit') => void;
  onGroupIntent:     (rateSheetId: string, groupId: string, actionId: 'view' | 'edit') => void;
  onRateSheetIntent: (rateSheetId: string, actionId: 'view' | 'edit') => void;
}): VNode {
  // Header summaries report only what the loaded records actually resolve. The
  // group and Rate Sheet connections are only knowable once a Tier is focused,
  // so with no focused Tier they are omitted rather than reported as zero.
  const stationsSummary = [
    family === null ? 'No Family' : '1 Family',
    hasFocusedTier ? `${groups.length} ${groups.length === 1 ? 'group' : 'groups'}` : null,
  ].filter((part): part is string => part !== null).join(' · ');

  const toolsSummary = !hasFocusedTier
    ? null
    : rateSheet === null ? 'No Rate Sheet' : '1 Rate Sheet';

  return (
    <div class="cz-tier-deck__connections">
      <ConnectionDisclosure
        icon={<PackagesIcon />}
        title="Stations"
        description="Package Station records this Tier is connected to — the Family its system is assigned to, and the Rate Sheet groups its selections draw from."
        summary={stationsSummary}
        defaultOpen
      >
        <ConnectionSection
          title="Family Groups"
          note="The Package Family this Tier system is assigned to, resolved through the assignment ledger. View and Edit open the Package Family drawer."
        >
          {family === null ? (
            <NotConfiguredRow
              label="No Package Family"
              copy="This Tier instance is being operated directly and is assigned to no Family."
            />
          ) : (
            <ul class="cz-tier-deck__list">
              <li class="cz-tier-deck__row cz-tier-deck__row--connection">
                <ConnectionIdentity icon={<ServicesIcon />} name={family.name} reference={family.id} />
                <div class="cz-tier-deck__field">
                  <span class="cz-tier-deck__field-label">Summary</span>
                  {family.description.trim() || '—'}
                </div>
                <div class="cz-tier-deck__field">
                  <span class="cz-tier-deck__field-label">Assigned Services</span>
                  <span class="cz-tier-deck__money">{family.dependents.services}</span>
                </div>
                <ConnectionStatus status={family.status} />
                <div class="cz-tier-deck__row-actions">
                  <StationSplitAction
                    actions={ROW_ACTIONS}
                    controlLabel={family.name}
                    onAction={(actionId) => onFamilyIntent(family.id, actionId as 'view' | 'edit')}
                  />
                </div>
              </li>
            </ul>
          )}
        </ConnectionSection>

        <ConnectionSection
          title="Groups"
          note="Rate Sheet groups this Tier draws priced rows from. View and Edit open that group scoped to this Tier."
        >
          {!hasFocusedTier ? (
            <p class="cz-station-empty">Focus a configured Tier to see the groups it connects to.</p>
          ) : groups.length === 0 ? (
            <NotConfiguredRow
              label="No connected group"
              copy="This Tier draws no resolving row from a group its Rate Sheet stores."
            />
          ) : (
            <ul class="cz-tier-deck__list">
              {groups.map((group) => (
                <li key={group.groupId} class="cz-tier-deck__row cz-tier-deck__row--connection">
                  <ConnectionIdentity icon={<RateSheetIcon />} name={group.title} reference={group.groupId} />
                  <div class="cz-tier-deck__field">
                    <span class="cz-tier-deck__field-label">Connected rows</span>
                    <span class="cz-tier-deck__money">{group.connectedRows}</span>
                  </div>
                  <div class="cz-tier-deck__field cz-tier-deck__field--hide-sm">
                    <span class="cz-tier-deck__field-label">Coverage</span>
                    {group.coverage} selected
                  </div>
                  <ConnectionStatus status={group.status} />
                  <div class="cz-tier-deck__row-actions">
                    <StationSplitAction
                      actions={ROW_ACTIONS}
                      controlLabel={group.title}
                      onAction={(actionId) => onGroupIntent(group.rateSheetId, group.groupId, actionId as 'view' | 'edit')}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ConnectionSection>
      </ConnectionDisclosure>

      <ConnectionDisclosure
        icon={<AppsIcon />}
        title="Tools"
        description="The authoring tools this Tier prices from. Sheet availability across the Tier system stays in Settings."
        summary={toolsSummary}
      >
        <ConnectionSection
          title="Rate Sheets"
          note="The Rate Sheet this Tier binds. View and Edit open its pricing grid filtered to this Tier's connected inclusions."
        >
          {!hasFocusedTier ? (
            <p class="cz-station-empty">Focus a configured Tier to see the Rate Sheet it binds. Sheet availability stays in Settings.</p>
          ) : rateSheet === null ? (
            <NotConfiguredRow
              label="No Rate Sheet bound"
              copy="This Tier binds no Rate Sheet, so it prices nothing. Bind one from the Tier drawer."
            />
          ) : (
            <ul class="cz-tier-deck__list">
              <li class="cz-tier-deck__row cz-tier-deck__row--connection">
                <ConnectionIdentity icon={<RateSheetIcon />} name={rateSheet.title} reference={rateSheet.rateSheetId} />
                <div class="cz-tier-deck__field">
                  <span class="cz-tier-deck__field-label">Connected inclusions</span>
                  <span class="cz-tier-deck__money">{rateSheet.connectedInclusions}</span>
                </div>
                <div class="cz-tier-deck__field cz-tier-deck__field--hide-sm">
                  <span class="cz-tier-deck__field-label">Connected rows</span>
                  {rateSheet.connectedRows}
                </div>
                <ConnectionStatus status={rateSheet.status} />
                <div class="cz-tier-deck__row-actions">
                  <StationSplitAction
                    actions={ROW_ACTIONS}
                    controlLabel={rateSheet.title}
                    onAction={(actionId) => onRateSheetIntent(rateSheet.rateSheetId, actionId as 'view' | 'edit')}
                  />
                </div>
              </li>
            </ul>
          )}
        </ConnectionSection>
      </ConnectionDisclosure>
    </div>
  );
}

/**
 * One connected record type inside a disclosure: a named subsection, not a
 * second accordion. Its heading is an `h5` under the disclosure's own `h4`, so
 * the outline reports the nesting the layout shows, and it carries no
 * `aria-label` of its own — the disclosure panel is already the named region,
 * and a nested landmark here would only repeat it.
 */
function ConnectionSection({
  title, note, children,
}: {
  title: string;
  note:  string;
  children: ComponentChildren;
}): VNode {
  return (
    <section class="cz-tier-deck__connection-section">
      <div class="cz-tier-deck__lane-head">
        <div>
          <h5 class="cz-tier-deck__lane-title">{title}</h5>
          <p class="cz-tier-deck__lane-note">{note}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ConnectionIdentity({ icon, name, reference }: {
  icon: VNode;
  name: string;
  reference: string;
}): VNode {
  return (
    <div class="cz-tier-deck__identity">
      <span class="cz-tier-deck__identity-icon" aria-hidden="true">{icon}</span>
      <div class="cz-tier-deck__identity-copy">
        <strong class="cz-tier-deck__identity-name">{name}</strong>
        <small class="cz-tier-deck__identity-ref">{reference}</small>
      </div>
    </div>
  );
}

function ConnectionStatus({ status }: { status: string }): VNode {
  const meta = connectionStatus(status);
  return <span class="cz-tier-deck__status" data-status={meta.token}>{meta.label}</span>;
}

/**
 * A connection that does not exist. It keeps the row shape so the section reads
 * as a summary rather than as an error, and it offers the actions as disabled
 * rather than omitting them — there is nothing to open, and nothing is invented
 * to open instead.
 */
function NotConfiguredRow({ label, copy }: { label: string; copy: string }): VNode {
  return (
    <ul class="cz-tier-deck__list">
      <li class="cz-tier-deck__row cz-tier-deck__row--connection cz-tier-deck__row--empty">
        <ConnectionIdentity icon={<PackagesIcon />} name={label} reference="—" />
        <div class="cz-tier-deck__field cz-tier-deck__field--wide">
          <span class="cz-tier-deck__field-label">Connection</span>
          {copy}
        </div>
        <span class="cz-tier-deck__status" data-status="inactive">Not configured</span>
        <div class="cz-tier-deck__row-actions">
          <StationSplitAction
            actions={DISABLED_ROW_ACTIONS}
            controlLabel={label}
            onAction={() => undefined}
          />
        </div>
      </li>
    </ul>
  );
}
