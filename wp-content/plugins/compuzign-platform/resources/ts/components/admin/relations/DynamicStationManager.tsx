import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ExitGuard, StepContext } from '../ActionShell';
import { ModuleStatusPill } from '../ui/ModuleStatusPill';
import { MODULE_ICONS } from '../schema/icons';
import { ReadBlock } from '../ReadBlock';
import { InlineEditorShell } from '../InlineEditorShell';
import { fetchAdminCatalog, fetchPackageCategoryGroups } from '@/api/endpoints/admin';
import type { AdminCatalogResponse, PackageCategoryGroupItem, StationSummary } from '@/api/types/admin';
import { relationProvidersFor } from './registry';
import type { ManagerContinuation, StationManagerScope } from './types';
import { assignPackageServiceCategoryGroup } from './providers/package';
import type { PackageRelationDraft } from './providers/package';
import { PackageServicesTable } from './PackageServicesTable';
import { PackageCategoryGroupsSection } from './PackageCategoryGroupsSection';
import { PackageRateSheetFilters, RATE_SHEET_FILTER_DEFAULTS, filterRateSheetItems } from './PackageRateSheetFilters';
import type { RateSheetFilterState } from './PackageRateSheetFilters';
import {
  applyProviderSaveResults, collectManagerValidation, createManagerCoordinatorState, managerFooterState, managerIsDirty,
  orderManagerProviders, providerCompositionIndicator, resetManagerDrafts,
  seedProviderReadModel, selectManagerProvider,
} from './coordinator';
import type { ManagerCoordinatorState, ManagerProviderAdapter } from './coordinator';
import { PromotionManagerWorkspace } from './PromotionManagerWorkspace';
import { PackageManagerTierCards } from './PackageManagerTierCards';
import { ManagerSubTabs } from './ManagerSubTabs';
import type { ManagerSubTab } from './ManagerSubTabs';

type ManagerShellContext = Pick<StepContext, 'setExitGuard' | 'confirmPendingExit' | 'cancelPendingExit' | 'requestExit' | 'setFooter'>;

interface RateSheetEditorValue {
  title: string;
  groups: { id: string; label: string }[];
  items: { id: string; optionId: string; unitPrice: number; per: string; quantity: number; groupId: string | null; sourceAvailable?: boolean }[];
}

type ManagerWorkspace = 'service' | 'package' | 'promotion';

function scopeKey(scope: StationManagerScope): string {
  const station = `${scope.stationContext.type}:${scope.stationContext.id}`;
  return scope.kind === 'connection-graph'
    ? `${scope.kind}:${station}`
    : `${scope.kind}:${station}:${scope.subject?.type}:${scope.subject?.id}`;
}

