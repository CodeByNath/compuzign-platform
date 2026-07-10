import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import type { ExitGuard, StepContext } from '../ActionShell';
import { ModuleStatusPill } from '../ui/ModuleStatusPill';
import { MODULE_ICONS } from '../schema/icons';
import { relationProvidersFor } from './registry';
import type { StationManagerScope } from './types';
import {
  createManagerCoordinatorState, managerFooterState, managerIsDirty,
  resetManagerDrafts, seedProviderReadModel,
} from './coordinator';
import type { ManagerCoordinatorState, ManagerProviderAdapter } from './coordinator';

type ManagerShellContext = Pick<StepContext, 'setExitGuard' | 'confirmPendingExit' | 'cancelPendingExit' | 'setFooter'>;

export function DynamicStationManager({ scope, shell }: { scope: StationManagerScope; shell: ManagerShellContext }) {
  const registered = useMemo(() => relationProvidersFor(scope), [scope.stationType, scope.stationId]);
  const providers = registered as unknown as readonly ManagerProviderAdapter[];
  const [state, setState] = useState<ManagerCoordinatorState>(() => createManagerCoordinatorState(providers));
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [filterBySection, setFilterBySection] = useState<Record<string, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    const initial = createManagerCoordinatorState(providers);
    for (const provider of providers) initial.loadStateByProvider[provider.key] = 'loading';
    setState(initial);
    providers.forEach(async (provider) => {
      try {
        const readModel = await provider.load(scope, controller.signal);
        if (controller.signal.aborted) return;
        setState((current) => {
          const seeded = seedProviderReadModel(current, provider, scope, readModel);
          return { ...seeded, loadStateByProvider: { ...seeded.loadStateByProvider, [provider.key]: 'loaded' } };
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState((current) => ({ ...current,
          loadStateByProvider: { ...current.loadStateByProvider, [provider.key]: 'error' },
          loadErrorsByProvider: { ...current.loadErrorsByProvider,
            [provider.key]: error instanceof Error ? error.message : `Could not load ${provider.label}.` },
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
  useEffect(() => { shell.setExitGuard(exitGuard); return () => shell.setExitGuard(null); }, [exitGuard, shell.setExitGuard]);
  useEffect(() => { shell.setFooter(null); return () => shell.setFooter(null); }, [shell.setFooter, footerState.saveDisabled]);

  const active = providers.find((provider) => provider.key === state.activeProviderKey) ?? providers[0];
  const readModel = active ? state.readModelByProvider[active.key] : undefined;
  const loadState = active ? state.loadStateByProvider[active.key] : 'idle';
  const loadError = active ? state.loadErrorsByProvider[active.key] : null;
  const summary = active?.manager.summary && readModel !== undefined
    ? active.manager.summary.project(readModel, scope) : null;

  return (
    <section class="cz-manager-workspace" aria-labelledby="dynamic-station-manager-title">
      <header class="cz-manager-workspace__header">
        <div>
          <h3 id="dynamic-station-manager-title">{active?.manager.summary?.label ?? 'Manager'}</h3>
          <p>{active?.manager.summary?.subtitle}</p>
        </div>
        <div class="cz-manager-workspace__status">
          <ModuleStatusPill status={loadState === 'loading' ? 'loading' : summary?.status.status ?? 'pending-dim'} notes={summary?.status.notes ?? []} />
        </div>
      </header>

      {summary && (
        <p class="cz-manager-workspace__summary" aria-label="Package Manager summary">
          {summary.metrics.map((metric, index) => (
            <span key={metric.id}>{index > 0 && <span aria-hidden="true"> · </span>}{metric.value} {metric.label}</span>
          ))}
        </p>
      )}

      {loadState === 'loading' && <p class="cz-sp-tier-table__muted">Loading provider workspace…</p>}
      {loadError && <div class="cz-admin-error-msg" role="alert">{loadError}</div>}

      {readModel !== undefined && active?.manager.sections.map((section) => {
        const projection = section.project(readModel, scope);
        if (projection.role === 'structure') {
          return (
            <section class="cz-manager-section" key={section.id} aria-labelledby={`manager-${section.id}`}>
              <h4 id={`manager-${section.id}`}>{section.label}</h4>
              {projection.rows.length === 0 ? (
                <div class="cz-manager-empty">
                  <span class="cz-manager-empty__icon">{MODULE_ICONS.package}</span>
                  <strong>{section.emptyState.title}</strong>
                  {section.emptyState.description && <p>{section.emptyState.description}</p>}
                </div>
              ) : (
                <div class="cz-manager-groups" role="list">
                  <div class="cz-manager-groups__heading"><span>Group</span><span>Order</span><span>Relationships</span></div>
                  {projection.rows.map((row) => (
                    <div class="cz-manager-groups__row" role="listitem" key={row.id}>
                      <strong>{row.label}</strong><span>{row.order}</span><span>{row.relationshipCount}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        }

        const activeFilter = filterBySection[section.id] ?? 'all';
        const rows = projection.rows.filter((row) => row.filterIds.includes(activeFilter));
        return (
          <section class="cz-manager-section" key={section.id} aria-labelledby={`manager-${section.id}`}>
            <h4 id={`manager-${section.id}`}>{section.label}</h4>
            <div class="cz-manager-filters" role="group" aria-label="Relationship filters">
              {projection.filters.map((filter) => (
                <button type="button" key={filter.id} class={activeFilter === filter.id ? 'is-active' : undefined}
                  aria-pressed={activeFilter === filter.id}
                  onClick={() => setFilterBySection((current) => ({ ...current, [section.id]: filter.id }))}>
                  {filter.label}
                </button>
              ))}
            </div>
            {rows.length === 0 ? <div class="cz-manager-empty"><strong>{section.emptyState.title}</strong></div> : (
              <div class="cz-sp-tier-table-wrap">
                <table class="cz-sp-tier-table cz-manager-relationships">
                  <thead><tr><th>Source</th><th>Group</th><th>Order</th><th>State</th><th>Availability</th><th>Source health</th></tr></thead>
                  <tbody>{rows.map((row) => (
                    <tr key={row.id}>
                      <td class="cz-sp-tier-table__name">{row.sourceLabel}</td>
                      <td class="cz-sp-tier-table__muted">{row.groupLabel}</td>
                      <td>{row.order}</td>
                      <td><ModuleStatusPill status={row.state.status} notes={row.state.notes} /><small>{row.stateDetail}</small></td>
                      <td>{row.availability}</td>
                      <td class={row.sourceHealth === 'Missing' ? 'cz-manager-text--attention' : 'cz-sp-tier-table__muted'}>{row.sourceHealth}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}

      {showExitConfirmation && (
        <div class="cz-publish-confirm-overlay"><div class="cz-publish-confirm" role="dialog" aria-modal="true">
          <div class="cz-publish-confirm__header"><h3 class="cz-publish-confirm__title">Unsaved Manager changes</h3></div>
          <div class="cz-publish-confirm__body"><p class="cz-publish-confirm__lead">Discard changes across all Manager providers and continue?</p></div>
          <div class="cz-publish-confirm__footer">
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => { setState((current) => resetManagerDrafts(current, providers)); setShowExitConfirmation(false); shell.confirmPendingExit(); }}>Discard</button>
            <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={() => { setShowExitConfirmation(false); shell.cancelPendingExit(); }}>Keep editing</button>
          </div>
        </div></div>
      )}
    </section>
  );
}
