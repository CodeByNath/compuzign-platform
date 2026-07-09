import { apiClient } from '../client';
import type {
  AcceptIntakeResponse,
  AdminCatalogResponse,
  PermanentDeleteResponse,
  AdminServiceDetailResponse,
  AdminOverview,
  AdminRequestsResponse,
  CreateServicePayload,
  CreateServiceResponse,
  MigrationAudit,
  MigrationRunResult,
  MigrationPhase2Result,
  MigrationPhase4Result,
  ServicePackageStationResponse,
  ServiceTierSaveResponse,
  TierLifecycleResponse,
  TierArchiveResponse,
  BinRestoreResponse,
  BinTrashResponse,
  BinDeleteResponse,
  TierModuleKey,
  TierModuleSavePayload,
  ServicePromotionStationResponse,
  ServicePromotionSaveResponse,
  ModuleRevertResponse,
  ModuleSettleResponse,
  PromotionTierPayload,
  PromotionModuleKey,
  PromotionOverviewDraft,
  PromotionLifecycleResponse,
  PromotionTransitionResponse,
  PromotionDeleteResponse,
  CategoryDeleteResponse,
  CategoryListResponse,
  CategoryMutationResponse,
  CategoryOverviewDraft,
  CategoryOverviewSaveResponse,
  CategoryGroupDeleteResponse,
  CategoryGroupListResponse,
  CategoryGroupMutationResponse,
  CategoryGroupOverviewDraft,
  CategoryGroupOverviewSaveResponse,
  InclusionItem,
  RequestEntry,
  ServiceFaqsPayload,
  ServiceFaqsResponse,
  ServiceInclusionsPayload,
  ServiceInclusionsResponse,
  ServiceOverviewPayload,
  ServiceOverviewResponse,
  ServiceStatusPayload,
  ServiceStatusResponse,
  SurfacePackagesResponse,
  TierSavePayload,
  CreateInclusionPoolItemResponse,
  CreateFaqPoolItemResponse,
} from '../types/admin';

export function fetchAdminCatalog(platformStatus?: 'archived' | 'trashed'): Promise<AdminCatalogResponse> {
  const path = platformStatus
    ? `admin/services?platform_status=${platformStatus}`
    : 'admin/services';
  return apiClient.get<AdminCatalogResponse>(path);
}

export function restoreService(serviceId: number): Promise<ServiceStatusResponse> {
  return apiClient.post<ServiceStatusResponse>(`admin/services/${serviceId}/restore`);
}

export function archiveService(serviceId: number): Promise<ServiceStatusResponse> {
  return apiClient.post<ServiceStatusResponse>(`admin/services/${serviceId}/status`, { platform_status: 'archived' });
}

export function trashService(serviceId: number): Promise<ServiceStatusResponse> {
  return apiClient.post<ServiceStatusResponse>(`admin/services/${serviceId}/status`, { platform_status: 'trashed' });
}

export function permanentDeleteService(serviceId: number): Promise<PermanentDeleteResponse> {
  return apiClient.delete<PermanentDeleteResponse>(`admin/services/${serviceId}`);
}

export function fetchAdminOverview(): Promise<AdminOverview> {
  return apiClient.get<AdminOverview>('admin/overview');
}

// Service category inline creation.
export function createServiceCategory(payload: {
  name:         string;
  description?: string;
}): Promise<{
  success:   boolean;
  existing?: boolean;
  message?:  string;
  category?: { id: number; name: string; slug: string; description: string };
}> {
  return apiClient.post('admin/service-categories', payload);
}

// Service category inline update (name and/or description).
export function updateServiceCategory(
  id:      number,
  payload: { name?: string; description?: string },
): Promise<{
  success:   boolean;
  message?:  string;
  category?: { id: number; name: string; slug: string; description: string };
}> {
  return apiClient.post(`admin/service-categories/${id}`, payload);
}