export function DynamicStationManager({ scope: initialScope, shell, continuation, onOpenPromotion, onOpenPackage, onOpenService }: {
  scope: StationManagerScope;
  shell: ManagerShellContext;
  continuation?: ManagerContinuation;
  onOpenPromotion?: (promotionId?: string, edit?: boolean) => void;
  onOpenPackage?: (occupantId: string, slotId: string, edit?: boolean) => void;
  onOpenService?: (summary: StationSummary, edit?: boolean) => void;
}) {
  // ===========================================================================
  // SECTION: MANAGER_COORDINATION
  // ===========================================================================
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
  const [sourcePreviewDraft, setSourcePreviewDraft] = useState<unknown | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<ManagerSubTab>('details');
  const [activeWorkspace, setActiveWorkspace] = useState<ManagerWorkspace>(
    initialScope.activeProviderKey === 'promotion' ? 'promotion' : 'service',
  );
  const [categoryGroups, setCategoryGroups] = useState<PackageCategoryGroupItem[]>([]);
  const [rateSheetFilters, setRateSheetFilters] = useState<RateSheetFilterState>(RATE_SHEET_FILTER_DEFAULTS);
  const temporaryGroupSequence = useRef(0);

  // Package Category Group registry — shared by the Services table dropdowns
  // and the Rate Sheet filters; the management section reloads it on change.
  const reloadCategoryGroups = useCallback(async () => {
    try {
      const response = await fetchPackageCategoryGroups();
      setCategoryGroups(response.package_category_groups);
    } catch {
      // Non-fatal: dropdowns simply stay empty; the section shows its own error.
    }
  }, []);
  const hasPackageProvider = providers.some((provider) => provider.key === 'package');
  useEffect(() => {
    if (hasPackageProvider) void reloadCategoryGroups();
  }, [hasPackageProvider, reloadCategoryGroups]);

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
  const packageProvider = providers.find((provider) => provider.key === 'package');
  const promotionProvider = providers.find((provider) => provider.key === 'promotion');
  const readModel = active ? state.readModelByProvider[active.key] : undefined;
  const loadState = active ? state.loadStateByProvider[active.key] : 'idle';
  const loadError = active ? state.loadErrorsByProvider[active.key] : null;
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
      ? { kind: 'error', message: `${results.length - failed.length} provider(s) saved; ${failed.length} failed: ${failed.map((result) => result.status === 'failed' ? result.error : '').filter(Boolean).join(' | ')} Unsaved changes were preserved.` }
      : { kind: 'success', message: 'Manager changes saved.' });
  }

  // ===========================================================================
  // SECTION: RATE_SHEET_EDITOR
  // ===========================================================================
  const saveRateSheet = async (section: ManagerProviderAdapter['manager']['sections'][number]) => {
    if (!active || !editingRateSheet || !section.rateSheetControls) return;
    const draft = sourcePreviewDraft ?? state.draftByProvider[active.key];
    const original = state.originalDraftByProvider[active.key];
    const model = state.readModelByProvider[active.key];
    const nextDraft = section.rateSheetControls.replace(draft, editingRateSheet);
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
    setSourcePreviewDraft(null);
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

  // ===========================================================================
  // SECTION: MANAGER_RENDER
  // ===========================================================================
  return (
    <section class="cz-manager-workspace" aria-label={`${activeWorkspace === 'service' ? 'Services' : active?.label ?? 'Connection'} Manager`}>
      {providers.length > 0 && (
        <nav class="cz-manager-provider-nav" aria-label="Relation providers">
          {([
            ...(packageProvider ? [
              { key: 'service' as const, label: 'Services', provider: packageProvider },
              { key: 'package' as const, label: 'Packages', provider: packageProvider },
            ] : []),
            ...(promotionProvider ? [
              { key: 'promotion' as const, label: 'Promotions', provider: promotionProvider },
            ] : []),
          ]).map((workspace) => {
            const provider = workspace.provider;
            const indicator = providerCompositionIndicator(state, provider);
            const indicatorLabel = indicator.error ? 'Error'
              : indicator.invalid ? 'Invalid'
                : indicator.dirty ? 'Unsaved'
                  : indicator.loading ? 'Loading'
                    : null;
            return (
              <button
                type="button"
                key={workspace.key}
                class={activeWorkspace === workspace.key ? 'is-active' : undefined}
                aria-current={activeWorkspace === workspace.key ? 'page' : undefined}
                onClick={() => {
                  setState((current) => selectManagerProvider(current, provider.key, providers));
                  setActiveWorkspace(workspace.key);
                  setActiveSubTab('details');
                }}
              >
                <span>{workspace.label}</span>
                {indicatorLabel && <small>{indicatorLabel}</small>}
              </button>
            );
          })}
        </nav>
      )}
      {(activeWorkspace === 'service' || activeWorkspace === 'package' || activeWorkspace === 'promotion') && (
        <ManagerSubTabs active={activeSubTab} onChange={setActiveSubTab} />
      )}
      {/* SECTION: PROMOTION_WORKSPACE */}
      {activeSubTab === 'details' && activeWorkspace === 'promotion' && active?.key === 'promotion' && scope.stationContext.type === 'service' && (
        <PromotionManagerWorkspace serviceId={Number(scope.stationContext.id)} onOpen={onOpenPromotion ?? (() => {})} />
      )}
      {/* SECTION: SERVICE_WORKSPACE */}
      {activeWorkspace === 'service' && active?.key === 'package' && scope.stationContext.type === 'service' && activeSubTab === 'details' && (
        <PackageServicesTable
            sources={((sourcePreviewDraft ?? state.draftByProvider[active.key]) as PackageRelationDraft | undefined)?.sources
              ?? (state.readModelByProvider[active.key] as { sources?: PackageRelationDraft['sources'] } | undefined)?.sources
              ?? []}
            categoryGroups={categoryGroups}
            hostServiceId={Number(scope.stationContext.id)}
            onAssign={(serviceId, groupId) => {
              const base = (sourcePreviewDraft ?? state.draftByProvider[active.key]) as PackageRelationDraft | undefined;
              if (base === undefined) return;
              const next = assignPackageServiceCategoryGroup(base, serviceId, groupId, Number(scope.stationContext.id));
              if (sourcePreviewDraft !== null) setSourcePreviewDraft(next);
              replaceActiveDraft(next);
            }}
            onOpenService={(summary, edit) => onOpenService?.(summary, edit)}
        />
      )}
      {activeWorkspace === 'service' && active?.key === 'package' && scope.stationContext.type === 'service' && activeSubTab === 'connections' && (
        <PackageCategoryGroupsSection onChanged={() => { void reloadCategoryGroups(); }} />
      )}
      {activeWorkspace === 'service' && activeSubTab === 'settings' && (
        <div class="cz-manager-empty"><strong>No Service settings configured.</strong></div>
      )}
      {/* SECTION: PACKAGE_WORKSPACE */}
      {activeWorkspace === 'package' && active?.key === 'package' && scope.stationContext.type === 'service' && activeSubTab === 'details' && (
        <PackageManagerTierCards serviceId={Number(scope.stationContext.id)} onOpen={onOpenPackage ?? (() => {})} />
      )}
      {activeWorkspace === 'promotion' && active?.key === 'promotion' && activeSubTab !== 'details' && (
        <div class="cz-manager-empty"><strong>No {activeSubTab === 'connections' ? 'connections' : 'settings'} configured.</strong></div>
      )}

      {loadState === 'loading' && <p class="cz-sp-tier-table__muted">Loading provider workspace…</p>}
      {loadError && <div class="cz-admin-error-msg" role="alert">{loadError}</div>}
      {managerNotice && <div class={managerNotice.kind === 'error' ? 'cz-admin-error-msg' : 'cz-admin-success-msg'} role="status">{managerNotice.message}</div>}

      {readModel !== undefined && active?.manager.sections.map((section) => {
        if (activeWorkspace !== 'package' || active.key !== 'package') return null;
        const sectionTab: ManagerSubTab = section.id === 'rate-sheets' ? 'settings' : 'connections';
        if (activeSubTab !== sectionTab) return null;
        const draft = sourcePreviewDraft ?? state.draftByProvider[active.key];
        const projection = section.project(readModel, scope, draft);
        if (activeSubTab === 'connections' && projection.role !== 'relations' && projection.role !== 'structure') return null;
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
                sourceAvailable: item.sourceAvailable,
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
            <section class="cz-manager-section cz-manager-section--content-only cz-manager-rate-sheet" key={section.id} aria-label="Rate Sheet">
              {editingRateSheet ? (
                <InlineEditorShell title={projection.configured ? 'Edit Rate Sheet' : 'Create Rate Sheet'}
                  onSave={() => saveRateSheet(section)}
                  onCancel={() => { setEditingRateSheet(null); setRateSheetError(null); setNewRateGroupLabel(''); setCreatingRateGroup(false); setRateGroupTargetIndex(null); setPendingOnboardIds([]); setSourcePreviewDraft(null); setSourcePickerOpen(false); setSelectedSourceIds([]); }}
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
                        <div><button type="button" class="cz-admin-btn cz-admin-btn--primary" disabled={selectedSourceIds.length === 0 || sourceLoading} onClick={async () => {
                          if (!section.rateSheetControls?.connectSources || !active || !editingRateSheet) return;
                          setSourceLoading(true); setSourceError(null);
                          try {
                            const baseDraft = section.rateSheetControls.replace(draft, editingRateSheet);
                            const nextDraft = await section.rateSheetControls.connectSources(baseDraft, selectedSourceIds, Number(scope.stationContext.id));
                            const nextProjection = section.project(readModel, scope, nextDraft);
                            if (nextProjection.role === 'rate-sheet') {
                              setEditingRateSheet({
                                title: nextProjection.title,
                                groups: nextProjection.groups.map((group) => ({ ...group })),
                                items: nextProjection.items.map((item) => ({ id: item.id, optionId: item.optionId, unitPrice: item.unitPrice, per: item.per, quantity: item.quantity, groupId: item.groupId, sourceAvailable: item.sourceAvailable })),
                              });
                            }
                            setSourcePreviewDraft(nextDraft);
                            setSourcePickerOpen(false); setSelectedSourceIds([]);
                          } catch (error) {
                            setSourceError(error instanceof Error ? error.message : 'Could not resolve selected Services.');
                          } finally { setSourceLoading(false); }
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
                          <td class="cz-sp-tier-table__name">{projection.options.find((option) => option.id === item.optionId)?.label ?? '(unresolved supplied content)'}{item.sourceAvailable === false ? ' — Unavailable' : ''}</td>
                          <td><input class="cz-tf-input" disabled={item.sourceAvailable === false} aria-label={`Unit Price row ${index + 1}`} type="number" min="0" step="0.01" value={item.unitPrice}
                            onInput={(event) => setEditingRateSheet({ ...editingRateSheet, items: editingRateSheet.items.map((row, rowIndex) => rowIndex === index ? { ...row, unitPrice: Number(event.currentTarget.value) } : row) })} /></td>
                          <td><select class="cz-tf-select" disabled={item.sourceAvailable === false} aria-label={`Per row ${index + 1}`} value={item.per}
                            onChange={(event) => setEditingRateSheet({ ...editingRateSheet, items: editingRateSheet.items.map((row, rowIndex) => rowIndex === index ? { ...row, per: event.currentTarget.value } : row) })}>
                            {projection.units.map((unit) => <option value={unit} key={unit}>{unit}</option>)}
                          </select></td>
                          <td><input class="cz-tf-input" disabled={item.sourceAvailable === false} aria-label={`Quantity row ${index + 1}`} type="number" min="1" step="1" value={item.quantity}
                            onInput={(event) => setEditingRateSheet({ ...editingRateSheet, items: editingRateSheet.items.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Number(event.currentTarget.value) } : row) })} /></td>
                          <td>{creatingRateGroup && rateGroupTargetIndex === index ? <div class="cz-rate-sheet-editor__inline-group">
                            <input class="cz-tf-input" value={newRateGroupLabel} autoFocus placeholder="New group name" aria-label={`New group name row ${index + 1}`}
                              onInput={(event) => setNewRateGroupLabel(event.currentTarget.value)}
                              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); createRateGroup(); } if (event.key === 'Escape') { setCreatingRateGroup(false); setNewRateGroupLabel(''); setRateGroupTargetIndex(null); } }} />
                            <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" onClick={createRateGroup} disabled={!newRateGroupLabel.trim()}>Add</button>
                            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => { setCreatingRateGroup(false); setNewRateGroupLabel(''); setRateGroupTargetIndex(null); }}>Cancel</button>
                          </div> : <select class="cz-tf-select" disabled={item.sourceAvailable === false} aria-label={`Group row ${index + 1}`} value={item.groupId ?? ''}
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
                  <div class="cz-manager-section__actions"><button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={beginEdit}>Edit Rate Sheet</button></div>
                  <PackageRateSheetFilters
                    items={projection.items}
                    sources={((draft as PackageRelationDraft | undefined)?.sources) ?? []}
                    categoryGroups={categoryGroups}
                    rateGroups={projection.groups}
                    value={rateSheetFilters}
                    onChange={setRateSheetFilters}
                  />
                  {(() => {
                    const visibleItems = filterRateSheetItems(
                      projection.items,
                      ((draft as PackageRelationDraft | undefined)?.sources) ?? [],
                      rateSheetFilters,
                    );
                    return visibleItems.length === 0 ? (
                      <div class="cz-manager-empty"><strong>No Rate Sheet rows match the current filters.</strong></div>
                    ) : (
                      <div class="cz-sp-tier-table-wrap"><table class="cz-sp-tier-table"><thead><tr><th>Option</th><th>Service</th><th>Service Category</th><th>Unit Price</th><th>Per</th><th>Quantity</th><th>Group</th></tr></thead>
                        <tbody>{visibleItems.map((item) => <tr key={item.id}>
                          <td class="cz-sp-tier-table__name">{item.optionLabel}</td>
                          <td class="cz-sp-tier-table__muted">{item.serviceTitle ?? '—'}</td>
                          <td class="cz-sp-tier-table__muted">{(item.serviceCategories?.length ?? 0) > 0 ? item.serviceCategories!.join(', ') : '—'}</td>
                          <td>${item.unitPrice.toFixed(2)}</td><td>{item.per}</td><td>{item.quantity}</td><td>{item.groupLabel}</td>
                        </tr>)}</tbody>
                      </table></div>
                    );
                  })()}
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
            <section class="cz-manager-section cz-manager-section--content-only" key={section.id} aria-label="Option Groups"
              onFocus={() => setSelectedSectionKey(section.id)}>
              {projection.rows.length === 0 ? (
                <div class="cz-manager-empty">
                  <span class="cz-manager-empty__icon">{MODULE_ICONS.package}</span>
                  <strong>{section.emptyState.title}</strong>
                  {section.emptyState.description && <p>{section.emptyState.description}</p>}
                  {controls && <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={createGroup} disabled={editingGroup !== null}>+ New Group</button>}
                </div>
              ) : (
                <div>
                  {controls && <div class="cz-manager-section__actions"><button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={createGroup} disabled={editingGroup !== null}>+ New Group</button></div>}
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
          <section class="cz-manager-section cz-manager-section--content-only" key={section.id}
            onFocus={() => setSelectedSectionKey(section.id)}>
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
/*
 * FILE INDEX
 *
 * MANAGER_COORDINATION       Provider reads, drafts, validation, and save state
 * RATE_SHEET_EDITOR          Rate Sheet sources, groups, selections, and filters
 * SERVICE_WORKSPACE          Service assignments and Package Category Groups
 * PACKAGE_WORKSPACE          Tier cards, relationships, and Rate Sheet settings
 * PROMOTION_WORKSPACE        Promotion provider sections and continuations
 * MANAGER_RENDER             Tabs, actions, exit guards, and workspace composition
 *
 * Search: SECTION: MANAGER_COORDINATION
 *         SECTION: RATE_SHEET_EDITOR
 *         SECTION: SERVICE_WORKSPACE
 *         SECTION: PACKAGE_WORKSPACE
 *         SECTION: PROMOTION_WORKSPACE
 *         SECTION: MANAGER_RENDER
 */
