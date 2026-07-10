import {
  aggregateProviderSaveResults,
  applyProviderSaveResults,
  createManagerCoordinatorState,
  managerIsDirty,
  orderManagerProviders,
  preserveActiveManagerProvider,
  providerCompositionIndicator,
  routeProviderDestination,
  seedProviderReadModel,
  selectManagerProvider,
  shouldShowProviderNavigation,
} from '../resources/ts/components/admin/relations/coordinator';
import type {
  ManagerCoordinatorState,
  ManagerProviderAdapter,
  ProviderSaveResult,
} from '../resources/ts/components/admin/relations/coordinator';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Manager coordinator contract: ${message}`);
}

const scope = { kind: 'connection-graph' as const, stationContext: { type: 'service' as const, id: 42 } };
const contribution = (order: number) => ({ order, sections: [] });
const writable = (key: string, order: number): ManagerProviderAdapter => ({
  key, label: key, access: 'writable', capabilities: { fields: ['grouping'] }, manager: contribution(order),
  load: async () => 1,
  createDraft: (readModel) => readModel,
  isDirty: (draft, original) => draft !== original,
  validate: () => ({ valid: true, issues: [] }),
});
const readOnly = (key: string, order: number): ManagerProviderAdapter => ({
  key, label: key, access: 'read-only', capabilities: { fields: [] }, manager: contribution(order),
  load: async () => 1,
  isDirty: () => true,
});

const alpha = writable('alpha', 100);
const beta = writable('beta', 20);
const audit = readOnly('audit', 10);

check(!shouldShowProviderNavigation([alpha]), 'one provider suppresses navigation');
check(shouldShowProviderNavigation([alpha, beta]), 'two real providers expose navigation');
check(orderManagerProviders([alpha, beta, audit]).map((provider) => provider.key).join(',') === 'audit,beta,alpha', 'provider order is deterministic metadata order');

let state = createManagerCoordinatorState([alpha, beta]);
check(state.activeProviderKey === 'beta', 'initial active provider uses deterministic order');
state = seedProviderReadModel(state, alpha, scope, 1);
state = seedProviderReadModel(state, beta, scope, 2);
state = { ...state, draftByProvider: { ...state.draftByProvider, alpha: 3 } };
const alphaDraft = state.draftByProvider.alpha;
const alphaReadModel = state.readModelByProvider.alpha;
state = selectManagerProvider(state, 'alpha', [alpha, beta]);
check(state.activeProviderKey === 'alpha', 'active provider selects by stable key');
state = selectManagerProvider(state, 'beta', [alpha, beta]);
check(state.draftByProvider.alpha === alphaDraft && state.readModelByProvider.alpha === alphaReadModel, 'selection preserves inactive provider state');
state = { ...state, activeProviderKey: 'alpha' };
check(preserveActiveManagerProvider(state, [beta, alpha]) === state, 'active key survives provider reordering');
check(preserveActiveManagerProvider(state, [beta]).activeProviderKey === 'beta', 'missing active provider falls back deterministically');

let readOnlyState = createManagerCoordinatorState([audit]);
readOnlyState = seedProviderReadModel(readOnlyState, audit, scope, 1);
check(!managerIsDirty(readOnlyState, [audit]), 'read-only provider is excluded from dirty state');
check(!Object.prototype.hasOwnProperty.call(readOnlyState.saveStateByProvider, 'audit'), 'read-only provider has no save state');
check(!providerCompositionIndicator(readOnlyState, audit).dirty, 'read-only indicator cannot become dirty');

const beforeSuccess = state;
const successResults: ProviderSaveResult[] = [{ providerKey: 'alpha', status: 'saved', readModel: 9 }];
const afterSuccess = applyProviderSaveResults(beforeSuccess, [alpha, beta], scope, successResults);
check(afterSuccess.readModelByProvider.alpha === 9, 'successful result replaces the provider read model');
check(afterSuccess.originalDraftByProvider.alpha === 9 && afterSuccess.draftByProvider.alpha === 9, 'successful result reseeds clean drafts');
check(!providerCompositionIndicator(afterSuccess, alpha).dirty, 'successful provider is clean');

const failedDraft = afterSuccess.draftByProvider.beta;
const failedResults: ProviderSaveResult[] = [{ providerKey: 'beta', status: 'failed', error: 'No connection' }];
const afterFailure = applyProviderSaveResults(afterSuccess, [alpha, beta], scope, failedResults);
check(afterFailure.draftByProvider.beta === failedDraft, 'failed result preserves the provider draft');
check(afterFailure.saveErrorsByProvider.beta === 'No connection', 'failed result retains provider error');

const partial = aggregateProviderSaveResults([...successResults, ...failedResults]);
check(!partial.complete, 'partial failure never reports complete success');
check(partial.savedProviderKeys[0] === 'alpha' && partial.failedProviderKeys[0] === 'beta', 'partial result separates successful and failed providers');

let pendingContinuation: (() => void) | null = null;
let destinationTarget = '';
let continued = false;
routeProviderDestination((intent, continuation) => {
  destinationTarget = intent.target;
  pendingContinuation = continuation;
}, 'alpha', 'row-7', () => { continued = true; });
check(destinationTarget === 'alpha:row-7' && !continued, 'destination uses provider-scoped guarded intent');
(pendingContinuation as (() => void) | null)?.();
check(continued, 'guard retains the exact destination continuation');

// Type-level assertion that provider-keyed state remains the coordinator shape.
const finalState: ManagerCoordinatorState = afterFailure;
check(finalState.activeProviderKey === 'alpha', 'save outcomes preserve active provider selection');

console.log('Manager coordinator contract checks passed.');
