// Tier Workspace Settings — the Settings shell.
//
// FILE INDEX
//   CONTRACTS      — presentation inputs and the one Tier-scoped action.
//   SECTION_MODEL  — the section tree the navigation and the accordions share.
//   SHELL          — the two-column layout and its single open-section state.
//
// Settings is a three-level tree: two top-level groups, a disclosure per subject,
// and one leaf inside each disclosure. The left navigation and the accordions are
// two controls over ONE open-section id, so they cannot disagree; the leaf heading
// is rendered by the shell, so a section can never present a different hierarchy
// from the one the navigation advertises.
//
//   Focused Tier System   Access          → Rate Sheet Access
//                         Tier Structure  → Fixed Tier Slots
//   Package Manager       Families        → Create Family
//                         Tiers           → Create Tier
//                         Groups          → Create Group
//                         Rate Sheets     → Create Rate Sheet
//
// Focused Tier System configures the ONE Tier system focused above. Package
// Manager creates ONE pool record per action. Neither group assigns anything to
// anything: no creation mints a second record, grants access, fills a slot, or
// pre-selects the focused Family, and nothing here suggests a consumer or
// launches an unrelated tool. Every relationship in this workspace is made in the
// drawer that owns the record.

import { useId, useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type {
  PackageRateSheet,
  TierInstanceSummary,
} from '../../types';
import type { TierInstancesToolState } from '../../surface/tierInstance/useTierInstances';
import type { PackageManagerCreationState } from '../../surface/packageManager/usePackageManagerCreation';
import { tierSlotStates } from '../../surface/tierInstance/tierInstanceModel';
import {
  AppsIcon,
  RateSheetIcon,
  ServicesIcon,
  TiersIcon,
} from '@/admin-station/shell/icons';
import { DeckDisclosure } from './DeckDisclosure';
import { TierSettingsNav, type SettingsNavGroup } from './TierSettingsNav';
import { FixedTierSlots, RateSheetAccess } from './FocusedTierSettings';
import {
  CreateFamily,
  CreateGroup,
  CreateRateSheet,
  CreateTier,
} from './PackageManagerSettings';

// ── SECTION: CONTRACTS ────────────────────────────────────────────────────────

interface Props {
  tool: TierInstancesToolState;
  creation: PackageManagerCreationState;
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
}

// ── SECTION: SECTION_MODEL ────────────────────────────────────────────────────

interface SettingsSection {
  id:          string;
  icon:        VNode;
  title:       string;
  description: string;
  /** A count the loaded records actually report, or null when none is knowable. */
  summary:     string | null;
  leaf:        string;
  content:     VNode;
}

interface SettingsGroup {
  id:       string;
  title:    string;
  note:     string;
  sections: SettingsSection[];
}

// ── SECTION: SHELL ────────────────────────────────────────────────────────────

export function TierSystemSettings({
  tool,
  creation,
  workspaceInstance,
  rateSheets,
  loading,
  error,
  onTierAction,
}: Props): VNode {
  const uid = useId();
  const idFor = (sectionId: string): string => `${uid}-${sectionId}`;

  const currentRecord = workspaceInstance
    ? tool.instances.find((instance) => instance.tier_instance_id === workspaceInstance.tier_instance_id) ?? null
    : null;

  const groups = useMemo<SettingsGroup[]>(() => {
    const activeRateSheets = rateSheets.filter((sheet) => sheet.status === 'active');
    const allowedCount = currentRecord?.allowed_rate_sheet_ids.length ?? 0;
    const configuredSlots = currentRecord
      ? tierSlotStates(currentRecord).filter((slot) => slot.occupied).length
      : null;

    return [
      {
        id: 'focused-tier-system',
        title: 'Focused Tier System',
        note: 'The Tier system focused above. Assignment to a Package Family stays in the Package Family drawer that owns it.',
        sections: [
          {
            id: 'access',
            icon: <RateSheetIcon />,
            title: 'Access',
            description: 'Which Package records this Tier system may reach.',
            summary: currentRecord === null
              ? null
              : allowedCount === 0
                ? `All ${activeRateSheets.length} active`
                : `${allowedCount} allowed`,
            leaf: 'Rate Sheet Access',
            content: (
              <RateSheetAccess
                record={currentRecord}
                rateSheets={rateSheets}
                saving={tool.saving}
                loading={loading}
                error={error}
                onAllow={(allowedRateSheetIds) => {
                  if (!currentRecord) return;
                  void tool.updateInstance(currentRecord.tier_instance_id, {
                    allowed_rate_sheet_ids: allowedRateSheetIds,
                  });
                }}
              />
            ),
          },
          {
            id: 'tier-structure',
            icon: <TiersIcon />,
            title: 'Tier Structure',
            description: 'The fixed slots this Tier system offers and what occupies them.',
            summary: configuredSlots === null ? null : `${configuredSlots} of 5 configured`,
            leaf: 'Fixed Tier Slots',
            content: <FixedTierSlots record={currentRecord} onTierAction={onTierAction} />,
          },
        ],
      },
      {
        id: 'package-manager',
        title: 'Package Manager',
        note: 'Creates one Package record at a time. Nothing created here is assigned, granted access, or connected to anything.',
        sections: [
          {
            id: 'families',
            icon: <ServicesIcon />,
            title: 'Families',
            description: 'The Package Family pool.',
            summary: `${tool.families.length} in pool`,
            leaf: 'Create Family',
            content: <CreateFamily creation={creation} />,
          },
          {
            id: 'tiers',
            icon: <TiersIcon />,
            title: 'Tiers',
            description: 'The Tier system pool.',
            summary: `${tool.instances.length} in pool`,
            leaf: 'Create Tier',
            content: <CreateTier tool={tool} />,
          },
          {
            id: 'groups',
            icon: <AppsIcon />,
            title: 'Groups',
            description: 'The groups each Rate Sheet stores.',
            summary: `${rateSheets.reduce((total, sheet) => total + sheet.groups.length, 0)} in pool`,
            leaf: 'Create Group',
            content: <CreateGroup creation={creation} rateSheets={rateSheets} />,
          },
          {
            id: 'rate-sheets',
            icon: <RateSheetIcon />,
            title: 'Rate Sheets',
            description: 'The Rate Sheet pool.',
            summary: `${rateSheets.length} in pool`,
            leaf: 'Create Rate Sheet',
            content: <CreateRateSheet creation={creation} />,
          },
        ],
      },
    ];
  }, [creation, currentRecord, error, loading, onTierAction, rateSheets, tool]);

  const [openId, setOpenId] = useState<string | null>('access');

  // One id, two controls. Toggling from either the navigation or a section header
  // runs this; opening from the navigation also moves focus to that section's own
  // header, so the keyboard lands where the reading continues. The trigger is
  // addressed by the id stem the shell handed the disclosure, which is why the
  // disclosure accepts one rather than minting its own here.
  const toggleSection = (sectionId: string, moveFocus: boolean) => {
    const opening = openId !== sectionId;
    setOpenId(opening ? sectionId : null);
    if (!opening || !moveFocus) return;
    window.requestAnimationFrame(() => {
      const trigger = document.getElementById(`${idFor(sectionId)}-trigger`);
      if (!trigger) return;
      trigger.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'nearest',
      });
      trigger.focus({ preventScroll: true });
    });
  };

  const navGroups: SettingsNavGroup[] = groups.map((group) => ({
    id: group.id,
    title: group.title,
    sections: group.sections.map((section) => ({
      id: section.id,
      title: section.title,
      leaf: section.leaf,
    })),
  }));

  return (
    <div class="cz-tier-settings">
      <TierSettingsNav
        groups={navGroups}
        openId={openId}
        idFor={idFor}
        onToggle={(sectionId) => toggleSection(sectionId, true)}
      />

      <div class="cz-tier-settings__sections">
        {groups.map((group) => (
          <section
            key={group.id}
            class="cz-tier-settings__group"
            aria-labelledby={`${uid}-${group.id}-title`}
          >
            <div class="cz-tier-deck__lane-head">
              <div>
                <h4 id={`${uid}-${group.id}-title`} class="cz-tier-deck__lane-title">{group.title}</h4>
                <p class="cz-tier-deck__lane-note">{group.note}</p>
              </div>
            </div>
            {group.sections.map((section) => (
              <DeckDisclosure
                key={section.id}
                idPrefix={idFor(section.id)}
                headingLevel={5}
                icon={section.icon}
                title={section.title}
                description={section.description}
                summary={section.summary}
                open={openId === section.id}
                onToggle={() => toggleSection(section.id, false)}
              >
                <div class="cz-tier-settings__leaf">
                  <h6 class="cz-tier-settings__leaf-title">{section.leaf}</h6>
                  {section.content}
                </div>
              </DeckDisclosure>
            ))}
          </section>
        ))}
      </div>

      {tool.error && <p class="cz-station-empty" role="alert">{tool.error}</p>}
    </div>
  );
}
