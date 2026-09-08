import { apiClient } from '../client';
import type { ComposablePreviewChoiceItem, ComposablePreviewResult, PackageBuilderResponse } from '../types/cost-builder';

export function fetchPackageBuilder(): Promise<PackageBuilderResponse> {
  return apiClient.get<PackageBuilderResponse>('package-builder');
}

// Phase 2B1 — customer-safe live resolve for the composable Tier occupant's
// candidate Add/Remove/quantity selection. Never persists anything; the
// caller owns the candidate state and re-calls this on every change.
// `editionId` (project-work/2026-09-06-tier-catalogue-admin-ux-
// consolidation.md, "composable Edition cue must drive real Edition
// resolution") — null/omitted resolves the occupant's own Default, exactly
// as before this parameter existed; a real Edition id routes the resolve
// through that Edition's own customer_policy server-side.
export function resolveComposablePreview(
  familyId: string,
  choice: ComposablePreviewChoiceItem[],
  editionId: string | null = null,
): Promise<ComposablePreviewResult> {
  return apiClient.post<ComposablePreviewResult>('package-builder/composable-preview', {
    family_id: familyId,
    choice,
    ...(editionId !== null ? { edition_id: editionId } : {}),
  });
}