// ── Category station (S6) ─────────────────────────────────────────────────────
// The /admin/categories family — additive beside the inline
// /admin/service-categories convenience routes above, which stay untouched (D3).

export function fetchAdminCategories(platformStatus?: 'archived' | 'trashed'): Promise<CategoryListResponse> {
  const path = platformStatus
    ? `admin/categories?platform_status=${platformStatus}`
    : 'admin/categories';
  return apiClient.get<CategoryListResponse>(path);
}

// Station create (D3): born disabled; overview settles immediately when the
// payload is complete. Duplicate names fail (no return-existing convenience).
export function createCategory(payload: {
  name:         string;
  description?: string;
}): Promise<CategoryMutationResponse> {
  return apiClient.post<CategoryMutationResponse>('admin/categories', payload);
}

// Save the overview draft — canonical term untouched, overview marked pending.
export function saveCategoryOverview(
  categoryId: number,
  payload:    CategoryOverviewDraft,
): Promise<CategoryOverviewSaveResponse> {
  return apiClient.put<CategoryOverviewSaveResponse>(`admin/categories/${categoryId}/overview`, payload);
}

// Commit the draft to the term (name + description), clear it, re-derive status.
export function settleCategoryOverview(categoryId: number): Promise<CategoryMutationResponse> {
  return apiClient.post<CategoryMutationResponse>(`admin/categories/${categoryId}/overview/settle`, {});
}

// Discard the draft; module_status re-derives from the settled state.
export function revertCategoryOverview(categoryId: number): Promise<CategoryMutationResponse> {
  return apiClient.post<CategoryMutationResponse>(`admin/categories/${categoryId}/overview/revert`, {});
}

// Engine transition — the only status write for categories.
export function updateCategoryStatus(
  categoryId:     number,
  platformStatus: 'active' | 'disabled' | 'archived' | 'trashed',
): Promise<CategoryMutationResponse> {
  return apiClient.patch<CategoryMutationResponse>(`admin/categories/${categoryId}/status`, {
    platform_status: platformStatus,
  });
}

// Server-driven restore — resolves previous_platform_status, lands disabled.
export function restoreCategory(categoryId: number): Promise<CategoryMutationResponse> {
  return apiClient.post<CategoryMutationResponse>(`admin/categories/${categoryId}/restore`, {});
}

// Trashed-only. A D6 guard failure is an HTTP 409 (apiClient throws; the error
// text carries { message, assigned_count }).
export function permanentDeleteCategory(categoryId: number): Promise<CategoryDeleteResponse> {
  return apiClient.delete<CategoryDeleteResponse>(`admin/categories/${categoryId}`);
}

// Group assignment (Category Group audit, Phase B/C) — structural, not draft
// content: moves this category under a group term, or ungroups it when
// groupId is null. Returns the same CategoryMutationResponse shape as every
// other category mutation.
export function updateCategoryGroup(
  categoryId: number,
  groupId:    number | null,
): Promise<CategoryMutationResponse> {
  return apiClient.patch<CategoryMutationResponse>(`admin/categories/${categoryId}/group`, {
    group_id: groupId,
  });
}

// ── Category Group station (Category Group audit, Option B, Phase C) ─────────
// The /admin/category-groups family — same route grammar as Category, one
// level up. Action naming mirrors the Category fetchers above exactly.

export function fetchAdminCategoryGroups(platformStatus?: 'archived' | 'trashed'): Promise<CategoryGroupListResponse> {
  const path = platformStatus
    ? `admin/category-groups?platform_status=${platformStatus}`
    : 'admin/category-groups';
  return apiClient.get<CategoryGroupListResponse>(path);
}

// Station create (D3-style): born disabled; overview settles immediately when
// the payload is complete.
export function createCategoryGroup(payload: {
  name:         string;
  description?: string;
}): Promise<CategoryGroupMutationResponse> {
  return apiClient.post<CategoryGroupMutationResponse>('admin/category-groups', payload);
}

