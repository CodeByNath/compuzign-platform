import { useApi } from './useApi';
import type { ApiResult } from './useApi';
import { fetchCostBuilder } from '@/api/endpoints/cost-builder';
import type { CostBuilderResponse } from '@/api/types/cost-builder';

export function useCostBuilder(): ApiResult<CostBuilderResponse> {
  return useApi<CostBuilderResponse>(fetchCostBuilder);
}
