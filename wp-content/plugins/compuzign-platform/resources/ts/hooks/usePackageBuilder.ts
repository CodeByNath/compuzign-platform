import { fetchPackageBuilder } from '@/api/endpoints/package-builder';
import type { PackageBuilderResponse } from '@/api/types/cost-builder';
import { useApi } from './useApi';
import type { ApiResult } from './useApi';

export function usePackageBuilder(): ApiResult<PackageBuilderResponse> {
  return useApi<PackageBuilderResponse>(fetchPackageBuilder);
}
