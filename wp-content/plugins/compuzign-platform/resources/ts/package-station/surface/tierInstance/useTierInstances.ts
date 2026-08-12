import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import {
  createTierAssignment,
  createTierInstance,
  deleteTierAssignment,
  deleteTierInstance,
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
  /** Registers ONE Tier system. The backend mints its id and its five empty slots. */
  createInstance: (
    payload: { title: string; description?: string },
  ) => Promise<TierInstanceRecord | null>;
  updateInstance: (
    instanceId: string,
    payload: { title?: string; description?: string; allowed_rate_sheet_ids?: string[] },
  ) => Promise<TierInstanceRecord | null>;
  assignInstance: (instanceId: string, familyId: string) => Promise<boolean>;
  unassignInstance: (instanceId: string) => Promise<boolean>;
  /** Destructive cascade delete — also removes the Tier Group's owned occupants, occupant-bin entries, and Family assignment. Null succeeds; a string is the endpoint error for the owning dialog. */
  deleteInstance: (instanceId: string) => Promise<string | null>;
  refetch: () => void;
}

export function useTierInstances(): TierInstancesToolState {
  const [instances, setInstances] = useState<TierInstanceRecord[]>([]);
  const [assignments, setAssignments] = useState<TierAssignment[]>([]);
  const [families, setFamilies] = useState<PackageFamilyListItem[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  // True only until the FIRST fetch (success or failure) settles, and never
  // again after — a later refetch() (createInstance()/deleteInstance() both
  // trigger one, to reconcile with the canonical collection) must not flip
  // this back to true. TierRegistrationHost / TierInstanceSettingsHost gate
  // mounting the Tier System composition on `loading`; re-entering a
  // blocking loading state over an already-mounted composition would
  // unmount it and discard the controller's local pending→persisted
  // transition (createdInstance) — exactly the Publish-reverts-to-pending
  // defect this field exists to prevent.
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openRequestRevision, setOpenRequestRevision] = useState(0);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
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
      .finally(() => { if (active) setInitialized(true); });
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

  const createInstance = useCallback(async (
    payload: { title: string; description?: string },
  ): Promise<TierInstanceRecord | null> => {
    setSaving(true);
    setError(null);
    try {
      const response = await createTierInstance(payload);
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
    payload: { title?: string; description?: string; allowed_rate_sheet_ids?: string[] },
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

  const deleteInstance = useCallback(async (instanceId: string): Promise<string | null> => {
    try {
      const response = await deleteTierInstance(instanceId);
      if (!response.success) return 'Unable to delete the Tier instance.';
      // The owning drawer closes on success and refreshes its opener. Do not
      // remove/refetch this mounted drawer's own record first: that replaces
      // its confirmation UI with a missing-record or unrelated GET error.
      return null;
    } catch (cause) {
      return cause instanceof Error ? cause.message : 'Unable to delete the Tier instance.';
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

  // Every consuming controller closes over this object in its own memoized
  // callbacks (see useTierSystemController's pointAssignment/publish/apply).
  // Returning a fresh literal on every render made those callbacks — and any
  // effect that lists them as a dependency — recreate every render too, which
  // is what caused the Tier System footer-registration effect to loop
  // (render → new tool → new publish/apply → effect refires → setFooter →
  // ancestor re-render → render …). Memoizing keeps this object referentially
  // stable unless the underlying state actually changed.
  return useMemo<TierInstancesToolState>(() => ({
    instances,
    assignments,
    families,
    rows,
    eligibleFamilies,
    selectedInstanceId,
    selectedInstance,
    loading: !initialized,
    saving,
    error,
    openRequestRevision,
    selectInstance: setSelectedInstanceId,
    createInstance,
    updateInstance,
    deleteInstance,
    assignInstance,
    unassignInstance,
    refetch,
  }), [
    instances, assignments, families, rows, eligibleFamilies,
    selectedInstanceId, selectedInstance, initialized, saving, error,
    openRequestRevision, createInstance, updateInstance, deleteInstance,
    assignInstance, unassignInstance, refetch,
  ]);
}
