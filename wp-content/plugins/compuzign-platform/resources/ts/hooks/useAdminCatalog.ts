import { useApi } from './useApi';
import type { ApiResult } from './useApi';
import { fetchAdminCatalog } from '@/admin-station/stations/service';
import type { ServiceCatalogResponse } from '@/admin-station/stations/service';

export function useAdminCatalog(
  opts?: { platformStatus?: 'archived' | 'trashed' },
): ApiResult<ServiceCatalogResponse> {
  return useApi<ServiceCatalogResponse>(() => fetchAdminCatalog(opts?.platformStatus));
}
