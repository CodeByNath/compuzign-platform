import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import {
  permanentDeletePackageFamily,
  restorePackageFamily,
  revertPackageFamilyOverview,
  savePackageFamilyOverview,
  setPackageFamilyTool,
  settlePackageFamilyOverview,
  updatePackageFamilyStatus,
} from '@/api/endpoints/admin';
import type { PackageFamilyItem } from '@/api/types/admin';
import type { PackageToolKey } from '@/modules/packages/packageTools';
import {
  evaluateModule,
  packageFamilyOverviewModule,
  packageFamilyRelationshipsModule,
} from '@/drawer-kit/utils/moduleNotifications';

export interface PackageFamilyOverviewDraft {
  name: string;
  description: string;
}

export function usePackageFamilyStation(
  seed: PackageFamilyItem,
  onMutationComplete?: () => void,
) {
  const [family, setFamily] = useState(seed);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toolSaving, setToolSaving] = useState<PackageToolKey | null>(null);

  useEffect(() => setFamily(seed), [seed]);

  const overviewState = useMemo(() => evaluateModule(
    packageFamilyOverviewModule,
    { name: family.label, description: family.description },
    {
      platformStatus: family.platform_status,
      platformLabel: 'Package Family',
      moduleTransition: family.module_status.overview,
      hasDraft: family.has_draft,
    },
  ), [family]);

  const relationshipData = useMemo(() => ({
    services: family.dependents.services,
    rateSheetRows: family.dependents.rate_sheet_rows,
    tierSelections: family.dependents.tier_selections,
  }), [family.dependents]);

  const relationshipsState = useMemo(() => evaluateModule(
    packageFamilyRelationshipsModule,
    relationshipData,
    {
      platformStatus: family.platform_status,
      platformLabel: 'Package Family',
    },
  ), [family.platform_status, relationshipData]);

  const requireGroup = useCallback((response: { success: boolean; group: PackageFamilyItem | null }, fallback: string) => {
    if (!response.success || !response.group) throw new Error(fallback);
    setFamily(response.group);
    return response.group;
  }, []);

  const saveOverview = useCallback(async (draft: PackageFamilyOverviewDraft) => {
    const response = await savePackageFamilyOverview(family.group_id, draft);
    const group = requireGroup(response, 'Could not save the Package Family Overview.');
    onMutationComplete?.();
    return group;
  }, [family.group_id, onMutationComplete, requireGroup]);

  const revertOverview = useCallback(async () => {
    const response = await revertPackageFamilyOverview(family.group_id);
    const group = requireGroup(response, 'Could not discard the Package Family draft.');
    onMutationComplete?.();
    return group;
  }, [family.group_id, onMutationComplete, requireGroup]);

  const settleOverview = useCallback(async () => {
    setStatusSaving(true);
    try {
      const response = await settlePackageFamilyOverview(family.group_id);
      const group = requireGroup(response, 'Could not settle the Package Family Overview.');
      onMutationComplete?.();
      return group;
    } finally {
      setStatusSaving(false);
    }
  }, [family.group_id, onMutationComplete, requireGroup]);

  const publishFamily = useCallback(async () => {
    setStatusSaving(true);
    try {
      const settled = await settlePackageFamilyOverview(family.group_id);
      requireGroup(settled, 'Could not settle the Package Family Overview.');
      const activated = await updatePackageFamilyStatus(family.group_id, 'active');
      const group = requireGroup(activated, 'Could not publish the Package Family.');
      onMutationComplete?.();
      return group;
    } finally {
      setStatusSaving(false);
    }
  }, [family.group_id, onMutationComplete, requireGroup]);

  const applyStatus = useCallback(async (status: 'active' | 'disabled' | 'archived' | 'trashed') => {
    setStatusSaving(true);
    try {
      const response = await updatePackageFamilyStatus(family.group_id, status);
      const group = requireGroup(response, `Could not move the Package Family to ${status}.`);
      onMutationComplete?.();
      return group;
    } finally {
      setStatusSaving(false);
    }
  }, [family.group_id, onMutationComplete, requireGroup]);

  const restoreFamily = useCallback(async () => {
    setStatusSaving(true);
    try {
      const response = await restorePackageFamily(family.group_id);
      const group = requireGroup(response, 'Could not restore the Package Family.');
      onMutationComplete?.();
      return group;
    } finally {
      setStatusSaving(false);
    }
  }, [family.group_id, onMutationComplete, requireGroup]);

  // Owner-specific tool activation. Writes a boolean on this Family's row and
  // advances the local record from the response — the same targeted-refresh
  // path as every other Family mutation. Never creates tool data.
  const setToolEnabled = useCallback(async (toolKey: PackageToolKey, enabled: boolean) => {
    setToolSaving(toolKey);
    try {
      const response = await setPackageFamilyTool(family.group_id, toolKey, enabled);
      const group = requireGroup(
        response,
        enabled ? 'Could not activate the tool.' : 'Could not deactivate the tool.',
      );
      onMutationComplete?.();
      return group;
    } finally {
      setToolSaving(null);
    }
  }, [family.group_id, onMutationComplete, requireGroup]);

  const deleteFamily = useCallback(async () => {
    setDeleting(true);
    try {
      const response = await permanentDeletePackageFamily(family.group_id);
      if (!response.success) throw new Error('Could not permanently delete the Package Family.');
      onMutationComplete?.();
      return true;
    } finally {
      setDeleting(false);
    }
  }, [family.group_id, onMutationComplete]);

  const isActive = family.platform_status === 'active';

  return {
    family,
    platformStatus: family.platform_status,
    isActive,
    hasDraft: family.has_draft,
    modules: { overview: overviewState, relationships: relationshipsState },
    relationshipData,
    tools: family.tools ?? {},
    loading: { status: statusSaving, deleting, tool: toolSaving },
    setToolEnabled,
    saveOverview,
    revertOverview,
    settleOverview,
    publishFamily,
    toggleActive: () => applyStatus(isActive ? 'disabled' : 'active'),
    archiveFamily: () => applyStatus('archived'),
    trashFamily: () => applyStatus('trashed'),
    restoreFamily,
    deleteFamily,
  };
}

export type PackageFamilyStation = ReturnType<typeof usePackageFamilyStation>;
