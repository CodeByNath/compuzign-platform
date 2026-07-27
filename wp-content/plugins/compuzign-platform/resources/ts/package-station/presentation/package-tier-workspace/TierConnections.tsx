// Tier Workspace Connections — compact category selectors, nested tabs, and
// canonical connected-record rows.
//
// The Package-owned surface projection supplies every category, summary, tab,
// row, status, empty state, action, and target. This component owns selection
// only; it fetches nothing, derives no relationship, encodes no route, and opens
// no drawer directly. Its rows are the shared connected-record row, so the
// whole-focus Settings lane presents the same record identically.

import { useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type {
  ConnectionActionId,
  ConnectionCategoryId,
  ConnectionNavigationCategory,
  ConnectionNavigationTab,
  ConnectionTabId,
  ConnectionTarget,
} from '../../surface/packageTierWorkspace/connectionNavigation';
import {
  AppsIcon,
  PackagesIcon,
} from '@/admin-station/shell/icons';
import { TierConnectionRow } from './TierConnectionRow';
import { TierTabSet } from './TierTabSet';

interface Props {
  navigation: ConnectionNavigationCategory[];
  onIntent: (target: ConnectionTarget, actionId: ConnectionActionId) => void;
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
        <ul class="cz-station-list">
          {tab.rows.map((row) => (
            <TierConnectionRow key={row.id} row={row} onIntent={onIntent} />
          ))}
        </ul>
      )}
    </section>
  );
}
