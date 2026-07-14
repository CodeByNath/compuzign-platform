import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ExitGuard, StepContext } from '../ActionShell';
import { ModuleStatusPill } from '../ui/ModuleStatusPill';
import { MODULE_ICONS } from '../schema/icons';
import { ReadBlock } from '../ReadBlock';
import { fetchPackageCategoryGroups } from '@/api/endpoints/admin';
import type { PackageCategoryGroupItem, StationSummary } from '@/api/types/admin';
import { relationProvidersFor } from './registry';
import type { ManagerContinuation, StationManagerScope } from './types';
import { assignPackageServiceCategoryGroup } from './providers/package';
import type { PackageRelationDraft } from './providers/package';
import { PackageServicesTable } from './PackageServicesTable';
import { PackageCategoryGroupsSection } from './PackageCategoryGroupsSection';
import { PackageCategoryGroupCards } from './PackageCategoryGroupCards';
import type { WorkspaceGroupScope } from './PackageCategoryGroupCards';
import { PackageRateSheetFilters, RATE_SHEET_FILTER_DEFAULTS, assignmentByServiceId, filterRateSheetItems } from './PackageRateSheetFilters';
import { PackageRateSheetEditor } from './PackageRateSheetEditor';
import type { RateSheetEditorValue } from './PackageRateSheetEditor';
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

export type ManagerShellContext = Pick<StepContext, 'setExitGuard' | 'confirmPendingExit' | 'cancelPendingExit' | 'requestExit' | 'setFooter'>;
export type ManagerSurface = 'legacy' | 'service-catalog' | 'packages';

type ManagerWorkspace = 'service' | 'package' | 'promotion';

// Sub-tabs each workspace actually populates (Phase 3): Services has no
// Settings content, Promotions has Details only. Empty tabs never render.
const WORKSPACE_SUB_TABS: Record<ManagerWorkspace, readonly ManagerSubTab[]> = {
  service: ['details', 'connections'],
  package: ['details', 'connections', 'settings'],
  promotion: ['details'],
};

// Settings renders Commercial (option) Groups above the Rate Sheet; the
// provider declares sections in contract order, so ordering is host-side.
const SETTINGS_SECTION_ORDER: Record<string, number> = { groups: 0, 'rate-sheets': 1 };

function scopeKey(scope: StationManagerScope): string {
  const station = `${scope.stationContext.type}:${scope.stationContext.id}`;
  return scope.kind === 'connection-graph'
    ? `${scope.kind}:${station}`
    : `${scope.kind}:${station}:${scope.subject?.type}:${scope.subject?.id}`;
}

