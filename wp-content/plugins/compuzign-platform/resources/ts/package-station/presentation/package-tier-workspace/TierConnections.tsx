// Tier Workspace Connections — compact category selectors and connected records.
//
// The pure Package-owned navigation projection supplies every category, summary,
// subsection, row, status, empty state, and drawer target. This presentation owns
// only the currently selected category. It does not fetch, infer relationships,
// encode routes, or open a drawer directly.

import { useId, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren, VNode } from 'preact';
import type {
  DeckRateSheetConnection,
  DeckRateSheetGroupConnection,
} from '../../surface/packageTierWorkspace/deck';
import {
  projectConnectionNavigation,
  type ConnectionCategoryId,
} from '../../surface/packageTierWorkspace/connectionNavigation';
import type { WorkspaceFamilyScope } from '../../surface/packageTierWorkspace/projection';
import { StationSplitAction } from '@/admin-station/presentation/StationSplitAction';
import {
  AppsIcon,
  ChevronDownIcon,
  PackagesIcon,
  RateSheetIcon,
  ServicesIcon,
} from '@/admin-station/shell/icons';

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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();
  const selected = navigation.find((category) => category.id === selectedId) ?? navigation[0];
  const panelId = `${uid}-connection-panel`;

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % navigation.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + navigation.length) % navigation.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = navigation.length - 1;
    if (next === null) return;
    event.preventDefault();
    setSelectedId(navigation[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div class="cz-tier-deck__connections">
      <div class="cz-tier-deck__selector-grid" role="tablist" aria-label="Connection categories">
        {navigation.map((category, index) => {
          const active = category.id === selected.id;
          const Icon = category.id === 'stations' ? PackagesIcon : AppsIcon;
          return (
            <button
              key={category.id}
              id={`${uid}-${category.id}-selector`}
              ref={(element) => { tabRefs.current[index] = element; }}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={active ? 0 : -1}
              class={`cz-tier-deck__selector-card${active ? ' cz-tier-deck__selector-card--selected' : ''}`}
              onClick={() => setSelectedId(category.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <span class="cz-tier-deck__selector-icon" aria-hidden="true"><Icon /></span>
              <span class="cz-tier-deck__selector-copy">
                <span class="cz-tier-deck__selector-title">{category.title}</span>
                <span class="cz-tier-deck__selector-summary">{category.summary}</span>
              </span>
              <span class="cz-tier-deck__selector-chevron" aria-hidden="true"><ChevronDownIcon /></span>
            </button>
          );
        })}
      </div>

      <div
        id={panelId}
        class="cz-tier-deck__connection-panel"
        role="tabpanel"
        aria-labelledby={`${uid}-${selected.id}-selector`}
      >
        {selected.id === 'stations' ? (
          <>
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
          </>
        ) : (
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
        )}
      </div>
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
