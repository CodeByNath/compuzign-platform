import { apiClient } from '../client';
import type {
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
  RequestEntry,
} from '../types/admin';
import type { InclusionItem } from '../types/pools';

type WirePlatformId<T extends { platformId: string }> = Omit<T, 'platformId'> & { platform_id: string };
type WireCategoryListResponse = Omit<CategoryListResponse, 'categories'> & {
  categories: Array<WirePlatformId<CategoryListResponse['categories'][number]>>;
};
type WireCategoryMutationResponse = Omit<CategoryMutationResponse, 'category'> & {
  category: WirePlatformId<CategoryMutationResponse['category']>;
};
type WireCategoryDeleteResponse = Omit<CategoryDeleteResponse, 'platformId'> & { platform_id: string };
type InlineCategory = { id: number; platformId: string; name: string; slug: string; description: string };
type WireInlineCategory = WirePlatformId<InlineCategory>;

function mapPlatformId<T extends { platformId: string }>(value: WirePlatformId<T>): T {
  const { platform_id, ...rest } = value;
  return { ...rest, platformId: platform_id } as unknown as T;
}

function mapCategoryMutation(response: WireCategoryMutationResponse): CategoryMutationResponse {
  return { ...response, category: mapPlatformId(response.category) };
}

// Service endpoint functions are owned by the Service Station and are NOT
// re-exported here. Import them from '@/service-station'.

// Package contracts/endpoints are owned by Package Station and are NOT
// re-exported here. Import them from '@/package-station'.

export function fetchAdminOverview(): Promise<AdminOverview> {
  return apiClient.get<AdminOverview>('admin/overview');
}

// Service category inline creation.
export async function createServiceCategory(payload: {
  name:         string;
  description?: string;
}): Promise<{
  success:   boolean;
  existing?: boolean;
  message?:  string;
  category?: InlineCategory;
}> {
  const response = await apiClient.post<{
    success: boolean; existing?: boolean; message?: string; category?: WireInlineCategory;
  }>('admin/service-categories', payload);
  const { category, ...rest } = response;
  return category
    ? { ...rest, category: mapPlatformId<InlineCategory>(category) }
    : rest;
}

// Service category inline update (name and/or description).
export async function updateServiceCategory(
  id:      number,
  payload: { name?: string; description?: string },
): Promise<{
  success:   boolean;
  message?:  string;
  category?: InlineCategory;
}> {
  const response = await apiClient.post<{
    success: boolean; message?: string; category?: WireInlineCategory;
  }>(`admin/service-categories/${id}`, payload);
  const { category, ...rest } = response;
  return category
    ? { ...rest, category: mapPlatformId<InlineCategory>(category) }
    : rest;
}

// ── Category station (S6) ─────────────────────────────────────────────────────
// The /admin/categories family — additive beside the inline
// /admin/service-categories convenience routes above, whose behavior remains D3.

export async function fetchAdminCategories(platformStatus?: 'archived' | 'trashed'): Promise<CategoryListResponse> {
  const path = platformStatus
    ? `admin/categories?platform_status=${platformStatus}`
    : 'admin/categories';
  const response = await apiClient.get<WireCategoryListResponse>(path);
  return { ...response, categories: response.categories.map(mapPlatformId) };
}

// Station create: born as an unmasked Pending record with its Overview draft.
// Duplicate names fail (no return-existing convenience).
export async function createCategory(payload: {
  name:         string;
  description?: string;
}): Promise<CategoryMutationResponse> {
  const response = await apiClient.post<WireCategoryMutationResponse>('admin/categories', payload);
  return mapCategoryMutation(response);
}

// Save the overview draft — canonical term untouched, overview marked pending.
export function saveCategoryOverview(
  categoryId: number,
  payload:    CategoryOverviewDraft,
): Promise<CategoryOverviewSaveResponse> {
  return apiClient.put<CategoryOverviewSaveResponse>(`admin/categories/${categoryId}/overview`, payload);
}

// Commit the draft to the term (name + description), clear it, re-derive status.
export async function settleCategoryOverview(categoryId: number): Promise<CategoryMutationResponse> {
  const response = await apiClient.post<WireCategoryMutationResponse>(`admin/categories/${categoryId}/overview/settle`, {});
  return mapCategoryMutation(response);
}

// Discard the draft; module_status re-derives from the settled state.
export async function revertCategoryOverview(categoryId: number): Promise<CategoryMutationResponse> {
  const response = await apiClient.post<WireCategoryMutationResponse>(`admin/categories/${categoryId}/overview/revert`, {});
  return mapCategoryMutation(response);
}

// Engine transition — the only status write for categories.
export async function updateCategoryStatus(
  categoryId:     number,
  platformStatus: 'active' | 'disabled' | 'archived' | 'trashed',
): Promise<CategoryMutationResponse> {
  const response = await apiClient.patch<WireCategoryMutationResponse>(`admin/categories/${categoryId}/status`, {
    platform_status: platformStatus,
  });
  return mapCategoryMutation(response);
}

// Disable/Enable are an explicit presentation mask, distinct from the
// platform_status shape Publish, Archive, and Trash use.
export async function disableCategory(categoryId: number): Promise<CategoryMutationResponse> {
  const response = await apiClient.patch<WireCategoryMutationResponse>(`admin/categories/${categoryId}/status`, { action: 'disable' });
  return mapCategoryMutation(response);
}

export async function enableCategory(categoryId: number): Promise<CategoryMutationResponse> {
  const response = await apiClient.patch<WireCategoryMutationResponse>(`admin/categories/${categoryId}/status`, { action: 'enable' });
  return mapCategoryMutation(response);
}

// Server-driven restore — resolves previous_platform_status, lands disabled.
export async function restoreCategory(categoryId: number): Promise<CategoryMutationResponse> {
  const response = await apiClient.post<WireCategoryMutationResponse>(`admin/categories/${categoryId}/restore`, {});
  return mapCategoryMutation(response);
}

// Trashed-only. A D6 guard failure is an HTTP 409 (apiClient throws; the error
// text carries { message, assigned_count }).
export async function permanentDeleteCategory(categoryId: number): Promise<CategoryDeleteResponse> {
  const response = await apiClient.delete<WireCategoryDeleteResponse>(`admin/categories/${categoryId}`);
  const { platform_id, ...rest } = response;
  return { ...rest, platformId: platform_id };
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
