// Package Tier workspace — typed Connections navigation projection.
//
// This is the single Package-owned model behind the Connections selector cards,
// nested tabs, row counts, statuses, empty states, and drawer targets. It derives
// from the exact Family assignment and focused-Tier deck projections; it fetches,
// renders, mutates, and encodes no route.

import type { CategoryGroupStatus } from '@/admin-station/presentation/category-groups/types';
import type {
  PackageRateSheetStatus,
  TierInstanceRecord,
  TierInstanceStatus,
} from '../../types';
import type {
  DeckRateSheetConnection,
  DeckRateSheetGroupConnection,
} from './deck';
import type { WorkspaceFamilyScope } from './projection';

export type ConnectionCategoryId = 'stations' | 'tools';
export type ConnectionTabId = 'family-groups' | 'groups' | 'rate-sheets';
export type ConnectionActionId = 'view' | 'edit';

export type ConnectionTarget =
  | { kind: 'package-family'; familyId: string }
  | { kind: 'tier-instance'; instanceId: string }
  | { kind: 'rate-sheet-group'; rateSheetId: string; groupId: string }
  | { kind: 'rate-sheet'; rateSheetId: string };

interface ConnectionRowBase {
  id:        string;
  name:      string;
  reference: string;
  target:    ConnectionTarget;
  actions:   ConnectionActionId[];
}

export interface FamilyConnectionRow extends ConnectionRowBase {
  kind:             'family';
  status:           CategoryGroupStatus;
  description:      string;
  assignedServices: number;
  // The Family's own output-only Platform ID (CZPG); empty when unassigned.
  platformId:       string;
}

// The lifecycle vocabulary a parent Tier Group row reports. It is the shared
// pill vocabulary, not the storage enum: a `draft` Tier system is Pending, and
// the bin states keep their own names rather than borrowing Disabled.
export type TierGroupRowStatus = 'active' | 'pending' | 'disabled' | 'archived' | 'trashed';

export interface TierGroupConnectionRow extends ConnectionRowBase {
  kind:       'tier-group';
  status:     TierGroupRowStatus;
  // The system's own output-only Platform ID (CZTG); empty when unassigned.
  platformId: string;
  // How many of the system's five slots are registered, split by the occupant's
  // own selection mode. Registration is the fact being counted, so an occupant
  // counts whatever its lifecycle status is.
  tierCount:  number;
  addonCount: number;
}

export interface GroupConnectionRow extends ConnectionRowBase {
  kind:          'group';
  status:        PackageRateSheetStatus;
  connectedRows: number;
  coverage:      number;
  // Of connectedRows, the ones sourced from an inclusion.
  connectedInclusions: number;
  // The group's own output-only Platform ID (CZPRCG); empty when unassigned.
  platformId:    string;
}

export interface RateSheetConnectionRow extends ConnectionRowBase {
  kind:                'rate-sheet';
  status:              PackageRateSheetStatus | 'unresolved';
  resolved:            boolean;
  connectedRows:       number;
  connectedInclusions: number;
  // The sheet's own output-only Platform ID (CZPRC); empty when unresolved or unassigned.
  platformId:          string;
}

export type ConnectionRow =
  | FamilyConnectionRow
  | TierGroupConnectionRow
  | GroupConnectionRow
  | RateSheetConnectionRow;

export interface ConnectionNavigationTab {
  id:          ConnectionTabId;
  label:       string;
  title:       string;
  description: string;
  rows:        ConnectionRow[];
  emptyState:  string;
}

export interface ConnectionNavigationCategory {
  id:          ConnectionCategoryId;
  title:       string;
  description: string;
  summary:     string;
  tabs:        ConnectionNavigationTab[];
}

// The Connections lane's flat presentation of the same three tabs, in the
// fixed Family Group / Groups / Rate Sheet order the lower-deck browser
// renders. It reshapes the existing category/tab projection into one ordered
// list; it derives no relationship, row, status or target of its own.
export type ConnectionSectionId = 'family-group' | 'groups' | 'rate-sheet';

export interface ConnectionSection {
  id:         ConnectionSectionId;
  label:      string;
  rows:       ConnectionRow[];
  emptyState: string;
}

export function flattenConnectionSections(
  categories: ConnectionNavigationCategory[],
): ConnectionSection[] {
  const stations = categories.find((category) => category.id === 'stations');
  const tools = categories.find((category) => category.id === 'tools');
  const familyTab    = stations?.tabs.find((tab) => tab.id === 'family-groups');
  const groupsTab     = stations?.tabs.find((tab) => tab.id === 'groups');
  const rateSheetTab = tools?.tabs.find((tab) => tab.id === 'rate-sheets');
  return [
    { id: 'family-group', label: 'Family Group', rows: familyTab?.rows ?? [],    emptyState: familyTab?.emptyState ?? '' },
    { id: 'groups',       label: 'Groups',       rows: groupsTab?.rows ?? [],     emptyState: groupsTab?.emptyState ?? '' },
    { id: 'rate-sheet',   label: 'Rate Sheet',   rows: rateSheetTab?.rows ?? [], emptyState: rateSheetTab?.emptyState ?? '' },
  ];
}

export interface ConnectionNavigationInput {
  family: WorkspaceFamilyScope | null;
  groups: readonly DeckRateSheetGroupConnection[];
  rateSheet: DeckRateSheetConnection | null;
  hasFocusedTier: boolean;
}

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * The connected Package Family row.
 *
 * One derivation serves both scopes that read this relationship: the focused
 * Tier's Connections lane, and the whole-focus Settings lane the Family Group
 * leads. Neither invents a second identity, status, count, target or action set
 * for the same record.
 */
