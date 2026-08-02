/*
 * Service Station — the endpoint functions for the cz_service entity.
 *
 * The authoritative implementations of the Service-owned endpoint calls.
 * api/endpoints/admin.ts holds no Service implementation and does not re-export
 * these; there is exactly one implementation of each call, here.
 *
 * OWNERSHIP TEST: a function belongs here iff it calls one of the 14 routes
 * owned by the backend Service module (src/Modules/Service ServiceController).
 * Route path is not ownership — several endpoints under /admin/services/{id}/...
 * are Package Station or Promotions routes, and several `*Service*`-named
 * functions (createServiceCategory, fetchServicePackageStation,
 * fetchServicePromotionStation) belong to other modules. Those stay put.
 *
 * URL strings, HTTP methods, request bodies, and return types are unchanged.
 */

import { apiClient } from '@/api/client';
import type {
  CreateInclusionPoolItemResponse,
  CreateFaqPoolItemResponse,
} from '@/api/types/pools';
import type {
  CreateServicePayload,
  CreateServiceResponse,
  ModuleRevertResponse,
  ModuleSettleResponse,
  PermanentDeleteResponse,
  ServiceCatalogResponse,
  ServiceDetail,
  ServiceFaqsPayload,
  ServiceFaqsResponse,
  ServiceInclusionsPayload,
  ServiceInclusionsResponse,
  ServiceOverviewPayload,
  ServiceOverviewResponse,
  ServiceStatusPayload,
  ServiceStatusResponse,
} from './types';

type WirePlatformId<T extends { platformId: string }> = Omit<T, 'platformId'> & { platform_id: string };
type WireServiceCatalogResponse = Omit<ServiceCatalogResponse, 'stations' | 'categories'> & {
  stations: Array<WirePlatformId<ServiceCatalogResponse['stations'][number]>>;
  categories: Array<WirePlatformId<ServiceCatalogResponse['categories'][number]>>;
};
type WireCreateServiceResponse = Omit<CreateServiceResponse, 'service'> & {
  service: WirePlatformId<CreateServiceResponse['service']>;
};
type WireModuleSettleResponse = Omit<ModuleSettleResponse, 'service'> & {
  service: WirePlatformId<ModuleSettleResponse['service']>;
};
type WireServiceStatusResponse = Omit<ServiceStatusResponse, 'service'> & {
  service: WirePlatformId<ServiceStatusResponse['service']>;
};
type WirePermanentDeleteResponse = Omit<PermanentDeleteResponse, 'platformId'> & { platform_id: string };

function mapPlatformId<T extends { platformId: string }>(value: WirePlatformId<T>): T {
  const { platform_id, ...rest } = value;
  return { ...rest, platformId: platform_id } as unknown as T;
}

// ── Catalogue ────────────────────────────────────────────────────────────────

export async function fetchAdminCatalog(platformStatus?: 'archived' | 'trashed'): Promise<ServiceCatalogResponse> {
  const path = platformStatus
    ? `admin/services?platform_status=${platformStatus}`
    : 'admin/services';
  const response = await apiClient.get<WireServiceCatalogResponse>(path);
  return {
    ...response,
    stations: response.stations.map(mapPlatformId),
    categories: response.categories.map(mapPlatformId),
  };
}

// ── Detail / create ──────────────────────────────────────────────────────────

export async function fetchAdminServiceDetail(serviceId: number): Promise<ServiceDetail> {
  const response = await apiClient.get<WirePlatformId<ServiceDetail>>(`admin/services/${serviceId}`);
  return mapPlatformId(response);
}

export async function createService(payload: CreateServicePayload): Promise<CreateServiceResponse> {
  const response = await apiClient.post<WireCreateServiceResponse>('admin/services', payload);
  return { ...response, service: mapPlatformId(response.service) };
}

// ── Module draft saves ───────────────────────────────────────────────────────

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

// ── Settle / revert ──────────────────────────────────────────────────────────

export async function settleServiceModule(
  serviceId: number,
  module: 'overview' | 'inclusions' | 'faqs',
): Promise<ModuleSettleResponse> {
  const response = await apiClient.post<WireModuleSettleResponse>(`admin/services/${serviceId}/${module}/settle`);
  return { ...response, service: mapPlatformId(response.service) };
}

export async function settleAllServiceModules(serviceId: number): Promise<ModuleSettleResponse> {
  const response = await apiClient.post<WireModuleSettleResponse>(`admin/services/${serviceId}/settle`);
  return { ...response, service: mapPlatformId(response.service) };
}

export function revertServiceModule(
  serviceId: number,
  module: 'overview' | 'inclusions' | 'faqs',
): Promise<ModuleRevertResponse> {
  return apiClient.post<ModuleRevertResponse>(`admin/services/${serviceId}/${module}/revert`);
}

// ── Lifecycle ────────────────────────────────────────────────────────────────
//
// updateServiceStatus is the general status write; archiveService and
// trashService are fixed-transition conveniences over the same route.

export async function updateServiceStatus(
  serviceId: number,
  payload: ServiceStatusPayload,
): Promise<ServiceStatusResponse> {
  const response = await apiClient.post<WireServiceStatusResponse>(`admin/services/${serviceId}/status`, payload);
  return { ...response, service: mapPlatformId(response.service) };
}

// Disable/Enable — the platform-visible presentation mask (never a settle/
// publish call). Distinct from updateServiceStatus's platform_status shape,
// which Publish also uses for 'active': see ServiceController::updateDisabledMask.
export async function disableService(serviceId: number): Promise<ServiceStatusResponse> {
  const response = await apiClient.post<WireServiceStatusResponse>(`admin/services/${serviceId}/status`, { action: 'disable' });
  return { ...response, service: mapPlatformId(response.service) };
}

export async function enableService(serviceId: number): Promise<ServiceStatusResponse> {
  const response = await apiClient.post<WireServiceStatusResponse>(`admin/services/${serviceId}/status`, { action: 'enable' });
  return { ...response, service: mapPlatformId(response.service) };
}

export async function archiveService(serviceId: number): Promise<ServiceStatusResponse> {
  const response = await apiClient.post<WireServiceStatusResponse>(`admin/services/${serviceId}/status`, { platform_status: 'archived' });
  return { ...response, service: mapPlatformId(response.service) };
}

export async function trashService(serviceId: number): Promise<ServiceStatusResponse> {
  const response = await apiClient.post<WireServiceStatusResponse>(`admin/services/${serviceId}/status`, { platform_status: 'trashed' });
  return { ...response, service: mapPlatformId(response.service) };
}

export async function restoreService(serviceId: number): Promise<ServiceStatusResponse> {
  const response = await apiClient.post<WireServiceStatusResponse>(`admin/services/${serviceId}/restore`);
  return { ...response, service: mapPlatformId(response.service) };
}

export async function permanentDeleteService(serviceId: number): Promise<PermanentDeleteResponse> {
  const response = await apiClient.delete<WirePermanentDeleteResponse>(`admin/services/${serviceId}`);
  const { platform_id, ...rest } = response;
  return { ...rest, platformId: platform_id };
}

// ── Pools ────────────────────────────────────────────────────────────────────
//
// Phase 2 — P5 Step 2: immediate canonical pool creation. Service owns the pool;
// the caller attaches the returned id to a tier's module draft in a separate save.
//
// The response types are typed on InclusionItem/FaqItem, a shape shared with the
// Package and Promotion contracts, so they live in the neutral api/types/pools.ts
// rather than here — claiming them for Service would invert the dependency for
// the whole tier/promotion model.

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
