/*
 * Service Station — the endpoint functions for the cz_service entity.
 *
 * The authoritative implementations, moved verbatim from api/endpoints/admin.ts
 * when the frontend Service boundary was established; that file now re-exports
 * these and holds no Service implementation of its own. There is exactly one
 * implementation of each call.
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

// ── Catalogue ────────────────────────────────────────────────────────────────

export function fetchAdminCatalog(platformStatus?: 'archived' | 'trashed'): Promise<ServiceCatalogResponse> {
  const path = platformStatus
    ? `admin/services?platform_status=${platformStatus}`
    : 'admin/services';
  return apiClient.get<ServiceCatalogResponse>(path);
}

// ── Detail / create ──────────────────────────────────────────────────────────

export function fetchAdminServiceDetail(serviceId: number): Promise<ServiceDetail> {
  return apiClient.get<ServiceDetail>(`admin/services/${serviceId}`);
}

export function createService(payload: CreateServicePayload): Promise<CreateServiceResponse> {
  return apiClient.post<CreateServiceResponse>('admin/services', payload);
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

// ── Lifecycle ────────────────────────────────────────────────────────────────
//
// updateServiceStatus is the general status write; archiveService and
// trashService are fixed-transition conveniences over the same route.

export function updateServiceStatus(
  serviceId: number,
  payload: ServiceStatusPayload,
): Promise<ServiceStatusResponse> {
  return apiClient.post<ServiceStatusResponse>(`admin/services/${serviceId}/status`, payload);
}

export function archiveService(serviceId: number): Promise<ServiceStatusResponse> {
  return apiClient.post<ServiceStatusResponse>(`admin/services/${serviceId}/status`, { platform_status: 'archived' });
}

export function trashService(serviceId: number): Promise<ServiceStatusResponse> {
  return apiClient.post<ServiceStatusResponse>(`admin/services/${serviceId}/status`, { platform_status: 'trashed' });
}

export function restoreService(serviceId: number): Promise<ServiceStatusResponse> {
  return apiClient.post<ServiceStatusResponse>(`admin/services/${serviceId}/restore`);
}

export function permanentDeleteService(serviceId: number): Promise<PermanentDeleteResponse> {
  return apiClient.delete<PermanentDeleteResponse>(`admin/services/${serviceId}`);
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
