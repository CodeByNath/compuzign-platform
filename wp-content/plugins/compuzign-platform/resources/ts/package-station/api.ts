import { apiClient } from '@/api/client';
import type {
  ServicePackageStationResponse,
  ServiceTierSaveResponse,
  PackageManagerResponse,
  PackageManagerSavePayload,
  PackageManagerSaveResponse,
  TierLifecycleResponse,
  TierArchiveResponse,
  BinRestoreResponse,
  BinTrashResponse,
  BinDeleteResponse,
  TierModuleKey,
  TierModuleSavePayload,
  PackageFamilyDeleteResponse,
  PackageFamilyListResponse,
  PackageFamilyMutationResponse,
  SurfacePackagesResponse,
  TierSavePayload,
  TierAssignmentDeleteResponse,
  TierAssignmentMutationResponse,
  TierAssignmentsResponse,
  TierInstancesResponse,
  TierInstanceMutationResponse,
  TierInstanceDeleteResponse,
  TierEditionOverviewDraft,
  TierEditionResponse,
} from './types';

export function fetchTierInstances(): Promise<TierInstancesResponse> {
  return apiClient.get<TierInstancesResponse>('admin/package-station/tier-instances');
}

export function createTierInstance(payload: {
  title: string;
  description?: string;
  allowed_rate_sheet_ids?: string[];
}): Promise<TierInstanceMutationResponse> {
  return apiClient.post<TierInstanceMutationResponse>('admin/package-station/tier-instances', payload);
}

export function updateTierInstance(
  instanceId: string,
  payload: { title?: string; description?: string; allowed_rate_sheet_ids?: string[] },
): Promise<TierInstanceMutationResponse> {
  return apiClient.patch<TierInstanceMutationResponse>(
    `admin/package-station/tier-instances/${instanceId}`,
    payload,
  );
}

// Guarded permanent delete: blocked by an existing Family assignment, an
// occupied Tier slot, an occupant-bin entry, or an outstanding Tier draft
// (each a distinct 409 code — see PackageStationController::deleteTierInstance).
export function deleteTierInstance(instanceId: string): Promise<TierInstanceDeleteResponse> {
  return apiClient.delete<TierInstanceDeleteResponse>(
    `admin/package-station/tier-instances/${instanceId}`,
  );
}

export function fetchTierAssignments(): Promise<TierAssignmentsResponse> {
  return apiClient.get<TierAssignmentsResponse>('admin/package-station/tier-assignments');
}

export function createTierAssignment(payload: {
  consumer_type: 'package_family';
  consumer_id: string;
  tier_instance_id: string;
}): Promise<TierAssignmentMutationResponse> {
  return apiClient.post<TierAssignmentMutationResponse>('admin/package-station/tier-assignments', payload);
}

export function deleteTierAssignment(assignmentId: string): Promise<TierAssignmentDeleteResponse> {
  return apiClient.delete<TierAssignmentDeleteResponse>(
    `admin/package-station/tier-assignments/${assignmentId}`,
  );
}

// The /admin/package-category-groups family — the Package-owned commercial
// bucket station (e.g. KAIROS). Same route grammar as the taxonomy Category
// Group station; storage is the single cz_package_station authority.
export function fetchPackageFamilies(
  platformStatus?: 'archived' | 'trashed',
): Promise<PackageFamilyListResponse> {
  const path = platformStatus
    ? `admin/package-category-groups?platform_status=${platformStatus}`
    : 'admin/package-category-groups';
  return apiClient.get<PackageFamilyListResponse>(path);
}

// Station create — born disabled, overview pending.
export function createPackageFamily(payload: {
  name: string;
  description?: string;
}): Promise<PackageFamilyMutationResponse> {
  return apiClient.post<PackageFamilyMutationResponse>('admin/package-category-groups', payload);
}

export function savePackageFamilyOverview(
  groupId: string,
  payload: { name: string; description: string },
): Promise<PackageFamilyMutationResponse> {
  return apiClient.put<PackageFamilyMutationResponse>(`admin/package-category-groups/${groupId}/overview`, payload);
}

export function settlePackageFamilyOverview(groupId: string): Promise<PackageFamilyMutationResponse> {
  return apiClient.post<PackageFamilyMutationResponse>(`admin/package-category-groups/${groupId}/overview/settle`, {});
}

export function revertPackageFamilyOverview(groupId: string): Promise<PackageFamilyMutationResponse> {
  return apiClient.post<PackageFamilyMutationResponse>(`admin/package-category-groups/${groupId}/overview/revert`, {});
}

export function updatePackageFamilyStatus(
  groupId: string,
  platformStatus: 'active' | 'disabled' | 'archived' | 'trashed',
): Promise<PackageFamilyMutationResponse> {
  return apiClient.patch<PackageFamilyMutationResponse>(`admin/package-category-groups/${groupId}/status`, {
    platform_status: platformStatus,
  });
}

