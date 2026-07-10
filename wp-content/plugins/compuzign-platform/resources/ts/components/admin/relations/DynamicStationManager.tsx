import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ExitGuard, StepContext } from '../ActionShell';
import { ModuleStatusPill } from '../ui/ModuleStatusPill';
import { MODULE_ICONS } from '../schema/icons';
import { relationProvidersFor } from './registry';
import type { StationManagerScope } from './types';
import {
  collectManagerValidation, createManagerCoordinatorState, managerFooterState, managerIsDirty,
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
  const [editingGroup, setEditingGroup] = useState<{ id: string; label: string } | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<{ id: string; label: string; count: number } | null>(null);
  const temporaryGroupSequence = useRef(0);

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
  useEffect(() => {
    shell.setFooter(dirty ? (
      <div class="cz-action-shell__footer">
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => setShowExitConfirmation(true)}>Cancel</button>
      </div>
    ) : null);
    return () => shell.setFooter(null);
  }, [shell.setFooter, dirty, footerState.saveDisabled]);

  const active = providers.find((provider) => provider.key === state.activeProviderKey) ?? providers[0];
  const readModel = active ? state.readModelByProvider[active.key] : undefined;
  const loadState = active ? state.loadStateByProvider[active.key] : 'idle';
  const loadError = active ? state.loadErrorsByProvider[active.key] : null;
  const summary = active?.manager.summary && readModel !== undefined
    ? active.manager.summary.project(readModel, scope, state.draftByProvider[active.key]) : null;

  const replaceActiveDraft = (nextDraft: unknown) => {
    if (!active) return;
    setState((current) => collectManagerValidation({
      ...current,
      draftByProvider: { ...current.draftByProvider, [active.key]: nextDraft },
    }, providers, scope));
  };

  const groupIssues = active
    ? state.validationByProvider[active.key]?.filter((issue) => issue.sectionId === 'groups') ?? []
    : [];

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
        const draft = state.draftByProvider[active.key];
        const projection = section.project(readModel, scope, draft);
        if (projection.role === 'structure') {
          const controls = section.structureControls;
          const createGroup = () => {
            if (!controls || draft === undefined) return;
            temporaryGroupSequence.current += 1;
            const id = `tmp_group_${Date.now()}_${temporaryGroupSequence.current}`;
            replaceActiveDraft(controls.create(draft, id));
            setEditingGroup({ id, label: 'New group' });
          };
          const commitRename = () => {
            if (!editingGroup || !controls || draft === undefined) return;
            replaceActiveDraft(controls.rename(draft, editingGroup.id, editingGroup.label));
            setEditingGroup(null);
          };
          return (
            <section class="cz-manager-section" key={section.id} aria-labelledby={`manager-${section.id}`}>
              <h4 id={`manager-${section.id}`}>{section.label}</h4>
              {projection.rows.length === 0 ? (
                <div class="cz-manager-empty">
                  <span class="cz-manager-empty__icon">{MODULE_ICONS.package}</span>
                  <strong>{section.emptyState.title}</strong>
                  {section.emptyState.description && <p>{section.emptyState.description}</p>}
                  {controls && <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={createGroup}>Create Group</button>}
                </div>
              ) : (
                <div>
                  <div class="cz-manager-section__actions"><button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={createGroup}>Create Group</button></div>
                  <div class="cz-manager-groups" role="list">
                  <div class="cz-manager-groups__heading"><span>Group</span><span>Order</span><span>Relationships</span><span>Actions</span></div>
                  {projection.rows.map((row) => (
                    <div class="cz-manager-groups__row" role="listitem" key={row.id}>
                      <div>
                        {editingGroup?.id === row.id ? (
                          <input class="cz-tf-input" value={editingGroup.label} autoFocus
                            aria-label={`Rename ${row.label}`}
                            onInput={(event) => setEditingGroup({ id: row.id, label: event.currentTarget.value })}
                            onBlur={commitRename}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') { event.preventDefault(); commitRename(); }
                              if (event.key === 'Escape') setEditingGroup(null);
                            }} />
                        ) : <strong>{row.label || 'Unnamed group'}</strong>}
                        {groupIssues.filter((issue) => issue.rowIdentity === row.id).map((issue) => (
                          <small class="cz-manager-field-error" key={issue.path}>{issue.message}</small>
                        ))}
                      </div>
                      <span>{row.order}</span><span>{row.relationshipCount}</span>
                      <div class="cz-manager-group-actions">
                        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => setEditingGroup({ id: row.id, label: row.label })}>Rename</button>
                        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" aria-label={`Move ${row.label} up`} disabled={row.order === 1} onClick={() => controls && replaceActiveDraft(controls.move(draft, row.id, -1))}>↑</button>
                        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" aria-label={`Move ${row.label} down`} disabled={row.order === projection.rows.length} onClick={() => controls && replaceActiveDraft(controls.move(draft, row.id, 1))}>↓</button>
                        <button type="button" class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm" onClick={() => {
                          if (row.relationshipCount > 0) setDeleteGroup({ id: row.id, label: row.label, count: row.relationshipCount });
                          else if (controls) replaceActiveDraft(controls.delete(draft, row.id));
                        }}>Delete</button>
                      </div>
                    </div>
                  ))}
                  </div>
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

      {deleteGroup && active && (
        <div class="cz-publish-confirm-overlay"><div class="cz-publish-confirm" role="dialog" aria-modal="true">
          <div class="cz-publish-confirm__header"><h3 class="cz-publish-confirm__title">Delete {deleteGroup.label || 'group'}?</h3></div>
          <div class="cz-publish-confirm__body"><p class="cz-publish-confirm__lead">
            {deleteGroup.count > 0
              ? `${deleteGroup.count} ${deleteGroup.count === 1 ? 'relationship' : 'relationships'} will be reassigned to Ungrouped.`
              : 'This group will be removed from the working draft.'}
          </p></div>
          <div class="cz-publish-confirm__footer">
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => setDeleteGroup(null)}>Keep group</button>
            <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={() => {
              const section = active.manager.sections.find((candidate) => candidate.id === 'groups');
              const draft = state.draftByProvider[active.key];
              if (section?.structureControls && draft !== undefined) replaceActiveDraft(section.structureControls.delete(draft, deleteGroup.id));
              setDeleteGroup(null);
            }}>Delete group</button>
          </div>
        </div></div>
      )}
    </section>
  );
}
