import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ActionConfig, ExitGuard, StepContext } from '../ActionShell';
import { ModuleStatusPill } from '../ui/ModuleStatusPill';
import { MODULE_ICONS } from '../schema/icons';
import { ReadBlock } from '../ReadBlock';
import { fetchPackageCategoryGroups } from '@/api/endpoints/admin';
import type { PackageCategoryGroupItem, StationSummary } from '@/api/types/admin';
import { relationProvidersFor } from './registry';
import type { ManagerContinuation, StationManagerScope } from './types';
import {
  assignPackageServiceCategoryGroup,
  createPackageRelationGroup,
  deletePackageRelationGroup,
  renamePackageRelationGroup,
  updatePackageRelationDecision,
} from './providers/package';
import type { PackageRelationDraft } from './providers/package';
import { PackageServicesTable } from './PackageServicesTable';
import { PackageCategoryGroupCards } from './PackageCategoryGroupCards';
import type { WorkspaceGroupScope } from './PackageCategoryGroupCards';
import { PackageRateSheetFilters, RATE_SHEET_FILTER_DEFAULTS, assignmentByServiceId, filterRateSheetItems } from './PackageRateSheetFilters';
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
import {
  buildCommercialGroupDrawerConfig,
  buildConnectionDrawerConfig,
  buildFamilyAssignmentDrawerConfig,
  buildPriceSettingsDrawerConfig,
  buildRateRowDrawerConfig,
  buildRateSheetSetupDrawerConfig,
} from './serviceManagerDrawers';
import type {
  CommercialGroupDrawerValue,
  ConnectionDrawerValue,
  RateRowDrawerValue,
} from './serviceManagerDrawers';

export type ManagerShellContext = Pick<StepContext, 'setExitGuard' | 'confirmPendingExit' | 'cancelPendingExit' | 'requestExit' | 'setFooter'>;
export type ManagerSurface = 'service-catalog' | 'packages';

type ManagerWorkspace = 'service' | 'package' | 'promotion';
type ManagerSectionProjection = ReturnType<ManagerProviderAdapter['manager']['sections'][number]['project']>;

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

