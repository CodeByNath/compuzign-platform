import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import {
  createPackageFamily,
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

  // A `group_id`-less family addresses no stored record yet. Module Save must
  // not call the update endpoint against an id that does not exist — it only
  // advances the local draft, moving the overview transition to 'pending' so
  // the record footer's Publish gate (canPublish) can read it as ready. The
  // drawer footer's own Create/Publish action is the sole authoritative write
  // for this record, via `createFamily` below.
  const saveOverview = useCallback(async (draft: PackageFamilyOverviewDraft) => {
    if (family.group_id === '') {
      setFamily((current) => ({
        ...current,
        label:       draft.name,
        description: draft.description,
        module_status: { ...current.module_status, overview: 'pending' },
      }));
      return family;
    }
    const response = await savePackageFamilyOverview(family.group_id, draft);
    const group = requireGroup(response, 'Could not save the Package Family Overview.');
    onMutationComplete?.();
    return group;
  }, [family, onMutationComplete, requireGroup]);

  // The drawer footer's authoritative creation. Persists the drafted overview
  // (staged locally by saveOverview above) as a brand-new Package Family and
  // replaces the local seed with the real, server-issued record — the same
  // "born disabled, overview pending" state as any other newly created Family,
  // so every existing lifecycle/footer computation applies unchanged from here.
  const createFamily = useCallback(async () => {
    const response = await createPackageFamily({ name: family.label, description: family.description });
    const group = requireGroup(response, 'Could not create the Package Family.');
    onMutationComplete?.();
    return group;
  }, [family.label, family.description, onMutationComplete, requireGroup]);

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

  return {
    family,
    platformStatus: family.platform_status,
    isActive,
    hasDraft: family.has_draft,
    modules: { overview: overviewState, relationships: relationshipsState },
    relationshipData,
    loading: { status: statusSaving, deleting },
    saveOverview,
    createFamily,
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
