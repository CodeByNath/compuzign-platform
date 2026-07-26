// Tier Workspace Settings — compact category and section navigation.
//
// Focused Tier System remains configuration-oriented. Package Home reads its
// access policy and slots, then opens their owning drawer modules. Package
// Manager remains a launcher: it holds no record draft, validation, endpoint, or
// save and pre-selects no relationship.

import { useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { PackageRateSheet, TierInstanceSummary } from '../../types';
import type { TierInstancesToolState } from '../../surface/tierInstance/useTierInstances';
import { tierSlotStates } from '../../surface/tierInstance/tierInstanceModel';
import { projectTierRateSheetAccess } from '../../surface/tierInstance/tierRateSheetAccessModel';
import {
  PackagesIcon,
  RateSheetIcon,
  ServicesIcon,
  TiersIcon,
} from '@/admin-station/shell/icons';
import { FixedTierSlots, RateSheetAccessSummary } from './FocusedTierSettings';
import { TierTabSet } from './TierTabSet';

export type PoolSubject = 'family' | 'tier' | 'rate-sheet';
type SettingsGroupId = 'focused-tier-system' | 'package-manager';
type SettingsSectionId = 'access' | 'tier-structure' | 'families' | 'tiers' | 'rate-sheets';

interface Props {
  tool: TierInstancesToolState;
  workspaceInstance: TierInstanceSummary | null;
  rateSheets: PackageRateSheet[];
  loading: boolean;
  error: string | null;
  onTierAction: (
    instanceId: string,
    slotId: string,
    occupantId: string | null,
    actionId: 'view' | 'edit',
  ) => void;
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
  icon: VNode;
  title: string;
  description: string;
  summary: string;
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
  workspaceInstance,
  rateSheets,
  loading,
  error,
  onTierAction,
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
  const groups = useMemo<SettingsGroup[]>(() => {
    const configuredSlots = currentRecord
      ? tierSlotStates(currentRecord).filter((slot) => slot.occupied).length
      : 0;
    const groupCount = rateSheets.reduce((total, sheet) => total + sheet.groups.length, 0);
    return [
      {
        id: 'focused-tier-system',
        icon: <TiersIcon />,
        title: 'Focused Tier System',
        note: 'Configuration for the exact Tier system focused above. Family assignment remains in the Package Family drawer.',
        summary: currentRecord
          ? `${configuredSlots} of 5 configured · ${access?.summary ?? 'Access unavailable'}`
          : 'No Tier system focused',
        sections: [
          {
            id: 'access',
            icon: <RateSheetIcon />,
            title: 'Access',
            description: 'Which Rate Sheets this Tier system may make available to its Tier slots.',
            summary: access?.summary ?? 'Not available',
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
            id: 'tier-structure',
            icon: <TiersIcon />,
            title: 'Tier Structure',
            description: 'The fixed slots this Tier system offers and what occupies them.',
            summary: currentRecord ? `${configuredSlots} of 5 configured` : 'Not available',
            leaf: 'Fixed Tier Slots',
            content: <FixedTierSlots record={currentRecord} onTierAction={onTierAction} />,
          },
        ],
      },
      {
        id: 'package-manager',
        icon: <PackagesIcon />,
        title: 'Package Manager',
        note: 'Opens each pool record in the drawer that owns it. Creation assigns, grants, and connects nothing.',
        summary: `${tool.families.length} Families · ${tool.instances.length} Tiers · ${rateSheets.length} Rate Sheets`,
        sections: [
          {
            id: 'families',
            icon: <ServicesIcon />,
            title: 'Families',
            description: 'The Package Family pool.',
            summary: `${tool.families.length} in pool`,
            leaf: 'Create Family',
            content: (
              <PoolLauncher
                label="Create Family"
                note="Opens the readable Package Family creation module. Its drawer owns the fields and save; the new Family starts with no Services or Tier system."
                onLaunch={() => onPoolIntent('family')}
              />
            ),
          },
          {
            id: 'tiers',
            icon: <TiersIcon />,
            title: 'Tiers',
            description: 'The Tier system pool.',
            summary: `${tool.instances.length} in pool`,
            leaf: 'Create Tier',
            content: (
              <PoolLauncher
                label="Create Tier"
                note="Opens the readable Tier registration module. Its drawer owns registration; no Family or slot is pre-selected here."
                onLaunch={() => onPoolIntent('tier')}
              />
            ),
          },
          {
            id: 'rate-sheets',
            icon: <RateSheetIcon />,
            title: 'Rate Sheets',
            description: 'The Rate Sheet pool and the groups stored inside each sheet.',
            summary: `${rateSheets.length} in pool · ${groupCount} ${groupCount === 1 ? 'group' : 'groups'}`,
            leaf: 'Create Rate Sheet',
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
  }, [access, currentRecord, error, loading, onInstanceIntent, onPoolIntent, onTierAction, rateSheets, tool.families.length, tool.instances.length]);

  const [selectedGroupId, setSelectedGroupId] = useState<SettingsGroupId>('focused-tier-system');
  const [selectedSections, setSelectedSections] = useState<Record<SettingsGroupId, SettingsSectionId>>({
    'focused-tier-system': 'access',
    'package-manager': 'families',
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
                  summary: section.summary,
                  icon: section.icon,
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
