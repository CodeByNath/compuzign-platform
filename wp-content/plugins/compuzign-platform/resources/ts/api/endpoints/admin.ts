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
  CreateSurfacePackagePayload,
  CreateSurfacePackageResponse,
  MigrationAudit,
  MigrationRunResult,
  MigrationPhase2Result,
  MigrationPhase4Result,
  ServicePackageStationResponse,
  ServiceTierSaveResponse,
  ServicePromotionStationResponse,
  ServicePromotionSaveResponse,
  ModuleRevertResponse,
  ModuleSettleResponse,
  PackageStatusResponse,
  PromotionTierArchiveResponse,
  PromotionTierPayload,
  PromotionTierReactivateResponse,
  PromotionTierSaveResponse,
  RequestEntry,
  ServiceFaqsPayload,
  ServiceFaqsResponse,
  ServiceInclusionsPayload,
  ServiceInclusionsResponse,
  ServiceOverviewPayload,
  ServiceOverviewResponse,
  ServiceStatusPayload,
  ServiceStatusResponse,
  SurfacePackageDetailResponse,
  SurfacePackagesResponse,
  TierSavePayload,
  TierSaveResponse,
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

export function saveServicePromotion(
  serviceId: number,
  promoId:   string,
  payload:   PromotionTierPayload,
): Promise<ServicePromotionSaveResponse> {
  return apiClient.post<ServicePromotionSaveResponse>(
    `admin/services/${serviceId}/promotion-station/promotions/${promoId}`,
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

export function reactivateServicePromotion(
  serviceId: number,
  promoId:   string,
): Promise<{ success: boolean; promo_id: string; status: string }> {
  return apiClient.post(
    `admin/services/${serviceId}/promotion-station/promotions/${promoId}/reactivate`,
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

export function createSurfacePackage(
  payload: CreateSurfacePackagePayload,
): Promise<CreateSurfacePackageResponse> {
  return apiClient.post<CreateSurfacePackageResponse>('admin/surface-packages', payload);
}

export function fetchSurfacePackageDetail(id: number): Promise<SurfacePackageDetailResponse> {
  return apiClient.get<SurfacePackageDetailResponse>(`admin/surface-packages/${id}`);
}

export function saveSurfaceTier(
  packageId: number,
  tierId: string,
  payload: TierSavePayload,
): Promise<TierSaveResponse> {
  return apiClient.post<TierSaveResponse>(
    `admin/surface-packages/${packageId}/tiers/${tierId}`,
    payload,
  );
}

export function disableSurfacePackage(id: number): Promise<PackageStatusResponse> {
  return apiClient.post<PackageStatusResponse>(`admin/surface-packages/${id}/disable`);
}

export function enableSurfacePackage(id: number): Promise<PackageStatusResponse> {
  return apiClient.post<PackageStatusResponse>(`admin/surface-packages/${id}/enable`);
}

export function createPromotionTier(
  packageId: number,
  payload: PromotionTierPayload,
): Promise<PromotionTierSaveResponse> {
  return apiClient.post<PromotionTierSaveResponse>(
    `admin/surface-packages/${packageId}/promotion-tiers`,
    payload,
  );
}

export function savePromotionTier(
  packageId: number,
  promoId: string,
  payload: PromotionTierPayload,
): Promise<PromotionTierSaveResponse> {
  return apiClient.post<PromotionTierSaveResponse>(
    `admin/surface-packages/${packageId}/promotion-tiers/${promoId}`,
    payload,
  );
}

export function archivePromotionTier(
  packageId: number,
  promoId: string,
): Promise<PromotionTierArchiveResponse> {
  return apiClient.post<PromotionTierArchiveResponse>(
    `admin/surface-packages/${packageId}/promotion-tiers/${promoId}/archive`,
  );
}

export function reactivatePromotionTier(
  packageId: number,
  promoId: string,
): Promise<PromotionTierReactivateResponse> {
  return apiClient.post<PromotionTierReactivateResponse>(
    `admin/surface-packages/${packageId}/promotion-tiers/${promoId}/reactivate`,
  );
}

export function toggleSurfaceTierEnabled(
  packageId: number,
  tierId: string,
  enabled: boolean,
): Promise<{ success: boolean; tier_id: string; enabled: boolean }> {
  return apiClient.post(`admin/surface-packages/${packageId}/tiers/${tierId}/enabled`, { enabled });
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
