// Tier System drawer controller — the one coordination layer behind BOTH a
// pending (not yet published) and a persisted Tier System.
//
// Tier System registration is the pending state of this lifecycle, not a
// separate workflow: `instance === null` (pending) and `instance !== null`
// (persisted) share one draft model, one footer model, and one identity-
// transition mechanism. A Package Family is optional and is NOT a field on
// the instance — the Tier instance schema carries no Family vocabulary; the
// link is a row in the separate `tier_assignments[]` ledger, written only by
// Publish/Apply, never by Inline Save.
//
// Inline Save commits a module's draft LOCALLY ONLY — no create, no update
// request. Footer Publish is the sole authoritative creation; footer Apply is
// the sole authoritative update for an existing Tier System, bundling
// whatever either module last committed locally (title/description/Family
// from Overview, allowed_rate_sheet_ids from Rate Sheet Access) into one
// PATCH. This mirrors usePackageFamilyStation's group_id==='' branch and
// createFamily's footer-owned authoritative write.

import { useCallback, useState } from 'preact/hooks';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import type {
  PackageFamilyListItem,
  PackageRateSheet,
  TierAssignment,
  TierInstanceRecord,
} from '../../types';
import type { TierInstancesToolState } from '../../surface/tierInstance/useTierInstances';
import type { TierSystemOverviewDraftFields } from '../editors/TierSystemOverviewEditor';
import {
  projectTierRateSheetAccess,
  tierRateSheetAccessDraft,
  tierRateSheetAccessIsDirty,
  tierRateSheetAccessIsValid,
  tierRateSheetAccessPayload,
  type TierRateSheetAccessDraft,
  type TierRateSheetAccessProjection,
} from '../../surface/tierInstance/tierRateSheetAccessModel';

export type TierSystemModule = 'overview' | 'rate-sheet-access';
export type TierSystemFooterMode = 'pending' | 'persisted' | 'none';

export interface TierSystemControllerArgs {
  tool:             TierInstancesToolState;
  /** The loaded record, or null when this is a pending (not yet created) Tier System. */
  instance:         TierInstanceRecord | null;
  /** Only meaningful while pending — the Family the caller already had in hand. */
  initialFamilyId:  string | null;
  rateSheets:       PackageRateSheet[];
  refetchRateSheets?: () => void;
  bridge:           EntityDrawerHostBridge;
}

/** The Family currently holding this instance, by the ledger rather than a field. */
function assignedFamilyId(
  instanceId: string | null,
  assignments: readonly TierAssignment[],
): string | null {
  if (instanceId === null) return null;
  return assignments.find((row) => row.tier_instance_id === instanceId)?.consumer_id ?? null;
}

function seedOverview(
  instance: TierInstanceRecord | null,
  initialFamilyId: string | null,
  tool: TierInstancesToolState,
): TierSystemOverviewDraftFields {
  if (instance !== null) {
    return {
      title:       instance.title,
      description: instance.description,
      familyId:    assignedFamilyId(instance.tier_instance_id, tool.assignments),
    };
  }
  const familyId = initialFamilyId !== null
    && tool.eligibleFamilies.some((family) => family.group_id === initialFamilyId)
    ? initialFamilyId
    : null;
  return { title: '', description: '', familyId };
}

// api.ts's apiClient throws `API ${method} ${path} → ${status}: ${bodyText}`
// on a non-OK response (see resources/ts/api/client.ts); useTierInstances
// catches that and stores its `.message` verbatim as `tool.error`, the same
// convention every other mutation on the tool already follows. The guard
// endpoints return a clean, human-readable `message` field inside that
// trailing JSON body — pull it out when present so "Remove the Tier
// assignment first." reaches the dialog instead of the wrapped fetch text;
// fall back to the raw string for anything that doesn't parse.
function guardMessage(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  const jsonStart = raw.indexOf('{');
  if (jsonStart === -1) return raw;
  try {
    const body = JSON.parse(raw.slice(jsonStart)) as { message?: string };
    return typeof body.message === 'string' && body.message ? body.message : raw;
  } catch {
    return raw;
  }
}

