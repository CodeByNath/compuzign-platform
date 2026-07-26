// Tier Workspace Connections — compact category selectors, nested tabs, and
// canonical connected-record rows.
//
// The Package-owned surface projection supplies every category, summary, tab,
// row, status, empty state, action, and target. This component owns selection
// only; it fetches nothing, derives no relationship, encodes no route, and opens
// no drawer directly.

import { useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type {
  ConnectionActionId,
  ConnectionCategoryId,
  ConnectionNavigationCategory,
  ConnectionNavigationTab,
  ConnectionRow,
  ConnectionTabId,
  ConnectionTarget,
} from '../../surface/packageTierWorkspace/connectionNavigation';
import { StationSplitAction } from '@/admin-station/presentation/StationSplitAction';
import {
  AppsIcon,
  PackagesIcon,
  RateSheetIcon,
  ServicesIcon,
} from '@/admin-station/shell/icons';
import { TierDeckRowIdentity } from './TierDeckRowIdentity';
import { TierTabSet } from './TierTabSet';

interface Props {
  navigation: ConnectionNavigationCategory[];
  onIntent: (target: ConnectionTarget, actionId: ConnectionActionId) => void;
}

const ACTION_LABELS: Record<ConnectionActionId, string> = {
  view: 'View',
  edit: 'Edit',
};

const CONNECTION_STATUS_TOKEN: Record<string, string> = {
  active:         'active',
  archived:       'inactive',
  disabled:       'inactive',
  unresolved:     'pending',
  'pending-dim':  'pending',
  'pending-full': 'pending',
};

function connectionStatus(status: string): { label: string; token: string } {
  return {
    label: status.replace(/-/g, ' ').replace(/^./, (first) => first.toUpperCase()),
    token: CONNECTION_STATUS_TOKEN[status] ?? 'pending',
  };
}

export function TierConnections({ navigation, onIntent }: Props): VNode {
  const [selectedId, setSelectedId] = useState<ConnectionCategoryId>(navigation[0]?.id ?? 'stations');
  const [selectedTabs, setSelectedTabs] = useState<Record<ConnectionCategoryId, ConnectionTabId>>({
    stations: 'family-groups',
    tools:    'rate-sheets',
  });
  const selectedCategory = navigation.find((category) => category.id === selectedId) ?? navigation[0];

  return (
    <div class="cz-tier-deck__connections">
      <TierTabSet
        label="Connection categories"
        items={navigation.map((category) => ({
          id:      category.id,
          label:   category.title,
          summary: category.summary,
          icon:    category.id === 'stations' ? <PackagesIcon /> : <AppsIcon />,
        }))}
        selectedId={selectedCategory.id}
        onSelect={setSelectedId}
        variant="selectors"
        renderPanel={(categoryId) => {
          const category = navigation.find((entry) => entry.id === categoryId) ?? navigation[0];
          const requestedTab = selectedTabs[category.id];
          const selectedTab = category.tabs.find((tab) => tab.id === requestedTab) ?? category.tabs[0];
          return (
            <TierTabSet
              label={`${category.title} connections`}
              items={category.tabs}
              selectedId={selectedTab.id}
              onSelect={(tabId) => setSelectedTabs((current) => ({ ...current, [category.id]: tabId }))}
              variant="nested"
              renderPanel={(tabId) => {
                const tab = category.tabs.find((entry) => entry.id === tabId) ?? category.tabs[0];
                return <ConnectionTabContent tab={tab} onIntent={onIntent} />;
              }}
            />
          );
        }}
      />
    </div>
  );
}

function ConnectionTabContent({ tab, onIntent }: {
  tab: ConnectionNavigationTab;
  onIntent: (target: ConnectionTarget, actionId: ConnectionActionId) => void;
}): VNode {
  return (
    <section class="cz-tier-deck__connection-section">
      <div class="cz-tier-deck__lane-head">
        <div>
          <h4 class="cz-tier-deck__lane-title">{tab.title}</h4>
          <p class="cz-tier-deck__lane-note">{tab.description}</p>
        </div>
      </div>
      {tab.rows.length === 0 ? (
        <p class="cz-station-empty">{tab.emptyState}</p>
      ) : (
        <ul class="cz-tier-deck__list cz-tier-deck__list--compact">
          {tab.rows.map((row) => (
            <ConnectionRowView key={row.id} row={row} onIntent={onIntent} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ConnectionRowView({ row, onIntent }: {
  row: ConnectionRow;
  onIntent: (target: ConnectionTarget, actionId: ConnectionActionId) => void;
}): VNode {
  const icon = row.kind === 'family' ? <ServicesIcon /> : <RateSheetIcon />;
  const meta = connectionStatus(row.status);
  return (
    <li class="cz-tier-deck__row cz-tier-deck__row--connection cz-tier-deck__row--compact">
      <TierDeckRowIdentity icon={icon} name={row.name} reference={row.reference} compact />
      {row.kind === 'family' ? (
        <>
          <div class="cz-tier-deck__field">
            <span class="cz-tier-deck__field-label">Summary</span>
            {row.description || '—'}
          </div>
          <div class="cz-tier-deck__field cz-tier-deck__field--hide-sm">
            <span class="cz-tier-deck__field-label">Assigned Services</span>
            <span class="cz-tier-deck__money">{row.assignedServices}</span>
          </div>
        </>
      ) : row.kind === 'group' ? (
        <>
          <div class="cz-tier-deck__field">
            <span class="cz-tier-deck__field-label">Connected rows</span>
            <span class="cz-tier-deck__money">{row.connectedRows}</span>
          </div>
          <div class="cz-tier-deck__field cz-tier-deck__field--hide-sm">
            <span class="cz-tier-deck__field-label">Coverage</span>
            {row.coverage} selected
          </div>
        </>
      ) : (
        <>
          <div class="cz-tier-deck__field">
            <span class="cz-tier-deck__field-label">Connected inclusions</span>
            <span class="cz-tier-deck__money">{row.connectedInclusions}</span>
          </div>
          <div class="cz-tier-deck__field cz-tier-deck__field--hide-sm">
            <span class="cz-tier-deck__field-label">Connected rows</span>
            {row.connectedRows}
          </div>
        </>
      )}
      <span class="cz-tier-deck__status" data-status={meta.token}>{meta.label}</span>
      <div class="cz-tier-deck__row-actions">
        <StationSplitAction
          actions={row.actions.map((actionId) => ({ id: actionId, label: ACTION_LABELS[actionId] }))}
          controlLabel={row.name}
          onAction={(actionId) => onIntent(row.target, actionId as ConnectionActionId)}
        />
      </div>
    </li>
  );
}