// Save the overview draft — canonical term untouched, overview marked pending.
export function saveCategoryGroupOverview(
  groupId: number,
  payload: CategoryGroupOverviewDraft,
): Promise<CategoryGroupOverviewSaveResponse> {
  return apiClient.put<CategoryGroupOverviewSaveResponse>(`admin/category-groups/${groupId}/overview`, payload);
}

// Commit the draft to the term (name + description), clear it, re-derive status.
export function settleCategoryGroupOverview(groupId: number): Promise<CategoryGroupMutationResponse> {
  return apiClient.post<CategoryGroupMutationResponse>(`admin/category-groups/${groupId}/overview/settle`, {});
}

// Discard the draft; module_status re-derives from the settled state.
export function revertCategoryGroupOverview(groupId: number): Promise<CategoryGroupMutationResponse> {
  return apiClient.post<CategoryGroupMutationResponse>(`admin/category-groups/${groupId}/overview/revert`, {});
}

// Engine transition — the only status write for category groups.
export function updateCategoryGroupStatus(
  groupId:        number,
  platformStatus: 'active' | 'disabled' | 'archived' | 'trashed',
): Promise<CategoryGroupMutationResponse> {
  return apiClient.patch<CategoryGroupMutationResponse>(`admin/category-groups/${groupId}/status`, {
    platform_status: platformStatus,
  });
}

// Server-driven restore — resolves previous_platform_status, lands disabled.
export function restoreCategoryGroup(groupId: number): Promise<CategoryGroupMutationResponse> {
  return apiClient.post<CategoryGroupMutationResponse>(`admin/category-groups/${groupId}/restore`, {});
}

// Trashed-only. A guard failure (non-empty group) is an HTTP 409 (apiClient
// throws; the error text carries { message, assigned_count }).
export function permanentDeleteCategoryGroup(groupId: number): Promise<CategoryGroupDeleteResponse> {
  return apiClient.delete<CategoryGroupDeleteResponse>(`admin/category-groups/${groupId}`);
}

// Temporary — Phase 0 migration readiness audit. Remove after migration is validated.
export function fetchMigrationAudit(): Promise<MigrationAudit> {
  return apiClient.get<MigrationAudit>('admin/migration-audit');
}

// Temporary — Phase 1+3 backfill. Remove after migration is validated.
export function runPhaseOneMigration(): Promise<MigrationRunResult> {
  return apiClient.post<MigrationRunResult>('admin/migrate/phase-one');
}

// Temporary — Phase 2 tier occupant migration. Remove after migration is validated.
export function runPhaseTwoMigration(): Promise<MigrationPhase2Result> {
  return apiClient.post<MigrationPhase2Result>('admin/migrate/phase-two');
}

// Temporary — Phase 4 promotion migration. Remove after migration is validated.
export function runPhaseFourMigration(): Promise<MigrationPhase4Result> {
  return apiClient.post<MigrationPhase4Result>('admin/migrate/phase-four');
}

// Phase 4 — service-level Promotion Station management.
export function fetchServicePromotionStation(serviceId: number): Promise<ServicePromotionStationResponse> {
  return apiClient.get<ServicePromotionStationResponse>(`admin/services/${serviceId}/promotion-station`);
}

export function createServicePromotion(
  serviceId: number,
  payload:   PromotionTierPayload,
): Promise<ServicePromotionSaveResponse> {
  return apiClient.post<ServicePromotionSaveResponse>(
    `admin/services/${serviceId}/promotion-station/promotions`,
    payload,
  );
}

export function archiveServicePromotion(
  serviceId: number,
  promoId:   string,
): Promise<{ success: boolean; promo_id: string; status: string }> {
  return apiClient.post(
    `admin/services/${serviceId}/promotion-station/promotions/${promoId}/archive`,
  );
}

