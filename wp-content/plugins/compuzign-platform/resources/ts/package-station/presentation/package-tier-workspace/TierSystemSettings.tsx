// Package Home Settings — per-record-type accordion navigation.
//
// Settings is scoped to the WHOLE focus the Package Family Group leads, not to
// one Tier slot inside it: the Connections lane beside it already reads that
// narrower Tier scope. Four ordered sections, one per Package-owned record
// type — Family Groups, Tier Groups, Groups, Rate Sheets — each showing what
// this focus is connected to (or configures) for that type, plus its pool
// creation launcher where one exists. A Rate Sheet Group has no pool of its
// own (it lives inside `rate_sheets[].groups[]`), so Groups reports only the
// existing pool count, never a fabricated creation entry.
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
} from '../../surface/packageTierWorkspace/connectionNavigation';
import type { WorkspaceFamilyScope } from '../../surface/packageTierWorkspace/projection';
import type { TierInstancesToolState } from '../../surface/tierInstance/useTierInstances';
import { projectFamilyConnectionRows } from '../../surface/packageTierWorkspace/connectionNavigation';
import { projectTierRateSheetAccess } from '../../surface/tierInstance/tierRateSheetAccessModel';
import { ConnectedStationsSummary, RateSheetAccessSummary } from './FocusedTierSettings';
import { TierAccordionSection } from './TierAccordionSection';

export type PoolSubject = 'family' | 'tier' | 'rate-sheet';
type SettingsGroupId = 'family-groups' | 'tier-groups' | 'groups' | 'rate-sheets';
type SettingsSectionId = 'connected' | 'pool';

interface Props {
  tool: TierInstancesToolState;
  family: WorkspaceFamilyScope | null;
  workspaceInstance: TierInstanceSummary | null;
  rateSheets: PackageRateSheet[];
  loading: boolean;
  error: string | null;
  onConnectionIntent: (target: ConnectionTarget, actionId: ConnectionActionId) => void;
  onInstanceIntent: (instanceId: string) => void;
  onPoolIntent: (subject: PoolSubject) => void;
}

function PoolLauncher({ label, note, onLaunch }: {
  label: string;
  note: string;
  onLaunch: () => void;
}): VNode {
  return (
    <div class="cz-tier-settings__launcher">
      <p class="cz-tier-settings__muted">{note}</p>
      <button type="button" class="cz-tier-deck__button cz-tier-deck__button--primary" onClick={onLaunch}>
        {label}
      </button>
    </div>
  );
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
}

export function TierSystemSettings({
  tool,
  family,
  workspaceInstance,
  rateSheets,
  loading,
  error,
  onConnectionIntent,
  onInstanceIntent,
  onPoolIntent,
}: Props): VNode {
  const currentRecord = workspaceInstance
    ? tool.instances.find((instance) => instance.tier_instance_id === workspaceInstance.tier_instance_id) ?? null
    : null;
  const access = useMemo(
    () => currentRecord ? projectTierRateSheetAccess(currentRecord, rateSheets) : null,
    [currentRecord, rateSheets],
  );
  // The connected Family Group is the workspace's own connection projection, so
  // Settings and Connections report one record, one status and one target.
  const familyRows = useMemo(() => projectFamilyConnectionRows(family), [family]);
  const groups = useMemo<SettingsGroup[]>(() => {
    const groupCount = rateSheets.reduce((total, sheet) => total + sheet.groups.length, 0);
    return [
      {
        id: 'family-groups',
        title: 'Family Groups',
        note: '',
        summary: `${familyRows[0]?.name ?? 'No Family Group'} · ${tool.families.length} in pool`,
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
          {
            id: 'pool',
            title: 'Pool',
            description: `The Package Family pool · ${tool.families.length} in pool.`,
            leaf: 'Create a Family',
            content: (
              <PoolLauncher
                label="Create Family"
                note="Opens the readable Package Family creation module. Its drawer owns the fields and save; the new Family starts with no Services or Tier system."
                onLaunch={() => onPoolIntent('family')}
              />
            ),
          },
        ],
      },
      {
        id: 'tier-groups',
        title: 'Tier Groups',
        note: 'The focused Tier system\'s Rate Sheet access, and the Tier system pool it comes from. Slot configuration remains in the drawer that owns it.',
        summary: `${currentRecord ? access?.summary ?? 'Access unavailable' : 'No Tier system'} · ${tool.instances.length} in pool`,
        sections: [
          {
            id: 'connected',
            title: 'Connected',
            description: 'Which Rate Sheets this Tier system may make available to its Tier slots.',
            leaf: 'Rate Sheet Access',
            content: (
              <RateSheetAccessSummary
                record={currentRecord}
                projection={access}
                loading={loading}
                error={error}
                onView={onInstanceIntent}
              />
            ),
          },
          {
            id: 'pool',
            title: 'Pool',
            description: `The Tier system pool · ${tool.instances.length} in pool.`,
            leaf: 'Create a Tier',
            content: (
              <PoolLauncher
                label="Create Tier"
                note="Opens the readable Tier registration module. Its drawer owns registration; no Family or slot is pre-selected here."
                onLaunch={() => onPoolIntent('tier')}
              />
            ),
          },
        ],
      },
      {
        id: 'groups',
        title: 'Groups',
        note: 'Rate Sheet groups stored inside the Rate Sheet pool. A group lives inside its parent sheet, so it has no independent pool or creation of its own — Edit owns New Group inside the sheet\'s own group tool.',
        summary: `${groupCount} ${groupCount === 1 ? 'group' : 'groups'}`,
        sections: [
          {
            id: 'pool',
            title: 'Pool',
            description: 'Groups stored across every Rate Sheet in the pool.',
            leaf: 'Rate Sheet Groups',
            content: (
              <p class="cz-tier-settings__muted">
                {groupCount} {groupCount === 1 ? 'group' : 'groups'} stored across {rateSheets.length} {rateSheets.length === 1 ? 'Rate Sheet' : 'Rate Sheets'} in the pool.
              </p>
            ),
          },
        ],
      },
      {
        id: 'rate-sheets',
        title: 'Rate Sheets',
        note: 'The Rate Sheet pool. Editing a sheet\'s rows and groups remains in the drawer that owns it.',
        summary: `${rateSheets.length} in pool`,
        sections: [
          {
            id: 'pool',
            title: 'Pool',
            description: `The Rate Sheet pool · ${rateSheets.length} in pool.`,
            leaf: 'Create a Rate Sheet',
            content: (
              <PoolLauncher
                label="Create Rate Sheet"
                note="Opens the readable Rate Sheet collection module. Edit owns New Rate Sheet and each sheet's group tool; Groups have no independent pool."
                onLaunch={() => onPoolIntent('rate-sheet')}
              />
            ),
          },
        ],
      },
    ];
  }, [access, currentRecord, error, familyRows, loading, onConnectionIntent, onInstanceIntent, onPoolIntent, rateSheets, tool.families.length, tool.instances.length]);

  const [expanded, setExpanded] = useState<Record<SettingsGroupId, boolean>>({
    'family-groups': true,
    'tier-groups':   false,
    'groups':        false,
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
