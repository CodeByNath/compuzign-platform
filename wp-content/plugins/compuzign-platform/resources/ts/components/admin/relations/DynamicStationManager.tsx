import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ExitGuard, StepContext } from '../ActionShell';
import { ModuleStatusPill } from '../ui/ModuleStatusPill';
import { MODULE_ICONS } from '../schema/icons';
import { ReadBlock } from '../ReadBlock';
import { InlineEditorShell } from '../InlineEditorShell';
import { fetchAdminCatalog } from '@/api/endpoints/admin';
import type { AdminCatalogResponse } from '@/api/types/admin';
import { relationProvidersFor } from './registry';
import type {
  ManagerContinuation, StationConnectionDescriptor, StationManagerScope,
} from './types';
import {
  applyProviderSaveResults, collectManagerValidation, createManagerCoordinatorState, managerFooterState, managerIsDirty,
  orderManagerProviders, providerCompositionIndicator, resetManagerDrafts,
  seedProviderReadModel, selectManagerProvider,
} from './coordinator';
import type { ManagerCoordinatorState, ManagerProviderAdapter } from './coordinator';

type ManagerShellContext = Pick<StepContext, 'setExitGuard' | 'confirmPendingExit' | 'cancelPendingExit' | 'requestExit' | 'setFooter'>;

type ManagerDestinationId = 'view-all' | 'open-current' | 'edit-current';

