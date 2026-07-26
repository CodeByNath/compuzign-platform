// Tier Workspace Connections — compact category selectors and connected records.
//
// The pure Package-owned navigation projection supplies every category, summary,
// subsection, row, status, empty state, and drawer target. This presentation owns
// only the currently selected category. It does not fetch, infer relationships,
// encode routes, or open a drawer directly.

import { useMemo, useState } from 'preact/hooks';
import type { ComponentChildren, VNode } from 'preact';
import type {
  DeckRateSheetConnection,
  DeckRateSheetGroupConnection,
} from '../../surface/packageTierWorkspace/deck';
import {
  projectConnectionNavigation,
  type ConnectionCategoryId,
  type ConnectionTabId,
} from '../../surface/packageTierWorkspace/connectionNavigation';
import type { WorkspaceFamilyScope } from '../../surface/packageTierWorkspace/projection';
import { StationSplitAction } from '@/admin-station/presentation/StationSplitAction';
import {
  AppsIcon,
  PackagesIcon,
  RateSheetIcon,
  ServicesIcon,
} from '@/admin-station/shell/icons';
import { TierTabSet } from './TierTabSet';

interface Props {
  family:    WorkspaceFamilyScope | null;
  groups:    DeckRateSheetGroupConnection[];
  rateSheet: DeckRateSheetConnection | null;
  hasFocusedTier: boolean;
  onFamilyIntent:    (familyId: string, actionId: 'view' | 'edit') => void;
  onGroupIntent:     (rateSheetId: string, groupId: string, actionId: 'view' | 'edit') => void;
  onRateSheetIntent: (rateSheetId: string, actionId: 'view' | 'edit') => void;
}

const ROW_ACTIONS = [
  { id: 'view', label: 'View' },
  { id: 'edit', label: 'Edit' },
];

const DISABLED_ROW_ACTIONS = ROW_ACTIONS.map((action) => ({ ...action, disabled: true }));

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

export function TierConnections({
  family,
  groups,
  rateSheet,
  hasFocusedTier,
  onFamilyIntent,
  onGroupIntent,
  onRateSheetIntent,
}: Props): VNode {
  const navigation = useMemo(() => projectConnectionNavigation({
    family, groups, rateSheet, hasFocusedTier,
  }), [family, groups, hasFocusedTier, rateSheet]);
  const [selectedId, setSelectedId] = useState<ConnectionCategoryId>('stations');
  const [selectedTabs, setSelectedTabs] = useState<Record<ConnectionCategoryId, ConnectionTabId>>({
    stations: 'family-groups',
    tools:    'rate-sheets',
  });

  const renderLegacyTab = (tabId: ConnectionTabId): ComponentChildren => {
    if (tabId === 'family-groups') {
      return (
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
      );
    }

    if (tabId === 'groups') {
      return (
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
      );
    }

    return (
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
    );
  };

  return (
    <div class="cz-tier-deck__connections">
      <TierTabSet
        label="Connection categories"
        items={navigation.map((category) => ({
          id: category.id,
          label: category.title,
          summary: category.summary,
          icon: category.id === 'stations' ? <PackagesIcon /> : <AppsIcon />,
        }))}
        selectedId={selectedId}
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
              renderPanel={renderLegacyTab}
            />
          );
        }}
      />
    </div>
  );
}

function ConnectionSection({ title, note, children }: {
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