export function useTierSystemController({
  tool, instance: initialInstance, initialFamilyId, rateSheets, refetchRateSheets, bridge,
}: TierSystemControllerArgs) {
  // The record replaces `null` the moment Publish mints it — local state, not
  // a routing/recordId change (Admin Station's drawer contract keeps every
  // entity's real id stable for the drawer's whole mounted lifetime; see
  // station-manager/recordIdentity.ts). Once set, THIS is the source of
  // truth for "persisted" rather than the host's own `instance` prop, so the
  // drawer continues in place instead of waiting on a wall refetch.
  const [createdInstance, setCreatedInstance] = useState<TierInstanceRecord | null>(null);
  const instance = createdInstance
    ?? (initialInstance !== null
      ? tool.instances.find((row) => row.tier_instance_id === initialInstance.tier_instance_id) ?? initialInstance
      : null);

  const [overview, setOverview] = useState<TierSystemOverviewDraftFields>(
    () => seedOverview(initialInstance, initialFamilyId, tool),
  );
  const [overviewOriginal, setOverviewOriginal] = useState<TierSystemOverviewDraftFields>(overview);
  const [rateSheetAccess, setRateSheetAccess] = useState<TierRateSheetAccessDraft | null>(null);
  const [rateSheetOriginal, setRateSheetOriginal] = useState<TierRateSheetAccessDraft | null>(null);
  const [editingModule, setEditingModule] = useState<TierSystemModule | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // The registered system's own Family stays selectable so it can be kept;
  // every other option must be a Family that holds nothing yet.
  const heldFamilyId = assignedFamilyId(instance?.tier_instance_id ?? null, tool.assignments);
  const selectable: PackageFamilyListItem[] = heldFamilyId === null
    ? tool.eligibleFamilies
    : [
        ...tool.families.filter((family) => family.group_id === heldFamilyId),
        ...tool.eligibleFamilies.filter((family) => family.group_id !== heldFamilyId),
      ];
  const familyLabel = overview.familyId === null
    ? null
    : selectable.find((family) => family.group_id === overview.familyId)?.label ?? null;

  const projection: TierRateSheetAccessProjection | null = instance !== null
    ? projectTierRateSheetAccess(instance, rateSheets)
    : null;

  // One assignment row per instance, so re-pointing is a delete then a
  // create. The instance is authoritative either way: a failed ledger write
  // leaves a registered/saved, unassigned Tier system rather than a
  // half-written record.
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

  // ── Module edit sessions — Inline Edit / Inline Save / Cancel ──────────────
  // Save commits the session's draft as the new LOCAL baseline and closes the
  // editor. It never calls create or update — only Publish/Apply do.

  const openOverviewEditor = useCallback(() => {
    setOverviewOriginal(overview);
    setEditingModule('overview');
    setError(null);
  }, [overview]);

  const patchOverview = useCallback((patch: Partial<TierSystemOverviewDraftFields>) => {
    setOverview((current) => ({ ...current, ...patch }));
  }, []);

  const saveOverviewDraft = useCallback(() => {
    setEditingModule(null);
  }, []);

  const cancelOverviewEdit = useCallback(() => {
    setOverview(overviewOriginal);
    setEditingModule(null);
  }, [overviewOriginal]);

  const openRateSheetEditor = useCallback(() => {
    if (projection === null) return;
    const seed = rateSheetAccess ?? tierRateSheetAccessDraft(projection);
    setRateSheetAccess(seed);
    setRateSheetOriginal(seed);
    setEditingModule('rate-sheet-access');
    setError(null);
  }, [projection, rateSheetAccess]);

  const replaceRateSheetDraft = useCallback((next: TierRateSheetAccessDraft) => {
    setRateSheetAccess(next);
  }, []);

  const saveRateSheetDraft = useCallback(() => {
    setEditingModule(null);
  }, []);

  const cancelRateSheetEdit = useCallback(() => {
    setRateSheetAccess(rateSheetOriginal);
    setEditingModule(null);
  }, [rateSheetOriginal]);

  // ── Footer — Publish (pending) / Apply + guarded Delete (persisted) ───────

  const canPublish = overview.title.trim().length > 0;
  const overviewDirty = instance !== null && (
    overview.title !== instance.title
    || overview.description !== instance.description
    || overview.familyId !== heldFamilyId
  );
  const rateSheetDirty = instance !== null && rateSheetAccess !== null
    && tierRateSheetAccessIsDirty(rateSheetAccess, instance);
  const rateSheetValid = rateSheetAccess === null || projection === null
    || tierRateSheetAccessIsValid(rateSheetAccess, projection);
  const canApply = instance !== null && canPublish && rateSheetValid && (overviewDirty || rateSheetDirty);

  const publish = useCallback(async () => {
    const title = overview.title.trim();
    if (title === '') {
      setError('A Tier system needs a title.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await tool.createInstance({ title, description: overview.description.trim() });
      if (!created) {
        setError(tool.error ?? 'Could not publish the Tier system.');
        return;
      }
      setCreatedInstance(created);
      setOverview({ title: created.title, description: created.description, familyId: overview.familyId });
      if (overview.familyId !== null
        && !(await pointAssignment(created.tier_instance_id, overview.familyId, null))) {
        // The Tier system exists and is reported by its own stored identity.
        // Only the optional link failed, and it is offered again rather than
        // retried automatically.
        setOverview((current) => ({ ...current, familyId: null }));
        setError('The Tier system was published, but it could not be given to that Package Family.');
      }
      setSaveOk(true);
      bridge.onMutationComplete?.();
    } finally {
      setSaving(false);
    }
  }, [bridge, overview, pointAssignment, tool]);

  const apply = useCallback(async () => {
    if (instance === null) return;
    const title = overview.title.trim();
    if (title === '') {
      setError('A Tier system needs a title.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await tool.updateInstance(instance.tier_instance_id, {
        title,
        description: overview.description.trim(),
        ...(rateSheetAccess !== null
          ? { allowed_rate_sheet_ids: tierRateSheetAccessPayload(rateSheetAccess) }
          : {}),
      });
      if (!saved) {
        setError(tool.error ?? 'Could not apply changes to the Tier system.');
        return;
      }
      if (!(await pointAssignment(instance.tier_instance_id, overview.familyId, heldFamilyId))) {
        setError('The Tier system was saved, but its Package Family could not be changed.');
        return;
      }
      refetchRateSheets?.();
      bridge.onMutationComplete?.();
      setSaveOk(true);
    } finally {
      setSaving(false);
    }
  }, [bridge, heldFamilyId, instance, overview, pointAssignment, rateSheetAccess, refetchRateSheets, tool]);

  const requestDelete = useCallback(() => {
    setDeleteError(null);
    setDeleteDialogOpen(true);
  }, []);

  const cancelDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeleteError(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (instance === null) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const deleted = await tool.deleteInstance(instance.tier_instance_id);
      if (!deleted) {
        setDeleteError(guardMessage(tool.error, 'Could not permanently delete the Tier system.'));
        return;
      }
      setDeleteDialogOpen(false);
      bridge.onMutationComplete?.();
      bridge.close();
    } finally {
      setDeleting(false);
    }
  }, [bridge, instance, tool]);

  const isDirty = editingModule === 'overview'
    ? (overview.title !== overviewOriginal.title
      || overview.description !== overviewOriginal.description
      || overview.familyId !== overviewOriginal.familyId)
    : editingModule === 'rate-sheet-access' && rateSheetAccess !== null && rateSheetOriginal !== null
      ? tierRateSheetAccessPayload(rateSheetAccess).join(',') !== tierRateSheetAccessPayload(rateSheetOriginal).join(',')
        || rateSheetAccess.mode !== rateSheetOriginal.mode
      : false;

  const footerMode: TierSystemFooterMode = editingModule !== null
    ? 'none'
    : instance !== null ? 'persisted' : 'pending';

  const requestClose = useCallback(() => bridge.close(), [bridge]);

  return {
    instance,
    isPersisted: instance !== null,
    overview,
    familyLabel,
    selectable,
    projection,
    rateSheetAccess,
    editingModule,
    openOverviewEditor,
    patchOverview,
    saveOverviewDraft,
    cancelOverviewEdit,
    openRateSheetEditor,
    replaceRateSheetDraft,
    saveRateSheetDraft,
    cancelRateSheetEdit,
    isDirty,
    footerMode,
    canPublish,
    canApply,
    saving,
    deleting,
    error,
    saveOk,
    publish,
    apply,
    requestDelete,
    cancelDeleteDialog,
    confirmDelete,
    deleteDialogOpen,
    deleteError,
    requestClose,
    overviewHasUnappliedChanges: overviewDirty,
    rateSheetHasUnappliedChanges: rateSheetDirty,
    hasUnappliedChanges: overviewDirty || rateSheetDirty,
  };
}

export type TierSystemController = ReturnType<typeof useTierSystemController>;