export function disablePackageFamily(groupId: string): Promise<PackageFamilyMutationResponse> {
  return apiClient.patch<PackageFamilyMutationResponse>(`admin/package-category-groups/${groupId}/status`, {
    action: 'disable',
  });
}

export function enablePackageFamily(groupId: string): Promise<PackageFamilyMutationResponse> {
  return apiClient.patch<PackageFamilyMutationResponse>(`admin/package-category-groups/${groupId}/status`, {
    action: 'enable',
  });
}

// Server-driven restore — resolves previous_platform_status, lands disabled.
export function restorePackageFamily(groupId: string): Promise<PackageFamilyMutationResponse> {
  return apiClient.post<PackageFamilyMutationResponse>(`admin/package-category-groups/${groupId}/restore`, {});
}

// Trashed-only. A dependency-guard failure is an HTTP 409 (apiClient throws;
// the error text carries { message, assigned_count, dependents }).
export function permanentDeletePackageFamily(groupId: string): Promise<PackageFamilyDeleteResponse> {
  return apiClient.delete<PackageFamilyDeleteResponse>(`admin/package-category-groups/${groupId}`);
}

// Phase 2 — Service Station-owned Package Station tier management.
export function fetchServicePackageStation(
  serviceId: number,
  tierInstanceId: string,
): Promise<ServicePackageStationResponse> {
  return apiClient.get<ServicePackageStationResponse>(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/read`,
  );
}

// Package relation provider — operational read model plus atomic explicit-
// decision commit. There is no Manager lifecycle, settle, or revert route.
export function fetchPackageStationManager(serviceId: number): Promise<PackageManagerResponse> {
  return apiClient.get<PackageManagerResponse>(`admin/services/${serviceId}/package-station/manager`);
}

export function savePackageStationManager(
  serviceId: number,
  payload: PackageManagerSavePayload,
): Promise<PackageManagerSaveResponse> {
  return apiClient.post<PackageManagerSaveResponse>(
    `admin/services/${serviceId}/package-station/manager`,
    payload,
  );
}

export function saveServicePackageStationTier(
  serviceId: number,
  tierInstanceId: string,
  tierId:    string,
  payload:   TierSavePayload,
): Promise<ServiceTierSaveResponse> {
  return apiClient.post<ServiceTierSaveResponse>(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/tiers/${tierId}`,
    payload,
  );
}

export function setServicePackageStationTierEnabled(
  serviceId: number,
  tierInstanceId: string,
  tierId:    string,
  enabled:   boolean,
): Promise<TierLifecycleResponse> {
  return apiClient.post(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/tiers/${tierId}/enabled`,
    { enabled },
  );
}

// Phase 2 (P3/P4) — per-module tier draft save. Persists drafts[module] and marks
// the module pending without touching the settled occupant. Consumed by usePackageStation.
export function saveServicePackageStationTierModule(
  serviceId: number,
  tierInstanceId: string,
  tierId:    string,
  module:    TierModuleKey,
  payload:   TierModuleSavePayload,
): Promise<TierLifecycleResponse> {
  return apiClient.post<TierLifecycleResponse>(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/tiers/${tierId}/modules/${module}`,
    payload,
  );
}

// Engine D1 — per-module tier revert: discard the pending draft; module_status
// re-derives from the settled occupant. Counterpart of revertServicePromotionModule.
export function revertServicePackageStationTierModule(
  serviceId: number,
  tierInstanceId: string,
  tierId:    string,
  module:    TierModuleKey,
): Promise<TierLifecycleResponse> {
  return apiClient.post<TierLifecycleResponse>(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/tiers/${tierId}/modules/${module}/revert`,
    {},
  );
}

// Phase 2 (P3/P4) — settle a tier: commit the draft-preferred state into the
// occupant, clear drafts, mark all modules settled.
export function settleServicePackageStationTier(
  serviceId: number,
  tierInstanceId: string,
  tierId:    string,
): Promise<TierLifecycleResponse> {
  return apiClient.post<TierLifecycleResponse>(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/tiers/${tierId}/settle`,
    {},
  );
}

// Engine D2/D4 — archive a tier's settled occupant into the occupant bin. The
// shell empties to not-configured; pending drafts block unless discardDrafts
// (the failure carries code: pending_drafts so the UI confirms first).
export function archiveServicePackageStationTierOccupant(
  serviceId:     number,
  tierInstanceId: string,
  tierId:        string,
  discardDrafts: boolean = false,
): Promise<TierArchiveResponse> {
  return apiClient.post<TierArchiveResponse>(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/tiers/${tierId}/archive`,
    { discard_drafts: discardDrafts },
  );
}

// Engine D3/D4 — restore a binned occupant. Plain restore targets the origin
// shell (must be empty); mode 'swap' displaces the origin's current content
// into the bin, mode 'retarget' places into an explicit empty shell. Restored
// occupants land disabled.
export function restoreServicePackageStationBinEntry(
  serviceId: number,
  tierInstanceId: string,
  binId:     string,
  opts:      { mode?: 'swap' | 'retarget'; targetTier?: string; discardDrafts?: boolean } = {},
): Promise<BinRestoreResponse> {
  return apiClient.post<BinRestoreResponse>(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/bin/${binId}/restore`,
    {
      ...(opts.mode ? { mode: opts.mode } : {}),
      ...(opts.targetTier ? { target_tier: opts.targetTier } : {}),
      ...(opts.discardDrafts ? { discard_drafts: true } : {}),
    },
  );
}

