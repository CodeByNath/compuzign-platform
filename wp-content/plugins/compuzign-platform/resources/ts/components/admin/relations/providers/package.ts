import {
  fetchPackageStationManager,
  fetchServicePackageStation,
  savePackageStationManager,
} from '@/api/endpoints/admin';
import { PACKAGE_RATE_SHEET_UNITS } from '@/api/types/admin';
import type {
  PackageManagerGroup,
  PackageManagerItem,
  PackageManagerItemDecision,
  PackageManagerReadModel,
  PackageRateSheet,
  PackageSourceRelationship,
  SurfaceTierDetail,
} from '@/api/types/admin';
import {
  evaluateModule,
  getTierNotes,
  packageManagerItemModule,
} from '@/components/admin/utils/moduleNotifications';
import { resolveTierStatus } from '@/components/admin/utils/moduleStatus';
import type {
  ProviderValidationIssue,
  StationManagerScope,
  WritableRelationProvider,
} from '../types';

export type PackageRelationScope = StationManagerScope & {
  stationContext: { type: 'service'; id: number };
};

export interface PackageRelationReadModel extends PackageManagerReadModel {
  tierSubjects: readonly {
    id: string;
    label: string;
    detail: SurfaceTierDetail;
    status: string;
    notes: ReturnType<typeof getTierNotes>;
  }[];
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
  sources: PackageSourceRelationship[];
  groups: PackageManagerGroup[];
  rateSheet: PackageRateSheet | null;
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
    sources: readModel.sources.map((source) => ({ ...source })),
    groups: cloneGroups(readModel.groups),
    rateSheet: readModel.rate_sheet ? {
      title: readModel.rate_sheet.title,
      groups: cloneGroups(readModel.rate_sheet.groups),
      items: readModel.rate_sheet.items.map((item) => ({ ...item })),
    } : null,
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

function normalizePackageGroups(groups: PackageManagerGroup[]): PackageManagerGroup[] {
  return [...groups]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((group, index) => ({ ...group, sort_order: index }));
}

export function createPackageRelationGroup(draft: PackageRelationDraft, groupId: string): PackageRelationDraft {
  if (draft.groups.some((group) => group.group_id === groupId)) return draft;
  const groups = normalizePackageGroups(draft.groups);
  return { ...draft, groups: [...groups, { group_id: groupId, label: 'New group', sort_order: groups.length }] };
}

export function renamePackageRelationGroup(draft: PackageRelationDraft, groupId: string, label: string): PackageRelationDraft {
  const trimmed = label.trim();
  return { ...draft, groups: draft.groups.map((group) => (
    group.group_id === groupId ? { ...group, label: trimmed } : group
  )) };
}

export function movePackageRelationGroup(draft: PackageRelationDraft, groupId: string, direction: -1 | 1): PackageRelationDraft {
  const groups = normalizePackageGroups(draft.groups);
  const from = groups.findIndex((group) => group.group_id === groupId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= groups.length) return draft;
  [groups[from], groups[to]] = [groups[to], groups[from]];
  return { ...draft, groups: groups.map((group, index) => ({ ...group, sort_order: index })) };
}

export function deletePackageRelationGroup(draft: PackageRelationDraft, groupId: string): PackageRelationDraft {
  let next = { ...draft, groups: normalizePackageGroups(draft.groups.filter((group) => group.group_id !== groupId)) };
  for (const item of Object.values(draft.itemsById)) {
    if (item.group_id === groupId) next = updatePackageRelationDecision(next, item.item_id, { group_id: null });
  }
  return next;
}

function comparableDraft(draft: PackageRelationDraft): unknown {
  return {
    groups: draft.groups.map((group) => ({
      group_id: group.group_id,
      label: group.label,
      sort_order: group.sort_order,
    })),
    sources: draft.sources,
    decisions: [...draft.explicitDecisionIds].sort().map((id) => draft.itemsById[id]),
    rate_sheet: draft.rateSheet,
  };
}

function replacePackageRateSheet(
  draft: PackageRelationDraft,
  input: {
    title: string;
    groups: readonly { id: string; label: string }[];
    items: readonly { id: string; optionId: string; unitPrice: number; per: string; quantity: number; groupId: string | null }[];
  },
): PackageRelationDraft {
  return {
    ...draft,
    rateSheet: {
      title: input.title,
      groups: input.groups.map((group, index) => ({ group_id: group.id, label: group.label, sort_order: index })),
      items: input.items.map((item, index) => ({
        item_id: item.id,
        source_item_id: item.optionId,
        unit_price: item.unitPrice,
        per: item.per as PackageRateSheet['items'][number]['per'],
        quantity: item.quantity,
        group_id: item.groupId,
        sort_order: index,
      })),
    },
  };
}

export function onboardPackageRateSheetOptions(
  draft: PackageRelationDraft,
  optionIds: readonly string[],
  rateSheet: Parameters<typeof replacePackageRateSheet>[1],
): PackageRelationDraft {
  const accepted = optionIds.filter((id, index) => (
    Object.prototype.hasOwnProperty.call(draft.itemsById, id) && optionIds.indexOf(id) === index
  ));
  return replacePackageRateSheet({
    ...draft,
    explicitDecisionIds: Array.from(new Set([...draft.explicitDecisionIds, ...accepted])).sort(),
  }, rateSheet);
}

export function connectPackageServiceSources(
  draft: PackageRelationDraft,
  serviceIds: readonly number[],
): PackageRelationDraft {
  const existing = new Set(draft.sources.map((source) => `${source.provider_key}:${source.entity_type}:${source.entity_id}`));
  const sources = [...draft.sources];
  for (const entityId of serviceIds) {
    const identity = `service:service:${entityId}`;
    if (!Number.isInteger(entityId) || entityId < 1 || existing.has(identity)) continue;
    existing.add(identity);
    sources.push({
      relationship_id: `source_service_${entityId}`,
      provider_key: 'service', entity_type: 'service', entity_id: entityId,
      sort_order: sources.length,
    });
  }
  return { ...draft, sources };
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

async function canonicalPackageItemId(sourceType: PackageManagerItem['source_type'], sourceId: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${sourceType}:${sourceId}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
  return `mgr_${hex.slice(0, 16)}`;
}

export async function projectPackageReadModelForTier(
  readModel: PackageManagerReadModel,
  tier: SurfaceTierDetail,
  tierSubjects: PackageRelationReadModel['tierSubjects'],
): Promise<PackageRelationReadModel> {
  const tierInclusions = tier.inclusions_override;
  const tierFaqRefs = tier.drafts?.faqs ?? tier.faq_refs;
  const inheritedInclusionIds = readModel.projections.inclusions.map((item) => item.id);
  const inclusionIds = new Set(
    tierInclusions.length > 0 ? tierInclusions.map((item) => item.id) : inheritedInclusionIds,
  );
  const faqIds = new Set(tierFaqRefs);
  const items = readModel.items.filter((item) => (
    item.source_type === 'inclusion' ? inclusionIds.has(item.source_id) : faqIds.has(item.source_id)
  ));
  const existingKeys = new Set(items.map((item) => `${item.source_type}:${item.source_id}`));
  for (const inclusion of tierInclusions) {
    if (!inclusionIds.has(inclusion.id) || existingKeys.has(`inclusion:${inclusion.id}`)) continue;
    items.push({
      item_id: await canonicalPackageItemId('inclusion', inclusion.id),
      source_type: 'inclusion', source_id: inclusion.id, resolved: { label: inclusion.label },
      decorated_label: null, group_id: null, sort_order: items.length,
      disabled: false, missing: true, module_transition: 'not-configured',
    });
  }
  for (const faqId of faqIds) {
    if (existingKeys.has(`faq:${faqId}`)) continue;
    items.push({
      item_id: await canonicalPackageItemId('faq', faqId),
      source_type: 'faq', source_id: faqId, resolved: null,
      decorated_label: null, group_id: null, sort_order: items.length,
      disabled: false, missing: true, module_transition: 'not-configured',
    });
  }
  const visibleGroupIds = new Set(items.map((item) => item.group_id).filter((id): id is string => id !== null));
  return {
    ...readModel,
    groups: readModel.groups.filter((group) => visibleGroupIds.has(group.group_id)),
    items,
    projections: {
      inclusions: readModel.projections.inclusions.filter((item) => inclusionIds.has(item.id)),
      faqs: readModel.projections.faqs.filter((item) => faqIds.has(item.id)),
    },
    tierSubjects,
  };
}

export const packageRelationProvider: WritableRelationProvider<
  PackageRelationScope,
  PackageRelationReadModel,
  PackageManagerItem,
  PackageRelationIdentity,
  PackageRelationDraft
> = {
  key: 'package',
  label: 'Packages',
  stationType: 'service',
  access: 'writable',
  capabilities: {
    fields: ['grouping', 'ordering', 'availability', 'decorated-label'],
  },
  profile: (scope) => {
    const applicable = scope.stationContext.type === 'service'
      && typeof scope.stationContext.id === 'number'
      && (scope.kind === 'connection-graph' || scope.subject?.type === 'tier');
    const writable = applicable && scope.kind === 'connection-graph';
    return {
      applicable,
      access: writable ? 'writable' : 'read-only',
      capabilities: {
        fields: writable ? ['grouping', 'ordering', 'availability', 'decorated-label'] : [],
      },
    };
  },
  manager: {
    order: 100,
    subjects: (readModel) => readModel.tierSubjects.map((tier) => ({
      ref: { type: 'tier', id: tier.id },
      label: tier.label,
    })),
    subjectSummaries: (readModel, scope) => readModel.tierSubjects
      .filter((tier) => scope.kind === 'connection-graph' || String(scope.subject.id) === tier.id)
      .map((tier) => ({
        ref: { type: 'tier', id: tier.id },
        label: tier.label,
        title: `Package ${tier.label}`,
        subtitle: 'Pricing and inclusions for this tier.',
        status: { status: tier.status, notes: tier.notes },
        fields: [
          {
            id: 'pricing',
            label: 'Pricing',
            values: tier.detail.contact && tier.detail.price === null
              ? ['Contact', tier.detail.billing_cycle ?? 'Not available']
              : [tier.detail.price != null ? `$${tier.detail.price.toFixed(2)}` : 'Not configured', tier.detail.billing_cycle ?? 'Not available'],
          },
          {
            id: 'includes',
            label: 'Includes',
            values: [
              `${tier.detail.inclusions_override.length} ${tier.detail.inclusions_override.length === 1 ? 'feature' : 'features'}`,
              `${tier.detail.faq_refs.length} ${tier.detail.faq_refs.length === 1 ? 'common question' : 'common questions'}`,
            ],
          },
        ],
    })),
    sections: [
      {
        id: 'rate-sheets', label: 'Rate Sheets', role: 'rate-sheet', capabilities: [],
        emptyState: {
          title: 'Rate Sheet',
          description: 'Create a rate sheet to define service options, pricing, units, and inclusion groups for this Service.',
        },
        validationPaths: ['rateSheet'],
        project: (readModel, _scope, candidate) => {
          const draft = candidate as PackageRelationDraft | undefined;
          const rateSheet = draft?.rateSheet ?? readModel.rate_sheet;
          const groups = rateSheet?.groups ?? [];
          const groupLabels = new Map(groups.map((group) => [group.group_id, group.label]));
          const optionLabels = new Map(readModel.items.map((item) => [item.item_id, packageItemLabel(item)]));
          return {
            role: 'rate-sheet',
            configured: rateSheet !== null,
            title: rateSheet?.title ?? '',
            groups: groups.map((group) => ({ id: group.group_id, label: group.label })),
            options: readModel.items.map((item) => ({
              id: item.item_id, label: packageItemLabel(item),
              sourceType: item.source_type, sourceId: item.source_id,
            })),
            units: PACKAGE_RATE_SHEET_UNITS,
            items: (rateSheet?.items ?? []).map((item) => ({
              id: item.item_id,
              optionId: item.source_item_id,
              optionLabel: optionLabels.get(item.source_item_id) ?? '(missing source)',
              unitPrice: item.unit_price,
              per: item.per,
              quantity: item.quantity,
              groupId: item.group_id,
              groupLabel: item.group_id ? groupLabels.get(item.group_id) ?? 'Unknown group' : 'Ungrouped',
            })),
          };
        },
        rateSheetControls: {
          sourcePicker: { enabled: true },
          connectSources: (draft, entityIds) => connectPackageServiceSources(draft as PackageRelationDraft, entityIds),
          replace: (draft, rateSheet) => replacePackageRateSheet(draft as PackageRelationDraft, rateSheet),
          onboard: (draft, optionIds, rateSheet) => onboardPackageRateSheetOptions(
            draft as PackageRelationDraft, optionIds, rateSheet,
          ),
        },
      },
      {
        id: 'groups', label: 'Groups', role: 'structure', capabilities: ['grouping', 'ordering'],
        emptyState: { title: 'No groups yet', description: 'Create groups to organize package relationships.' },
        validationPaths: ['groups'],
        project: (readModel, _scope, candidate) => {
          const draft = candidate as PackageRelationDraft | undefined;
          const groups = draft?.groups ?? readModel.groups;
          return {
            role: 'structure',
            rows: normalizePackageGroups(groups).map((group, index) => ({
              id: group.group_id, label: group.label, order: index + 1,
              relationshipCount: readModel.items.filter((item) => (
                (draft?.itemsById[item.item_id]
                  ? draft.itemsById[item.item_id].group_id
                  : item.group_id) === group.group_id
              )).length,
            })),
          };
        },
        structureControls: {
          create: (draft, groupId) => createPackageRelationGroup(draft as PackageRelationDraft, groupId),
          rename: (draft, groupId, label) => renamePackageRelationGroup(draft as PackageRelationDraft, groupId, label),
          move: (draft, groupId, direction) => movePackageRelationGroup(draft as PackageRelationDraft, groupId, direction),
          delete: (draft, groupId) => deletePackageRelationGroup(draft as PackageRelationDraft, groupId),
        },
      },
      {
        id: 'relationships', label: 'Package Relationships', role: 'relations',
        capabilities: ['grouping', 'ordering', 'availability', 'decorated-label'],
        rows: (readModel) => readModel.items,
        identity: (row) => ({ itemId: row.item_id, sourceType: row.source_type, sourceId: row.source_id }),
        emptyState: { title: 'No relationships yet' },
        validationPaths: ['items'],
        project: (readModel, _scope, candidate) => {
          const draft = candidate as PackageRelationDraft | undefined;
          const groups = new Map((draft?.groups ?? readModel.groups).map((group) => [group.group_id, group.label]));
          return {
            role: 'relations',
            filters: [
              { id: 'all', label: 'All' }, { id: 'features', label: 'Features' },
              { id: 'questions', label: 'Common Questions' }, { id: 'attention', label: 'Attention' },
            ],
            rows: [...readModel.items].sort((a, b) => a.sort_order - b.sort_order).map((source) => {
              const decision = draft?.itemsById[source.item_id];
              const item = decision ? { ...source, ...decision } : source;
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
    scope.stationContext.type === 'service'
    && typeof scope.stationContext.id === 'number'
    && Number.isInteger(scope.stationContext.id)
    && scope.stationContext.id > 0
    && (scope.kind === 'connection-graph'
      || (scope.kind === 'subject-connections' && scope.subject?.type === 'tier'))
  ),

  async load(scope, signal) {
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    const serviceId = scope.stationContext.id;
    const [response, stationResponse] = await Promise.all([
      fetchPackageStationManager(serviceId),
      fetchServicePackageStation(serviceId),
    ]);
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    if (!response.success || !stationResponse.success) throw new Error('Could not load the Package relation provider.');

    const tierSubjects = Object.entries(stationResponse.station.tiers).map(([id, tier]) => {
      const overview = tier.drafts?.overview;
      const detail: SurfaceTierDetail = {
        ...tier,
        label: overview?.label ?? tier.label,
        price: overview?.price ?? tier.price,
        contact: overview?.contact ?? tier.contact,
        billing_cycle: overview?.billing_cycle ?? tier.billing_cycle,
        inclusions_override: tier.inclusions_override,
        faq_refs: tier.drafts?.faqs ?? tier.faq_refs,
      };
      const tierLike = {
        enabled: detail.enabled,
        price: detail.price,
        billing_cycle: detail.billing_cycle,
        contact: detail.contact,
      };
      return {
        id,
        label: detail.label?.trim() || id.replace(/(^|[-_])\w/g, (part) => part.replace(/[-_]/, ' ').toUpperCase()),
        detail,
        status: resolveTierStatus(tierLike, { pkgStatus: stationResponse.station.platform_status }),
        notes: getTierNotes(tierLike, { platformStatus: stationResponse.station.platform_status }),
      };
    });
    if (scope.kind === 'connection-graph') return { ...response.manager, tierSubjects };

    const tier = stationResponse.station.tiers[String(scope.subject?.id)] as SurfaceTierDetail | undefined;
    if (!tier) throw new Error('The selected Tier is not connected to this Package station.');
    return projectPackageReadModelForTier(response.manager, tier, tierSubjects);
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

    const orderedGroups = [...draft.groups].sort((a, b) => a.sort_order - b.sort_order);
    orderedGroups.forEach((group, index) => {
      if (!group.group_id.trim()) {
        issues.push({ path: `groups.${index}.group_id`, sectionId: 'groups', rowIdentity: group.group_id, message: 'Group identity is required.' });
      } else if (groupIds.has(group.group_id)) {
        issues.push({ path: `groups.${index}.group_id`, sectionId: 'groups', rowIdentity: group.group_id, message: 'Group identities must be unique.' });
      } else {
        groupIds.add(group.group_id);
      }
      if (!group.label.trim()) {
        issues.push({ path: `groups.${index}.label`, sectionId: 'groups', rowIdentity: group.group_id, message: 'Group label is required.' });
      }
      if (!Number.isInteger(group.sort_order)) {
        issues.push({ path: `groups.${index}.sort_order`, sectionId: 'groups', rowIdentity: group.group_id, message: 'Group order must be an integer.' });
      } else if (group.sort_order !== index) {
        issues.push({ path: `groups.${index}.sort_order`, sectionId: 'groups', rowIdentity: group.group_id, message: 'Group order must be contiguous and deterministic.' });
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

    if (draft.rateSheet) {
      if (!draft.rateSheet.title.trim()) {
        issues.push({ path: 'rateSheet.title', sectionId: 'rate-sheets', message: 'Rate Sheet title is required.' });
      }
      const rateGroupIds = new Set<string>();
      draft.rateSheet.groups.forEach((group, index) => {
        if (!group.group_id.trim() || rateGroupIds.has(group.group_id)) {
          issues.push({ path: `rateSheet.groups.${index}.group_id`, sectionId: 'rate-sheets', rowIdentity: group.group_id, message: 'Rate Sheet group identity must be unique.' });
        }
        rateGroupIds.add(group.group_id);
        if (!group.label.trim()) {
          issues.push({ path: `rateSheet.groups.${index}.label`, sectionId: 'rate-sheets', rowIdentity: group.group_id, message: 'Rate Sheet group label is required.' });
        }
      });
      const rateItemIds = new Set<string>();
      draft.rateSheet.items.forEach((item, index) => {
        if (!item.item_id.trim() || rateItemIds.has(item.item_id)) {
          issues.push({ path: `rateSheet.items.${index}.item_id`, sectionId: 'rate-sheets', rowIdentity: item.item_id, message: 'Rate Sheet item identity must be unique.' });
        }
        rateItemIds.add(item.item_id);
        if (!sourceById.has(item.source_item_id)) {
          issues.push({ path: `rateSheet.items.${index}.source_item_id`, sectionId: 'rate-sheets', rowIdentity: item.item_id, message: 'Select an available Package relationship.' });
        }
        if (!Number.isFinite(item.unit_price) || item.unit_price < 0) {
          issues.push({ path: `rateSheet.items.${index}.unit_price`, sectionId: 'rate-sheets', rowIdentity: item.item_id, message: 'Unit Price must be zero or greater.' });
        }
        if (!PACKAGE_RATE_SHEET_UNITS.includes(item.per)) {
          issues.push({ path: `rateSheet.items.${index}.per`, sectionId: 'rate-sheets', rowIdentity: item.item_id, message: 'Select a valid Rate Sheet unit.' });
        }
        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
          issues.push({ path: `rateSheet.items.${index}.quantity`, sectionId: 'rate-sheets', rowIdentity: item.item_id, message: 'Quantity must be a whole number of at least 1.' });
        }
        if (item.group_id !== null && !rateGroupIds.has(item.group_id)) {
          issues.push({ path: `rateSheet.items.${index}.group_id`, sectionId: 'rate-sheets', rowIdentity: item.item_id, message: 'Select a valid Rate Sheet group.' });
        }
      });
    }

    return issues.length > 0
      ? { valid: false, issues }
      : { valid: true, issues: [] };
  },

  async save(scope, draft, _original, readModel) {
    const itemDecisions = draft.explicitDecisionIds.map((id) => draft.itemsById[id]);
    const response = await savePackageStationManager(scope.stationContext.id, {
      sources: draft.sources,
      groups: cloneGroups(draft.groups),
      item_decisions: itemDecisions,
      rate_sheet: draft.rateSheet,
    });
    if (!response.success) throw new Error(response.message || 'Could not save Package Manager.');
    return { ...response.manager, tierSubjects: readModel.tierSubjects };
  },
};
