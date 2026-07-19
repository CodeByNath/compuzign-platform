// Service guarded-exit flow — the drawer's exit dialogs and their continuations.
//
// The composition owns the exit dialogs; the bridge only closes. Exit policy
// (in priority order): a dirty open editor raises 'unsaved'; a never-published
// service with a saved overview draft raises 'new-service-draft'; an active
// service with pending modules raises 'pending'. The shared useGuardedClose
// machinery stashes the blocked continuation (close, or a tab switch) and runs
// it when a dialog resolves.

import { useCallback, useState } from 'preact/hooks';
import type { ServiceStation } from '@/admin-station/stations/service';
import type { OverviewDraft } from '@/admin-station/stations/service';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { useGuardedClose } from '../shared/drawerChrome';
import type { ServiceModuleEditing } from './useServiceModuleEditing';
import type { ServiceExitDialog } from './serviceDrawerTypes';

export interface ServiceExitFlowArgs {
  bridge:              EntityDrawerHostBridge;
  station:             ServiceStation;
  editing:             ServiceModuleEditing;
  isNewNeverPublished: boolean;
  // Settle-and-exit continuation supplied by the lifecycle hook.
  settleModules: () => Promise<void>;
}

export function useServiceExitFlow({
  bridge, station, editing, isNewNeverPublished, settleModules,
}: ServiceExitFlowArgs) {
  const { isActive, hasPendingModules, overviewDraft: stationOverviewDraft, saveOverview, trashStation } = station;
  const { editingSection, isEditorDirty, clearEditState, saveCurrentModule, setSaveErr } = editing;

  const [exitDialog,   setExitDialog]   = useState<ServiceExitDialog>(null);
  const [exitSaving,   setExitSaving]   = useState(false);
  const [newSvcFields, setNewSvcFields] = useState({ title: false, category: false, description: false });

  // Evaluate whether an exit may proceed now; raise the matching dialog if not.
  // Closes over current render state — useGuardedClose reads it through a ref.
  const evaluateExit = (): boolean => {
    if (editingSection && isEditorDirty) { setExitDialog('unsaved'); return false; }
    if (isNewNeverPublished && stationOverviewDraft !== null) { setExitDialog('new-service-draft'); return false; }
    if (isActive && hasPendingModules) { setExitDialog('pending'); return false; }
    return true;
  };

  const { guard, resolveExit, closeBypassingGuard } = useGuardedClose(bridge, evaluateExit);

  // ── New-never-published exit prompt ─────────────────────────────────────────
  const handleNewSvcSaveDraft = useCallback(async () => {
    if (!stationOverviewDraft) return;
    setExitSaving(true);
    try {
      const draft: OverviewDraft = {
        title:       stationOverviewDraft.title,
        excerpt:     stationOverviewDraft.excerpt ?? '',
        content:     stationOverviewDraft.content,
        category_id: stationOverviewDraft.category_ids[0] ?? null,
      };
      await saveOverview(draft);
      setExitDialog(null);
      setNewSvcFields({ title: false, category: false, description: false });
      resolveExit();
    } finally {
      setExitSaving(false);
    }
  }, [stationOverviewDraft, saveOverview, resolveExit]);

  const handleNewSvcTrash = useCallback(async () => {
    setExitDialog(null);
    setNewSvcFields({ title: false, category: false, description: false });
    const result = await trashStation();
    if (result) resolveExit();
  }, [trashStation, resolveExit]);

  // ── Dirty-editor exit ───────────────────────────────────────────────────────
  const handleExitSaveAndProceed = useCallback(async () => {
    setExitSaving(true);
    setSaveErr(null);
    try {
      const newModuleStatus = await saveCurrentModule();
      clearEditState();
      const stillPending = isActive && newModuleStatus != null && (
        newModuleStatus.overview   === 'pending' ||
        newModuleStatus.inclusions === 'pending' ||
        newModuleStatus.faqs       === 'pending'
      );
      if (stillPending) {
        setExitDialog('pending');
      } else {
        setExitDialog(null);
        resolveExit();
      }
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setExitSaving(false);
    }
  }, [saveCurrentModule, clearEditState, isActive, resolveExit, setSaveErr]);

  const handleExitDiscard = useCallback(() => {
    clearEditState();
    setExitDialog(null);
    resolveExit();
  }, [clearEditState, resolveExit]);

  // ── Pending-modules exit ────────────────────────────────────────────────────
  const handleExitCloseWithoutSettling = useCallback(() => {
    setExitDialog(null);
    resolveExit();
  }, [resolveExit]);

  const handleExitSettle = useCallback(async () => {
    setExitSaving(true);
    try {
      await settleModules();
      setExitDialog(null);
      resolveExit();
    } finally {
      setExitSaving(false);
    }
  }, [settleModules, resolveExit]);

  return {
    exitDialog, setExitDialog, exitSaving,
    newSvcFields, setNewSvcFields,
    guard, resolveExit, closeBypassingGuard,
    handleExitSaveAndProceed, handleExitDiscard, handleExitSettle, handleExitCloseWithoutSettling,
    handleNewSvcSaveDraft, handleNewSvcTrash,
  };
}

export type ServiceExitFlow = ReturnType<typeof useServiceExitFlow>;
