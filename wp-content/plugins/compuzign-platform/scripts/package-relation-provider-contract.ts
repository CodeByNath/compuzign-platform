import type { PackageRelationReadModel } from '../resources/ts/components/admin/relations/providers/package';
import {
  createPackageRelationDraft,
  createPackageRelationGroup,
  deletePackageRelationGroup,
  movePackageRelationGroup,
  packageRelationProvider,
  projectPackageReadModelForTier,
  renamePackageRelationGroup,
  updatePackageRelationDecision,
} from '../resources/ts/components/admin/relations/providers/package';
import {
  providersExposeManager,
  relationProvidersFor,
} from '../resources/ts/components/admin/relations/registry';
import {
  collectManagerValidation,
  createManagerCoordinatorState,
  managerIsDirty,
  resetManagerDrafts,
  seedProviderReadModel,
} from '../resources/ts/components/admin/relations/coordinator';
import type { ManagerProviderAdapter } from '../resources/ts/components/admin/relations/coordinator';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package provider contract: ${message}`);
}

const readModel: PackageRelationReadModel = {
  service_id: 42,
  platform_status: 'active',
  has_configuration: true,
  groups: [{ group_id: 'core', label: 'Core', sort_order: 0 }],
  items: [
    {
      item_id: 'mgr_feature', source_type: 'inclusion', source_id: 'feature',
      resolved: { label: 'Feature' }, decorated_label: null, group_id: 'core',
      sort_order: 0, disabled: false, missing: false, module_transition: 'settled',
    },
    {
      item_id: 'mgr_question', source_type: 'faq', source_id: 'question',
      resolved: { question: 'Question?', answer: 'Answer.' }, decorated_label: null,
      group_id: null, sort_order: 1, disabled: false, missing: false,
      module_transition: 'not-configured',
    },
  ],
  rate_sheet: null,
  projections: {
    inclusions: [{ id: 'feature', label: 'Feature' }],
    faqs: [],
  },
  tierSubjects: [{
    id: 'essential',
    label: 'Essential',
    detail: {
      label: 'Essential', price: 10, contact: false, billing_cycle: 'monthly',
      inclusions_override: [{ id: 'feature', label: 'Feature' }], features: [],
      faq_refs: ['question'], enabled: true,
    },
    status: 'active',
    notes: [],
  }],
};

const scope = {
  kind: 'connection-graph' as const,
  stationContext: { type: 'service' as const, id: 42 },
};

const original = createPackageRelationDraft(readModel);
check(original.explicitDecisionIds.length === 1, 'only persisted decisions seed the explicit set');
check(original.explicitDecisionIds[0] === 'mgr_feature', 'settled decision remains explicit');
check(!original.explicitDecisionIds.includes('mgr_question'), 'provisional row remains implicit');
check(!packageRelationProvider.isDirty(original, original, readModel), 'fresh draft is clean');

const withNewGroup = createPackageRelationGroup(original, 'tmp_group_1');
check(readModel.groups.length === 1, 'group creation does not mutate the GET read model');
check(withNewGroup.groups[1].label === 'New group' && withNewGroup.groups[1].sort_order === 1, 'new group appends with a stable supplied identity');
check(packageRelationProvider.isDirty(withNewGroup, original, readModel), 'group creation marks the provider dirty');
const renamedGroup = renamePackageRelationGroup(withNewGroup, 'tmp_group_1', '  Optional  ');
check(renamedGroup.groups[1].label === 'Optional', 'rename trims the draft label');
const reorderedGroups = movePackageRelationGroup(renamedGroup, 'tmp_group_1', -1);
check(reorderedGroups.groups[0].group_id === 'tmp_group_1' && reorderedGroups.groups[0].sort_order === 0, 'move normalizes deterministic order');
const groupedQuestion = updatePackageRelationDecision(reorderedGroups, 'mgr_question', { group_id: 'tmp_group_1' });
const deletedGroup = deletePackageRelationGroup(groupedQuestion, 'tmp_group_1');
check(deletedGroup.itemsById.mgr_question.group_id === null, 'delete reassigns relationships to Ungrouped');
check(deletedGroup.groups.length === 1 && deletedGroup.groups[0].sort_order === 0, 'delete normalizes remaining order');
check(readModel.items[1].group_id === null, 'group operations leave source relationships unchanged');
const invalidGroupLabel = renamePackageRelationGroup(withNewGroup, 'tmp_group_1', '   ');
const invalidGroupResult = packageRelationProvider.validate(invalidGroupLabel, readModel, {
  ...scope,
});
check(!invalidGroupResult.valid && invalidGroupResult.issues.some((issue) => (
  issue.sectionId === 'groups' && issue.rowIdentity === 'tmp_group_1' && issue.path.endsWith('.label')
)), 'empty group labels route to the exact Groups control');
const invalidOrder = { ...withNewGroup, groups: withNewGroup.groups.map((group) => ({ ...group, sort_order: 0 })) };
check(!packageRelationProvider.validate(invalidOrder, readModel, {
  ...scope,
}).valid, 'non-deterministic group order fails validation');

const edited = updatePackageRelationDecision(original, 'mgr_question', { disabled: true });
check(edited.explicitDecisionIds.includes('mgr_question'), 'editing marks a provisional row explicit');
check(packageRelationProvider.isDirty(edited, original, readModel), 'explicit edit is dirty');
check(packageRelationProvider.validate(edited, readModel, {
  ...scope,
}).valid, 'valid explicit decisions pass provider validation');

const invalid = {
  ...edited,
  itemsById: {
    ...edited.itemsById,
    mgr_question: { ...edited.itemsById.mgr_question, group_id: 'missing-group' },
  },
};
check(!packageRelationProvider.validate(invalid, readModel, {
  ...scope,
}).valid, 'unknown groups fail provider validation');

const providers = relationProvidersFor(scope);
check(providers.length === 1 && providers[0].key === 'package', 'registry discovers Package by scope');
check(providersExposeManager(providers), 'Package writable capabilities expose Manager');
check(packageRelationProvider.manager.summary === undefined, 'Package does not declare a duplicated static Manager summary');
check(packageRelationProvider.manager.sections.length === 3, 'Package declares Rate Sheets plus the existing two sections');
check(packageRelationProvider.manager.sections[0].id === 'rate-sheets', 'Rate Sheets is directly above Groups');
check(packageRelationProvider.manager.sections[1].id === 'groups', 'Package keeps Groups structure');
check(packageRelationProvider.manager.sections[2].id === 'relationships', 'Package keeps one Relationships section');
check(packageRelationProvider.manager.sections[2].capabilities.includes('availability'), 'availability stays a capability');
const managerSummaries = packageRelationProvider.manager.subjectSummaries?.(readModel, {
  ...scope,
}) ?? [];
check(managerSummaries.length === 1 && managerSummaries[0].title === 'Package Essential', 'All projects every canonical Tier summary');
check(managerSummaries[0].fields.map((field) => field.id).join(',') === 'pricing,includes', 'Tier summary exposes canonical pricing and inclusion fields');
check(packageRelationProvider.manager.destinationActions === undefined, 'Package does not declare a separate View all action');
const rateSheetSection = packageRelationProvider.manager.sections[0];
const emptyRateSheetProjection = rateSheetSection.project(readModel, { ...scope });
check(emptyRateSheetProjection.role === 'rate-sheet' && !emptyRateSheetProjection.configured, 'Rate Sheet begins not configured');
const rateSheetDraft = rateSheetSection.rateSheetControls!.replace(original, {
  title: 'Infrastructure',
  groups: [{ id: 'compute', label: 'Compute' }],
  items: [{ id: 'rate-1', optionId: 'mgr_feature', unitPrice: 36, per: 'Per VM', quantity: 2, groupId: 'compute' }],
}) as typeof original;
check(packageRelationProvider.isDirty(rateSheetDraft, original, readModel), 'Rate Sheet edits participate in Package provider dirty state');
check(packageRelationProvider.validate(rateSheetDraft, readModel, { ...scope }).valid, 'valid Rate Sheet passes provider validation');
const invalidRateSheet = { ...rateSheetDraft, rateSheet: { ...rateSheetDraft.rateSheet!, items: [{ ...rateSheetDraft.rateSheet!.items[0], source_item_id: 'unknown' }] } };
check(!packageRelationProvider.validate(invalidRateSheet, readModel, { ...scope }).valid, 'Rate Sheet options must use stable Package relationship identities');
const groupProjection = packageRelationProvider.manager.sections[1].project(readModel, {
  ...scope,
});
check(groupProjection.role === 'structure' && groupProjection.rows[0].relationshipCount === 1, 'Groups projects relationship counts');
const relationshipProjection = packageRelationProvider.manager.sections[2].project(readModel, {
  ...scope,
});
check(relationshipProjection.role === 'relations', 'Relationships uses one relation projection');
if (relationshipProjection.role === 'relations') {
  check(relationshipProjection.filters.map((filter) => filter.label).join(',') === 'All,Features,Common Questions,Attention', 'Features and questions are filters');
  check(relationshipProjection.rows[0].availability === 'Available', 'availability uses the settled active consumer gate');
  check(relationshipProjection.rows[1].availability === 'Not available', 'provisional enabled row is not falsely available');
  check(relationshipProjection.rows[1].stateDetail === 'Provisional', 'provisional semantics remain visible');
}
const draftGroupProjection = packageRelationProvider.manager.sections[1].project(readModel, {
  ...scope,
}, groupedQuestion);
check(draftGroupProjection.role === 'structure' && draftGroupProjection.rows[0].order === 1, 'Groups displays human-facing 1-based order');
const draftRelationshipProjection = packageRelationProvider.manager.sections[2].project(readModel, {
  ...scope,
}, groupedQuestion);
check(draftRelationshipProjection.role === 'relations' && draftRelationshipProjection.rows[1].groupLabel === 'Optional', 'Relationships immediately projects working group assignments');
const deletedRelationshipProjection = packageRelationProvider.manager.sections[2].project(readModel, {
  ...scope,
}, deletedGroup);
check(deletedRelationshipProjection.role === 'relations' && deletedRelationshipProjection.rows[1].groupLabel === 'Ungrouped', 'deleted group projects affected rows as Ungrouped');
check(
  relationProvidersFor({ kind: 'subject-connections', stationContext: scope.stationContext, subject: { type: 'promotion', id: 'promo' } }).length === 0,
  'registry does not leak Package into an unsupported subject scope',
);

const adapter = providers[0] as ManagerProviderAdapter;
let coordinator = createManagerCoordinatorState([adapter]);
check(!managerIsDirty(coordinator, [adapter]), 'unloaded writable providers are clean');
coordinator = seedProviderReadModel(coordinator, adapter, scope, readModel);
check(!managerIsDirty(coordinator, [adapter]), 'seeded writable draft is clean');
coordinator = {
  ...coordinator,
  draftByProvider: { ...coordinator.draftByProvider, package: edited },
};
check(managerIsDirty(coordinator, [adapter]), 'aggregate dirty delegates to provider.isDirty');
coordinator = collectManagerValidation(coordinator, [adapter], scope);
check(coordinator.validationByProvider.package.length === 0, 'valid draft has no routed issues');
coordinator = {
  ...coordinator,
  draftByProvider: { ...coordinator.draftByProvider, package: invalid },
};
coordinator = collectManagerValidation(coordinator, [adapter], scope);
check(coordinator.validationByProvider.package[0].sectionId === 'relationships', 'item validation routes to Relationships');
check(coordinator.validationByProvider.package[0].rowIdentity === 'mgr_question', 'validation retains row identity');
coordinator = resetManagerDrafts(coordinator, [adapter]);
check(!managerIsDirty(coordinator, [adapter]), 'discard resets every writable draft to its original');

const readOnly: ManagerProviderAdapter = {
  key: 'audit', label: 'Audit', access: 'read-only', capabilities: { fields: [] }, manager: { order: 200, sections: [] },
  load: async () => ({}),
  isDirty: () => true,
};
let readOnlyState = createManagerCoordinatorState([readOnly]);
readOnlyState = seedProviderReadModel(readOnlyState, readOnly, scope, { changed: true });
check(!managerIsDirty(readOnlyState, [readOnly]), 'read-only providers cannot contribute dirty state');

const inheritedTier = {
  label: 'Essential', price: 10, contact: false, billing_cycle: 'monthly',
  inclusions_override: [], features: [], faq_refs: ['question'], enabled: true,
};
const inheritedProjection = await projectPackageReadModelForTier(readModel, inheritedTier, readModel.tierSubjects);
check(inheritedProjection.items.map((item) => item.item_id).join(',') === 'mgr_feature,mgr_question', 'Tier projection retains canonical Package item ids');
check(inheritedProjection.items.some((item) => item.source_type === 'inclusion'), 'empty inclusion override inherits the available Package projection');
check(inheritedProjection.items.some((item) => item.source_type === 'faq'), 'Tier FAQ participation filters by canonical source id');
check(inheritedProjection.groups.length === 1 && inheritedProjection.groups[0].group_id === 'core', 'Tier projection retains only groups containing visible relationships');

const missingTier = {
  ...inheritedTier,
  inclusions_override: [{ id: 'removed-feature', label: 'Removed feature', missing: true }],
  faq_refs: ['removed-question'],
};
const missingProjection = await projectPackageReadModelForTier(readModel, missingTier, readModel.tierSubjects);
check(missingProjection.items.length === 2 && missingProjection.items.every((item) => item.missing), 'missing selected Tier sources remain visible and unhealthy');
check(missingProjection.items.every((item) => item.item_id.startsWith('mgr_')), 'missing sources use the canonical deterministic Package identity format');
check(missingProjection.groups.length === 0, 'unrelated empty groups are hidden in Tier scope');

console.log('Package relation provider contract checks passed.');
