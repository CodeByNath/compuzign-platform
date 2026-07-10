import type { PackageManagerReadModel } from '../resources/ts/api/types/admin';
import {
  createPackageRelationDraft,
  packageRelationProvider,
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

const readModel: PackageManagerReadModel = {
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
  projections: {
    inclusions: [{ id: 'feature', label: 'Feature' }],
    faqs: [],
  },
};

const original = createPackageRelationDraft(readModel);
check(original.explicitDecisionIds.length === 1, 'only persisted decisions seed the explicit set');
check(original.explicitDecisionIds[0] === 'mgr_feature', 'settled decision remains explicit');
check(!original.explicitDecisionIds.includes('mgr_question'), 'provisional row remains implicit');
check(!packageRelationProvider.isDirty(original, original, readModel), 'fresh draft is clean');

const edited = updatePackageRelationDecision(original, 'mgr_question', { disabled: true });
check(edited.explicitDecisionIds.includes('mgr_question'), 'editing marks a provisional row explicit');
check(packageRelationProvider.isDirty(edited, original, readModel), 'explicit edit is dirty');
check(packageRelationProvider.validate(edited, readModel, {
  stationType: 'package', stationId: 42, context: {},
}).valid, 'valid explicit decisions pass provider validation');

const invalid = {
  ...edited,
  itemsById: {
    ...edited.itemsById,
    mgr_question: { ...edited.itemsById.mgr_question, group_id: 'missing-group' },
  },
};
check(!packageRelationProvider.validate(invalid, readModel, {
  stationType: 'package', stationId: 42, context: {},
}).valid, 'unknown groups fail provider validation');

const providers = relationProvidersFor({ stationType: 'package', stationId: 42, context: {} });
check(providers.length === 1 && providers[0].key === 'package', 'registry discovers Package by scope');
check(providersExposeManager(providers), 'Package writable capabilities expose Manager');
check(packageRelationProvider.manager.summary?.label === 'Package Manager', 'Package declares one summary');
check(packageRelationProvider.manager.sections.length === 2, 'Package declares exactly two sections');
check(packageRelationProvider.manager.sections[0].id === 'groups', 'Package declares Groups structure');
check(packageRelationProvider.manager.sections[1].id === 'relationships', 'Package declares one Relationships section');
check(packageRelationProvider.manager.sections[1].capabilities.includes('availability'), 'availability stays a capability');
const managerSummary = packageRelationProvider.manager.summary!.project(readModel, {
  stationType: 'package', stationId: 42, context: {},
});
check(managerSummary.status.status === 'pending-dim', 'provisional relationship keeps summary Pending');
check(managerSummary.metrics.map((metric) => metric.id).join(',') === 'features,questions,groups,configured,available,missing', 'summary exposes the six required counts');
const groupProjection = packageRelationProvider.manager.sections[0].project(readModel, {
  stationType: 'package', stationId: 42, context: {},
});
check(groupProjection.role === 'structure' && groupProjection.rows[0].relationshipCount === 1, 'Groups projects relationship counts');
const relationshipProjection = packageRelationProvider.manager.sections[1].project(readModel, {
  stationType: 'package', stationId: 42, context: {},
});
check(relationshipProjection.role === 'relations', 'Relationships uses one relation projection');
if (relationshipProjection.role === 'relations') {
  check(relationshipProjection.filters.map((filter) => filter.label).join(',') === 'All,Features,Common Questions,Attention', 'Features and questions are filters');
  check(relationshipProjection.rows[0].availability === 'Available', 'availability uses the settled active consumer gate');
  check(relationshipProjection.rows[1].availability === 'Not available', 'provisional enabled row is not falsely available');
  check(relationshipProjection.rows[1].stateDetail === 'Provisional', 'provisional semantics remain visible');
}
check(
  relationProvidersFor({ stationType: 'service', stationId: 42, context: {} }).length === 0,
  'registry does not leak Package into another station scope',
);

const scope = { stationType: 'package' as const, stationId: 42, context: {} };
const adapter = packageRelationProvider as unknown as ManagerProviderAdapter;
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
  key: 'audit', label: 'Audit', access: 'read-only', manager: { sections: [] },
  load: async () => ({}),
  isDirty: () => true,
};
let readOnlyState = createManagerCoordinatorState([readOnly]);
readOnlyState = seedProviderReadModel(readOnlyState, readOnly, scope, { changed: true });
check(!managerIsDirty(readOnlyState, [readOnly]), 'read-only providers cannot contribute dirty state');

console.log('Package relation provider contract checks passed.');
