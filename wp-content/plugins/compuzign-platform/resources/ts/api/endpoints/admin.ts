import { apiClient } from '../client';
import type {
  AcceptIntakeResponse,
  AdminOverview,
  AdminRequestsResponse,
  PackageStatusResponse,
  RequestEntry,
  SurfacePackageDetailResponse,
  SurfacePackagesResponse,
  TierSavePayload,
  TierSaveResponse,
} from '../types/admin';

export function fetchAdminOverview(): Promise<AdminOverview> {
  return apiClient.get<AdminOverview>('admin/overview');
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

export function toggleSurfaceTierEnabled(
  packageId: number,
  tierId: string,
  enabled: boolean,
): Promise<{ success: boolean; tier_id: string; enabled: boolean }> {
  return apiClient.post(`admin/surface-packages/${packageId}/tiers/${tierId}/enabled`, { enabled });
}