export function DynamicStationManager({ scope: initialScope, shell, continuation, onOpenPromotion, onOpenPackage, onOpenService, services, surface, onManageCategoryGroups, openAction }: {
  scope: StationManagerScope;
  shell: ManagerShellContext;
  continuation?: ManagerContinuation;
  onOpenPromotion?: (promotionId?: string, edit?: boolean) => void;
  onOpenPackage?: (occupantId: string, slotId: string, edit?: boolean) => void;
  onOpenService?: (summary: StationSummary, edit?: boolean) => void;
  services?: readonly StationSummary[];
  surface?: ManagerSurface;
  onManageCategoryGroups?: (group?: PackageCategoryGroupItem) => void;
  openAction?: (config: ActionConfig) => void;
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
  const [managerNotice, setManagerNotice] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [sourcePreviewDraft, setSourcePreviewDraft] = useState<unknown | null>(null);
  const sourcePreviewDraftRef = useRef<unknown | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<ManagerSubTab>('details');
  const [activeWorkspace, setActiveWorkspace] = useState<ManagerWorkspace>(
    surface === 'packages' ? 'package' : initialScope.activeProviderKey === 'promotion' ? 'promotion' : 'service',
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
  const dirty = providerDirty || editingGroup !== null;
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
  // Project each Package section once from the draft-preferred model. Station
  // Home metrics and collections consume these same projections; presentation
  // never creates a second read model or persistence path.
  const packageSectionProjections = useMemo(() => {
    const model = state.readModelByProvider['package'];
    if (!packageProvider || model === undefined) return new Map<string, ManagerSectionProjection>();
    const draft = sourcePreviewDraft ?? state.draftByProvider['package'];
    return new Map(packageProvider.manager.sections.map((section) => [section.id, section.project(model, scope, draft)]));
  }, [packageProvider, state.readModelByProvider['package'], state.draftByProvider['package'], sourcePreviewDraft, currentScopeKey]);
  const relationshipProjection = packageSectionProjections.get('relationships');
  const structureProjection = packageSectionProjections.get('groups');
  const rateSheetProjection = packageSectionProjections.get('rate-sheets');
  const connectedServiceCount = new Set(packageDraftSources
    .filter((source) => source.provider_key === 'service' && source.entity_type === 'service')
    .map((source) => Number(source.entity_id))).size;
  const activeConnectionCount = relationshipProjection?.role === 'relations'
    ? relationshipProjection.rows.filter((row) => row.state.status === 'active' && row.availability === 'Available' && row.sourceHealth === 'Connected').length
    : 0;
  const commercialGroupCount = structureProjection?.role === 'structure' ? structureProjection.rows.length : 0;
  const rateSheetRowCount = rateSheetProjection?.role === 'rate-sheet' ? rateSheetProjection.items.length : 0;
  const serviceConnectionSummaryById = useMemo(() => {
    const summaries = new Map<number, { count: number; attention: number }>();
    if (relationshipProjection?.role !== 'relations') return summaries;
    for (const row of relationshipProjection.rows) {
      if (row.sourceServiceId == null) continue;
      const current = summaries.get(row.sourceServiceId) ?? { count: 0, attention: 0 };
      current.count += 1;
      if (row.state.status !== 'active' || row.availability !== 'Available' || row.sourceHealth !== 'Connected') current.attention += 1;
      summaries.set(row.sourceServiceId, current);
    }
    return summaries;
  }, [relationshipProjection]);

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
    const tabs = packagesSurface ? ['details'] : WORKSPACE_SUB_TABS[activeWorkspace];
    if (!tabs.includes(activeSubTab)) setActiveSubTab('details');
  }, [activeWorkspace, activeSubTab, serviceCatalogSurface, packagesSurface]);

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
  // Focused drawer coordination is assembled in the Rate Sheet projection
  // branch below; the provider remains the sole validation/draft authority.
  // ===========================================================================
  const groupIssues = active
    ? state.validationByProvider[active.key]?.filter((issue) => issue.sectionId === 'groups') ?? []
    : [];

  // ===========================================================================
  // SECTION: MANAGER_RENDER
  // ===========================================================================
  return (
    <section class="cz-manager-workspace" aria-label={serviceCatalogSurface ? 'Your Service Manager' : `${activeWorkspace === 'service' ? 'Services' : active?.label ?? 'Connection'} Manager`}>
      {serviceCatalogSurface && (
        <section class="cz-station-summary" aria-label="Service Station summary">
          {([
            { label: 'Connected Services', value: connectedServiceCount, detail: 'Available to Package connections', icon: MODULE_ICONS.package, tone: 'blue' },
            { label: 'Active Connections', value: activeConnectionCount, detail: 'Healthy and available', icon: MODULE_ICONS.features, tone: 'green' },
            { label: 'Commercial Groups', value: commercialGroupCount, detail: 'Package-owned groupings', icon: MODULE_ICONS.category, tone: 'violet' },
            { label: 'Rate Sheet Rows', value: rateSheetRowCount, detail: 'Configured pricing rows', icon: MODULE_ICONS.overview, tone: 'amber' },
          ] as const).map((metric) => (
            <article class="cz-station-summary__card" key={metric.label}>
              <span class={`cz-station-summary__icon is-${metric.tone}`}>{metric.icon}</span>
              <div>
                <span class="cz-station-summary__label">{metric.label}</span>
                <strong class="cz-station-summary__value">{metric.value.toLocaleString()}</strong>
                <small>{metric.detail}</small>
              </div>
            </article>
          ))}
        </section>
      )}
      {/* SECTION: FAMILY_SCOPE — Category Group cards establish the workspace scope. */}
      {!packagesSurface && hasPackageProvider && scope.stationContext.type === 'service' && (
        <PackageCategoryGroupCards
          groups={categoryGroups}
          sources={packageDraftSources}
          selected={selectedCategoryGroupId}
          onSelect={setSelectedCategoryGroupId}
          busy={groupActionBusy}
          onLifecycleAction={(groupId, operation) => { void runGroupLifecycle(groupId, operation); }}
          onManageGroups={(group) => {
            if (onManageCategoryGroups) {
              onManageCategoryGroups(group);
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
              ...(!packagesSurface ? [{ key: 'service' as const, label: 'Services', provider: packageProvider }] : []),
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
      {(serviceCatalogSurface || (!packagesSurface && WORKSPACE_SUB_TABS[activeWorkspace].length > 1)) && (
        <ManagerSubTabs active={activeSubTab} onChange={setActiveSubTab} tabs={serviceCatalogSurface ? ['details', 'connections', 'settings'] : WORKSPACE_SUB_TABS[activeWorkspace]} />
      )}
      {/* SECTION: PROMOTION_WORKSPACE */}
      {!serviceCatalogSurface && activeSubTab === 'details' && activeWorkspace === 'promotion' && active?.key === 'promotion' && scope.stationContext.type === 'service' && (
        <PromotionManagerWorkspace serviceId={Number(scope.stationContext.id)} onOpen={onOpenPromotion ?? (() => {})} />
      )}
      {/* SECTION: SERVICE_WORKSPACE */}
      {!packagesSurface && (serviceCatalogSurface || activeWorkspace === 'service') && active?.key === 'package' && scope.stationContext.type === 'service' && activeSubTab === 'details' && (
        <PackageServicesTable
            services={services ?? []}
            sources={((sourcePreviewDraft ?? state.draftByProvider[active.key]) as PackageRelationDraft | undefined)?.sources
              ?? (state.readModelByProvider[active.key] as { sources?: PackageRelationDraft['sources'] } | undefined)?.sources
              ?? []}
            categoryGroups={categoryGroups}
            hostServiceId={Number(scope.stationContext.id)}
            connectionSummaryByServiceId={serviceConnectionSummaryById}
            onOpenService={(summary, edit) => onOpenService?.(summary, edit)}
            onManageAssignment={(summary, groupId) => {
              if (!openAction) return;
              openAction(buildFamilyAssignmentDrawerConfig({
                serviceId: summary.id,
                serviceTitle: summary.title,
                groupId,
                groups: categoryGroups
                  .filter((group) => group.platform_status === 'active' || group.platform_status === 'disabled' || group.group_id === groupId)
                  .map((group) => ({ id: group.group_id, label: `${group.label}${group.platform_status === 'archived' || group.platform_status === 'trashed' ? ' (binned)' : ''}` })),
              }, (next) => {
                const base = (sourcePreviewDraft ?? state.draftByProvider[active.key]) as PackageRelationDraft | undefined;
                if (base === undefined) return;
                const nextDraft = assignPackageServiceCategoryGroup(base, next.serviceId, next.groupId, Number(scope.stationContext.id));
                if (sourcePreviewDraft !== null) setSourcePreviewDraft(nextDraft);
                replaceActiveDraft(nextDraft);
              }));
            }}
            categoryGroupFilter={selectedCategoryGroupId}
        />
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
        const projection = active.key === 'package'
          ? packageSectionProjections.get(section.id) ?? section.project(readModel, scope, draft)
          : section.project(readModel, scope, draft);
        if (activeSubTab === 'connections' && projection.role !== 'relations') return null;
        if (activeSubTab === 'settings' && projection.role !== 'structure' && projection.role !== 'rate-sheet') return null;
        if (projection.role === 'rate-sheet') {
          const beginEdit = () => {
            if (!openAction || !section.rateSheetControls) return;
            const rateSheet = {
              title: projection.title,
              groups: projection.groups.map((group) => ({ ...group })),
              items: projection.items.map((item) => ({
                id: item.id, optionId: item.optionId, unitPrice: item.unitPrice,
                per: item.per, quantity: item.quantity, groupId: item.groupId,
                sourceAvailable: item.sourceAvailable,
              })),
            };
            openAction(buildRateSheetSetupDrawerConfig({
              rateSheet,
              configured: projection.configured,
              options: projection.options,
              units: projection.units,
              sourcePicker: !!section.rateSheetControls.sourcePicker,
            }, async (nextValue) => {
              const latestDraft = sourcePreviewDraftRef.current ?? state.draftByProvider[active.key];
              const model = state.readModelByProvider[active.key];
              if (latestDraft === undefined) throw new Error('The Package manager draft is unavailable.');
              const nextDraft = section.rateSheetControls!.replace(latestDraft, nextValue);
              const validation = active.validate?.(nextDraft, model, scope);
              const issue = validation?.issues.find((candidate) => candidate.sectionId === section.id);
              if (issue) throw new Error(issue.message);
              replaceActiveDraft(nextDraft);
              sourcePreviewDraftRef.current = null;
              setSourcePreviewDraft(null);
            }, () => { sourcePreviewDraftRef.current = null; setSourcePreviewDraft(null); }, section.rateSheetControls.connectSources ? async (currentValue, serviceIds) => {
              const latestDraft = sourcePreviewDraftRef.current ?? state.draftByProvider[active.key];
              if (latestDraft === undefined) throw new Error('The Package manager draft is unavailable.');
              const baseDraft = section.rateSheetControls!.replace(latestDraft, currentValue);
              const nextDraft = await section.rateSheetControls!.connectSources!(baseDraft, serviceIds, Number(scope.stationContext.id));
              const nextProjection = section.project(readModel, scope, nextDraft);
              if (nextProjection.role !== 'rate-sheet') throw new Error('The Rate Sheet could not be projected.');
              sourcePreviewDraftRef.current = nextDraft;
              setSourcePreviewDraft(nextDraft);
              return {
                title: nextProjection.title,
                groups: nextProjection.groups.map((group) => ({ ...group })),
                items: nextProjection.items.map((item) => ({ id: item.id, optionId: item.optionId, unitPrice: item.unitPrice, per: item.per, quantity: item.quantity, groupId: item.groupId, sourceAvailable: item.sourceAvailable })),
              };
            } : undefined));
          };
          return (
            <section class="cz-manager-section cz-manager-section--content-only cz-manager-rate-sheet" key={section.id} aria-label="Rate Sheet">
              {!projection.configured ? (
                <div class="cz-manager-empty">
                  <span class="cz-manager-empty__icon">{MODULE_ICONS.package}</span>
                  <strong>{section.emptyState.title}</strong>
                  <span class="cz-manager-empty__status">Not configured</span>
                  <p>{section.emptyState.description}</p>
                  <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={beginEdit}>Create Rate Sheet</button>
                </div>
              ) : (
                <div class="cz-manager-rate-sheet__catalogue">
                  <div class="cz-manager-section__title">
                    <div><h3>Rate Sheet</h3><p>Browse pricing rows and open one focused drawer to edit configuration.</p></div>
                    <div class="cz-manager-section__actions">
                      {serviceCatalogSurface && openAction && <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => openAction(buildPriceSettingsDrawerConfig())}>Price Settings</button>}
                      <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={beginEdit}>Rate Sheet setup</button>
                    </div>
                  </div>
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
                      <div class="cz-sp-tier-table-wrap cz-manager-read-table"><table class="cz-sp-tier-table"><thead><tr><th>Option</th><th>Service</th><th>Service Category</th><th>Unit Price</th><th>Per</th><th>Quantity</th><th>Group</th>{serviceCatalogSurface && <th>Action</th>}</tr></thead>
                        <tbody>{visibleItems.map((item) => <tr key={item.id}>
                          <td class="cz-sp-tier-table__name">{item.optionLabel}</td>
                          <td class="cz-sp-tier-table__muted">{item.serviceTitle ?? '—'}</td>
                          <td class="cz-sp-tier-table__muted">{(item.serviceCategories?.length ?? 0) > 0 ? item.serviceCategories!.join(', ') : '—'}</td>
                          <td>${item.unitPrice.toFixed(2)}</td><td>{item.per}</td><td>{item.quantity}</td><td>{item.groupLabel}</td>
                          {serviceCatalogSurface && <td><button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => {
                            if (!openAction || !section.rateSheetControls) return;
                            const value: RateRowDrawerValue = {
                              id: item.id, optionLabel: item.optionLabel, serviceTitle: item.serviceTitle ?? null,
                              serviceCategories: item.serviceCategories ?? [], unitPrice: item.unitPrice,
                              per: item.per, quantity: item.quantity, groupId: item.groupId,
                              groups: projection.groups, units: projection.units,
                            };
                            openAction(buildRateRowDrawerConfig(value, (next) => {
                              const latestDraft = sourcePreviewDraft ?? state.draftByProvider[active.key];
                              if (latestDraft === undefined) return;
                              const nextRateSheet = {
                                title: projection.title,
                                groups: projection.groups,
                                items: projection.items.map((row) => row.id === next.id
                                  ? { id: row.id, optionId: row.optionId, unitPrice: next.unitPrice, per: next.per, quantity: next.quantity, groupId: next.groupId }
                                  : { id: row.id, optionId: row.optionId, unitPrice: row.unitPrice, per: row.per, quantity: row.quantity, groupId: row.groupId }),
                              };
                              replaceActiveDraft(section.rateSheetControls!.replace(latestDraft, nextRateSheet));
                            }));
                          }}>Edit</button></td>}
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
          if (serviceCatalogSurface && openAction && controls) {
            const relationSection = active.manager.sections.find((candidate) => candidate.id === 'relationships');
            const relationProjection = relationSection?.project(readModel, scope, draft);
            const sourceOptions = relationProjection?.role === 'relations'
              ? relationProjection.rows.map((row) => ({ id: row.id, label: row.sourceLabel }))
              : [];
            const openGroupDrawer = (row?: typeof projection.rows[number]) => {
              const base = draft as PackageRelationDraft | undefined;
              if (!base) return;
              temporaryGroupSequence.current += 1;
              const id = row?.id ?? `tmp_group_${Date.now()}_${temporaryGroupSequence.current}`;
              const value: CommercialGroupDrawerValue = {
                id,
                label: row?.label ?? '',
                order: row?.order ?? projection.rows.length + 1,
                memberIds: sourceOptions.filter((source) => base.itemsById[source.id]?.group_id === id).map((source) => source.id),
                sourceOptions,
                isNew: !row,
              };
              openAction(buildCommercialGroupDrawerConfig(value, (nextValue) => {
                let next = (sourcePreviewDraft ?? state.draftByProvider[active.key]) as PackageRelationDraft | undefined;
                if (!next) return;
                if (nextValue.isNew) next = createPackageRelationGroup(next, nextValue.id);
                next = renamePackageRelationGroup(next, nextValue.id, nextValue.label);
                const members = new Set(nextValue.memberIds);
                for (const source of sourceOptions) {
                  const current = next.itemsById[source.id];
                  if (!current) continue;
                  const desired = members.has(source.id) ? nextValue.id : current.group_id === nextValue.id ? null : current.group_id;
                  if (desired !== current.group_id) next = updatePackageRelationDecision(next, source.id, { group_id: desired });
                }
                replaceActiveDraft(next);
              }, row ? () => {
                const latest = (sourcePreviewDraft ?? state.draftByProvider[active.key]) as PackageRelationDraft | undefined;
                if (latest) replaceActiveDraft(deletePackageRelationGroup(latest, row.id));
              } : undefined));
            };
            return (
              <section class="cz-manager-section cz-manager-section--content-only" key={section.id} aria-label="Commercial Groups">
                <div class="cz-manager-section__title">
                  <div><h3>Commercial Groups</h3><p>Organise connected source content into customer-facing collections.</p></div>
                  <div class="cz-manager-section__actions"><button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={() => openGroupDrawer()}>+ New Group</button></div>
                </div>
                {projection.rows.length === 0 ? <div class="cz-manager-empty"><strong>No Commercial Groups yet.</strong><p>Create groups to organise source connections.</p></div> : (
                  <div class="cz-manager-summary-grid">
                    {projection.rows.map((row) => <article class="cz-manager-commercial-card" key={row.id}>
                      <span class="cz-manager-commercial-card__icon" aria-hidden="true">{MODULE_ICONS.category}</span>
                      <div><strong>{row.label || 'Unnamed group'}</strong><p>{row.relationshipCount} source{row.relationshipCount === 1 ? '' : 's'} · display order {row.order}</p></div>
                      <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => openGroupDrawer(row)}>Edit</button>
                    </article>)}
                  </div>
                )}
              </section>
            );
          }
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
            <div class="cz-manager-section__title">
              <div><h3>Source Connections</h3><p>Monitor availability, configuration state, and source health.</p></div>
              <div class="cz-manager-filters" role="group" aria-label="Relationship filters">
                {projection.filters.map((filter) => (
                  <button type="button" key={filter.id} class={activeFilter === filter.id ? 'is-active' : undefined}
                    aria-pressed={activeFilter === filter.id}
                    onClick={() => setFilterBySection((current) => ({ ...current, [section.id]: filter.id }))}>
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            {rows.length === 0 ? <div class="cz-manager-empty"><strong>{section.emptyState.title}</strong></div> : (
              <div class="cz-manager-collection cz-manager-collection--connections" role="table" aria-label="Source Connections">
                <div class="cz-manager-collection__header" role="row"><span role="columnheader">Source</span><span role="columnheader">Group</span><span role="columnheader">State</span><span role="columnheader">Availability</span><span role="columnheader">Health</span>{serviceCatalogSurface && <span role="columnheader">Action</span>}</div>
                <div class="cz-manager-collection__body" role="rowgroup">{rows.map((row) => (
                    <div class="cz-manager-collection__row" role="row" key={row.id} tabIndex={0}
                      aria-current={focusedRelationshipKey === row.id ? 'true' : undefined}
                      onClick={() => setFocusedRelationshipKey(row.id)}
                      onFocus={() => { setSelectedSectionKey(section.id); setFocusedRelationshipKey(row.id); }}>
                      <div class="cz-manager-collection__cell cz-manager-collection__identity" role="cell" data-label="Source"><strong>{row.sourceLabel}</strong><small>Display order {row.order}</small></div>
                      <div class="cz-manager-collection__cell cz-manager-collection__secondary" role="cell" data-label="Group">{row.groupLabel}</div>
                      <div class="cz-manager-collection__cell cz-manager-collection__status" role="cell" data-label="State"><ModuleStatusPill status={row.state.status} notes={row.state.notes} /><small>{row.stateDetail}</small></div>
                      <div class="cz-manager-collection__cell" role="cell" data-label="Availability">{row.availability}</div>
                      <div class={`cz-manager-collection__cell${row.sourceHealth === 'Missing' ? ' cz-manager-text--attention' : ' cz-manager-collection__secondary'}`} role="cell" data-label="Health">{row.sourceHealth}</div>
                      {serviceCatalogSurface && <div class="cz-manager-collection__cell cz-manager-collection__action" role="cell" data-label="Action"><button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={(event) => {
                        event.stopPropagation();
                        if (!openAction) return;
                        const value: ConnectionDrawerValue = {
                          id: row.id, sourceLabel: row.sourceLabel, groupId: row.groupId,
                          order: row.order, disabled: row.disabled, decoratedLabel: row.decoratedLabel,
                          availability: row.availability, sourceHealth: row.sourceHealth,
                        };
                        const groupOptions = ((draft as PackageRelationDraft | undefined)?.groups ?? []).map((group) => ({ id: group.group_id, label: group.label }));
                        openAction(buildConnectionDrawerConfig(value, groupOptions, (next) => {
                          const latest = (sourcePreviewDraft ?? state.draftByProvider[active.key]) as PackageRelationDraft | undefined;
                          if (!latest) return;
                          replaceActiveDraft(updatePackageRelationDecision(latest, next.id, {
                            group_id: next.groupId, sort_order: next.order, disabled: next.disabled, decorated_label: next.decoratedLabel,
                          }));
                        }));
                      }}>Edit</button></div>}
                    </div>
                  ))}</div>
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
 * SERVICE_WORKSPACE          Your Service Manager Service assignments
 * PACKAGE_WORKSPACE          Service Catalog connections/settings or Packages Tier cards
 * PROMOTION_WORKSPACE        Packages Promotion presentation
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
