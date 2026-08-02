// Package Tier workspace — typed Connections navigation projection.
//
// This is the single Package-owned model behind the Connections selector cards,
// nested tabs, row counts, statuses, empty states, and drawer targets. It derives
// from the exact Family assignment and focused-Tier deck projections; it fetches,
// renders, mutates, and encodes no route.

import type { CategoryGroupStatus } from '@/admin-station/presentation/category-groups/types';
import type { PackageRateSheetStatus } from '../../types';
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
