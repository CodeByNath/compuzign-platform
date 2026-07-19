import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CategoryOverviewDraft } from '@/api/types/admin';
import { fetchAdminServiceCategoryGroups } from '@/api/endpoints/admin';
import { useApi } from '@/hooks/useApi';
import { useCategoryStation } from '@/hooks/useCategoryStation';
import type { CategoryServiceCounts } from '@/hooks/useCategoryStation';
import type { DrawerTabId } from '@/drawer-kit/DrawerTabs';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import { categoryServicesModule, evaluateModule } from '@/drawer-kit/utils/moduleNotifications';
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
  const groupsApi = useApi(() => fetchAdminServiceCategoryGroups());
  const [tab, setTab] = useState<DrawerTabId>(initialTab ?? 'details');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CategoryOverviewDraft | null>(null);
  const [original, setOriginal] = useState<CategoryOverviewDraft | null>(null);
  const [groupId, setGroupId] = useState<number | null>(category.group_id);
  const [groupIdOriginal, setGroupIdOriginal] = useState<number | null>(category.group_id);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<CategoryConfirmDialog>(null);
  const [exitDialog, setExitDialog] = useState<CategoryExitDialog>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setGroupId(station.category.group_id);
      setGroupIdOriginal(station.category.group_id);
    }
  }, [editing, station.category.group_id]);

  useEffect(() => {
    if (!saveOk) return;
    const timeout = setTimeout(() => setSaveOk(false), 3000);
    return () => clearTimeout(timeout);
  }, [saveOk]);

  const isDirty = editing && draft !== null && original !== null && (
    draft.name !== original.name
    || draft.description !== original.description
    || groupId !== groupIdOriginal
  );

  const groupName = useMemo(() => {
    if (groupId === null) return 'Ungrouped';
    return groupsApi.data?.category_groups.find((group) => group.id === groupId)?.name ?? 'Ungrouped';
  }, [groupId, groupsApi.data]);

  const openOverviewEditor = useCallback(() => {
    const seed = {
      name: station.category.name,
      description: station.category.description,
    };
    setOriginal(seed);
    setDraft(seed);
    setGroupIdOriginal(groupId);
    setEditing(true);
    setOpenPanel(null);
    setSaveErr(null);
  }, [groupId, station.category.description, station.category.name]);

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
    setGroupId(groupIdOriginal);
    setSaveErr(null);
    setSaving(false);
  }, [groupIdOriginal]);

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
      if (groupId !== groupIdOriginal) {
        await station.updateGroupMembership(groupId);
        setGroupIdOriginal(groupId);
      }
      setEditing(false);
      setDraft(null);
      setOriginal(null);
      setSaveOk(true);
    } catch (error) {
      setSaveErr(error instanceof Error ? error.message : 'Could not save the Category Overview.');
    } finally {
      setSaving(false);
    }
  }, [draft, groupId, groupIdOriginal, station]);

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
      setActionError(error instanceof Error ? error.message : 'The Category action failed.');
    }
  }, [closeBypassingGuard]);

  const handleConfirmPublish = useCallback(async () => {
    setConfirmDialog(null);
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
  const isNewNeverPublished = station.platformStatus === 'disabled' && station.moduleStatus.overview !== 'settled';
  const hasBeenPublished = isActive || station.moduleStatus.overview === 'settled';
  const canPublish = station.modules.overview.status === 'pending-full' || (isActive && station.hasDraft);

  const overviewBinding: ShellBinding<CategoryOverviewShellData> = {
    data: {
      name: station.category.name,
      slug: station.category.slug,
      description: station.category.description,
      groupName,
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
    groupsApi,
    tab,
    selectTab,
    editing,
    draft,
    setDraft,
    groupId,
    setGroupId,
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
    handleTrash: () => setConfirmDialog('trash'),
    handleRestore: () => void runLifecycle(station.restoreStation),
    handleDelete: () => setConfirmDialog('delete'),
    openPublish: () => setConfirmDialog('publish'),
  };
}

export type CategoryDrawerController = ReturnType<typeof useCategoryDrawerController>;
