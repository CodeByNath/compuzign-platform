import type {
  ManagerContribution,
  ProviderValidationIssue,
  ProviderValidationResult,
  StationManagerScope,
} from './types';

export type ProviderLoadState = 'idle' | 'loading' | 'loaded' | 'error';
export type ProviderSaveState = 'idle' | 'saving' | 'error';

// Runtime-erased adapter used only at the provider registry boundary. Provider
// implementations remain fully generic and typed at their declaration sites.
export interface ManagerProviderAdapter {
  key: string;
  label: string;
  access: 'read-only' | 'writable';
  manager: ManagerContribution<any, any, any>;
  load(scope: StationManagerScope, signal?: AbortSignal): Promise<unknown>;
  createDraft?: (readModel: unknown, scope: StationManagerScope) => unknown;
  isDirty?: (draft: unknown, original: unknown, readModel: unknown) => boolean;
  validate?: (draft: unknown, readModel: unknown, scope: StationManagerScope) => ProviderValidationResult;
}

export interface RoutedValidationIssue extends ProviderValidationIssue {
  providerKey: string;
  sectionId?: string;
}

export interface ManagerCoordinatorState {
  readModelByProvider: Record<string, unknown>;
  originalDraftByProvider: Record<string, unknown>;
  draftByProvider: Record<string, unknown>;
  loadStateByProvider: Record<string, ProviderLoadState>;
  loadErrorsByProvider: Record<string, string | null>;
  validationByProvider: Record<string, readonly RoutedValidationIssue[]>;
  saveStateByProvider: Record<string, ProviderSaveState>;
  saveErrorsByProvider: Record<string, string | null>;
  activeProviderKey: string | null;
}

export function createManagerCoordinatorState(
  providers: readonly ManagerProviderAdapter[],
): ManagerCoordinatorState {
  const state: ManagerCoordinatorState = {
    readModelByProvider: {}, originalDraftByProvider: {}, draftByProvider: {},
    loadStateByProvider: {}, loadErrorsByProvider: {}, validationByProvider: {},
    saveStateByProvider: {}, saveErrorsByProvider: {},
    activeProviderKey: providers[0]?.key ?? null,
  };
  for (const provider of providers) {
    state.loadStateByProvider[provider.key] = 'idle';
    state.loadErrorsByProvider[provider.key] = null;
    state.validationByProvider[provider.key] = [];
    state.saveStateByProvider[provider.key] = 'idle';
    state.saveErrorsByProvider[provider.key] = null;
  }
  return state;
}

export function seedProviderReadModel(
  state: ManagerCoordinatorState,
  provider: ManagerProviderAdapter,
  scope: StationManagerScope,
  readModel: unknown,
): ManagerCoordinatorState {
  const next = { ...state, readModelByProvider: { ...state.readModelByProvider, [provider.key]: readModel } };
  if (provider.access === 'writable' && provider.createDraft) {
    const original = provider.createDraft(readModel, scope);
    next.originalDraftByProvider = { ...state.originalDraftByProvider, [provider.key]: original };
    next.draftByProvider = { ...state.draftByProvider, [provider.key]: provider.createDraft(readModel, scope) };
  }
  return next;
}

export function managerIsDirty(
  state: ManagerCoordinatorState,
  providers: readonly ManagerProviderAdapter[],
): boolean {
  return providers.some((provider) => provider.access === 'writable'
    && !!provider.isDirty
    && Object.prototype.hasOwnProperty.call(state.draftByProvider, provider.key)
    && Object.prototype.hasOwnProperty.call(state.originalDraftByProvider, provider.key)
    && Object.prototype.hasOwnProperty.call(state.readModelByProvider, provider.key)
    && provider.isDirty(
      state.draftByProvider[provider.key],
      state.originalDraftByProvider[provider.key],
      state.readModelByProvider[provider.key],
    ));
}

function routeIssue(provider: ManagerProviderAdapter, issue: ProviderValidationIssue): RoutedValidationIssue {
  const declared = issue.sectionId
    ? provider.manager.sections.find((section) => section.id === issue.sectionId)
    : provider.manager.sections.find((section) => section.validationPaths.some(
      (prefix) => issue.path === prefix || issue.path.startsWith(`${prefix}.`),
    ));
  return { ...issue, providerKey: provider.key, sectionId: declared?.id ?? issue.sectionId };
}

export function collectManagerValidation(
  state: ManagerCoordinatorState,
  providers: readonly ManagerProviderAdapter[],
  scope: StationManagerScope,
): ManagerCoordinatorState {
  const validationByProvider = { ...state.validationByProvider };
  for (const provider of providers) {
    if (provider.access !== 'writable' || !provider.validate) {
      validationByProvider[provider.key] = [];
      continue;
    }
    const result = provider.validate(
      state.draftByProvider[provider.key],
      state.readModelByProvider[provider.key],
      scope,
    );
    validationByProvider[provider.key] = result.issues.map((issue) => routeIssue(provider, issue));
  }
  return { ...state, validationByProvider };
}

export function resetManagerDrafts(
  state: ManagerCoordinatorState,
  providers: readonly ManagerProviderAdapter[],
): ManagerCoordinatorState {
  const drafts = { ...state.draftByProvider };
  const validation = { ...state.validationByProvider };
  for (const provider of providers) {
    if (provider.access !== 'writable') continue;
    drafts[provider.key] = state.originalDraftByProvider[provider.key];
    validation[provider.key] = [];
  }
  return { ...state, draftByProvider: drafts, validationByProvider: validation };
}

export function managerFooterState(state: ManagerCoordinatorState, dirty: boolean) {
  const loading = Object.values(state.loadStateByProvider).some((value) => value === 'loading');
  const saving = Object.values(state.saveStateByProvider).some((value) => value === 'saving');
  const valid = Object.values(state.validationByProvider).every((issues) => issues.length === 0);
  return { dirty, loading, saving, valid, saveDisabled: !dirty || loading || saving || !valid };
}
