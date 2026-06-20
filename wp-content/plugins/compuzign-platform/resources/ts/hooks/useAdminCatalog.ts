import { useApi } from './useApi';
import type { ApiResult } from './useApi';
import { fetchAdminCatalog } from '@/api/endpoints/admin';
import type { AdminCatalogResponse } from '@/api/types/admin';

export function useAdminCatalog(): ApiResult<AdminCatalogResponse> {
  return useApi<AdminCatalogResponse>(fetchAdminCatalog);
}
