import { apiClient } from '../client';
import type {
  AcceptIntakeResponse,
  AdminOverview,
  AdminRequestsResponse,
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
  RequestEntry,
} from '../types/admin';
import type { InclusionItem } from '../types/pools';

// Service endpoint functions are owned by the Service Station and are NOT
// re-exported here. Import them from '@/service-station'.

// Package contracts/endpoints are owned by Package Station and are NOT
// re-exported here. Import them from '@/package-station'.

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
// `group_id` is accepted directly on creation — a Group chosen before Publish
// (Settings' Create Category launcher) travels in the same request rather than
// a separate follow-up membership call.
export function createCategory(payload: {
  name:         string;
  description?: string;
  group_id?:    number | null;
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


export function fetchAdminRequests(): Promise<AdminRequestsResponse> {
  return apiClient.get<AdminRequestsResponse>('admin/requests');
}

export function fetchAdminRequest(ref: string): Promise<{ success: boolean; request: RequestEntry }> {
  return apiClient.get<{ success: boolean; request: RequestEntry }>(`admin/requests/${ref}`);
}

export function acceptIntakeRequest(ref: string): Promise<AcceptIntakeResponse> {
  return apiClient.post<AcceptIntakeResponse>(`admin/requests/${ref}/accept`);
}
