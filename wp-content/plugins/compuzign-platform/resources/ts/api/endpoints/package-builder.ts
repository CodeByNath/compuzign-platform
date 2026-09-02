import { apiClient } from '../client';
import type { ComposablePreviewChoiceItem, ComposablePreviewResult, PackageBuilderResponse } from '../types/cost-builder';

export function fetchPackageBuilder(): Promise<PackageBuilderResponse> {
  return apiClient.get<PackageBuilderResponse>('package-builder');
}

// Phase 2B1 — customer-safe live resolve for the composable Tier occupant's
// candidate Add/Remove/quantity selection. Never persists anything; the
// caller owns the candidate state and re-calls this on every change.
export function resolveComposablePreview(
  familyId: string,
  choice: ComposablePreviewChoiceItem[],
): Promise<ComposablePreviewResult> {
  return apiClient.post<ComposablePreviewResult>('package-builder/composable-preview', {
    family_id: familyId,
    choice,
  });
}
