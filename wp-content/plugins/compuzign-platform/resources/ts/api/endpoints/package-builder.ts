import { apiClient } from '../client';
import type { PackageBuilderResponse } from '../types/cost-builder';

export function fetchPackageBuilder(): Promise<PackageBuilderResponse> {
  return apiClient.get<PackageBuilderResponse>('package-builder');
}
