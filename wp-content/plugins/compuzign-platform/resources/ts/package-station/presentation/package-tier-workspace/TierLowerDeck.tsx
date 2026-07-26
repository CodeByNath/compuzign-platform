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
//   Settings     — the focused Tier system's own Rate Sheet access and its five
//                  fixed slots. It wires no relationship and launches no other
//                  tool.
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

import { useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type {
  TierDeck,
  DeckInclusion,
} from '../../surface/packageTierWorkspace/deck';
import type { PackageRateSheet, TierInstanceSummary } from '../../types';
import type {
  ConnectionNavigationCategory,
  ConnectionTarget,
} from '../../surface/packageTierWorkspace/connectionNavigation';
import type { TierInstancesToolState } from '../../surface/tierInstance/useTierInstances';
import type { PoolSubject } from './TierSystemSettings';
import { StationSplitAction } from '@/admin-station/presentation/StationSplitAction';
import {
  PackagesIcon,
  SearchIcon,
  TiersIcon,
} from '@/admin-station/shell/icons';
import { TierSystemSettings } from './TierSystemSettings';
import { TierConnections } from './TierConnections';
import { TierTabSet } from './TierTabSet';
import { TierDeckRowIdentity } from './TierDeckRowIdentity';

// ── SECTION: contract ─────────────────────────────────────────────────────────

interface Props {
  familyName: string;
  tierName:   string;
  deck:       TierDeck;
  connectionNavigation: ConnectionNavigationCategory[];
  activeTab:  DeckTab;
  hasFocusedTier: boolean;
  connectionScopeKey: string;
  tierTool: TierInstancesToolState;
  workspaceInstance: TierInstanceSummary | null;
  rateSheets: PackageRateSheet[];
  settingsLoading: boolean;
  settingsError: string | null;
  // Dispatches a registered action id for ONE inclusion the focused Tier
  // selects. `itemId` is the Tier's Rate Sheet selection key, carried straight
  // from the row; the orchestrator scopes it to the instance and slot.
  onInclusionIntent: (itemId: string, actionId: 'view' | 'edit') => void;
  // Dispatches a registered action id for the connected Package Family. The row
  // forwards the Family's own group_id; the orchestrator routes it to the mature
  // `package-family` drawer.
  onConnectionIntent: (target: ConnectionTarget, actionId: 'view' | 'edit') => void;
  onTierAction: (
    instanceId: string,
    slotId: string,
    occupantId: string | null,
    actionId: 'view' | 'edit',
  ) => void;
  // Opens the drawer that owns one pool subject's creation. The Settings lane
  // launches; it never carries the record, so no identity crosses this deck.
  onPoolIntent: (subject: PoolSubject) => void;
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
  connectionNavigation,
  activeTab,
  hasFocusedTier,
  connectionScopeKey,
  tierTool,
  workspaceInstance,
  rateSheets,
  settingsLoading,
  settingsError,
  onInclusionIntent,
  onConnectionIntent,
  onTierAction,
  onPoolIntent,
  onTabChange,
}: Props): VNode {
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

      <TierTabSet
        label="Focused Tier sections"
        items={TABS}
        selectedId={activeTab}
        onSelect={onTabChange}
        variant="deck"
        renderPanel={(tabId) => {
          if (tabId === 'details') {
            return <DetailsLane deck={deck} hasFocusedTier={hasFocusedTier} onInclusionIntent={onInclusionIntent} />;
          }
          if (tabId === 'connections') {
            return (
              <TierConnections
                key={connectionScopeKey}
                navigation={connectionNavigation}
                onIntent={onConnectionIntent}
              />
            );
          }
          return (
            <TierSystemSettings
              tool={tierTool}
              workspaceInstance={workspaceInstance}
              rateSheets={rateSheets}
              loading={settingsLoading}
              error={settingsError}
              onTierAction={onTierAction}
              onPoolIntent={onPoolIntent}
            />
          );
        }}
      />
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
            class="cz-tf-control cz-tf-input cz-tier-deck__control--search"
            type="search"
            placeholder="Search focused inclusions…"
            value={query}
            aria-label="Search focused inclusions"
            onInput={(event) => setQuery((event.currentTarget as HTMLInputElement).value)}
          />
        </span>
        <select
          class="cz-tf-control cz-tf-select"
          value={category}
          aria-label="Filter by category"
          disabled={deck.categories.length === 0}
          onChange={(event) => setCategory((event.currentTarget as HTMLSelectElement).value)}
        >
          <option value="">All categories</option>
          {deck.categories.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
        </select>
        <select
          class="cz-tf-control cz-tf-select"
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
      <TierDeckRowIdentity
        icon={<PackagesIcon />}
        name={inclusion.name}
        reference={inclusion.sourceId ?? inclusion.itemId}
      />
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
