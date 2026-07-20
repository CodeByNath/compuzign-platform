import { apiClient } from '../client';
import type {
  AcceptIntakeResponse,
  AdminOverview,
  AdminRequestsResponse,
  ServicePackageStationResponse,
  ServiceTierSaveResponse,
  PackageManagerResponse,
  PackageManagerSavePayload,
  PackageManagerSaveResponse,
  TierLifecycleResponse,
  TierArchiveResponse,
  BinRestoreResponse,
  BinTrashResponse,
  BinDeleteResponse,
  TierModuleKey,
  TierModuleSavePayload,
  ServicePromotionStationResponse,
  ServicePromotionSaveResponse,
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
  ServiceCategoryGroupDeleteResponse,
  ServiceCategoryGroupListResponse,
  ServiceCategoryGroupMutationResponse,
  ServiceCategoryGroupOverviewDraft,
  ServiceCategoryGroupOverviewSaveResponse,
  PackageFamilyDeleteResponse,
  PackageFamilyListResponse,
  PackageFamilyMutationResponse,
  RequestEntry,
  SurfacePackagesResponse,
  TierSavePayload,
} from '../types/admin';
import type { InclusionItem } from '../types/pools';

// Service endpoint functions are owned by the Service Station and are NOT
// re-exported here. Import them from '@/admin-station/stations/service'.

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
export function updateServiceCategoryGroup(
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

export function fetchAdminServiceCategoryGroups(platformStatus?: 'archived' | 'trashed'): Promise<ServiceCategoryGroupListResponse> {
  const path = platformStatus
    ? `admin/category-groups?platform_status=${platformStatus}`
    : 'admin/category-groups';
  return apiClient.get<ServiceCategoryGroupListResponse>(path);
}

// Station create (D3-style): born disabled; overview settles immediately when
// the payload is complete.
export function createServiceCategoryGroup(payload: {
  name:         string;
  description?: string;
}): Promise<ServiceCategoryGroupMutationResponse> {
  return apiClient.post<ServiceCategoryGroupMutationResponse>('admin/category-groups', payload);
}

// Save the overview draft — canonical term untouched, overview marked pending.
export function saveServiceCategoryGroupOverview(
  groupId: number,
  payload: ServiceCategoryGroupOverviewDraft,
): Promise<ServiceCategoryGroupOverviewSaveResponse> {
  return apiClient.put<ServiceCategoryGroupOverviewSaveResponse>(`admin/category-groups/${groupId}/overview`, payload);
}

// Commit the draft to the term (name + description), clear it, re-derive status.
export function settleServiceCategoryGroupOverview(groupId: number): Promise<ServiceCategoryGroupMutationResponse> {
  return apiClient.post<ServiceCategoryGroupMutationResponse>(`admin/category-groups/${groupId}/overview/settle`, {});
}

// Discard the draft; module_status re-derives from the settled state.
export function revertServiceCategoryGroupOverview(groupId: number): Promise<ServiceCategoryGroupMutationResponse> {
  return apiClient.post<ServiceCategoryGroupMutationResponse>(`admin/category-groups/${groupId}/overview/revert`, {});
}

// Engine transition — the only status write for category groups.
export function updateServiceCategoryGroupStatus(
  groupId:        number,
  platformStatus: 'active' | 'disabled' | 'archived' | 'trashed',
): Promise<ServiceCategoryGroupMutationResponse> {
  return apiClient.patch<ServiceCategoryGroupMutationResponse>(`admin/category-groups/${groupId}/status`, {
    platform_status: platformStatus,
  });
}

// Server-driven restore — resolves previous_platform_status, lands disabled.
export function restoreServiceCategoryGroup(groupId: number): Promise<ServiceCategoryGroupMutationResponse> {
  return apiClient.post<ServiceCategoryGroupMutationResponse>(`admin/category-groups/${groupId}/restore`, {});
}

// Trashed-only. A guard failure (non-empty group) is an HTTP 409 (apiClient
// throws; the error text carries { message, assigned_count }).
export function permanentDeleteServiceCategoryGroup(groupId: number): Promise<ServiceCategoryGroupDeleteResponse> {
  return apiClient.delete<ServiceCategoryGroupDeleteResponse>(`admin/category-groups/${groupId}`);
}

// The /admin/package-category-groups family — the Package-owned commercial
// bucket station (e.g. KAIROS). Same route grammar as the taxonomy Category
// Group station; storage is the single cz_package_station authority.
export function fetchPackageFamilies(
  platformStatus?: 'archived' | 'trashed',
): Promise<PackageFamilyListResponse> {
  const path = platformStatus
    ? `admin/package-category-groups?platform_status=${platformStatus}`
    : 'admin/package-category-groups';
  return apiClient.get<PackageFamilyListResponse>(path);
}

// Station create — born disabled, overview pending.
export function createPackageFamily(payload: {
  name: string;
  description?: string;
}): Promise<PackageFamilyMutationResponse> {
  return apiClient.post<PackageFamilyMutationResponse>('admin/package-category-groups', payload);
}

export function savePackageFamilyOverview(
  groupId: string,
  payload: { name: string; description: string },
): Promise<PackageFamilyMutationResponse> {
  return apiClient.put<PackageFamilyMutationResponse>(`admin/package-category-groups/${groupId}/overview`, payload);
}

export function settlePackageFamilyOverview(groupId: string): Promise<PackageFamilyMutationResponse> {
  return apiClient.post<PackageFamilyMutationResponse>(`admin/package-category-groups/${groupId}/overview/settle`, {});
}

export function revertPackageFamilyOverview(groupId: string): Promise<PackageFamilyMutationResponse> {
  return apiClient.post<PackageFamilyMutationResponse>(`admin/package-category-groups/${groupId}/overview/revert`, {});
}

export function updatePackageFamilyStatus(
  groupId: string,
  platformStatus: 'active' | 'disabled' | 'archived' | 'trashed',
): Promise<PackageFamilyMutationResponse> {
  return apiClient.patch<PackageFamilyMutationResponse>(`admin/package-category-groups/${groupId}/status`, {
    platform_status: platformStatus,
  });
}

// Server-driven restore — resolves previous_platform_status, lands disabled.
export function restorePackageFamily(groupId: string): Promise<PackageFamilyMutationResponse> {
  return apiClient.post<PackageFamilyMutationResponse>(`admin/package-category-groups/${groupId}/restore`, {});
}

// Trashed-only. A dependency-guard failure is an HTTP 409 (apiClient throws;
// the error text carries { message, assigned_count, dependents }).
export function permanentDeletePackageFamily(groupId: string): Promise<PackageFamilyDeleteResponse> {
  return apiClient.delete<PackageFamilyDeleteResponse>(`admin/package-category-groups/${groupId}`);
}

// Activate / deactivate one Tool / Skill for one Package Family. The {groupId}
// owner owns the assignment; enabling writes a boolean on the group row and
// creates no tool data (no Tier occupant). Returns the updated group.
export function setPackageFamilyTool(
  groupId: string,
  toolKey: string,
  enabled: boolean,
): Promise<PackageFamilyMutationResponse> {
  return apiClient.put<PackageFamilyMutationResponse>(
    `admin/package-category-groups/${groupId}/tools/${toolKey}`,
    { enabled },
  );
}





// Promotions — child collection of the independent Package Station. The
// serviceId in these URLs is navigation context only; storage is always the
// single cz_package_station authority.
export function fetchServicePromotionStation(serviceId: number): Promise<ServicePromotionStationResponse> {
  return apiClient.get<ServicePromotionStationResponse>(`admin/services/${serviceId}/package-station/promotions`);
}

export function createServicePromotion(
  serviceId: number,
  payload:   PromotionTierPayload,
): Promise<ServicePromotionSaveResponse> {
  return apiClient.post<ServicePromotionSaveResponse>(
    `admin/services/${serviceId}/package-station/promotions`,
    payload,
  );
}

export function archiveServicePromotion(
  serviceId: number,
  promoId:   string,
): Promise<{ success: boolean; promo_id: string; status: string }> {
  return apiClient.post(
    `admin/services/${serviceId}/package-station/promotions/${promoId}/archive`,
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
    `admin/services/${serviceId}/package-station/promotions/${promoId}/modules/${module}`,
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
    `admin/services/${serviceId}/package-station/promotions/${promoId}/settle`,
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
    `admin/services/${serviceId}/package-station/promotions/${promoId}/modules/${module}/revert`,
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
    `admin/services/${serviceId}/package-station/promotions/${promoId}/publish`,
  );
}

export function toggleServicePromotion(
  serviceId: number,
  promoId:   string,
): Promise<PromotionTransitionResponse> {
  return apiClient.post<PromotionTransitionResponse>(
    `admin/services/${serviceId}/package-station/promotions/${promoId}/toggle`,
  );
}

export function trashServicePromotion(
  serviceId: number,
  promoId:   string,
): Promise<PromotionTransitionResponse> {
  return apiClient.post<PromotionTransitionResponse>(
    `admin/services/${serviceId}/package-station/promotions/${promoId}/trash`,
  );
}

export function restoreServicePromotion(
  serviceId: number,
  promoId:   string,
): Promise<PromotionTransitionResponse> {
  return apiClient.post<PromotionTransitionResponse>(
    `admin/services/${serviceId}/package-station/promotions/${promoId}/restore`,
  );
}

// Engine C3 — permanent removal, trashed-only; the sole operation that removes
// an instance from the station array.
export function permanentDeleteServicePromotion(
  serviceId: number,
  promoId:   string,
): Promise<PromotionDeleteResponse> {
  return apiClient.delete<PromotionDeleteResponse>(
    `admin/services/${serviceId}/package-station/promotions/${promoId}`,
  );
}

// Phase 2 — Service Station-owned Package Station tier management.
export function fetchServicePackageStation(serviceId: number): Promise<ServicePackageStationResponse> {
  return apiClient.get<ServicePackageStationResponse>(`admin/services/${serviceId}/package-station`);
}

// Package relation provider — operational read model plus atomic explicit-
// decision commit. There is no Manager lifecycle, settle, or revert route.
export function fetchPackageStationManager(serviceId: number): Promise<PackageManagerResponse> {
  return apiClient.get<PackageManagerResponse>(`admin/services/${serviceId}/package-station/manager`);
}

export function savePackageStationManager(
  serviceId: number,
  payload: PackageManagerSavePayload,
): Promise<PackageManagerSaveResponse> {
  return apiClient.post<PackageManagerSaveResponse>(
    `admin/services/${serviceId}/package-station/manager`,
    payload,
  );
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