export function projectFamilyConnectionRows(
  family: WorkspaceFamilyScope | null,
): FamilyConnectionRow[] {
  return family === null ? [] : [{
    id:               family.id,
    kind:             'family',
    name:             family.name,
    reference:        family.id,
    status:           family.status,
    description:      family.description.trim(),
    assignedServices: family.dependents.services,
    platformId:       family.platformId,
    target:           { kind: 'package-family', familyId: family.id },
    actions:          ['view', 'edit'],
  }];
}

// Storage lifecycle → the shared pill vocabulary. `draft` is the Tier system's
// pending state, so it reports Pending; the two bin states keep their own
// names rather than being flattened into Disabled.
const TIER_GROUP_ROW_STATUS: Record<TierInstanceStatus, TierGroupRowStatus> = {
  draft:    'pending',
  active:   'active',
  disabled: 'disabled',
  archived: 'archived',
  trashed:  'trashed',
};

/**
 * One parent Tier Group / Tier System row.
 *
 * The Settings lane lists the whole Tier Group pool through this derivation, the
 * same way it lists the Family pool through `projectFamilyConnectionRows`. The
 * row addresses the parent system itself — never one of its Tier occupants or
 * fixed slots — so its target carries the instance id the registered Tier drawer
 * already opens, and it mints no route, status or action of its own.
 */
export function projectTierGroupConnectionRows(
  instance: TierInstanceRecord | null,
): TierGroupConnectionRow[] {
  if (instance === null) return [];
  // Registered occupants, split by selection mode. The occupant's presence in a
  // slot is the registration, so no lifecycle status filters this count — a
  // Pending or Disabled occupant is still registered. Binned occupants are not:
  // they have left their slot.
  const occupants = Object.values(instance.tiers)
    .map((slot) => slot?.current_occupant ?? null)
    .filter((occupant): occupant is NonNullable<typeof occupant> => occupant !== null);
  const addonCount = occupants.filter((occupant) => occupant.is_addon === true).length;
  return [{
    id:         instance.tier_instance_id,
    kind:       'tier-group',
    name:       instance.title,
    reference:  instance.tier_instance_id,
    status:     TIER_GROUP_ROW_STATUS[instance.status] ?? 'pending',
    platformId: instance.cz_platform_id,
    tierCount:  occupants.length - addonCount,
    addonCount,
    target:     { kind: 'tier-instance', instanceId: instance.tier_instance_id },
    actions:    ['view', 'edit'],
  }];
}

export function projectConnectionNavigation({
  family,
  groups,
  rateSheet,
  hasFocusedTier,
}: ConnectionNavigationInput): ConnectionNavigationCategory[] {
  const familyRows = projectFamilyConnectionRows(family);

  const groupRows: GroupConnectionRow[] = groups.map((group) => ({
    id:            `${group.rateSheetId}:${group.groupId}`,
    kind:          'group',
    name:          group.title,
    reference:     group.groupId,
    status:        group.status,
    connectedRows: group.connectedRows,
    coverage:      group.coverage,
    connectedInclusions: group.connectedInclusions,
    platformId:    group.platformId,
    target: {
      kind:        'rate-sheet-group',
      rateSheetId: group.rateSheetId,
      groupId:     group.groupId,
    },
    actions: ['view', 'edit'],
  }));

  const rateSheetRows: RateSheetConnectionRow[] = rateSheet === null ? [] : [{
    id:                  rateSheet.rateSheetId,
    kind:                'rate-sheet',
    name:                rateSheet.title,
    reference:           rateSheet.rateSheetId,
    status:              rateSheet.status,
    resolved:            rateSheet.resolved,
    connectedRows:       rateSheet.connectedRows,
    connectedInclusions: rateSheet.connectedInclusions,
    platformId:          rateSheet.platformId,
    target:              { kind: 'rate-sheet', rateSheetId: rateSheet.rateSheetId },
    actions:             rateSheet.resolved ? ['view', 'edit'] : ['view'],
  }];

  const stationSummary = [
    familyRows.length === 0 ? 'No Family' : countLabel(familyRows.length, 'Family', 'Families'),
    hasFocusedTier ? countLabel(groupRows.length, 'Group') : null,
  ].filter((part): part is string => part !== null).join(' · ');

  return [
    {
      id:          'stations',
      title:       'Stations',
      description: 'Package Station records connected to this Tier.',
      summary:     stationSummary,
      tabs: [
        {
          id:          'family-groups',
          label:       'Family Groups',
          title:       'Family Groups',
          description: 'The Package Family assigned through the Tier system assignment ledger.',
          rows:        familyRows,
          emptyState:  'This Tier system is assigned to no Package Family.',
        },
        {
          id:          'groups',
          label:       'Groups',
          title:       'Groups',
          description: 'Rate Sheet groups used by resolving rows selected by this Tier.',
          rows:        groupRows,
          emptyState:  hasFocusedTier
            ? 'This Tier uses no resolving row from a stored Rate Sheet group.'
            : 'Focus a configured Tier to see its connected groups.',
        },
      ],
    },
    {
      id:          'tools',
      title:       'Tools',
      description: 'Package authoring tools this Tier is connected to.',
      summary:     hasFocusedTier
        ? rateSheetRows.length === 0 ? 'No Rate Sheet' : countLabel(rateSheetRows.length, 'Rate Sheet')
        : 'Focus a Tier',
      tabs: [{
        id:          'rate-sheets',
        label:       'Rate Sheets',
        title:       'Rate Sheets',
        description: 'The Rate Sheet bound to this Tier, scoped to its connected rows.',
        rows:        rateSheetRows,
        emptyState:  hasFocusedTier
          ? 'This Tier has no Rate Sheet binding. Configure one in the Tier drawer.'
          : 'Focus a configured Tier to see its connected Rate Sheet.',
      }],
    },
  ];
}
