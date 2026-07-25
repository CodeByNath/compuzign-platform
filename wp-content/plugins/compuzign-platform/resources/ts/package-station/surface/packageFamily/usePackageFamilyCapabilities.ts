import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { useInlineConfirm } from '@/hooks/useInlineConfirm';
import {
  createTierAssignment,
  createTierInstance,
  deleteTierAssignment,
  fetchTierAssignments,
  fetchTierInstances,
} from '../../api';
import type {
  PackageFamilyItem,
  TierAssignment,
  TierInstanceRecord,
} from '../../types';
import { requestTierInstanceOpen } from '../tierInstance/useTierInstances';

export type PackageFamilyTierCapability =
  | { enabled: false }
  | { enabled: true; instanceId: string; instanceTitle: string; readiness: string };

export interface PackageFamilyCapabilitiesData {
  tier: PackageFamilyTierCapability;
}

export function projectPackageFamilyCapabilities(
  family: Pick<PackageFamilyItem, 'group_id' | 'platform_status'>,
  assignments: readonly TierAssignment[],
  instances: readonly TierInstanceRecord[],
): PackageFamilyCapabilitiesData {
  const assignment = assignments.find((item) =>
    item.consumer_type === 'package_family' && item.consumer_id === family.group_id,
  );
  const instance = assignment
    ? instances.find((item) => item.tier_instance_id === assignment.tier_instance_id)
    : null;
  if (!assignment || !instance) return { tier: { enabled: false } };
  return {
    tier: {
      enabled: true,
      instanceId: instance.tier_instance_id,
      instanceTitle: instance.title,
      readiness: instance.status === 'active' && family.platform_status === 'active' ? 'Ready' : 'Not ready',
    },
  };
}

export function usePackageFamilyCapabilities(
  family: PackageFamilyItem,
  onMutationComplete?: () => void,
) {
  const [assignments, setAssignments] = useState<TierAssignment[]>([]);
  const [instances, setInstances] = useState<TierInstanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdOrphan, setCreatedOrphan] = useState<TierInstanceRecord | null>(null);
  const [revision, setRevision] = useState(0);
  const removeConfirm = useInlineConfirm<string>();

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([fetchTierAssignments(), fetchTierInstances()])
      .then(([assignmentResponse, instanceResponse]) => {
        if (!active) return;
        setAssignments(assignmentResponse.success ? assignmentResponse.tier_assignments : []);
        setInstances(instanceResponse.success ? instanceResponse.tier_instances : []);
        setError(null);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Could not load Family capabilities.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  const assignment = useMemo(() => assignments.find((item) =>
    item.consumer_type === 'package_family' && item.consumer_id === family.group_id,
  ) ?? null, [assignments, family.group_id]);
  const instance = useMemo(() => assignment
    ? instances.find((item) => item.tier_instance_id === assignment.tier_instance_id) ?? null
    : null, [assignment, instances]);
  const data = useMemo(
    () => projectPackageFamilyCapabilities(family, assignments, instances),
    [assignments, family, instances],
  );

  const addTier = useCallback(async (): Promise<boolean> => {
    if (assignment || busy) return false;
    setBusy('add-tier-capability');
    setError(null);
    let createdForAttempt = createdOrphan;
    try {
      if (!createdForAttempt) {
        const created = await createTierInstance({ title: `${family.label} Tiers` });
        if (!created.success || !created.tier_instance) throw new Error('Could not create the Tier instance.');
        createdForAttempt = created.tier_instance;
      }
      const assigned = await createTierAssignment({
        consumer_type: 'package_family',
        consumer_id: family.group_id,
        tier_instance_id: createdForAttempt.tier_instance_id,
      });
      if (!assigned.success) {
        setCreatedOrphan(createdForAttempt);
        throw new Error('Tier instance created but not yet attached to this Family. Attach it from this Capabilities panel.');
      }
      setCreatedOrphan(null);
      setRevision((value) => value + 1);
      onMutationComplete?.();
      return true;
    } catch (cause) {
      if (createdForAttempt) {
        setCreatedOrphan(createdForAttempt);
        setError('Tier instance created but not yet attached to this Family. Attach it from this Capabilities panel.');
      } else {
        setError(cause instanceof Error ? cause.message : 'Could not add Tier capability.');
      }
      return false;
    } finally {
      setBusy(null);
    }
  }, [assignment, busy, createdOrphan, family.group_id, family.label, onMutationComplete]);

  const requestRemoveTier = useCallback(() => {
    if (assignment) removeConfirm.request(assignment.assignment_id);
  }, [assignment, removeConfirm]);

  const confirmRemoveTier = useCallback(async () => {
    if (!assignment) return;
    setError(null);
    try {
      await removeConfirm.run(assignment.assignment_id, async () => {
        const response = await deleteTierAssignment(assignment.assignment_id);
        if (!response.success) throw new Error('Could not remove Tier capability.');
        setAssignments(response.tier_assignments);
        onMutationComplete?.();
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove Tier capability.');
    }
  }, [assignment, onMutationComplete, removeConfirm]);

  const openTier = useCallback(() => {
    if (instance) requestTierInstanceOpen(instance.tier_instance_id);
  }, [instance]);

  return {
    data,
    assignment,
    instance,
    loading,
    busy,
    error,
    removeConfirm,
    addTier,
    requestRemoveTier,
    confirmRemoveTier,
    openTier,
  };
}
