import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ExitGuard, StepContext } from '../ActionShell';
import { ModuleStatusPill } from '../ui/ModuleStatusPill';
import { MODULE_ICONS } from '../schema/icons';
import { ReadBlock } from '../ReadBlock';
import { relationProvidersFor } from './registry';
import type {
  ManagerContinuation, StationConnectionDescriptor, StationManagerScope,
} from './types';
import {
  collectManagerValidation, createManagerCoordinatorState, managerFooterState, managerIsDirty,
  orderManagerProviders, providerCompositionIndicator, resetManagerDrafts,
  seedProviderReadModel, selectManagerProvider, shouldShowProviderNavigation,
} from './coordinator';
import type { ManagerCoordinatorState, ManagerProviderAdapter } from './coordinator';

type ManagerShellContext = Pick<StepContext, 'setExitGuard' | 'confirmPendingExit' | 'cancelPendingExit' | 'requestExit' | 'setFooter'>;

type ManagerDestinationId = 'view-all' | 'open-current' | 'edit-current';

function scopeKey(scope: StationManagerScope): string {
  const station = `${scope.stationContext.type}:${scope.stationContext.id}`;
  return scope.kind === 'connection-graph'
    ? `${scope.kind}:${station}`
    : `${scope.kind}:${station}:${scope.subject?.type}:${scope.subject?.id}`;
}

