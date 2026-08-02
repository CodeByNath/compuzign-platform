import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  createPackageFamily,
  disablePackageFamily,
  enablePackageFamily,
  permanentDeletePackageFamily,
  restorePackageFamily,
  revertPackageFamilyOverview,
  savePackageFamilyOverview,
  settlePackageFamilyOverview,
  updatePackageFamilyStatus,
} from './api';
import type { PackageFamilyItem } from './types';
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
  const [creating, setCreating] = useState(false);
  const createInFlight = useRef<Promise<PackageFamilyItem> | null>(null);

  useEffect(() => {
    setFamily((current) => {
      // The host intentionally keeps resolving recordId "new" to the local
      // seed for this mounted session. Once Overview Save has installed the
      // authoritative returned identity, a host refresh must not rewind it.
      if (current.group_id !== '' && seed.group_id === '') return current;
      return seed;
    });
  }, [seed]);

  const overviewState = useMemo(() => evaluateModule(
    packageFamilyOverviewModule,
    { name: family.label, description: family.description },
    {
      platformStatus: family.platform_status,
      platformLabel: 'Package Family',
      moduleTransition: family.module_status.overview,
      hasDraft: family.has_draft,
      disabled: family.platform_status === 'disabled' && family.previous_platform_status !== null,
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
      disabled: family.platform_status === 'disabled' && family.previous_platform_status !== null,
    },
  ), [family.platform_status, relationshipData]);

  const requireGroup = useCallback((response: { success: boolean; group: PackageFamilyItem | null }, fallback: string) => {
    if (!response.success || !response.group) throw new Error(fallback);
    setFamily(response.group);
    return response.group;
  }, []);

  // A complete Overview Save is the persistence boundary. The first valid save
  // creates one Package-owned Pending Family; every later save addresses that
  // returned native identity through the existing Overview endpoint.
  const saveOverview = useCallback(async (draft: PackageFamilyOverviewDraft) => {
    if (family.group_id === '') {
      if (createInFlight.current) return createInFlight.current;
      setCreating(true);
      const request = createPackageFamily({ name: draft.name, description: draft.description })
        .then((response) => {
          const group = requireGroup(response, 'Could not create the Package Family.');
          onMutationComplete?.();
          return group;
        })
        .finally(() => {
          createInFlight.current = null;
          setCreating(false);
        });
      createInFlight.current = request;
      return request;
    }
    const response = await savePackageFamilyOverview(family.group_id, draft);
    const group = requireGroup(response, 'Could not save the Package Family Overview.');
    onMutationComplete?.();
    return group;
  }, [family, onMutationComplete, requireGroup]);

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
  const isDisabledMasked = family.platform_status === 'disabled'
    && family.previous_platform_status !== null;

  const toggleActive = useCallback(async () => {
    if (family.group_id === '') return null;
    setStatusSaving(true);
    try {
      const response = isDisabledMasked
        ? await enablePackageFamily(family.group_id)
        : await disablePackageFamily(family.group_id);
      const group = requireGroup(response, `Could not ${isDisabledMasked ? 'enable' : 'disable'} the Package Family.`);
      onMutationComplete?.();
      return group;
    } finally {
      setStatusSaving(false);
    }
  }, [family.group_id, isDisabledMasked, onMutationComplete, requireGroup]);

  return {
    family,
    platformStatus: family.platform_status,
    isActive,
    isDisabledMasked,
    hasDraft: family.has_draft,
    modules: { overview: overviewState, relationships: relationshipsState },
    relationshipData,
    loading: { status: statusSaving, deleting, creating },
    saveOverview,
    revertOverview,
    settleOverview,
    publishFamily,
    toggleActive,
    archiveFamily: () => applyStatus('archived'),
    trashFamily: () => applyStatus('trashed'),
    restoreFamily,
    deleteFamily,
  };
}

export type PackageFamilyStation = ReturnType<typeof usePackageFamilyStation>;
