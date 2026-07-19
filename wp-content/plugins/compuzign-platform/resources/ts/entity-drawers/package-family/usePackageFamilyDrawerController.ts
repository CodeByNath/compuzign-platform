import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { DrawerTabId } from '@/drawer-kit/DrawerTabs';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import { usePackageFamilyStation } from '@/hooks/usePackageFamilyStation';
import type { PackageFamilyOverviewDraft } from '@/hooks/usePackageFamilyStation';
import type {
  PackageFamilyOverviewShellData,
  PackageFamilyRelationshipsShellData,
} from '../schema/bindings/packageFamily';
import type {
  PackageFamilyConfirmDialog,
  PackageFamilyDrawerContentProps,
  PackageFamilyExitDialog,
} from './packageFamilyDrawerTypes';

export function usePackageFamilyDrawerController({
  family,
  initialTab,
  initialEdit,
  bridge,
}: PackageFamilyDrawerContentProps) {
  const station = usePackageFamilyStation(family, bridge.onMutationComplete);
  const [tab, setTab] = useState<DrawerTabId>(initialTab ?? 'details');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PackageFamilyOverviewDraft | null>(null);
  const [original, setOriginal] = useState<PackageFamilyOverviewDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<PackageFamilyConfirmDialog>(null);
  const [exitDialog, setExitDialog] = useState<PackageFamilyExitDialog>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!saveOk) return;
    const timeout = setTimeout(() => setSaveOk(false), 3000);
    return () => clearTimeout(timeout);
  }, [saveOk]);

  const isDirty = editing && draft !== null && original !== null
    && (draft.name !== original.name || draft.description !== original.description);

  const openOverviewEditor = useCallback(() => {
    const seed = { name: station.family.label, description: station.family.description };
    setDraft(seed);
    setOriginal(seed);
    setEditing(true);
    setOpenPanel(null);
    setSaveErr(null);
  }, [station.family.description, station.family.label]);

  const initialEditOpened = useRef(false);
  useEffect(() => {
    if (!initialEdit || initialEditOpened.current) return;
    initialEditOpened.current = true;
    openOverviewEditor();
  }, [initialEdit, openOverviewEditor]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDraft(null);
    setOriginal(null);
    setSaveErr(null);
    setSaving(false);
  }, []);

  const saveOverview = useCallback(async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setSaveErr('Package Family name is required.');
      return;
    }
    setSaving(true);
    setSaveErr(null);
    try {
      await station.saveOverview({ name, description: draft.description });
      setEditing(false);
      setDraft(null);
      setOriginal(null);
      setSaveOk(true);
    } catch (error) {
      setSaveErr(error instanceof Error ? error.message : 'Could not save the Family Overview.');
    } finally {
      setSaving(false);
    }
  }, [draft, station]);

  const bypassRef = useRef(false);
  const pendingContinuationRef = useRef<null | (() => void)>(null);
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;

  const evaluateExit = useCallback(() => {
    if (bypassRef.current || !dirtyRef.current) return true;
    setExitDialog('unsaved');
    return false;
  }, []);

  useEffect(() => {
    bridge.setCloseGuard(() => {
      const allowed = evaluateExit();
      if (!allowed) pendingContinuationRef.current = bridge.close;
      return allowed;
    });
    return () => bridge.setCloseGuard(null);
  }, [bridge, evaluateExit]);

  const selectTab = useCallback((next: DrawerTabId) => {
    if (evaluateExit()) setTab(next);
    else pendingContinuationRef.current = () => setTab(next);
  }, [evaluateExit]);

  const resolveExit = useCallback(() => {
    bypassRef.current = true;
    const continuation = pendingContinuationRef.current;
    pendingContinuationRef.current = null;
    continuation?.();
    bypassRef.current = false;
  }, []);

  const closeBypassingGuard = useCallback(() => {
    bypassRef.current = true;
    bridge.close();
  }, [bridge]);

  const handleExitDiscard = useCallback(() => {
    cancelEdit();
    setExitDialog(null);
    resolveExit();
  }, [cancelEdit, resolveExit]);

  useEffect(() => {
    if (!splitOpen) return;
    const close = () => setSplitOpen(false);
    const timeout = setTimeout(() => document.addEventListener('click', close), 0);
    return () => { clearTimeout(timeout); document.removeEventListener('click', close); };
  }, [splitOpen]);

  const runLifecycle = useCallback(async (operation: () => Promise<unknown>, closeAfter = false) => {
    setSplitOpen(false);
    setActionError(null);
    try {
      const result = await operation();
      if (result && closeAfter) closeBypassingGuard();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The Package Family action failed.');
    }
  }, [closeBypassingGuard]);

  const handleConfirmPublish = useCallback(async () => {
    setConfirmDialog(null);
    await runLifecycle(station.isActive ? station.settleOverview : station.publishFamily);
  }, [runLifecycle, station]);

  const handleConfirmDiscard = useCallback(async () => {
    setConfirmDialog(null);
    await runLifecycle(station.revertOverview);
  }, [runLifecycle, station.revertOverview]);

  const handleConfirmDestructive = useCallback(async () => {
    const action = confirmDialog;
    if (action !== 'trash' && action !== 'delete') return;
    if (action === 'trash') {
      setConfirmDialog(null);
      await runLifecycle(station.trashFamily, true);
      return;
    }
    setActionError(null);
    try {
      const deleted = await station.deleteFamily();
      if (deleted) {
        setConfirmDialog(null);
        closeBypassingGuard();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The Package Family could not be deleted.');
    }
  }, [closeBypassingGuard, confirmDialog, runLifecycle, station]);

  const isNewNeverPublished = station.platformStatus === 'disabled'
    && station.family.module_status.overview !== 'settled';
  const hasBeenPublished = station.isActive || station.family.module_status.overview === 'settled';
  const canPublish = station.modules.overview.status === 'pending-full'
    || (station.isActive && station.hasDraft);

  const overviewBinding: ShellBinding<PackageFamilyOverviewShellData> = {
    data: {
      groupId: station.family.group_id,
      name: station.family.label,
      description: station.family.description,
    },
    state: station.modules.overview,
    hasDraft: station.hasDraft,
    handlers: {
      edit: openOverviewEditor,
      'discard-draft': () => setConfirmDialog('discard'),
    },
  };

  const relationshipsBinding: ShellBinding<PackageFamilyRelationshipsShellData> = {
    data: station.relationshipData,
    state: station.modules.relationships,
    hasDraft: false,
    handlers: {},
  };

  const dependentsSummary = [
    `${station.relationshipData.services} Services`,
    `${station.relationshipData.rateSheetRows} Rate Sheet rows`,
    `${station.relationshipData.tierSelections} Tier selections`,
  ].join(' · ');

  return {
    station,
    tab,
    selectTab,
    editing,
    draft,
    setDraft,
    saving,
    saveErr,
    saveOk,
    isDirty,
    openPanel,
    setOpenPanel,
    splitOpen,
    setSplitOpen,
    confirmDialog,
    setConfirmDialog,
    exitDialog,
    setExitDialog,
    actionError,
    isNewNeverPublished,
    hasBeenPublished,
    canPublish,
    overviewBinding,
    relationshipsBinding,
    dependentsSummary,
    saveOverview,
    cancelEdit,
    requestClose: bridge.close,
    handleExitDiscard,
    handleConfirmPublish,
    handleConfirmDiscard,
    handleConfirmDestructive,
    handleToggleActive: () => void runLifecycle(station.toggleActive),
    handleArchive: () => void runLifecycle(station.archiveFamily, true),
    handleTrash: () => setConfirmDialog('trash'),
    handleRestore: () => void runLifecycle(station.restoreFamily),
    handleDelete: () => setConfirmDialog('delete'),
    openPublish: () => setConfirmDialog('publish'),
  };
}

export type PackageFamilyDrawerController = ReturnType<typeof usePackageFamilyDrawerController>;
