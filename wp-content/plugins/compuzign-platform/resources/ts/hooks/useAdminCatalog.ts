import { useApi } from './useApi';
import type { ApiResult } from './useApi';
import { fetchAdminCatalog } from '@/service-station';
import type { ServiceCatalogResponse } from '@/service-station';

export function useAdminCatalog(
  opts?: { platformStatus?: 'archived' | 'trashed' },
): ApiResult<ServiceCatalogResponse> {
  return useApi<ServiceCatalogResponse>(() => fetchAdminCatalog(opts?.platformStatus));
}
