// Package Home Settings — compact category and section navigation.
//
// Settings is scoped to the WHOLE focus the Package Family Group leads, not to
// one Tier slot inside it: the Connections lane beside it already reads that
// narrower Tier scope. Both lanes name the same two categories, Stations and
// Tools, so the focused Package reports its connected Family Group and the Rate
// Sheet access its Tier system grants under the same headings.
//
// It presents no Tier slot inventory: the engine above already lists every fixed
// slot with the same occupant/slot drawer dispatch, so a second listing here
// would restate that surface rather than add one.
//
// Package Manager remains a launcher, in those same two categories: Station
// records (Family, Tier system) and Tool records (Rate Sheet). It holds no
// record draft, validation, endpoint, or save and pre-selects no relationship.

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
import {
  AppsIcon,
  PackagesIcon,
} from '@/admin-station/shell/icons';
import { ConnectedStationsSummary, RateSheetAccessSummary } from './FocusedTierSettings';
import { TierTabSet } from './TierTabSet';

export type PoolSubject = 'family' | 'tier' | 'rate-sheet';
type SettingsGroupId = 'focused-package' | 'package-manager';
type SettingsSectionId = 'focused-stations' | 'focused-tools' | 'pool-stations' | 'pool-tools';

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
}

interface SettingsGroup {
  id: SettingsGroupId;
  icon: VNode;
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
        id: 'focused-package',
        icon: <PackagesIcon />,
        title: 'Focused Package',
        note: 'The whole focus this Package Family Group leads. One Tier slot\'s own connections stay in Connections above; Family assignment and slot configuration each remain in the drawer that owns them.',
        summary: [
          familyRows[0]?.name ?? 'No Family Group',
          currentRecord ? access?.summary ?? 'Access unavailable' : 'No Tier system',
        ].join(' · '),
        sections: [
          {
            id: 'focused-stations',
            title: 'Stations',
            description: 'Package Station records this focus is connected to.',
            leaf: 'Connected Family Group',
            content: (
              <ConnectedStationsSummary rows={familyRows} onIntent={onConnectionIntent} />
            ),
          },
          {
            id: 'focused-tools',
            title: 'Tools',
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
        ],
      },
      {
        id: 'package-manager',
        icon: <AppsIcon />,
        title: 'Package Manager',
        note: 'Opens each pool record in the drawer that owns it. Creation assigns, grants, and connects nothing.',
        summary: `${tool.families.length} Families · ${tool.instances.length} Tiers · ${rateSheets.length} Rate Sheets`,
        sections: [
          {
            id: 'pool-stations',
            title: 'Stations',
            description: `The Package Family and Tier system pools · ${tool.families.length} Families · ${tool.instances.length} Tiers.`,
            leaf: 'Create a Station record',
            content: (
              <div class="cz-tier-settings__launchers">
                <PoolLauncher
                  label="Create Family"
                  note="Opens the readable Package Family creation module. Its drawer owns the fields and save; the new Family starts with no Services or Tier system."
                  onLaunch={() => onPoolIntent('family')}
                />
                <PoolLauncher
                  label="Create Tier"
                  note="Opens the readable Tier registration module. Its drawer owns registration; no Family or slot is pre-selected here."
                  onLaunch={() => onPoolIntent('tier')}
                />
              </div>
            ),
          },
          {
            id: 'pool-tools',
            title: 'Tools',
            description: `The Rate Sheet pool and the groups stored inside each sheet · ${rateSheets.length} in pool · ${groupCount} ${groupCount === 1 ? 'group' : 'groups'}.`,
            leaf: 'Create a Tool record',
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

  const [selectedGroupId, setSelectedGroupId] = useState<SettingsGroupId>('focused-package');
  const [selectedSections, setSelectedSections] = useState<Record<SettingsGroupId, SettingsSectionId>>({
    'focused-package': 'focused-stations',
    'package-manager': 'pool-stations',
  });
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0];

  return (
    <div class="cz-tier-settings">
      <TierTabSet
        label="Settings categories"
        items={groups.map((group) => ({
          id: group.id,
          label: group.title,
          summary: group.summary,
          icon: group.icon,
        }))}
        selectedId={selectedGroup.id}
        onSelect={setSelectedGroupId}
        variant="selectors"
        renderPanel={(groupId) => {
          const group = groups.find((entry) => entry.id === groupId) ?? groups[0];
          const requestedSection = selectedSections[group.id];
          const selectedSection = group.sections.find((section) => section.id === requestedSection) ?? group.sections[0];
          return (
            <>
              <p class="cz-tier-settings__muted">{group.note}</p>
              <TierTabSet
                label={`${group.title} settings`}
                items={group.sections.map((section) => ({
                  id: section.id,
                  label: section.title,
                }))}
                selectedId={selectedSection.id}
                onSelect={(sectionId) => setSelectedSections((current) => ({ ...current, [group.id]: sectionId }))}
                variant="nested"
                renderPanel={(sectionId) => {
                  const section = group.sections.find((entry) => entry.id === sectionId) ?? group.sections[0];
                  return (
                    <section class="cz-tier-settings__leaf">
                      <div class="cz-tier-deck__lane-head">
                        <div>
                          <h4 class="cz-tier-settings__leaf-title">{section.leaf}</h4>
                          <p class="cz-tier-deck__lane-note">{section.description}</p>
                        </div>
                      </div>
                      {section.content}
                    </section>
                  );
                }}
              />
            </>
          );
        }}
      />
      {tool.error && <p class="cz-station-empty" role="alert">{tool.error}</p>}
    </div>
  );
}
