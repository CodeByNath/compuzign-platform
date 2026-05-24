import { apiClient } from '../client';
import type { CostBuilderResponse } from '../types/cost-builder';

export function fetchCostBuilder(): Promise<CostBuilderResponse> {
  return apiClient.get<CostBuilderResponse>('cost-builder');
}