export function DynamicStationManager({ scope: initialScope, shell, continuation, onOpenPromotion, onOpenPackage, onOpenService, surface = 'legacy', onManageCategoryGroups }: {
  scope: StationManagerScope;
  shell: ManagerShellContext;
  continuation?: ManagerContinuation;
  onOpenPromotion?: (promotionId?: string, edit?: boolean) => void;
  onOpenPackage?: (occupantId: string, slotId: string, edit?: boolean) => void;
  onOpenService?: (summary: StationSummary, edit?: boolean) => void;
  surface?: ManagerSurface;
  onManageCategoryGroups?: () => void;
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
  const [pendingOnboardIds, setPendingOnboardIds] = useState<string[]>([]);
  const [sourcePreviewDraft, setSourcePreviewDraft] = useState<unknown | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<ManagerSubTab>('details');
  const [activeWorkspace, setActiveWorkspace] = useState<ManagerWorkspace>(
    initialScope.activeProviderKey === 'promotion' ? 'promotion' : 'service',
  );
  const [categoryGroups, setCategoryGroups] = useState<PackageCategoryGroupItem[]>([]);
  const [rateSheetFilters, setRateSheetFilters] = useState<RateSheetFilterState>(RATE_SHEET_FILTER_DEFAULTS);
  // Family-first workspace scope (Phase 2): 'all' | 'unassigned' | group_id.
  // Drives the Services table filter, relationship-row scoping, and the Rate
  // Sheet Category Group filter through their existing mechanisms.
  const [selectedCategoryGroupId, setSelectedCategoryGroupId] = useState<WorkspaceGroupScope>('all');
  const [groupActionBusy, setGroupActionBusy] = useState(false);
  const temporaryGroupSequence = useRef(0);
  const serviceCatalogSurface = surface === 'service-catalog';
  const packagesSurface = surface === 'packages';

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
  // Package provider sources (draft-preferred) — provenance for the Family
  // Card counts and relationship-row scoping, same source of truth the
  // Services table and Rate Sheet filters already consume.
  const packageDraftSources = ((sourcePreviewDraft ?? state.draftByProvider['package']) as PackageRelationDraft | undefined)?.sources
    ?? (state.readModelByProvider['package'] as { sources?: PackageRelationDraft['sources'] } | undefined)?.sources
    ?? [];

  // Keep the Rate Sheet's existing Category Group filter in step with the
  // workspace scope; the Rate Sheet dropdown can still refine locally after.
  useEffect(() => {
    setRateSheetFilters((current) => current.categoryGroup === selectedCategoryGroupId
      ? current
      : { ...current, categoryGroup: selectedCategoryGroupId });
  }, [selectedCategoryGroupId]);

  // A workspace only offers the sub-tabs it populates.
  useEffect(() => {
    if (serviceCatalogSurface) return;
    if (!WORKSPACE_SUB_TABS[activeWorkspace].includes(activeSubTab)) setActiveSubTab('details');
  }, [activeWorkspace, activeSubTab, serviceCatalogSurface]);

  // A group that leaves the current registry (archived, trashed, deleted)
  // cannot remain the workspace scope.
  useEffect(() => {
    if (selectedCategoryGroupId === 'all' || selectedCategoryGroupId === 'unassigned') return;
    if (!categoryGroups.some((group) => group.group_id === selectedCategoryGroupId)) setSelectedCategoryGroupId('all');
  }, [categoryGroups, selectedCategoryGroupId]);

  const runGroupLifecycle = async (groupId: string, operation: () => Promise<unknown>) => {
    setGroupActionBusy(true);
    setManagerNotice(null);
    try {
      await operation();
      await reloadCategoryGroups();
    } catch (error) {
      setManagerNotice({ kind: 'error', message: error instanceof Error ? error.message : 'The group operation failed.' });
    } finally {
      setGroupActionBusy(false);
    }
  };
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
    setPendingOnboardIds([]);
    setSourcePreviewDraft(null);
  };

  const groupIssues = active
    ? state.validationByProvider[active.key]?.filter((issue) => issue.sectionId === 'groups') ?? []
    : [];

  // ===========================================================================
  // SECTION: MANAGER_RENDER
  // ===========================================================================
  return (
    <section class="cz-manager-workspace" aria-label={serviceCatalogSurface ? 'Your Service Manager' : `${activeWorkspace === 'service' ? 'Services' : active?.label ?? 'Connection'} Manager`}>
      {/* SECTION: FAMILY_SCOPE — Category Group cards establish the workspace scope. */}
      {hasPackageProvider && scope.stationContext.type === 'service' && (
        <PackageCategoryGroupCards
          groups={categoryGroups}
          sources={packageDraftSources}
          selected={selectedCategoryGroupId}
          onSelect={setSelectedCategoryGroupId}
          busy={groupActionBusy}
          onLifecycleAction={(groupId, operation) => { void runGroupLifecycle(groupId, operation); }}
          onManageGroups={() => {
            if (onManageCategoryGroups) {
              onManageCategoryGroups();
              return;
            }
            if (packageProvider) setState((current) => selectManagerProvider(current, packageProvider.key, providers));
            setActiveWorkspace('service');
            setActiveSubTab('connections');
          }}
        />
      )}
      {!serviceCatalogSurface && providers.length > 0 && (
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
      {(serviceCatalogSurface || WORKSPACE_SUB_TABS[activeWorkspace].length > 1) && (
        <ManagerSubTabs active={activeSubTab} onChange={setActiveSubTab} tabs={serviceCatalogSurface ? ['details', 'connections', 'settings'] : WORKSPACE_SUB_TABS[activeWorkspace]} />
      )}
      {/* SECTION: PROMOTION_WORKSPACE */}
      {!serviceCatalogSurface && activeSubTab === 'details' && activeWorkspace === 'promotion' && active?.key === 'promotion' && scope.stationContext.type === 'service' && (
        <PromotionManagerWorkspace serviceId={Number(scope.stationContext.id)} onOpen={onOpenPromotion ?? (() => {})} />
      )}
      {/* SECTION: SERVICE_WORKSPACE */}
      {!packagesSurface && (serviceCatalogSurface || activeWorkspace === 'service') && active?.key === 'package' && scope.stationContext.type === 'service' && activeSubTab === 'details' && (
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
            categoryGroupFilter={selectedCategoryGroupId}
            onCategoryGroupFilterChange={(value) => setSelectedCategoryGroupId(value as WorkspaceGroupScope)}
        />
      )}
      {!serviceCatalogSurface && activeWorkspace === 'service' && active?.key === 'package' && scope.stationContext.type === 'service' && activeSubTab === 'connections' && (
        <PackageCategoryGroupsSection onChanged={() => { void reloadCategoryGroups(); }} />
      )}
      {/* SECTION: PACKAGE_WORKSPACE */}
      {!serviceCatalogSurface && activeWorkspace === 'package' && active?.key === 'package' && scope.stationContext.type === 'service' && activeSubTab === 'details' && (
        <PackageManagerTierCards serviceId={Number(scope.stationContext.id)} onOpen={onOpenPackage ?? (() => {})} />
      )}
      {loadState === 'loading' && <p class="cz-sp-tier-table__muted">Loading provider workspace…</p>}
      {loadError && <div class="cz-admin-error-msg" role="alert">{loadError}</div>}
      {managerNotice && <div class={managerNotice.kind === 'error' ? 'cz-admin-error-msg' : 'cz-admin-success-msg'} role="status">{managerNotice.message}</div>}

      {readModel !== undefined && active && [...active.manager.sections]
        .sort((a, b) => (SETTINGS_SECTION_ORDER[a.id] ?? 9) - (SETTINGS_SECTION_ORDER[b.id] ?? 9))
        .map((section) => {
        if ((!serviceCatalogSurface && activeWorkspace !== 'package') || active.key !== 'package') return null;
        // Relationships are the primary Connections content; Commercial
        // (option) Groups and the Rate Sheet compose Settings.
        const sectionTab: ManagerSubTab = section.id === 'relationships' ? 'connections' : 'settings';
        if (activeSubTab !== sectionTab) return null;
        const draft = sourcePreviewDraft ?? state.draftByProvider[active.key];
        const projection = section.project(readModel, scope, draft);
        if (activeSubTab === 'connections' && projection.role !== 'relations') return null;
        if (activeSubTab === 'settings' && projection.role !== 'structure' && projection.role !== 'rate-sheet') return null;
        if (projection.role === 'rate-sheet') {
          const beginEdit = () => {
            setRateSheetError(null);
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
          return (
            <section class="cz-manager-section cz-manager-section--content-only cz-manager-rate-sheet" key={section.id} aria-label="Rate Sheet">
              {editingRateSheet ? (
                <PackageRateSheetEditor
                  value={editingRateSheet}
                  onChange={setEditingRateSheet}
                  configured={projection.configured}
                  options={projection.options}
                  units={projection.units}
                  sourcePicker={!!section.rateSheetControls?.sourcePicker}
                  saving={rateSheetSaving}
                  saveError={rateSheetError}
                  onSave={() => saveRateSheet(section)}
                  onCancel={() => { setEditingRateSheet(null); setRateSheetError(null); setPendingOnboardIds([]); setSourcePreviewDraft(null); }}
                  onConnectSources={section.rateSheetControls?.connectSources ? async (serviceIds) => {
                    if (!editingRateSheet) return;
                    const baseDraft = section.rateSheetControls!.replace(draft, editingRateSheet);
                    const nextDraft = await section.rateSheetControls!.connectSources!(baseDraft, serviceIds, Number(scope.stationContext.id));
                    const nextProjection = section.project(readModel, scope, nextDraft);
                    if (nextProjection.role === 'rate-sheet') {
                      setEditingRateSheet({
                        title: nextProjection.title,
                        groups: nextProjection.groups.map((group) => ({ ...group })),
                        items: nextProjection.items.map((item) => ({ id: item.id, optionId: item.optionId, unitPrice: item.unitPrice, per: item.per, quantity: item.quantity, groupId: item.groupId, sourceAvailable: item.sourceAvailable })),
                      });
                    }
                    setSourcePreviewDraft(nextDraft);
                  } : undefined}
                />
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
        // Workspace scope: relationship rows resolve their supplying Service's
        // Category Group assignment through the same provenance map the Rate
        // Sheet filter uses (assignmentByServiceId) — no second mechanism.
        const groupAssignments = assignmentByServiceId(packageDraftSources);
        const rows = projection.rows.filter((row) => {
          if (!row.filterIds.includes(activeFilter)) return false;
          if (selectedCategoryGroupId === 'all') return true;
          const assigned = row.sourceServiceId != null ? groupAssignments.get(row.sourceServiceId) ?? null : null;
          return selectedCategoryGroupId === 'unassigned' ? assigned === null : assigned === selectedCategoryGroupId;
        });
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
 * FAMILY_SCOPE               Category Group cards and workspace scope selection
 * RATE_SHEET_EDITOR          Rate Sheet save/validation coordination (editor UI
 *                            extracted to PackageRateSheetEditor.tsx)
 * SERVICE_WORKSPACE          Service assignments and Package Category Groups
 * PACKAGE_WORKSPACE          Tier cards, Connections relationships, and Settings
 *                            (Commercial Groups + Rate Sheet)
 * PROMOTION_WORKSPACE        Promotion provider sections and continuations
 * MANAGER_RENDER             Tabs, actions, exit guards, and workspace composition
 *
 * Search: SECTION: MANAGER_COORDINATION
 *         SECTION: FAMILY_SCOPE
 *         SECTION: RATE_SHEET_EDITOR
 *         SECTION: SERVICE_WORKSPACE
 *         SECTION: PACKAGE_WORKSPACE
 *         SECTION: PROMOTION_WORKSPACE
 *         SECTION: MANAGER_RENDER
 */
