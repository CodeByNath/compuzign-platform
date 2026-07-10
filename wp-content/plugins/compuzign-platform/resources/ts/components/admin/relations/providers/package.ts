import {
  fetchPackageStationManager,
  savePackageStationManager,
} from '@/api/endpoints/admin';
import type {
  PackageManagerGroup,
  PackageManagerItem,
  PackageManagerItemDecision,
  PackageManagerReadModel,
} from '@/api/types/admin';
import {
  evaluateModule,
  packageManagerItemModule,
  packageManagerSummaryModule,
} from '@/components/admin/utils/moduleNotifications';
import type {
  ProviderValidationIssue,
  StationManagerScope,
  WritableRelationProvider,
} from '../types';

export interface PackageRelationScope extends StationManagerScope {
  stationType: 'package';
  stationId: number;
}

export interface PackageRelationIdentity {
  itemId: string;
  sourceType: PackageManagerItem['source_type'];
  sourceId: string;
}

export interface PackageRelationDraftItem extends PackageManagerItemDecision {
  group_id: string | null;
  sort_order: number;
  disabled: boolean;
  decorated_label: string | null;
}

export interface PackageRelationDraft {
  groups: PackageManagerGroup[];
  itemsById: Record<string, PackageRelationDraftItem>;
  // Only these rows are sent to the explicit-decision POST. Reconciled source
  // rows stay provisional until a control deliberately marks them explicit.
  explicitDecisionIds: string[];
}

