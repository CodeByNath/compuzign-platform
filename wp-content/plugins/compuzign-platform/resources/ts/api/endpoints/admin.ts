import { apiClient } from '../client';
import type { AdminOverview } from '../types/admin';

export function fetchAdminOverview(): Promise<AdminOverview> {
  return apiClient.get<AdminOverview>('admin/overview');
}