interface RateSheetEditorValue {
  title: string;
  groups: { id: string; label: string }[];
  items: { id: string; optionId: string; unitPrice: number; per: string; quantity: number; groupId: string | null }[];
}

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
  const [scope] = useState(initialScope);
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
  const [editingRateSheet, setEditingRateSheet] = useState<RateSheetEditorValue | null>(null);
  const [rateSheetSaving, setRateSheetSaving] = useState(false);
  const [rateSheetError, setRateSheetError] = useState<string | null>(null);
  const [managerNotice, setManagerNotice] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [newRateGroupLabel, setNewRateGroupLabel] = useState('');
  const [creatingRateGroup, setCreatingRateGroup] = useState(false);
  const [rateGroupTargetIndex, setRateGroupTargetIndex] = useState<number | null>(null);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [sourceCatalog, setSourceCatalog] = useState<AdminCatalogResponse | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([]);
  const [pendingOnboardIds, setPendingOnboardIds] = useState<string[]>([]);
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

  const providerDirty = managerIsDirty(state, providers);
  const dirty = providerDirty || editingRateSheet !== null || editingGroup !== null;
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
    shell.setFooter(providerDirty ? (
      <div class="cz-action-shell__footer">
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => {
          shell.requestExit({ kind: 'cancel' }, () => {
            setState((current) => resetManagerDrafts(current, providers));
          });
        }}>Cancel</button>
        <button type="button" class="cz-admin-btn cz-admin-btn--primary" disabled={footerState.saveDisabled} onClick={saveManager}>Save changes</button>
      </div>
    ) : null);
    return () => shell.setFooter(null);
  }, [shell.setFooter, shell.requestExit, providers, providerDirty, footerState.saveDisabled, state, scope]);

  const active = providers.find((provider) => provider.key === state.activeProviderKey) ?? providers[0];
  const readModel = active ? state.readModelByProvider[active.key] : undefined;
  const loadState = active ? state.loadStateByProvider[active.key] : 'idle';
  const loadError = active ? state.loadErrorsByProvider[active.key] : null;
  const subjectSummaries = active && readModel !== undefined
    ? active.manager.subjectSummaries?.(readModel, scope) ?? [] : [];

  const runDestination = (action: ManagerDestinationId, destination?: ManagerContinuation['destination']) => {
    if (!active) return;
    const continuation: ManagerContinuation = {
      stationContext: scope.stationContext,
      scopeKind: scope.kind,
      subject: scope.kind === 'subject-connections' ? scope.subject : undefined,
      destination,
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

  async function saveManager() {
    const validated = collectManagerValidation(state, providers, scope);
    setState(validated);
    const invalidProviders = providers.filter((provider) => (validated.validationByProvider[provider.key]?.length ?? 0) > 0);
    if (invalidProviders.length > 0) {
      setManagerNotice({ kind: 'error', message: `Resolve validation issues in ${invalidProviders.map((provider) => provider.label).join(', ')}.` });
      return;
    }
    const dirtyProviders = providers.filter((provider) => provider.access === 'writable' && provider.save && provider.isDirty
      && provider.isDirty(validated.draftByProvider[provider.key], validated.originalDraftByProvider[provider.key], validated.readModelByProvider[provider.key]));
    setManagerNotice(null);
    setState((current) => ({ ...current, saveStateByProvider: {
      ...current.saveStateByProvider,
      ...Object.fromEntries(dirtyProviders.map((provider) => [provider.key, 'saving'])),
    } }));
    const results = await Promise.all(dirtyProviders.map(async (provider) => {
      try {
        const readModel = await provider.save!(scope, validated.draftByProvider[provider.key], validated.originalDraftByProvider[provider.key], validated.readModelByProvider[provider.key]);
        return { providerKey: provider.key, status: 'saved' as const, readModel };
      } catch (error) {
        return { providerKey: provider.key, status: 'failed' as const, error: error instanceof Error ? error.message : `Could not save ${provider.label}.` };
      }
    }));
    setState((current) => applyProviderSaveResults(current, providers, scope, results));
    const failed = results.filter((result) => result.status === 'failed');
    setManagerNotice(failed.length > 0
      ? { kind: 'error', message: `${results.length - failed.length} provider(s) saved; ${failed.length} failed. Unsaved changes were preserved.` }
      : { kind: 'success', message: 'Manager changes saved.' });
  }

  const saveRateSheet = async (section: ManagerProviderAdapter['manager']['sections'][number]) => {
    if (!active || !editingRateSheet || !section.rateSheetControls) return;
    const draft = state.draftByProvider[active.key];
    const original = state.originalDraftByProvider[active.key];
    const model = state.readModelByProvider[active.key];
    const connectedDraft = pendingOnboardIds.length > 0 && section.rateSheetControls.connectSources
      ? section.rateSheetControls.connectSources(draft, pendingOnboardIds.map(Number))
      : draft;
    const nextDraft = section.rateSheetControls.replace(connectedDraft, editingRateSheet);
    const validation = active.validate?.(nextDraft, model, scope);
    const rateIssues = validation?.issues.filter((issue) => issue.sectionId === section.id) ?? [];
    if (rateIssues.length > 0) {
      setRateSheetError(rateIssues[0].message);
      return;
    }
    replaceActiveDraft(nextDraft);
    setEditingRateSheet(null);
    setNewRateGroupLabel('');
    setCreatingRateGroup(false);
    setRateGroupTargetIndex(null);
    setPendingOnboardIds([]);
    setSourcePickerOpen(false);
  };

  const openSourcePicker = async () => {
    setSourcePickerOpen(true); setSourceError(null); setSourceLoading(true);
    try { setSourceCatalog(await fetchAdminCatalog()); }
    catch (error) { setSourceError(error instanceof Error ? error.message : 'Could not load source Services.'); }
    finally { setSourceLoading(false); }
  };

  const groupIssues = active
    ? state.validationByProvider[active.key]?.filter((issue) => issue.sectionId === 'groups') ?? []
    : [];

  return (
    <section class="cz-manager-workspace" aria-label={`${active?.label ?? 'Connection'} Manager`}>
      {providers.length > 0 && (
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
                { id: 'overview', label: 'Overview', onSelect: () => runDestination('open-current', subjectSummary.ref) },
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
      {managerNotice && <div class={managerNotice.kind === 'error' ? 'cz-admin-error-msg' : 'cz-admin-success-msg'} role="status">{managerNotice.message}</div>}

      {readModel !== undefined && active?.manager.sections.map((section) => {
        const draft = state.draftByProvider[active.key];
        const projection = section.project(readModel, scope, draft);
        if (projection.role === 'rate-sheet') {
          const beginEdit = () => {
            setRateSheetError(null);
            setNewRateGroupLabel('');
            setCreatingRateGroup(false);
            setRateGroupTargetIndex(null);
            setEditingRateSheet({
              title: projection.title,
              groups: projection.groups.map((group) => ({ ...group })),
              items: projection.items.map((item) => ({
                id: item.id, optionId: item.optionId, unitPrice: item.unitPrice,
                per: item.per, quantity: item.quantity, groupId: item.groupId,
              })),
            });
          };
          const createRateGroup = () => {
            const label = newRateGroupLabel.trim();
            if (!label) return;
            const groupId = `rate_group_${Date.now()}_${editingRateSheet?.groups.length ?? 0}`;
            setEditingRateSheet((current) => current ? ({
              ...current,
              groups: [...current.groups, { id: groupId, label }],
              items: current.items.map((item, index) => index === rateGroupTargetIndex
                ? { ...item, groupId }
                : item),
            }) : current);
            setNewRateGroupLabel('');
            setCreatingRateGroup(false);
            setRateGroupTargetIndex(null);
          };
          return (
            <section class="cz-manager-section cz-manager-rate-sheet" key={section.id} aria-labelledby={`manager-${section.id}`}>
              <h4 id={`manager-${section.id}`}>{section.label}</h4>
              <p class="cz-manager-section__description">Manage the pricing catalogue for this Service. Rate sheets define the available options, units, and base prices that Packages and Tiers can include.</p>
              {editingRateSheet ? (
                <InlineEditorShell title={projection.configured ? 'Edit Rate Sheet' : 'Create Rate Sheet'}
                  onSave={() => saveRateSheet(section)}
                  onCancel={() => { setEditingRateSheet(null); setRateSheetError(null); setNewRateGroupLabel(''); setCreatingRateGroup(false); setRateGroupTargetIndex(null); setPendingOnboardIds([]); setSourcePickerOpen(false); setSelectedSourceIds([]); }}
                  saving={rateSheetSaving} saveErr={rateSheetError} isDirty>
                  <div class="cz-rate-sheet-editor">
                    <label class="cz-tf-field"><span>Title</span><input class="cz-tf-input" value={editingRateSheet.title}
                      onInput={(event) => setEditingRateSheet({ ...editingRateSheet, title: event.currentTarget.value })} /></label>
                    <div class="cz-rate-sheet-editor__toolbar">
                      <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => { setCreatingRateGroup(true); setRateGroupTargetIndex(null); }}>Create Group</button>
                      {section.rateSheetControls?.sourcePicker && <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={openSourcePicker}>Add Source Service</button>}
                    </div>
                    {sourcePickerOpen && <div class="cz-manager-source-picker">
                      <div class="cz-manager-section__actions"><strong>Browse Services</strong><button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => { setSourcePickerOpen(false); setSelectedSourceIds([]); }}>Cancel</button></div>
                      <p>Select Services to establish supply. Their exposed Inclusions and FAQs will be loaded automatically after this Rate Sheet is saved.</p>
                      {sourceLoading && <p class="cz-sp-tier-table__muted">Loading Services…</p>}
                      {sourceError && <div class="cz-admin-error-msg" role="alert">{sourceError}</div>}
                      {sourceCatalog && <div>{sourceCatalog.stations.map((service) => <label class="cz-manager-source-picker__candidate" key={service.id}><input type="checkbox" checked={selectedSourceIds.includes(service.id)} onChange={(event) => setSelectedSourceIds((current) => event.currentTarget.checked ? [...current, service.id] : current.filter((id) => id !== service.id))} /> {service.title}</label>)}
                        <div><button type="button" class="cz-admin-btn cz-admin-btn--primary" disabled={selectedSourceIds.length === 0} onClick={() => {
                          setPendingOnboardIds((current) => Array.from(new Set([...current, ...selectedSourceIds.map(String)])));
                          setSourcePickerOpen(false); setSelectedSourceIds([]);
                        }}>Add Selected Services</button></div></div>}
                    </div>}
                    {creatingRateGroup && rateGroupTargetIndex === null && <div class="cz-rate-sheet-editor__group-create">
                      <label class="cz-tf-field"><span>Group name</span><input class="cz-tf-input" value={newRateGroupLabel} autoFocus
                        onInput={(event) => setNewRateGroupLabel(event.currentTarget.value)}
                        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); createRateGroup(); } }} /></label>
                      <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={createRateGroup} disabled={!newRateGroupLabel.trim()}>Add Group</button>
                      <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => { setCreatingRateGroup(false); setNewRateGroupLabel(''); setRateGroupTargetIndex(null); }}>Cancel</button>
                    </div>}
                    <div class="cz-rate-sheet-editor__grid-wrap"><table class="cz-rate-sheet-editor__grid">
                      <thead><tr><th>Supplied content</th><th>Unit Price</th><th>Per</th><th>Qty</th><th>Commercial Group</th></tr></thead>
                      <tbody>{editingRateSheet.items.map((item, index) => (
                        <tr key={item.id}>
                          <td class="cz-sp-tier-table__name">{projection.options.find((option) => option.id === item.optionId)?.label ?? '(unresolved supplied content)'}</td>
                          <td><input class="cz-tf-input" aria-label={`Unit Price row ${index + 1}`} type="number" min="0" step="0.01" value={item.unitPrice}
                            onInput={(event) => setEditingRateSheet({ ...editingRateSheet, items: editingRateSheet.items.map((row, rowIndex) => rowIndex === index ? { ...row, unitPrice: Number(event.currentTarget.value) } : row) })} /></td>
                          <td><select class="cz-tf-select" aria-label={`Per row ${index + 1}`} value={item.per}
                            onChange={(event) => setEditingRateSheet({ ...editingRateSheet, items: editingRateSheet.items.map((row, rowIndex) => rowIndex === index ? { ...row, per: event.currentTarget.value } : row) })}>
                            {projection.units.map((unit) => <option value={unit} key={unit}>{unit}</option>)}
                          </select></td>
                          <td><input class="cz-tf-input" aria-label={`Quantity row ${index + 1}`} type="number" min="1" step="1" value={item.quantity}
                            onInput={(event) => setEditingRateSheet({ ...editingRateSheet, items: editingRateSheet.items.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Number(event.currentTarget.value) } : row) })} /></td>
                          <td>{creatingRateGroup && rateGroupTargetIndex === index ? <div class="cz-rate-sheet-editor__inline-group">
                            <input class="cz-tf-input" value={newRateGroupLabel} autoFocus placeholder="New group name" aria-label={`New group name row ${index + 1}`}
                              onInput={(event) => setNewRateGroupLabel(event.currentTarget.value)}
                              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); createRateGroup(); } if (event.key === 'Escape') { setCreatingRateGroup(false); setNewRateGroupLabel(''); setRateGroupTargetIndex(null); } }} />
                            <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" onClick={createRateGroup} disabled={!newRateGroupLabel.trim()}>Add</button>
                            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => { setCreatingRateGroup(false); setNewRateGroupLabel(''); setRateGroupTargetIndex(null); }}>Cancel</button>
                          </div> : <select class="cz-tf-select" aria-label={`Group row ${index + 1}`} value={item.groupId ?? ''}
                            onChange={(event) => {
                              if (event.currentTarget.value === '__add_new__') { setNewRateGroupLabel(''); setCreatingRateGroup(true); setRateGroupTargetIndex(index); return; }
                              setEditingRateSheet({ ...editingRateSheet, items: editingRateSheet.items.map((row, rowIndex) => rowIndex === index ? { ...row, groupId: event.currentTarget.value || null } : row) });
                            }}>
                            <option value="">Ungrouped</option>{editingRateSheet.groups.map((group) => <option value={group.id} key={group.id}>{group.label}</option>)}<option value="__add_new__">+ Add New</option>
                          </select>}</td>
                        </tr>
                      ))}</tbody>
                    </table></div>
                  </div>
                </InlineEditorShell>
              ) : !projection.configured ? (
                <div class="cz-manager-empty">
                  <span class="cz-manager-empty__icon">{MODULE_ICONS.package}</span>
                  <strong>{section.emptyState.title}</strong>
                  <span class="cz-manager-empty__status">Not configured</span>
                  <p>{section.emptyState.description}</p>
                  <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={beginEdit}>Create Rate Sheet</button>
                </div>
              ) : (
                <div class="cz-manager-rate-sheet__catalogue">
                  <div class="cz-manager-section__actions"><strong>{projection.title}</strong><button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={beginEdit}>Edit Rate Sheet</button></div>
                  <div class="cz-sp-tier-table-wrap"><table class="cz-sp-tier-table"><thead><tr><th>Option</th><th>Unit Price</th><th>Per</th><th>Quantity</th><th>Group</th></tr></thead>
                    <tbody>{projection.items.map((item) => <tr key={item.id}><td class="cz-sp-tier-table__name">{item.optionLabel}</td><td>${item.unitPrice.toFixed(2)}</td><td>{item.per}</td><td>{item.quantity}</td><td>{item.groupLabel}</td></tr>)}</tbody>
                  </table></div>
                </div>
              )}
            </section>
          );
        }
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
