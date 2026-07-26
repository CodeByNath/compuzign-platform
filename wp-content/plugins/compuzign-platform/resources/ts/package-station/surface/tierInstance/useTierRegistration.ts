// Tier system registration — the Package-owned state behind the `tier` drawer's
// registration address.
//
// Registering is ONE atomic creation: a Tier system enters the pool with its own
// title and description, and the backend mints its id and its five empty slots.
// Nothing else is minted, filled, or granted.
//
// A Package Family is optional and is NOT a field on the instance. The Tier
// instance schema deliberately carries no Family vocabulary; the link is a row in
// the separate `tier_assignments[]` ledger. Choosing a Family here therefore
// writes that row after the instance exists, and clearing it deletes that row —
// two authoritative writes, never one blended record. A Tier system registered
// standalone is complete; it is unassigned, not unfinished.
//
// After registering, the drawer stays on the registered system so its own
// overview can be corrected. That is still not a workflow: nothing here fills a
// slot, and configuring Tiers happens later through the engine.

import { useCallback, useState } from 'preact/hooks';
import type { PackageFamilyListItem, TierAssignment, TierInstanceRecord } from '../../types';
import type { TierInstancesToolState } from './useTierInstances';

export interface TierRegistrationDraft {
  title:       string;
  description: string;
  /** The Family that will hold this Tier system, or null to register it standalone. */
  familyId:    string | null;
}

export type TierRegistrationStage = 'form' | 'registered';

export interface TierRegistrationState {
  stage:      TierRegistrationStage;
  draft:      TierRegistrationDraft;
  /** Families holding no Tier system, plus the one this system already holds. */
  selectable: PackageFamilyListItem[];
  instance:   TierInstanceRecord | null;
  saving:     boolean;
  error:      string | null;
  setDraft:   (next: Partial<TierRegistrationDraft>) => void;
  register:   () => Promise<void>;
  /** Re-saves the registered system's own overview, and re-points its assignment. */
  applyEdits: () => Promise<void>;
}

/** The Family currently holding this instance, by the ledger rather than a field. */
function assignedFamilyId(
  instanceId: string | null,
  assignments: readonly TierAssignment[],
): string | null {
  if (instanceId === null) return null;
  return assignments.find((row) => row.tier_instance_id === instanceId)?.consumer_id ?? null;
}

export function useTierRegistration(
  tool: TierInstancesToolState,
  initialFamilyId: string | null,
  onMutationComplete: () => void,
): TierRegistrationState {
  const [stage, setStage] = useState<TierRegistrationStage>('form');
  const [instance, setInstance] = useState<TierInstanceRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraftState] = useState<TierRegistrationDraft>({
    title:       '',
    description: '',
    // A pre-selected Family is only honoured while it still holds no Tier system.
    // A stale hand-off must not silently retarget an assignment that already exists.
    familyId: initialFamilyId !== null
      && tool.eligibleFamilies.some((family) => family.group_id === initialFamilyId)
      ? initialFamilyId
      : null,
  });

  const setDraft = useCallback((next: Partial<TierRegistrationDraft>) => {
    setDraftState((current) => ({ ...current, ...next }));
  }, []);

  // The registered system's own Family stays selectable so it can be kept; every
  // other option must be a Family that holds nothing yet.
  const heldFamilyId = assignedFamilyId(instance?.tier_instance_id ?? null, tool.assignments);
  const selectable = heldFamilyId === null
    ? tool.eligibleFamilies
    : [
        ...tool.families.filter((family) => family.group_id === heldFamilyId),
        ...tool.eligibleFamilies.filter((family) => family.group_id !== heldFamilyId),
      ];

  // One assignment row per instance, so re-pointing is a delete then a create.
  // The instance is authoritative either way: a failed ledger write leaves a
  // registered, unassigned Tier system rather than a half-written record.
  const pointAssignment = useCallback(async (
    instanceId: string,
    familyId: string | null,
    currentFamilyId: string | null,
  ): Promise<boolean> => {
    if (familyId === currentFamilyId) return true;
    if (currentFamilyId !== null && !(await tool.unassignInstance(instanceId))) return false;
    if (familyId === null) return true;
    return tool.assignInstance(instanceId, familyId);
  }, [tool]);

  const register = useCallback(async () => {
    const title = draft.title.trim();
    if (title === '') {
      setError('A Tier system needs a title.');
      return;
    }
    setError(null);
    const created = await tool.createInstance({ title, description: draft.description.trim() });
    if (!created) {
      setError(tool.error ?? 'Could not register the Tier system.');
      return;
    }
    setInstance(created);
    setStage('registered');
    if (draft.familyId !== null
      && !(await pointAssignment(created.tier_instance_id, draft.familyId, null))) {
      // The Tier system exists and is reported by its own stored identity. Only
      // the optional link failed, and it is offered again rather than retried.
      setDraft({ familyId: null });
      setError('The Tier system was registered, but it could not be given to that Package Family.');
    }
    onMutationComplete();
  }, [draft, onMutationComplete, pointAssignment, setDraft, tool]);

  const applyEdits = useCallback(async () => {
    if (instance === null) return;
    const title = draft.title.trim();
    if (title === '') {
      setError('A Tier system needs a title.');
      return;
    }
    setError(null);
    const saved = await tool.updateInstance(instance.tier_instance_id, {
      title,
      description: draft.description.trim(),
    });
    if (!saved) {
      setError(tool.error ?? 'Could not save the Tier system.');
      return;
    }
    setInstance(saved);
    if (!(await pointAssignment(instance.tier_instance_id, draft.familyId, heldFamilyId))) {
      setError('The Tier system was saved, but its Package Family could not be changed.');
      return;
    }
    onMutationComplete();
  }, [draft, heldFamilyId, instance, onMutationComplete, pointAssignment, tool]);

  return {
    stage,
    draft,
    selectable,
    instance,
    saving: tool.saving,
    error,
    setDraft,
    register,
    applyEdits,
  };
}
