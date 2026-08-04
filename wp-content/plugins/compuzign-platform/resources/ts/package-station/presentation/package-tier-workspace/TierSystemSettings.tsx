// Package Home Settings — per-record-type accordion navigation.
//
// Settings is scoped to the WHOLE focus the Package Family Group leads, not to
// one Tier slot inside it: the Connections lane beside it already reads that
// narrower Tier scope. Three ordered sections, one per Package-owned record
// type — Family Groups, Tier Groups, Rate Sheets — each showing what this
// focus is connected to (or configures) for that type, plus its pool creation
// launcher where one exists. A Rate Sheet Group has no pool of its own (it
// lives inside `rate_sheets[].groups[]`), so its read-only pool count reports
// inside Rate Sheets rather than as a fourth section.
//
// It presents no Tier slot inventory: the engine above already lists every fixed
// slot with the same occupant/slot drawer dispatch, so a second listing here
// would restate that surface rather than add one.
//
// Package Manager launches remain launchers: they hold no record draft,
// validation, endpoint, or save and pre-select no relationship.

import { useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { PackageRateSheet, TierInstanceSummary } from '../../types';
import type {
  ConnectionActionId,
  ConnectionTarget,
  FamilyConnectionRow,
  TierGroupConnectionRow,
} from '../../surface/packageTierWorkspace/connectionNavigation';
import type { WorkspaceFamilyScope } from '../../surface/packageTierWorkspace/projection';
import type { TierInstancesToolState } from '../../surface/tierInstance/useTierInstances';
import {
  projectFamilyConnectionRows,
  projectTierGroupConnectionRows,
} from '../../surface/packageTierWorkspace/connectionNavigation';
import { ConnectedStationsSummary, TierGroupPoolSummary } from './FocusedTierSettings';
import { TierAccordionSection } from './TierAccordionSection';

export type PoolSubject = 'family' | 'tier' | 'rate-sheet';
type SettingsGroupId = 'family-groups' | 'tier-groups' | 'rate-sheets';
type SettingsSectionId = 'connected' | 'pool';

// Family Groups' own filter. Default is the full loaded Family pool (`all`),
// focused family first, remaining families in their existing stable order;
// `focused` narrows the list back down to the one connected Family Group row.
const FAMILY_GROUP_FILTERS = [
  { id: 'focused',  label: 'Focused' },
  { id: 'all',      label: 'All' },
  { id: 'active',   label: 'Active' },
  { id: 'pending',  label: 'Pending' },
  { id: 'disabled', label: 'Disabled' },
] as const;
type FamilyGroupFilter = typeof FAMILY_GROUP_FILTERS[number]['id'];

// Tier Groups' own filter, on the same system as Family Groups': the default is
// the whole loaded parent Tier Group pool (`all`), focused system first,
// remaining systems in their existing stable order. Every filter reads the
// PARENT Tier Group's own lifecycle state — never an occupant's, a slot's, or a
// Rate Sheet access policy's.
const TIER_GROUP_FILTERS = [
  { id: 'focused',  label: 'Focused' },
  { id: 'all',      label: 'All' },
  { id: 'active',   label: 'Active' },
  { id: 'pending',  label: 'Pending' },
  { id: 'disabled', label: 'Disabled' },
] as const;
type TierGroupFilter = typeof TIER_GROUP_FILTERS[number]['id'];

// Rate Sheets' own filter, presentational only, same as Family Groups' and
// Tier Groups': it narrows nothing yet, because this scope carries only the
// read-only Rate Sheet Group count.
const RATE_SHEET_FILTERS = [
  { id: 'focused',  label: 'Focused' },
  { id: 'all',      label: 'All' },
  { id: 'active',   label: 'Active' },
  { id: 'pending',  label: 'Pending' },
  { id: 'disabled', label: 'Disabled' },
] as const;
type RateSheetFilter = typeof RATE_SHEET_FILTERS[number]['id'];

interface Props {
  tool: TierInstancesToolState;
  family: WorkspaceFamilyScope | null;
  families: WorkspaceFamilyScope[];
  workspaceInstance: TierInstanceSummary | null;
  rateSheets: PackageRateSheet[];
  // The Package Manager read's state. Rate Sheet Access consumed it while it sat
  // in the Tier Groups list; the parent Tier Group pool tracks its own load
  // through `tool`, so these stay on the prop contract without a reader here.
  loading: boolean;
  error: string | null;
  onConnectionIntent: (target: ConnectionTarget, actionId: ConnectionActionId) => void;
  onInstanceIntent: (instanceId: string) => void;
  onPoolIntent: (subject: PoolSubject) => void;
}

interface SettingsSection {
  id: SettingsSectionId;
  title: string;
  description: string;
  leaf: string;
  content: VNode;
  // When true, the section renders only its content — no kicker, heading, or
  // description above it.
  hideHeading?: boolean;
}

interface SettingsGroup {
  id: SettingsGroupId;
  title: string;
  note: string;
  summary: string;
  sections: SettingsSection[];
  // A top-of-panel control row, above the note and sections.
  toolbar?: VNode;
}

export function TierSystemSettings({
  tool,
  family,
  families,
  workspaceInstance,
  rateSheets,
  onConnectionIntent,
  onInstanceIntent,
  onPoolIntent,
}: Props): VNode {
  // The connected Family Group is the workspace's own connection projection, so
  // Settings and Connections report one record, one status and one target.
  const connectedFamilyRow = useMemo(() => projectFamilyConnectionRows(family), [family]);
  const [familyGroupFilter, setFamilyGroupFilter] = useState<FamilyGroupFilter>('all');
  // The Family Groups list: Focused shows only the connected row above; every
  // other filter narrows the whole loaded Family pool by status, with the
  // focused Family — when it is present in that narrowed pool — kept first and
  // the rest left in their existing stable order.
  const familyRows = useMemo<FamilyConnectionRow[]>(() => {
    if (familyGroupFilter === 'focused') return connectedFamilyRow;
    const focusedId = family?.id ?? null;
    const pool = families.filter((candidate) => {
      if (familyGroupFilter === 'all') return true;
      if (familyGroupFilter === 'pending') return candidate.status === 'pending-dim' || candidate.status === 'pending-full';
      return candidate.status === familyGroupFilter;
    });
    const ordered = focusedId
      ? [...pool].sort((a, b) => (a.id === focusedId ? -1 : b.id === focusedId ? 1 : 0))
      : pool;
    return ordered.flatMap((candidate) => projectFamilyConnectionRows(candidate));
  }, [connectedFamilyRow, family, familyGroupFilter, families]);
  const [tierGroupFilter, setTierGroupFilter] = useState<TierGroupFilter>('all');
  // The Tier Groups list: the parent Tier Group / Tier System records themselves,
  // narrowed by their own lifecycle state, with the focused system — when it is
  // present in that narrowed pool — kept first and the rest left in their
  // existing stable order. Focused shows only the focused system.
  const focusedInstanceId = workspaceInstance?.tier_instance_id ?? null;
  const tierGroupRows = useMemo<TierGroupConnectionRow[]>(() => {
    const pool = tool.instances.filter((candidate) => {
      if (tierGroupFilter === 'all') return true;
      if (tierGroupFilter === 'focused') return candidate.tier_instance_id === focusedInstanceId;
      if (tierGroupFilter === 'pending') return candidate.status === 'draft';
      return candidate.status === tierGroupFilter;
    });
    const ordered = focusedInstanceId
      ? [...pool].sort((a, b) => (
          a.tier_instance_id === focusedInstanceId ? -1 : b.tier_instance_id === focusedInstanceId ? 1 : 0
        ))
      : pool;
    return ordered.flatMap((candidate) => projectTierGroupConnectionRows(candidate));
  }, [focusedInstanceId, tierGroupFilter, tool.instances]);
  // The accordion summary reports the real parent pool, not an access policy.
  const activeTierGroups = useMemo(
    () => tool.instances.filter((instance) => instance.status === 'active').length,
    [tool.instances],
  );
  const [rateSheetFilter, setRateSheetFilter] = useState<RateSheetFilter>('focused');
  const groups = useMemo<SettingsGroup[]>(() => {
    const groupCount = rateSheets.reduce((total, sheet) => total + sheet.groups.length, 0);
    return [
      {
        id: 'family-groups',
        title: 'Family Groups',
        note: '',
        summary: `${connectedFamilyRow[0]?.name ?? 'No Family Group'} · ${tool.families.length} in pool`,
        toolbar: (
          <div class="cz-tier-settings__toolbar">
            <select
              class="cz-tf-control cz-tf-select"
              value={familyGroupFilter}
              aria-label="Filter Family Groups"
              onChange={(event) => setFamilyGroupFilter((event.currentTarget as HTMLSelectElement).value as FamilyGroupFilter)}
            >
              {FAMILY_GROUP_FILTERS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <button
              type="button"
              class="cz-tier-deck__button cz-tier-deck__button--primary"
              onClick={() => onPoolIntent('family')}
            >
              + New Family
            </button>
          </div>
        ),
        sections: [
          {
            id: 'connected',
            title: '',
            description: '',
            leaf: '',
            hideHeading: true,
            content: (
              <ConnectedStationsSummary rows={familyRows} onIntent={onConnectionIntent} />
            ),
          },
        ],
      },
      {
        id: 'tier-groups',
        title: 'Tier Groups',
        note: '',
        summary: `${activeTierGroups} active · ${tool.instances.length} in pool`,
        toolbar: (
          <div class="cz-tier-settings__toolbar">
            <select
              class="cz-tf-control cz-tf-select"
              value={tierGroupFilter}
              aria-label="Filter Tier Groups"
              onChange={(event) => setTierGroupFilter((event.currentTarget as HTMLSelectElement).value as TierGroupFilter)}
            >
              {TIER_GROUP_FILTERS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <button
              type="button"
              class="cz-tier-deck__button cz-tier-deck__button--primary"
              onClick={() => onPoolIntent('tier')}
            >
              + New Tier Group
            </button>
          </div>
        ),
        sections: [
          {
            id: 'connected',
            title: '',
            description: '',
            leaf: '',
            hideHeading: true,
            content: (
              <TierGroupPoolSummary rows={tierGroupRows} loading={tool.loading} onView={onInstanceIntent} />
            ),
          },
        ],
      },
      {
        id: 'rate-sheets',
        title: 'Rate Sheets',
        note: '',
        summary: `${rateSheets.length} in pool · ${groupCount} ${groupCount === 1 ? 'group' : 'groups'}`,
        toolbar: (
          <div class="cz-tier-settings__toolbar">
            <select
              class="cz-tf-control cz-tf-select"
              value={rateSheetFilter}
              aria-label="Filter Rate Sheets"
              onChange={(event) => setRateSheetFilter((event.currentTarget as HTMLSelectElement).value as RateSheetFilter)}
            >
              {RATE_SHEET_FILTERS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <button
              type="button"
              class="cz-tier-deck__button cz-tier-deck__button--primary"
              onClick={() => onPoolIntent('rate-sheet')}
            >
              + New Rate Sheet
            </button>
          </div>
        ),
        sections: [
          {
            id: 'pool',
            title: '',
            description: '',
            leaf: '',
            hideHeading: true,
            content: (
              <p class="cz-tier-settings__muted">
                {groupCount} {groupCount === 1 ? 'group' : 'groups'}
              </p>
            ),
          },
        ],
      },
    ];
  }, [activeTierGroups, connectedFamilyRow, familyGroupFilter, familyRows, onConnectionIntent, onInstanceIntent, onPoolIntent, rateSheetFilter, rateSheets, tierGroupFilter, tierGroupRows, tool.families.length, tool.instances.length, tool.loading]);

  const [expanded, setExpanded] = useState<Record<SettingsGroupId, boolean>>({
    'family-groups': true,
    'tier-groups':   false,
    'rate-sheets':   false,
  });

  return (
    <div class="cz-tier-settings">
      <div class="cz-tier-deck__accordion">
        {groups.map((group) => (
          <TierAccordionSection
            key={group.id}
            id={`cz-tier-settings__${group.id}`}
            label={group.title}
            meta={<span class="cz-tier-deck__accordion-summary">{group.summary}</span>}
            isOpen={expanded[group.id]}
            onToggle={() => setExpanded((current) => ({ ...current, [group.id]: !current[group.id] }))}
          >
            {group.toolbar}
            {group.note && <p class="cz-tier-settings__muted">{group.note}</p>}
            {group.sections.map((section) => (
              <section key={section.id} class="cz-tier-settings__leaf">
                {!section.hideHeading && (
                  <div class="cz-tier-deck__lane-head">
                    <div>
                      <span class="cz-tier-deck__field-label">{section.title}</span>
                      <h4 class="cz-tier-settings__leaf-title">{section.leaf}</h4>
                      <p class="cz-tier-deck__lane-note">{section.description}</p>
                    </div>
                  </div>
                )}
                {section.content}
              </section>
            ))}
          </TierAccordionSection>
        ))}
      </div>
      {tool.error && <p class="cz-station-empty" role="alert">{tool.error}</p>}
    </div>
  );
}
