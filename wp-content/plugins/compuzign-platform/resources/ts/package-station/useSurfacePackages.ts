import { useApi } from '@/hooks/useApi';
import type { ApiResult } from '@/hooks/useApi';
import { fetchSurfacePackages } from './api';
import type { SurfacePackagesResponse } from './types';

export function useSurfacePackages(): ApiResult<SurfacePackagesResponse> {
  return useApi<SurfacePackagesResponse>(fetchSurfacePackages);
}
