import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CategoryOverviewDraft } from '@/api/types/admin';
import { useCategoryStation } from '@/hooks/useCategoryStation';
import type { CategoryServiceCounts } from '@/hooks/useCategoryStation';
import type { DrawerTabId } from '@/drawer-kit/DrawerTabs';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import { categoryServicesModule, evaluateModule } from '@/drawer-kit/utils/moduleNotifications';
import {
  useAutoDismiss,
  useGuardedClose,
  useLifecycleRunner,
  useOutsideClickDismiss,
} from '../shared/drawerChrome';
import type {
  CategoryOverviewShellData,
  CategoryServicesShellData,
} from '../schema/bindings/category';
import type {
  CategoryConfirmDialog,
  CategoryDrawerContentProps,
  CategoryExitDialog,
} from './categoryDrawerTypes';

export function useCategoryDrawerController({
  category,
  assignedServices,
  initialTab,
  initialEdit,
  bridge,
}: CategoryDrawerContentProps) {
  const counts = useMemo<CategoryServiceCounts>(() => {
    const active = assignedServices.filter((service) => service.platform_status === 'active').length;
    return { total: assignedServices.length, active, disabled: assignedServices.length - active };
  }, [assignedServices]);

  const station = useCategoryStation(category, bridge.onMutationComplete, counts);
  const [tab, setTab] = useState<DrawerTabId>(initialTab ?? 'details');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CategoryOverviewDraft | null>(null);
  const [original, setOriginal] = useState<CategoryOverviewDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<CategoryConfirmDialog>(null);
  const [exitDialog, setExitDialog] = useState<CategoryExitDialog>(null);

  useAutoDismiss(saveOk, () => setSaveOk(false), 3000);

  const isDirty = editing && draft !== null && original !== null && (
    draft.name !== original.name
    || draft.description !== original.description
  );

  const openOverviewEditor = useCallback(() => {
    const seed = {
      name: station.displayName,
      description: station.displayDescription,
    };
    setOriginal(seed);
    setDraft(seed);
    setEditing(true);
    setOpenPanel(null);
    setSaveErr(null);
  }, [station.displayDescription, station.displayName]);

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
    if (!draft.name.trim()) {
      setSaveErr('Category name is required.');
      return;
    }
    setSaving(true);
    setSaveErr(null);
    try {
      await station.saveOverview(draft);
      setEditing(false);
      setDraft(null);
      setOriginal(null);
      setSaveOk(true);
    } catch (error) {
      setSaveErr(error instanceof Error ? error.message : 'Could not save the Category Overview.');
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
    'The Category action failed.',
    () => setSplitOpen(false),
  );

  const handleConfirmPublish = useCallback(async () => {
    setConfirmDialog(null);
    // A pending Category addresses no stored term: the footer's Publish is
    // this record's one authoritative creation, not a settle/activate pair
    // against an id that does not exist yet — mirrors Package Family's `'new'`
    // guard on the same action.
    if (!station.category) {
      await runLifecycle(() => station.createCategory());
      return;
    }
    await runLifecycle(station.isActive ? station.settleModules : station.publishCategory);
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
      await runLifecycle(station.trashStation, true);
      return;
    }
    setActionError(null);
    try {
      const deleted = await station.deleteStation();
      if (deleted) {
        setConfirmDialog(null);
        closeBypassingGuard();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The Category could not be deleted.');
    }
  }, [closeBypassingGuard, confirmDialog, runLifecycle, station]);

  const isActive = station.isActive;
  // station.hasSettledOverview, not moduleStatus.overview === 'settled': the
  // transition label alone never distinguished "genuinely new" from
  // "previously published, mid-edit" (createCategory always seeds overview
  // 'pending' too) — see useCategoryStation's hasSettledOverview comment.
  const isNewNeverPublished = station.platformStatus === 'disabled' && !station.hasSettledOverview;
  const hasBeenPublished = isActive || station.hasSettledOverview;
  const canPublish = station.modules.overview.status === 'pending-full' || (isActive && station.hasDraft);

  const overviewBinding: ShellBinding<CategoryOverviewShellData> = {
    data: {
      name: station.displayName,
      description: station.displayDescription,
    },
    state: station.modules.overview,
    hasDraft: station.hasDraft,
    handlers: {
      edit: openOverviewEditor,
      'discard-draft': () => setConfirmDialog('discard'),
    },
  };

  const servicesBinding: ShellBinding<CategoryServicesShellData> = {
    data: {
      services: assignedServices.map((service) => ({ id: service.id, title: service.title })),
      ...counts,
    },
    state: evaluateModule(categoryServicesModule, counts, {
      platformStatus: station.platformStatus,
      platformLabel: 'Category',
    }),
    hasDraft: false,
    handlers: {},
  };

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
    isActive,
    isDisabledMasked: station.isDisabledMasked,
    isNewNeverPublished,
    hasBeenPublished,
    canPublish,
    overviewBinding,
    servicesBinding,
    saveOverview,
    cancelEdit,
    requestClose: bridge.close,
    handleExitDiscard,
    handleConfirmPublish,
    handleConfirmDiscard,
    handleConfirmDestructive,
    handleToggleActive: () => void runLifecycle(station.toggleActive),
    handleArchive: () => void runLifecycle(station.archiveStation, true),
    // Nothing is stored yet for a pending Category: discarding it is simply
    // closing, never a status write against an id that does not exist —
    // mirrors Package Family's `group_id === ''` guard on the same action.
    handleTrash: () => { if (!station.category) { closeBypassingGuard(); return; } setConfirmDialog('trash'); },
    handleRestore: () => void runLifecycle(station.restoreStation),
    handleDelete: () => setConfirmDialog('delete'),
    openPublish: () => setConfirmDialog('publish'),
  };
}

export type CategoryDrawerController = ReturnType<typeof useCategoryDrawerController>;
