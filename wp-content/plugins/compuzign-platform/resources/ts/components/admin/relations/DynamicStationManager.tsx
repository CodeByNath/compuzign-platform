import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import type { ExitGuard, StepContext } from '../ActionShell';
import { relationProvidersFor } from './registry';
import type { StationManagerScope } from './types';
import {
  createManagerCoordinatorState,
  managerFooterState,
  managerIsDirty,
  resetManagerDrafts,
  seedProviderReadModel,
} from './coordinator';
import type { ManagerCoordinatorState, ManagerProviderAdapter } from './coordinator';

type ManagerShellContext = Pick<
  StepContext,
  'setExitGuard' | 'confirmPendingExit' | 'cancelPendingExit' | 'setFooter'
>;

export function DynamicStationManager({
  scope,
  shell,
}: {
  scope: StationManagerScope;
  shell: ManagerShellContext;
}) {
  const registered = useMemo(
    () => relationProvidersFor(scope),
    [scope.stationType, scope.stationId],
  );
  const providers = registered as unknown as readonly ManagerProviderAdapter[];
  const [state, setState] = useState<ManagerCoordinatorState>(
    () => createManagerCoordinatorState(providers),
  );
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let next = createManagerCoordinatorState(providers);
    for (const provider of providers) next.loadStateByProvider[provider.key] = 'loading';
    setState(next);

    providers.forEach(async (provider) => {
      try {
        const readModel = await provider.load(scope, controller.signal);
        if (controller.signal.aborted) return;
        setState((current) => {
          const seeded = seedProviderReadModel(current, provider, scope, readModel);
          return {
            ...seeded,
            loadStateByProvider: { ...seeded.loadStateByProvider, [provider.key]: 'loaded' },
            loadErrorsByProvider: { ...seeded.loadErrorsByProvider, [provider.key]: null },
          };
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState((current) => ({
          ...current,
          loadStateByProvider: { ...current.loadStateByProvider, [provider.key]: 'error' },
          loadErrorsByProvider: {
            ...current.loadErrorsByProvider,
            [provider.key]: error instanceof Error ? error.message : `Could not load ${provider.label}.`,
          },
        }));
      }
    });
    return () => controller.abort();
  }, [providers, scope]);

  const dirty = managerIsDirty(state, providers);
  const footerState = managerFooterState(state, dirty);

  const exitGuard = useCallback<ExitGuard>(() => {
    if (!dirty) return true;
    setShowExitConfirmation(true);
    return false;
  }, [dirty]);

  useEffect(() => {
    shell.setExitGuard(exitGuard);
    return () => shell.setExitGuard(null);
  }, [exitGuard, shell.setExitGuard]);

  // ActionShell owns this one session footer. Phase 3A deliberately exposes no
  // misleading Save/Cancel buttons while provider controls are not rendered.
  useEffect(() => {
    shell.setFooter(null);
    return () => shell.setFooter(null);
  }, [shell.setFooter, footerState.saveDisabled]);

  const keepEditing = () => {
    setShowExitConfirmation(false);
    shell.cancelPendingExit();
  };
  const discardAndContinue = () => {
    setState((current) => resetManagerDrafts(current, providers));
    setShowExitConfirmation(false);
    shell.confirmPendingExit();
  };

  const errors = providers.flatMap((provider) => {
    const error = state.loadErrorsByProvider[provider.key];
    return error ? [{ key: provider.key, message: error }] : [];
  });
  const loading = providers.some((provider) => state.loadStateByProvider[provider.key] === 'loading');
  const active = providers.find((provider) => provider.key === state.activeProviderKey) ?? providers[0];
  const validationCount = Object.values(state.validationByProvider)
    .reduce((count, issues) => count + issues.length, 0);

  return (
    <section class="cz-manager-workspace" aria-labelledby="dynamic-station-manager-title">
      <header class="cz-manager-workspace__header">
        <div>
          <h3 id="dynamic-station-manager-title">Manager</h3>
          <p class="cz-sp-tier-table__muted">Coordinate structure and relationships for this station.</p>
        </div>
        <span class="cz-module-status-pill cz-module-status-pill--draft">
          {loading ? 'Loading' : errors.length ? 'Unavailable' : 'Ready'}
        </span>
      </header>

      <div class="cz-manager-workspace__dashboard" aria-label="Manager summary">
        <span>{providers.length} {providers.length === 1 ? 'provider' : 'providers'}</span>
        <span>{providers.filter((provider) => provider.access === 'writable').length} writable</span>
        <span>{validationCount} validation issues</span>
      </div>

      <nav class="cz-manager-workspace__providers" aria-label="Manager providers">
        {providers.map((provider) => (
          <span
            key={provider.key}
            class={provider.key === active?.key ? 'is-active' : undefined}
          >
            {provider.label}
          </span>
        ))}
      </nav>

      <div class="cz-manager-workspace__sections">
        {loading && <p>Loading provider workspace…</p>}
        {errors.length > 0 && (
          <div class="cz-admin-error-msg" role="alert">
            {errors.map((error) => <p key={error.key}>{error.message}</p>)}
          </div>
        )}
        {!loading && errors.length === 0 && active && (
          <>
            <h4>{active.label}</h4>
            <p class="cz-sp-tier-table__muted">
              {active.manager.sections.map((section) => section.id).join(' · ')} sections are registered.
              Controls arrive in the next Manager phase.
            </p>
          </>
        )}
      </div>

      {showExitConfirmation && (
        <div class="cz-publish-confirm-overlay">
          <div class="cz-publish-confirm" role="dialog" aria-modal="true" aria-labelledby="manager-exit-title">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title" id="manager-exit-title">Unsaved Manager changes</h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">Discard changes across all Manager providers and continue?</p>
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={discardAndContinue}>Discard</button>
              <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={keepEditing}>Keep editing</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