// Engine C2 — per-module promotion draft save. Persists lifecycle.drafts[module]
// and marks the module pending without touching settled fields or travel status.
// Body keying mirrors the tier module endpoint: overview → the draft fields
// themselves; features → { inclusions }; faqs → { faq_refs }.
export function saveServicePromotionModule(
  serviceId: number,
  promoId:   string,
  module:    PromotionModuleKey,
  payload:   PromotionOverviewDraft | { inclusions: InclusionItem[] } | { faq_refs: string[] },
): Promise<PromotionLifecycleResponse> {
  return apiClient.post<PromotionLifecycleResponse>(
    `admin/services/${serviceId}/promotion-station/promotions/${promoId}/modules/${module}`,
    payload,
  );
}

// Engine C2 — settle an instance: commit draft-preferred state into the settled
// fields, clear drafts. No-ops backend-side when there are no drafts.
export function settleServicePromotion(
  serviceId: number,
  promoId:   string,
): Promise<PromotionLifecycleResponse> {
  return apiClient.post<PromotionLifecycleResponse>(
    `admin/services/${serviceId}/promotion-station/promotions/${promoId}/settle`,
    {},
  );
}

// Engine C2 — per-module revert: discard the draft; module_status re-derives
// from the settled content.
export function revertServicePromotionModule(
  serviceId: number,
  promoId:   string,
  module:    PromotionModuleKey,
): Promise<PromotionLifecycleResponse> {
  return apiClient.post<PromotionLifecycleResponse>(
    `admin/services/${serviceId}/promotion-station/promotions/${promoId}/modules/${module}/revert`,
    {},
  );
}

// Engine C3 — travel transitions. The only status writes for promotion
// instances; publish composes settle + activate.
export function publishServicePromotion(
  serviceId: number,
  promoId:   string,
): Promise<PromotionTransitionResponse> {
  return apiClient.post<PromotionTransitionResponse>(
    `admin/services/${serviceId}/promotion-station/promotions/${promoId}/publish`,
  );
}

export function toggleServicePromotion(
  serviceId: number,
  promoId:   string,
): Promise<PromotionTransitionResponse> {
  return apiClient.post<PromotionTransitionResponse>(
    `admin/services/${serviceId}/promotion-station/promotions/${promoId}/toggle`,
  );
}

export function trashServicePromotion(
  serviceId: number,
  promoId:   string,
): Promise<PromotionTransitionResponse> {
  return apiClient.post<PromotionTransitionResponse>(
    `admin/services/${serviceId}/promotion-station/promotions/${promoId}/trash`,
  );
}

export function restoreServicePromotion(
  serviceId: number,
  promoId:   string,
): Promise<PromotionTransitionResponse> {
  return apiClient.post<PromotionTransitionResponse>(
    `admin/services/${serviceId}/promotion-station/promotions/${promoId}/restore`,
  );
}

// Engine C3 — permanent removal, trashed-only; the sole operation that removes
// an instance from the station array.
export function permanentDeleteServicePromotion(
  serviceId: number,
  promoId:   string,
): Promise<PromotionDeleteResponse> {
  return apiClient.delete<PromotionDeleteResponse>(
    `admin/services/${serviceId}/promotion-station/promotions/${promoId}`,
  );
}

// Phase 2 — Service Station-owned Package Station tier management.
export function fetchServicePackageStation(serviceId: number): Promise<ServicePackageStationResponse> {
  return apiClient.get<ServicePackageStationResponse>(`admin/services/${serviceId}/package-station`);
}

export function saveServicePackageStationTier(
  serviceId: number,
  tierId:    string,
  payload:   TierSavePayload,
): Promise<ServiceTierSaveResponse> {
  return apiClient.post<ServiceTierSaveResponse>(
    `admin/services/${serviceId}/package-station/tiers/${tierId}`,
    payload,
  );
}

export function setServicePackageStationTierEnabled(
  serviceId: number,
  tierId:    string,
  enabled:   boolean,
): Promise<{ success: boolean; tier_id: string; enabled: boolean }> {
  return apiClient.post(
    `admin/services/${serviceId}/package-station/tiers/${tierId}/enabled`,
    { enabled },
  );
}

