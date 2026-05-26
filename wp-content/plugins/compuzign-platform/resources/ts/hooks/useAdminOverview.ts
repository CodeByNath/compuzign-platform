import { useApi } from './useApi';
import type { ApiResult } from './useApi';
import { fetchAdminOverview } from '@/api/endpoints/admin';
import type { AdminOverview } from '@/api/types/admin';

export function useAdminOverview(): ApiResult<AdminOverview> {
  return useApi<AdminOverview>(fetchAdminOverview);
}
