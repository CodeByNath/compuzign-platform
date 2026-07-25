import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import {
  createTierAssignment,
  createTierInstance,
  deleteTierAssignment,
  fetchPackageFamilies,
  fetchTierAssignments,
  fetchTierInstances,
  updateTierInstance,
} from '../../api';
import type {
  PackageFamilyListItem,
  TierAssignment,
  TierInstanceRecord,
} from '../../types';
import { eligibleConsumers, tierInstanceRows } from './tierInstanceModel';

let requestedInstanceId: string | null = null;
const openListeners = new Set<(instanceId: string) => void>();

/** Package-owned hand-off used by Family capability actions; no host rule. */
export function requestTierInstanceOpen(instanceId: string): void {
  requestedInstanceId = instanceId;
  for (const listener of openListeners) listener(instanceId);
}

export interface TierInstancesToolState {
  instances: TierInstanceRecord[];
  assignments: TierAssignment[];
  families: PackageFamilyListItem[];
  rows: ReturnType<typeof tierInstanceRows>;
  eligibleFamilies: PackageFamilyListItem[];
  selectedInstanceId: string | null;
  selectedInstance: TierInstanceRecord | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  /** Increments for Package-owned Open Tier tool hand-offs, even when identity is unchanged. */
  openRequestRevision: number;
  selectInstance: (instanceId: string) => void;
  createInstance: (title: string) => Promise<TierInstanceRecord | null>;
  updateInstance: (
    instanceId: string,
    payload: { title?: string; allowed_rate_sheet_ids?: string[] },
  ) => Promise<TierInstanceRecord | null>;
  assignInstance: (instanceId: string, familyId: string) => Promise<boolean>;
  unassignInstance: (instanceId: string) => Promise<boolean>;
  refetch: () => void;
}

export function useTierInstances(): TierInstancesToolState {
  const [instances, setInstances] = useState<TierInstanceRecord[]>([]);
  const [assignments, setAssignments] = useState<TierAssignment[]>([]);
  const [families, setFamilies] = useState<PackageFamilyListItem[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openRequestRevision, setOpenRequestRevision] = useState(0);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchTierInstances(),
      fetchTierAssignments(),
      fetchPackageFamilies(),
      fetchPackageFamilies('archived'),
      fetchPackageFamilies('trashed'),
    ])
      .then(([instanceResponse, assignmentResponse, familyResponse, archivedResponse, trashedResponse]) => {
        if (!active) return;
        const nextInstances = instanceResponse.success ? instanceResponse.tier_instances : [];
        setInstances(nextInstances);
        setAssignments(assignmentResponse.success ? assignmentResponse.tier_assignments : []);
        const allFamilies = [
          ...(familyResponse.package_category_groups ?? []),
          ...(archivedResponse.package_category_groups ?? []),
          ...(trashedResponse.package_category_groups ?? []),
        ];
        setFamilies([...new Map(allFamilies.map((family) => [family.group_id, family])).values()]);
        const requested = nextInstances.some((instance) => instance.tier_instance_id === requestedInstanceId)
          ? requestedInstanceId
          : null;
        if (requested !== null) {
          requestedInstanceId = null;
          setOpenRequestRevision((value) => value + 1);
        }
        setSelectedInstanceId((current) => {
          if (requested !== null) return requested;
          return nextInstances.some((instance) => instance.tier_instance_id === current)
            ? current
            : nextInstances[0]?.tier_instance_id ?? null;
        });
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Unable to load Tier instances.');
        setInstances([]);
        setAssignments([]);
        setFamilies([]);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);

  useEffect(() => {
    const open = (instanceId: string) => {
      requestedInstanceId = null;
      setSelectedInstanceId(instanceId);
      setOpenRequestRevision((value) => value + 1);
    };
    openListeners.add(open);
    return () => { openListeners.delete(open); };
  }, []);

  const refetch = useCallback(() => setRevision((value) => value + 1), []);
  const selectedInstance = useMemo(
    () => instances.find((instance) => instance.tier_instance_id === selectedInstanceId) ?? null,
    [instances, selectedInstanceId],
  );
  const rows = useMemo(
    () => tierInstanceRows(instances, assignments, families),
    [instances, assignments, families],
  );
  const eligibleFamilies = useMemo(
    () => eligibleConsumers(families, assignments),
    [families, assignments],
  );

  const createInstance = useCallback(async (title: string): Promise<TierInstanceRecord | null> => {
    setSaving(true);
    setError(null);
    try {
      const response = await createTierInstance({ title });
      if (!response.success) return null;
      setSelectedInstanceId(response.tier_instance.tier_instance_id);
      refetch();
      return response.tier_instance;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create the Tier instance.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [refetch]);

  const updateInstance = useCallback(async (
    instanceId: string,
    payload: { title?: string; allowed_rate_sheet_ids?: string[] },
  ): Promise<TierInstanceRecord | null> => {
    setSaving(true);
    setError(null);
    try {
      const response = await updateTierInstance(instanceId, payload);
      if (!response.success) return null;
      setInstances((current) => current.map((instance) =>
        instance.tier_instance_id === instanceId ? response.tier_instance : instance,
      ));
      return response.tier_instance;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the Tier instance.');
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const assignInstance = useCallback(async (instanceId: string, familyId: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const response = await createTierAssignment({
        consumer_type: 'package_family',
        consumer_id: familyId,
        tier_instance_id: instanceId,
      });
      if (!response.success) return false;
      setAssignments(response.tier_assignments);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to add the Tier assignment.');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const unassignInstance = useCallback(async (instanceId: string): Promise<boolean> => {
    const assignment = assignments.find((item) => item.tier_instance_id === instanceId);
    if (!assignment) return true;
    setSaving(true);
    setError(null);
    try {
      const response = await deleteTierAssignment(assignment.assignment_id);
      if (!response.success) return false;
      setAssignments(response.tier_assignments);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove the Tier assignment.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [assignments]);

  return {
    instances,
    assignments,
    families,
    rows,
    eligibleFamilies,
    selectedInstanceId,
    selectedInstance,
    loading,
    saving,
    error,
    openRequestRevision,
    selectInstance: setSelectedInstanceId,
    createInstance,
    updateInstance,
    assignInstance,
    unassignInstance,
    refetch,
  };
}