function cloneGroups(groups: PackageManagerGroup[]): PackageManagerGroup[] {
  return groups
    .map((group) => ({ ...group }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

function itemDecision(item: PackageManagerItem): PackageRelationDraftItem {
  return {
    item_id:          item.item_id,
    source_type:      item.source_type,
    source_id:        item.source_id,
    group_id:         item.group_id,
    sort_order:       item.sort_order,
    disabled:         item.disabled,
    decorated_label: item.decorated_label,
  };
}

export function createPackageRelationDraft(readModel: PackageManagerReadModel): PackageRelationDraft {
  const itemsById: Record<string, PackageRelationDraftItem> = {};
  const explicitDecisionIds: string[] = [];

  for (const item of readModel.items) {
    itemsById[item.item_id] = itemDecision(item);
    if (item.module_transition !== 'not-configured') {
      explicitDecisionIds.push(item.item_id);
    }
  }

  return {
    groups: cloneGroups(readModel.groups),
    itemsById,
    explicitDecisionIds: explicitDecisionIds.sort(),
  };
}

// Shared capability controls use this helper so editing a provisional row
// turns it into an explicit upsert without persisting untouched siblings.
export function updatePackageRelationDecision(
  draft: PackageRelationDraft,
  itemId: string,
  patch: Partial<Pick<
    PackageRelationDraftItem,
    'group_id' | 'sort_order' | 'disabled' | 'decorated_label'
  >>,
): PackageRelationDraft {
  const current = draft.itemsById[itemId];
  if (!current) return draft;

  return {
    ...draft,
    itemsById: {
      ...draft.itemsById,
      [itemId]: { ...current, ...patch },
    },
    explicitDecisionIds: draft.explicitDecisionIds.includes(itemId)
      ? draft.explicitDecisionIds
      : [...draft.explicitDecisionIds, itemId].sort(),
  };
}

function comparableDraft(draft: PackageRelationDraft): unknown {
  return {
    groups: draft.groups.map((group) => ({
      group_id: group.group_id,
      label: group.label,
      sort_order: group.sort_order,
    })),
    decisions: [...draft.explicitDecisionIds].sort().map((id) => draft.itemsById[id]),
  };
}

function packageItemLabel(item: PackageManagerItem): string {
  if (item.source_type === 'faq') {
    return item.resolved && 'question' in item.resolved
      ? item.resolved.question
      : '(missing source)';
  }
  if (item.decorated_label) return item.decorated_label;
  return item.resolved && 'label' in item.resolved
    ? item.resolved.label
    : '(missing source)';
}

function packageItemAvailable(item: PackageManagerItem, platformStatus: string): boolean {
  return item.module_transition === 'settled'
    && platformStatus === 'active'
    && !item.disabled
    && !item.missing;
}

function packageAvailability(item: PackageManagerItem, platformStatus: string) {
  if (item.missing) return 'Missing source' as const;
  if (item.disabled) return 'Disabled' as const;
  return packageItemAvailable(item, platformStatus) ? 'Available' as const : 'Not available' as const;
}

export const packageRelationProvider: WritableRelationProvider<
  PackageRelationScope,
  PackageManagerReadModel,
  PackageManagerItem,
  PackageRelationIdentity,
  PackageRelationDraft
> = {
  key: 'package',
  label: 'Package',
  stationType: 'package',
  access: 'writable',
  capabilities: {
    fields: ['grouping', 'ordering', 'availability', 'decorated-label'],
  },
  manager: {
    summary: {
      label: 'Package Manager',
      subtitle: 'Manage how Service-owned features and common questions participate in this package.',
      project: (readModel) => ({
        status: evaluateModule(packageManagerSummaryModule, readModel.items, { platformStatus: readModel.platform_status }),
        metrics: [
          { id: 'features', label: readModel.items.filter((item) => item.source_type === 'inclusion').length === 1 ? 'feature' : 'features', value: readModel.items.filter((item) => item.source_type === 'inclusion').length },
          { id: 'questions', label: readModel.items.filter((item) => item.source_type === 'faq').length === 1 ? 'common question' : 'common questions', value: readModel.items.filter((item) => item.source_type === 'faq').length },
          { id: 'groups', label: readModel.groups.length === 1 ? 'group' : 'groups', value: readModel.groups.length },
          { id: 'configured', label: 'configured', value: readModel.items.filter((item) => item.module_transition !== 'not-configured').length },
          { id: 'available', label: 'available', value: readModel.items.filter((item) => packageItemAvailable(item, readModel.platform_status)).length },
          { id: 'missing', label: 'missing source', value: readModel.items.filter((item) => item.missing).length },
        ],
      }),
    },
    sections: [
      {
        id: 'groups', label: 'Groups', role: 'structure', capabilities: ['grouping', 'ordering'],
        emptyState: { title: 'No groups yet', description: 'Create groups to organize package relationships.' },
        validationPaths: ['groups'],
        project: (readModel) => ({
          role: 'structure',
          rows: [...readModel.groups].sort((a, b) => a.sort_order - b.sort_order).map((group) => ({
            id: group.group_id, label: group.label, order: group.sort_order,
            relationshipCount: readModel.items.filter((item) => item.group_id === group.group_id).length,
          })),
        }),
      },
      {
        id: 'relationships', label: 'Package Relationships', role: 'relations',
        capabilities: ['grouping', 'ordering', 'availability', 'decorated-label'],
        rows: (readModel) => readModel.items,
        identity: (row) => ({ itemId: row.item_id, sourceType: row.source_type, sourceId: row.source_id }),
        emptyState: { title: 'No relationships yet' },
        validationPaths: ['items'],
        project: (readModel) => {
          const groups = new Map(readModel.groups.map((group) => [group.group_id, group.label]));
          return {
            role: 'relations',
            filters: [
              { id: 'all', label: 'All' }, { id: 'features', label: 'Features' },
              { id: 'questions', label: 'Common Questions' }, { id: 'attention', label: 'Attention' },
            ],
            rows: [...readModel.items].sort((a, b) => a.sort_order - b.sort_order).map((item) => {
              const state = evaluateModule(packageManagerItemModule, item, { platformStatus: readModel.platform_status });
              const availability = packageAvailability(item, readModel.platform_status);
              return {
                id: item.item_id,
                filterIds: ['all', item.source_type === 'inclusion' ? 'features' : 'questions', ...(availability !== 'Available' || state.status !== 'active' ? ['attention'] : [])],
                sourceLabel: packageItemLabel(item),
                groupLabel: item.group_id ? groups.get(item.group_id) ?? 'Unknown group' : 'Ungrouped',
                order: item.sort_order,
                state,
                stateDetail: item.missing ? 'Missing source' : item.disabled ? 'Disabled' : item.module_transition === 'not-configured' ? 'Provisional' : item.module_transition === 'pending' ? 'Pending changes' : 'Configured',
                availability,
                sourceHealth: item.missing ? 'Missing' as const : 'Connected' as const,
              };
            }),
          };
        },
      },
    ],
  },

  appliesTo: (scope): scope is PackageRelationScope => (
    scope.stationType === 'package'
    && typeof scope.stationId === 'number'
    && Number.isInteger(scope.stationId)
    && scope.stationId > 0
  ),

  async load(scope, signal) {
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    const response = await fetchPackageStationManager(scope.stationId);
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    if (!response.success) throw new Error('Could not load the Package relation provider.');
    return response.manager;
  },

  rows: (readModel) => readModel.items,

  identity: (row) => ({
    itemId: row.item_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
  }),

  identityKey: (identity) => identity.itemId,

  display: (row) => ({
    label: packageItemLabel(row),
    description: row.source_type === 'inclusion' ? 'Feature' : 'Common Question',
  }),

  health: (row, readModel) => {
    const state = evaluateModule(packageManagerItemModule, row, {
      platformStatus: readModel.platform_status,
    });
    return {
      state,
      destinationAvailable: !row.missing,
      notes: state.notes,
    };
  },

  // Package rows reference Service-owned source children; no individual
  // destination drawer exists yet. Manager controls never edit source content.
  destination: () => null,

  createDraft: (readModel) => createPackageRelationDraft(readModel),

  isDirty: (draft, original) => (
    JSON.stringify(comparableDraft(draft)) !== JSON.stringify(comparableDraft(original))
  ),

  validate: (draft, readModel) => {
    const issues: ProviderValidationIssue[] = [];
    const groupIds = new Set<string>();

    draft.groups.forEach((group, index) => {
      if (!group.group_id.trim()) {
        issues.push({ path: `groups.${index}.group_id`, message: 'Group identity is required.' });
      } else if (groupIds.has(group.group_id)) {
        issues.push({ path: `groups.${index}.group_id`, message: 'Group identities must be unique.' });
      } else {
        groupIds.add(group.group_id);
      }
      if (!group.label.trim()) {
        issues.push({ path: `groups.${index}.label`, message: 'Group label is required.' });
      }
      if (!Number.isInteger(group.sort_order)) {
        issues.push({ path: `groups.${index}.sort_order`, message: 'Group order must be an integer.' });
      }
    });

    const sourceById = new Map(readModel.items.map((item) => [item.item_id, item]));
    for (const itemId of draft.explicitDecisionIds) {
      const decision = draft.itemsById[itemId];
      const source = sourceById.get(itemId);
      if (!decision || !source) {
        issues.push({ path: `items.${itemId}`, rowIdentity: itemId, message: 'Decision no longer matches a Manager source row.' });
        continue;
      }
      if (
        decision.item_id !== source.item_id
        || decision.source_type !== source.source_type
        || decision.source_id !== source.source_id
      ) {
        issues.push({ path: `items.${itemId}`, rowIdentity: itemId, message: 'Decision identity does not match its source.' });
      }
      if (decision.group_id !== null && !groupIds.has(decision.group_id)) {
        issues.push({ path: `items.${itemId}.group_id`, rowIdentity: itemId, message: 'Decision references an unknown group.' });
      }
      if (!Number.isInteger(decision.sort_order)) {
        issues.push({ path: `items.${itemId}.sort_order`, rowIdentity: itemId, message: 'Item order must be an integer.' });
      }
    }

    return issues.length > 0
      ? { valid: false, issues }
      : { valid: true, issues: [] };
  },

  async save(scope, draft) {
    const itemDecisions = draft.explicitDecisionIds.map((id) => draft.itemsById[id]);
    const response = await savePackageStationManager(scope.stationId, {
      groups: cloneGroups(draft.groups),
      item_decisions: itemDecisions,
    });
    if (!response.success) throw new Error(response.message || 'Could not save Package Manager.');
    return response.manager;
  },
};