export function trashServicePackageStationBinEntry(
  serviceId: number,
  tierInstanceId: string,
  binId:     string,
): Promise<BinTrashResponse> {
  return apiClient.post<BinTrashResponse>(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/bin/${binId}/trash`,
    {},
  );
}

// Trashed-only; the sole operation that removes an occupant_bin entry.
export function deleteServicePackageStationBinEntry(
  serviceId: number,
  tierInstanceId: string,
  binId:     string,
): Promise<BinDeleteResponse> {
  return apiClient.delete<BinDeleteResponse>(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/bin/${binId}`,
  );
}

// Phase 2 (P5) — set the station-level popular tier. `popular_tier` is a
// package-module concern, not part of the per-tier overview draft, so it has
// its own station-level write. A null tierId clears the selection.
export function setServicePackageStationPopular(
  serviceId: number,
  tierInstanceId: string,
  tierId:    string | null,
  label:     string,
): Promise<{ success: boolean; tier_instance_id?: string; popular_tier: string | null; popular_label: string }> {
  return apiClient.post(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/popular`,
    { tier_id: tierId, label },
  );
}

// ── Tier Edition (Phase 1+) — independently addressed child record ──────────
// Same instance/slot address as every other Tier route above, plus the
// Edition's own minted edt_… id. No new endpoint FAMILY: reuses the
// established module draft/settle/revert and engine-transition shapes one
// level deeper, exactly like PackageCategoryGroups' own contract.

export function createTierEdition(
  serviceId: number,
  tierInstanceId: string,
  tierId: string,
  payload: Partial<TierEditionOverviewDraft>,
): Promise<TierEditionResponse> {
  return apiClient.post<TierEditionResponse>(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/tiers/${tierId}/editions`,
    payload,
  );
}

export function saveTierEditionModule(
  serviceId: number,
  tierInstanceId: string,
  tierId: string,
  editionId: string,
  payload: TierEditionOverviewDraft,
): Promise<TierEditionResponse> {
  return apiClient.post<TierEditionResponse>(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/tiers/${tierId}/editions/${editionId}/modules/overview`,
    payload,
  );
}

export function settleTierEditionModule(
  serviceId: number,
  tierInstanceId: string,
  tierId: string,
  editionId: string,
): Promise<TierEditionResponse> {
  return apiClient.post<TierEditionResponse>(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/tiers/${tierId}/editions/${editionId}/modules/overview/settle`,
    {},
  );
}

export function revertTierEditionModule(
  serviceId: number,
  tierInstanceId: string,
  tierId: string,
  editionId: string,
): Promise<TierEditionResponse> {
  return apiClient.post<TierEditionResponse>(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/tiers/${tierId}/editions/${editionId}/modules/overview/revert`,
    {},
  );
}

// One permissive engine-transition endpoint (platform_status) plus the
// explicit Disable/Enable mask (action) — the same one-route shape Package
// Family's own /status endpoint uses, not a named route per transition.
export function updateTierEditionStatus(
  serviceId: number,
  tierInstanceId: string,
  tierId: string,
  editionId: string,
  change: { platform_status: 'active' | 'disabled' | 'archived' | 'trashed' } | { action: 'disable' | 'enable' },
): Promise<TierEditionResponse> {
  return apiClient.patch<TierEditionResponse>(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/tiers/${tierId}/editions/${editionId}/status`,
    change,
  );
}

export function restoreTierEdition(
  serviceId: number,
  tierInstanceId: string,
  tierId: string,
  editionId: string,
): Promise<TierEditionResponse> {
  return apiClient.post<TierEditionResponse>(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/tiers/${tierId}/editions/${editionId}/restore`,
    {},
  );
}

/** Guarded permanent delete: trashed-only. */
export function deleteTierEdition(
  serviceId: number,
  tierInstanceId: string,
  tierId: string,
  editionId: string,
): Promise<TierEditionResponse> {
  return apiClient.delete<TierEditionResponse>(
    `admin/services/${serviceId}/package-station/tier-instances/${tierInstanceId}/tiers/${tierId}/editions/${editionId}`,
  );
}

export function fetchSurfacePackages(): Promise<SurfacePackagesResponse> {
  return apiClient.get<SurfacePackagesResponse>('admin/surface-packages');
}
