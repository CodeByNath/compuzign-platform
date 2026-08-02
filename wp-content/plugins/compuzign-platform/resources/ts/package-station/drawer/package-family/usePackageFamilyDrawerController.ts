import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { DrawerTabId } from '@/drawer-kit/DrawerTabs';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import { usePackageFamilyStation } from '../../usePackageFamilyStation';
import type { PackageFamilyOverviewDraft } from '../../usePackageFamilyStation';
import {
  useAutoDismiss,
  useGuardedClose,
  useLifecycleRunner,
  useOutsideClickDismiss,
} from '@/entity-drawers/shared/drawerChrome';
import type {
  PackageFamilyCapabilitiesShellData,
  PackageFamilyOverviewShellData,
  PackageFamilyRelationshipsShellData,
} from '../schema/bindings/packageFamily';
import { evaluateModule, packageFamilyCapabilitiesModule } from '@/drawer-kit/utils/moduleNotifications';
import { usePackageFamilyCapabilities } from '../../surface/packageFamily/usePackageFamilyCapabilities';
import type {
  PackageFamilyConfirmDialog,
  PackageFamilyDrawerContentProps,
  PackageFamilyExitDialog,
} from './packageFamilyDrawerTypes';

export function derivePackageFamilyFooterState(
  family: { group_id: string; platform_status: string; module_status: { overview: string } },
  overviewStatus: string,
  hasDraft: boolean,
) {
  const isActive = family.platform_status === 'active';
  return {
    // Category establishes the reference grammar: once Overview Save has
    // issued a native identity, the record is no longer the local-new drawer,
    // even though its raw storage status remains disabled/Pending.
    isNewNeverPublished: family.group_id === '',
    // Match Category's existing footer archive gate. No Package-only stored
    // lifecycle-history field is introduced by this migration.
    hasBeenPublished: isActive || family.module_status.overview === 'settled',
    canPublish: family.group_id !== ''
      && (overviewStatus === 'pending-full' || (isActive && hasDraft)),
  };
}

export function usePackageFamilyDrawerController({
  family,
  initialTab,
  initialEdit,
  onManageTierSystem,
  bridge,
}: PackageFamilyDrawerContentProps) {
  const station = usePackageFamilyStation(family, bridge.onMutationComplete);
  const capabilities = usePackageFamilyCapabilities(station.family, bridge.onMutationComplete);
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

  useAutoDismiss(saveOk, () => setSaveOk(false), 3000);

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

  // Guarded exit: a dirty overview editor raises the 'unsaved' dialog; the
  // shared machinery stashes the blocked close/tab-switch continuation.
  const { guard, resolveExit, closeBypassingGuard } = useGuardedClose(bridge, () => {
    if (!isDirty) return true;
    setExitDialog('unsaved');
    return false;
  });

  const selectTab = useCallback((next: DrawerTabId) => {
    guard(() => setTab(next));
  }, [guard]);

  const handleExitDiscard = useCallback(() => {
    cancelEdit();
    setExitDialog(null);
    resolveExit();
  }, [cancelEdit, resolveExit]);

  useOutsideClickDismiss(splitOpen, () => setSplitOpen(false));

  const { actionError, setActionError, run: runLifecycle } = useLifecycleRunner(
    closeBypassingGuard,
    'The Package Family action failed.',
    () => setSplitOpen(false),
  );

  const handleConfirmPublish = useCallback(async () => {
    setConfirmDialog(null);
    // Publish never establishes identity. Complete Overview Save must already
    // have returned the real Package-owned Family record.
    if (station.family.group_id === '') return;
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

  const { isNewNeverPublished, hasBeenPublished, canPublish } = derivePackageFamilyFooterState(
    station.family,
    station.modules.overview.status,
    station.hasDraft,
  );

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

  const capabilitiesBinding: ShellBinding<PackageFamilyCapabilitiesShellData> = {
    data: capabilities.data,
    state: capabilities.loading
      ? { status: 'loading', notes: [] }
      : evaluateModule(packageFamilyCapabilitiesModule, capabilities.data, {
        platformStatus: station.platformStatus,
        platformLabel: 'Package Family',
        disabled: station.isDisabledMasked,
        }),
    hasDraft: false,
    busy: capabilities.busy ?? capabilities.removeConfirm.busyId,
    handlers: {
      'add-tier-capability': async () => { await capabilities.addTier(); },
      'open-tier-tool': () => {
        const instanceId = capabilities.instance?.tier_instance_id;
        capabilities.openTier();
        bridge.close();
        if (instanceId) onManageTierSystem?.(instanceId);
      },
      'remove-tier-capability': capabilities.requestRemoveTier,
    },
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
    isDisabledMasked: station.isDisabledMasked,
    hasBeenPublished,
    canPublish,
    overviewBinding,
    relationshipsBinding,
    capabilitiesBinding,
    capabilities,
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
    // isNewNeverPublished offers this action as "Move to Trash" (the
    // CanonicalEntityFooter split's danger primary). Nothing is stored yet for
    // a `group_id`-less family, so discarding it is simply closing — never a
    // status write against an id that does not exist.
    handleTrash: () => {
      if (station.family.group_id === '') { closeBypassingGuard(); return; }
      setConfirmDialog('trash');
    },
    handleRestore: () => void runLifecycle(station.restoreFamily),
    handleDelete: () => setConfirmDialog('delete'),
    openPublish: () => setConfirmDialog('publish'),
  };
}

export type PackageFamilyDrawerController = ReturnType<typeof usePackageFamilyDrawerController>;