export function DynamicStationManager({ scope: initialScope, shell, connection, continuation, onDestination }: {
  scope: StationManagerScope;
  shell: ManagerShellContext;
  connection: StationConnectionDescriptor;
  continuation?: ManagerContinuation;
  onDestination: (action: ManagerDestinationId, continuation: ManagerContinuation) => void;
}) {
  const [scope, setScope] = useState(initialScope);
  const currentScopeKey = scopeKey(scope);
  const registered = useMemo(() => relationProvidersFor(scope), [currentScopeKey]);
  const providers = useMemo(
    () => orderManagerProviders(registered as unknown as readonly ManagerProviderAdapter[]),
    [registered],
  );
  const [state, setState] = useState<ManagerCoordinatorState>(() => {
    const created = createManagerCoordinatorState(providers);
    return initialScope.activeProviderKey
      ? selectManagerProvider(created, initialScope.activeProviderKey, providers)
      : created;
  });
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [filterBySection, setFilterBySection] = useState<Record<string, string>>({});
  const [editingGroup, setEditingGroup] = useState<{
    id: string;
    label: string;
    originalDraft: unknown;
  } | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<{ id: string; label: string; count: number } | null>(null);
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | undefined>(continuation?.selectedSectionKey);
  const [focusedRelationshipKey, setFocusedRelationshipKey] = useState<string | undefined>(initialScope.activeRelationshipKey);
  const temporaryGroupSequence = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const created = createManagerCoordinatorState(providers);
    const initial = scope.activeProviderKey
      ? selectManagerProvider(created, scope.activeProviderKey, providers)
      : created;
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
  useEffect(() => {
    shell.setExitGuard(dirty ? exitGuard : null);
    return () => shell.setExitGuard(null);
  }, [dirty, exitGuard, shell.setExitGuard]);
  useEffect(() => {
    shell.setFooter(dirty ? (
      <div class="cz-action-shell__footer">
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => {
          shell.requestExit({ kind: 'cancel' }, () => {
            setState((current) => resetManagerDrafts(current, providers));
          });
        }}>Cancel</button>
      </div>
    ) : null);
    return () => shell.setFooter(null);
  }, [shell.setFooter, shell.requestExit, providers, dirty, footerState.saveDisabled]);

  const active = providers.find((provider) => provider.key === state.activeProviderKey) ?? providers[0];
  const readModel = active ? state.readModelByProvider[active.key] : undefined;
  const loadState = active ? state.loadStateByProvider[active.key] : 'idle';
  const loadError = active ? state.loadErrorsByProvider[active.key] : null;
  const subjects = active && readModel !== undefined
    ? active.manager.subjects?.(readModel, scope) ?? [] : [];
  const subjectSummaries = active && readModel !== undefined
    ? active.manager.subjectSummaries?.(readModel, scope) ?? [] : [];

  const selectScope = (next: StationManagerScope) => {
    if (scopeKey(next) === currentScopeKey) return;
    shell.requestExit({ kind: 'manager-scope', target: scopeKey(next) }, () => {
      setSelectedSectionKey(undefined);
      setFocusedRelationshipKey(undefined);
      setScope(next);
    });
  };

  const runDestination = (action: ManagerDestinationId, subject = scope.kind === 'subject-connections' ? scope.subject : undefined) => {
    if (!active) return;
    const continuation: ManagerContinuation = {
      stationContext: scope.stationContext,
      scopeKind: subject ? 'subject-connections' : scope.kind,
      subject,
      activeProviderKey: active.key,
      activeRelationshipKey: focusedRelationshipKey ?? scope.activeRelationshipKey ?? connection.relationshipKey,
      selectedSectionKey,
      originatingTab: 'manager',
    };
    shell.requestExit({ kind: 'destination', target: `${active.key}:${action}` }, () => {
      onDestination(action, continuation);
    });
  };

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
    <section class="cz-manager-workspace" aria-label={`${active?.label ?? 'Connection'} Manager`}>
      {shouldShowProviderNavigation(providers) && (
        <nav class="cz-manager-provider-nav" aria-label="Relation providers">
          {providers.map((provider) => {
            const indicator = providerCompositionIndicator(state, provider);
            const indicatorLabel = indicator.error ? 'Error'
              : indicator.invalid ? 'Invalid'
                : indicator.dirty ? 'Unsaved'
                  : indicator.loading ? 'Loading'
                    : null;
            return (
              <button
                type="button"
                key={provider.key}
                class={state.activeProviderKey === provider.key ? 'is-active' : undefined}
                aria-current={state.activeProviderKey === provider.key ? 'page' : undefined}
                onClick={() => setState((current) => selectManagerProvider(current, provider.key, providers))}
              >
                <span>{provider.label}</span>
                {indicatorLabel && <small>{indicatorLabel}</small>}
              </button>
            );
          })}
        </nav>
      )}
      {active && readModel !== undefined && subjects.length > 0 && (
        <div class="cz-manager-subject-nav" role="group" aria-label={`${active.label} subject`}>
          <button type="button" class={scope.kind === 'connection-graph' ? 'is-active' : undefined}
            aria-pressed={scope.kind === 'connection-graph'}
            onClick={() => selectScope({ kind: 'connection-graph', stationContext: scope.stationContext, activeProviderKey: active.key })}>
            All
          </button>
          {subjects.map((subject) => {
            const selected = scope.kind === 'subject-connections'
              && scope.subject?.type === subject.ref.type && scope.subject.id === subject.ref.id;
            return <button type="button" key={`${subject.ref.type}:${subject.ref.id}`} class={selected ? 'is-active' : undefined}
              aria-pressed={selected}
              onClick={() => selectScope({ kind: 'subject-connections', stationContext: scope.stationContext, subject: subject.ref, activeProviderKey: active.key })}>
              {subject.label}
            </button>;
          })}
        </div>
      )}
      {subjectSummaries.length > 0 && (
        <div class={`cz-manager-summary-grid${scope.kind === 'subject-connections' ? ' is-subject' : ''}`}>
          {subjectSummaries.map((subjectSummary) => (
            <ReadBlock
              key={`${subjectSummary.ref.type}:${subjectSummary.ref.id}`}
              title={subjectSummary.title}
              subtitle={subjectSummary.subtitle}
              icon={MODULE_ICONS.package}
              scopeClass="drawerOverview tier cz-manager-summary-card"
              status={subjectSummary.status.status}
              notes={[...subjectSummary.status.notes]}
              actions={[
                { id: 'view', label: 'View', onSelect: () => runDestination('open-current', subjectSummary.ref) },
                { id: 'edit', label: 'Edit', onSelect: () => runDestination('edit-current', subjectSummary.ref) },
              ]}
            >
              <div class="drawerModule__fields">
                {subjectSummary.fields.map((field) => (
                  <div class="drawerModule__field" key={field.id}>
                    <p class="drawerModule__label">{field.label}</p>
                    <p class="drawerModule__value">{field.values.map((value, index) => (
                      <span key={`${field.id}:${index}`}>{index > 0 && <br />}{value}</span>
                    ))}</p>
                  </div>
                ))}
              </div>
            </ReadBlock>
          ))}
        </div>
      )}

      {loadState === 'loading' && <p class="cz-sp-tier-table__muted">Loading provider workspace…</p>}
      {loadError && <div class="cz-admin-error-msg" role="alert">{loadError}</div>}

      {readModel !== undefined && active?.manager.sections.map((section) => {
        const draft = state.draftByProvider[active.key];
        const projection = section.project(readModel, scope, draft);
        if (projection.role === 'structure') {
          const controls = active.access === 'writable' ? section.structureControls : undefined;
          const createGroup = () => {
            if (!controls || draft === undefined) return;
            temporaryGroupSequence.current += 1;
            const id = `tmp_group_${Date.now()}_${temporaryGroupSequence.current}`;
            replaceActiveDraft(controls.create(draft, id));
            setEditingGroup({ id, label: 'New group', originalDraft: draft });
          };
          const finishGroupEdit = () => {
            if (!editingGroup || !controls || draft === undefined) return;
            replaceActiveDraft(controls.rename(draft, editingGroup.id, editingGroup.label));
            setEditingGroup(null);
          };
          const cancelGroupEdit = () => {
            if (!editingGroup) return;
            replaceActiveDraft(editingGroup.originalDraft);
            setEditingGroup(null);
          };
          return (
            <section class="cz-manager-section" key={section.id} aria-labelledby={`manager-${section.id}`}
              onFocus={() => setSelectedSectionKey(section.id)}>
              <h4 id={`manager-${section.id}`}>{section.label}</h4>
              {projection.rows.length === 0 ? (
                <div class="cz-manager-empty">
                  <span class="cz-manager-empty__icon">{MODULE_ICONS.package}</span>
                  <strong>{section.emptyState.title}</strong>
                  {section.emptyState.description && <p>{section.emptyState.description}</p>}
                  {controls && <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={createGroup} disabled={editingGroup !== null}>Create Group</button>}
                </div>
              ) : (
                <div>
                  {controls && <div class="cz-manager-section__actions"><button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={createGroup} disabled={editingGroup !== null}>Create Group</button></div>}
                  <div class="cz-manager-groups" role="list">
                  <div class="cz-manager-groups__heading"><span>Group</span><span>Order</span><span>Relationships</span><span>Actions</span></div>
                  {projection.rows.map((row) => (
                    <div class="cz-manager-groups__row" role="listitem" key={row.id}>
                      <div>
                        {editingGroup?.id === row.id ? (
                          <input class="cz-tf-input" value={editingGroup.label} autoFocus
                            aria-label={`Rename ${row.label}`}
                            onInput={(event) => setEditingGroup({ ...editingGroup, label: event.currentTarget.value })}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') { event.preventDefault(); finishGroupEdit(); }
                              if (event.key === 'Escape') { event.preventDefault(); cancelGroupEdit(); }
                            }} />
                        ) : <strong>{row.label || 'Unnamed group'}</strong>}
                        {groupIssues.filter((issue) => issue.rowIdentity === row.id).map((issue) => (
                          <small class="cz-manager-field-error" key={issue.path}>{issue.message}</small>
                        ))}
                      </div>
                      <span>{row.order}</span><span>{row.relationshipCount}</span>
                      <div class="cz-manager-group-actions">
                        {editingGroup?.id === row.id ? (
                          <>
                            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" title="Move group up" aria-label={`Move ${row.label} up`} disabled={row.order === 1} onClick={() => controls && replaceActiveDraft(controls.move(draft, row.id, -1))}>↑</button>
                            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" title="Move group down" aria-label={`Move ${row.label} down`} disabled={row.order === projection.rows.length} onClick={() => controls && replaceActiveDraft(controls.move(draft, row.id, 1))}>↓</button>
                            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => {
                              if (row.relationshipCount > 0) setDeleteGroup({ id: row.id, label: row.label, count: row.relationshipCount });
                              else if (controls) { replaceActiveDraft(controls.delete(draft, row.id)); setEditingGroup(null); }
                            }}>Delete group</button>
                            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={cancelGroupEdit}>Cancel</button>
                            <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" onClick={finishGroupEdit}>Done</button>
                          </>
                        ) : controls ? (
                          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={editingGroup !== null} onClick={() => setEditingGroup({ id: row.id, label: row.label, originalDraft: draft })}>Edit</button>
                        ) : null}
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
          <section class="cz-manager-section" key={section.id} aria-labelledby={`manager-${section.id}`}
            onFocus={() => setSelectedSectionKey(section.id)}>
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
                    <tr key={row.id} tabIndex={0}
                      aria-current={focusedRelationshipKey === row.id ? 'true' : undefined}
                      onClick={() => setFocusedRelationshipKey(row.id)}
                      onFocus={() => { setSelectedSectionKey(section.id); setFocusedRelationshipKey(row.id); }}>
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
              setEditingGroup(null);
              setDeleteGroup(null);
            }}>Delete group</button>
          </div>
        </div></div>
      )}
    </section>
  );
}
