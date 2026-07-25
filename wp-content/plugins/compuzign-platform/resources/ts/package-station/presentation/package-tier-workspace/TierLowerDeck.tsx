// Tier Workspace Engine — the focused-Tier lower deck.
//
// The deck beneath the engine, scoped to the ONE Package Family and Tier already
// selected in the engine above (it takes them as props and owns NO second
// selector). It presents that Tier through the mockup's three lanes:
//
//   Details      — the Tier's inclusion rows: Service-owned identity/category and
//                  Rate Sheet-derived pricing, filterable by search/category/status.
//   Connections  — the Rate Sheet groups those selections draw from.
//   Settings     — explicit Tier-system operations, the Package Manager tools,
//                  and Rate Sheet availability/current-use inventory.
//
// It is presentation-only: it receives derived workspace models plus intent
// dispatchers and fetches nothing.
//
// Two intent scopes, deliberately separate:
//   - Tier-scoped   (`onIntent`) — the Connections lane and anything about the
//     focused Tier as a whole forwards to the registered `tier` drawer, keyed by
//     the focused occupant_id the orchestrator supplies.
//   - Inclusion-scoped (`onInclusionIntent`) — a Details row addresses ONE
//     inclusion, so it forwards its own `item_id` (the Tier's Rate Sheet
//     selection key) and the orchestrator routes it to the registered
//     `tier-inclusion` drawer. The row never resolves anything itself and never
//     passes a label as identity.
//
// Both land inside the Package Station boundary that owns Tier selections,
// quantities and Rate Sheet connections. This deck still invents no drawer.

import { useMemo, useRef, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { TierDeck, DeckInclusion, DeckRateSheetConnection } from '../../surface/packageTierWorkspace/deck';
import type { PackageRateSheet, TierInstanceSummary } from '../../types';
import type { WorkspaceFamilyScope } from '../../surface/packageTierWorkspace/projection';
import type { TierInstancesToolState } from '../../surface/tierInstance/useTierInstances';
import type { TierRateSheetInventoryRow } from '../../surface/tierInstance/tierInstanceModel';
import { StationSplitAction } from '@/admin-station/presentation/StationSplitAction';
import {
  PackagesIcon,
  RateSheetIcon,
  SearchIcon,
  TiersIcon,
} from '@/admin-station/shell/icons';
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

function money(value: number | null): string {
  return value == null ? '—' : `$${value.toFixed(2)}`;
}

const ROW_ACTIONS = [
  { id: 'view', label: 'View' },
  { id: 'edit', label: 'Edit' },
];

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
            connections={deck.rateSheets}
            familyName={familyName}
            hasFocusedTier={hasFocusedTier}
            onIntent={onIntent}
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

function ConnectionsLane({
  connections,
  familyName,
  hasFocusedTier,
  onIntent,
}: {
  connections: DeckRateSheetConnection[];
  familyName:  string;
  hasFocusedTier: boolean;
  onIntent:    (actionId: string) => void;
}): VNode {
  return (
    <>
      <div class="cz-tier-deck__lane-head">
        <div>
          <h4 class="cz-tier-deck__lane-title">Connected Rate Sheets</h4>
          <p class="cz-tier-deck__lane-note">
            Rate Sheet groups this Tier draws its priced rows from. Edit opens the Tier drawer, where Package Station owns the Rate Sheet selection.
          </p>
        </div>
      </div>

      {!hasFocusedTier ? (
        <p class="cz-station-empty">Focus a configured Tier to see its current connections. Available Rate Sheets and their users remain visible in Settings.</p>
      ) : connections.length === 0 ? (
        <p class="cz-station-empty">This Tier connects to no Rate Sheet rows.</p>
      ) : (
        <ul class="cz-tier-deck__list">
          {connections.map((connection) => (
            <li key={connection.groupId ?? '__ungrouped__'} class="cz-tier-deck__row cz-tier-deck__row--connection">
              <div class="cz-tier-deck__identity">
                <span class="cz-tier-deck__identity-icon" aria-hidden="true"><RateSheetIcon /></span>
                <div class="cz-tier-deck__identity-copy">
                  <strong class="cz-tier-deck__identity-name">{connection.title}</strong>
                  {connection.groupId && <small class="cz-tier-deck__identity-ref">{connection.groupId}</small>}
                </div>
              </div>
              <div class="cz-tier-deck__field">
                <span class="cz-tier-deck__field-label">Family</span>
                {familyName}
              </div>
              <div class="cz-tier-deck__field">
                <span class="cz-tier-deck__field-label">Connected rows</span>
                <span class="cz-tier-deck__money">{connection.connectedRows}</span>
              </div>
              <div class="cz-tier-deck__field cz-tier-deck__field--hide-sm">
                <span class="cz-tier-deck__field-label">Coverage</span>
                {connection.coverage} selected
              </div>
              <div class="cz-tier-deck__row-actions">
                <StationSplitAction actions={ROW_ACTIONS} controlLabel={connection.title} onAction={onIntent} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
