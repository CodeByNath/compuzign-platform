import { apiClient } from '../client';
import type { AdminOverview, AdminRequestsResponse, RequestEntry } from '../types/admin';

export function fetchAdminOverview(): Promise<AdminOverview> {
  return apiClient.get<AdminOverview>('admin/overview');
}

export function fetchAdminRequests(): Promise<AdminRequestsResponse> {
  return apiClient.get<AdminRequestsResponse>('admin/requests');
}

export function fetchAdminRequest(ref: string): Promise<{ success: boolean; request: RequestEntry }> {
  return apiClient.get<{ success: boolean; request: RequestEntry }>(`admin/requests/${ref}`);
}