// Phase 2 (P3/P4) — per-module tier draft save. Persists drafts[module] and marks
// the module pending without touching the settled occupant. Consumed by usePackageStation.
export function saveServicePackageStationTierModule(
  serviceId: number,
  tierId:    string,
  module:    TierModuleKey,
  payload:   TierModuleSavePayload,
): Promise<TierLifecycleResponse> {
  return apiClient.post<TierLifecycleResponse>(
    `admin/services/${serviceId}/package-station/tiers/${tierId}/modules/${module}`,
    payload,
  );
}

// Engine D1 — per-module tier revert: discard the pending draft; module_status
// re-derives from the settled occupant. Counterpart of revertServicePromotionModule.
export function revertServicePackageStationTierModule(
  serviceId: number,
  tierId:    string,
  module:    TierModuleKey,
): Promise<TierLifecycleResponse> {
  return apiClient.post<TierLifecycleResponse>(
    `admin/services/${serviceId}/package-station/tiers/${tierId}/modules/${module}/revert`,
    {},
  );
}

// Phase 2 (P3/P4) — settle a tier: commit the draft-preferred state into the
// occupant, clear drafts, mark all modules settled.
export function settleServicePackageStationTier(
  serviceId: number,
  tierId:    string,
): Promise<TierLifecycleResponse> {
  return apiClient.post<TierLifecycleResponse>(
    `admin/services/${serviceId}/package-station/tiers/${tierId}/settle`,
    {},
  );
}

// Engine D2/D4 — archive a tier's settled occupant into the occupant bin. The
// shell empties to not-configured; pending drafts block unless discardDrafts
// (the failure carries code: pending_drafts so the UI confirms first).
export function archiveServicePackageStationTierOccupant(
  serviceId:     number,
  tierId:        string,
  discardDrafts: boolean = false,
): Promise<TierArchiveResponse> {
  return apiClient.post<TierArchiveResponse>(
    `admin/services/${serviceId}/package-station/tiers/${tierId}/archive`,
    { discard_drafts: discardDrafts },
  );
}

// Engine D3/D4 — restore a binned occupant. Plain restore targets the origin
// shell (must be empty); mode 'swap' displaces the origin's current content
// into the bin, mode 'retarget' places into an explicit empty shell. Restored
// occupants land disabled.
export function restoreServicePackageStationBinEntry(
  serviceId: number,
  binId:     string,
  opts:      { mode?: 'swap' | 'retarget'; targetTier?: string; discardDrafts?: boolean } = {},
): Promise<BinRestoreResponse> {
  return apiClient.post<BinRestoreResponse>(
    `admin/services/${serviceId}/package-station/bin/${binId}/restore`,
    {
      ...(opts.mode ? { mode: opts.mode } : {}),
      ...(opts.targetTier ? { target_tier: opts.targetTier } : {}),
      ...(opts.discardDrafts ? { discard_drafts: true } : {}),
    },
  );
}

export function trashServicePackageStationBinEntry(
  serviceId: number,
  binId:     string,
): Promise<BinTrashResponse> {
  return apiClient.post<BinTrashResponse>(
    `admin/services/${serviceId}/package-station/bin/${binId}/trash`,
    {},
  );
}

// Trashed-only; the sole operation that removes an occupant_bin entry.
export function deleteServicePackageStationBinEntry(
  serviceId: number,
  binId:     string,
): Promise<BinDeleteResponse> {
  return apiClient.delete<BinDeleteResponse>(
    `admin/services/${serviceId}/package-station/bin/${binId}`,
  );
}

