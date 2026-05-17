import { useApi } from './useApi';
import type { ApiState } from './useApi';
import { fetchCostBuilder } from '@/api/endpoints/cost-builder';
import type { CostBuilderResponse } from '@/api/types/cost-builder';

export function useCostBuilder(): ApiState<CostBuilderResponse> {
  return useApi<CostBuilderResponse>(fetchCostBuilder);
}
