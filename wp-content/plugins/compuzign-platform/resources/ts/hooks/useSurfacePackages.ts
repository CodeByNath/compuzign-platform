import { useApi } from './useApi';
import type { ApiResult } from './useApi';
import { fetchSurfacePackages } from '@/api/endpoints/admin';
import type { SurfacePackagesResponse } from '@/api/types/admin';

export function useSurfacePackages(): ApiResult<SurfacePackagesResponse> {
  return useApi<SurfacePackagesResponse>(fetchSurfacePackages);
}