// Phase 2 (P5) — set the station-level popular tier. `popular_tier` is a
// package-module concern, not part of the per-tier overview draft, so it has
// its own station-level write. A null tierId clears the selection.
export function setServicePackageStationPopular(
  serviceId: number,
  tierId:    string | null,
  label:     string,
): Promise<{ success: boolean; popular_tier: string | null; popular_label: string }> {
  return apiClient.post(
    `admin/services/${serviceId}/package-station/popular`,
    { tier_id: tierId, label },
  );
}

// Phase 2 — P5 Step 2: immediate canonical pool creation. Service owns the pool;
// the caller attaches the returned id to a tier's module draft in a separate save.
export function createServiceInclusionPoolItem(
  serviceId: number,
  label:     string,
): Promise<CreateInclusionPoolItemResponse> {
  return apiClient.post<CreateInclusionPoolItemResponse>(
    `admin/services/${serviceId}/inclusion-pool/items`,
    { label },
  );
}

export function createServiceFaqPoolItem(
  serviceId: number,
  question:  string,
  answer:    string,
): Promise<CreateFaqPoolItemResponse> {
  return apiClient.post<CreateFaqPoolItemResponse>(
    `admin/services/${serviceId}/faq-pool/items`,
    { question, answer },
  );
}

export function fetchAdminRequests(): Promise<AdminRequestsResponse> {
  return apiClient.get<AdminRequestsResponse>('admin/requests');
}

export function fetchAdminRequest(ref: string): Promise<{ success: boolean; request: RequestEntry }> {
  return apiClient.get<{ success: boolean; request: RequestEntry }>(`admin/requests/${ref}`);
}

export function acceptIntakeRequest(ref: string): Promise<AcceptIntakeResponse> {
  return apiClient.post<AcceptIntakeResponse>(`admin/requests/${ref}/accept`);
}

export function fetchSurfacePackages(): Promise<SurfacePackagesResponse> {
  return apiClient.get<SurfacePackagesResponse>('admin/surface-packages');
}

export function updateServiceOverview(
  serviceId: number,
  payload: ServiceOverviewPayload,
): Promise<ServiceOverviewResponse> {
  return apiClient.post<ServiceOverviewResponse>(`admin/services/${serviceId}/overview`, payload);
}

export function updateServiceInclusions(
  serviceId: number,
  payload: ServiceInclusionsPayload,
): Promise<ServiceInclusionsResponse> {
  return apiClient.post<ServiceInclusionsResponse>(`admin/services/${serviceId}/inclusions`, payload);
}

export function updateServiceFaqs(
  serviceId: number,
  payload: ServiceFaqsPayload,
): Promise<ServiceFaqsResponse> {
  return apiClient.post<ServiceFaqsResponse>(`admin/services/${serviceId}/faqs`, payload);
}

export function updateServiceStatus(
  serviceId: number,
  payload: ServiceStatusPayload,
): Promise<ServiceStatusResponse> {
  return apiClient.post<ServiceStatusResponse>(`admin/services/${serviceId}/status`, payload);
}

export function createService(payload: CreateServicePayload): Promise<CreateServiceResponse> {
  return apiClient.post<CreateServiceResponse>('admin/services', payload);
}

export function fetchAdminServiceDetail(serviceId: number): Promise<AdminServiceDetailResponse> {
  return apiClient.get<AdminServiceDetailResponse>(`admin/services/${serviceId}`);
}

export function settleServiceModule(
  serviceId: number,
  module: 'overview' | 'inclusions' | 'faqs',
): Promise<ModuleSettleResponse> {
  return apiClient.post<ModuleSettleResponse>(`admin/services/${serviceId}/${module}/settle`);
}

export function settleAllServiceModules(serviceId: number): Promise<ModuleSettleResponse> {
  return apiClient.post<ModuleSettleResponse>(`admin/services/${serviceId}/settle`);
}

export function revertServiceModule(
  serviceId: number,
  module: 'overview' | 'inclusions' | 'faqs',
): Promise<ModuleRevertResponse> {
  return apiClient.post<ModuleRevertResponse>(`admin/services/${serviceId}/${module}/revert`);
}
