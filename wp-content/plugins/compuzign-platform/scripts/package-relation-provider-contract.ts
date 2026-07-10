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
check(
  relationProvidersFor({ stationType: 'service', stationId: 42, context: {} }).length === 0,
  'registry does not leak Package into another station scope',
);

console.log('Package relation provider contract checks passed.');
