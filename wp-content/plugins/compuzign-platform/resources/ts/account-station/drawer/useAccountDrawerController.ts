// Account drawer controller — coordination layer, mirroring
// usePackageFamilyDrawerController at Account's much smaller scale: one
// module (Brand), no travel actions, no numeric/string record id.

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { DrawerTabId } from '@/drawer-kit/DrawerTabs';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import { useAccountStation } from '../useAccountStation';
import {
  useAutoDismiss,
  useGuardedClose,
  useLifecycleRunner,
  useOutsideClickDismiss,
} from '@/entity-drawers/shared/drawerChrome';
import type { AccountBrandShellData } from './schema/bindings/account';
import type { AccountDrawerContentProps, AccountExitDialog } from './accountDrawerTypes';
import type { AccountBrandDraft } from './editors/AccountBrandEditor';

export function useAccountDrawerController({ account, initialTab, initialEdit, bridge }: AccountDrawerContentProps) {
  const station = useAccountStation(account, bridge.onMutationComplete);
  const [tab, setTab] = useState<DrawerTabId>(initialTab ?? 'details');
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AccountBrandDraft | null>(null);
  const [original, setOriginal] = useState<AccountBrandDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [exitDialog, setExitDialog] = useState<AccountExitDialog>(null);

  useAutoDismiss(saveOk, () => setSaveOk(false), 3000);
  useOutsideClickDismiss(splitOpen, () => setSplitOpen(false));

  const isDirty = editing && draft !== null && original !== null && (
    draft.name !== original.name
    || draft.code !== original.code
    || draft.logo_attachment_id !== original.logo_attachment_id
    || draft.favicon_attachment_id !== original.favicon_attachment_id
  );

  const openBrandEditor = useCallback(() => {
    // Draft-preferred: a saved-but-not-yet-settled Brand draft edits further
    // rather than restarting from the stale canonical value.
    const source = station.detail.drafts.brand ?? station.detail.brand;
    const seed: AccountBrandDraft = {
      name: source.name,
      code: source.code,
      logo_attachment_id: source.logo_attachment_id,
      favicon_attachment_id: source.favicon_attachment_id,
    };
    setDraft(seed);
    setOriginal(seed);
    setEditing(true);
    setOpenPanel(null);
    setSaveErr(null);
  }, [station.detail.brand, station.detail.drafts.brand]);

  const initialEditOpened = useRef(false);
  useEffect(() => {
    if (!initialEdit || initialEditOpened.current) return;
    initialEditOpened.current = true;
    openBrandEditor();
  }, [initialEdit, openBrandEditor]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDraft(null);
    setOriginal(null);
    setSaveErr(null);
    setSaving(false);
  }, []);

  const saveBrand = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setSaveErr(null);
    try {
      await station.saveBrand(draft);
      setEditing(false);
      setDraft(null);
      setOriginal(null);
      setSaveOk(true);
    } catch (error) {
      setSaveErr(error instanceof Error ? error.message : 'Could not save the Account Profile Brand.');
    } finally {
      setSaving(false);
    }
  }, [draft, station]);

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

  const { actionError, setActionError, run: runLifecycle } = useLifecycleRunner(
    closeBypassingGuard,
    'The Account Profile action failed.',
    () => setSplitOpen(false),
  );

  // Already-active: a new Save created a draft without re-addressing the
  // status route (which 422s on an already-active record — only a disabled
  // Account Profile can be published). Settle promotes it without Publish.
  const handleConfirmPublish = useCallback(async () => {
    setShowPublishModal(false);
    await runLifecycle(station.isActive ? station.settleBrand : station.publish);
  }, [runLifecycle, station]);

  const brandBinding: ShellBinding<AccountBrandShellData> = {
    data: {
      platformId: station.detail.nodes.profile.platformId,
      bootstrapped: station.detail.bootstrapped,
      name: station.detail.drafts.brand?.name ?? station.detail.brand.name,
      code: station.detail.drafts.brand?.code ?? station.detail.brand.code,
      logo_attachment_id: station.detail.drafts.brand?.logo_attachment_id ?? station.detail.brand.logo_attachment_id,
      favicon_attachment_id: station.detail.drafts.brand?.favicon_attachment_id ?? station.detail.brand.favicon_attachment_id,
    },
    state: station.modules.brand,
    hasDraft: station.hasDraft,
    handlers: { edit: openBrandEditor },
  };

  return {
    station,
    tab, selectTab,
    openPanel, togglePanel: (m: string) => setOpenPanel((p) => (p === m ? null : m)),
    brandBinding,
    editing, draft, setDraft, original,
    isDirty, saving, saveErr, saveOk,
    openBrandEditor, saveBrand, cancelEdit,
    splitOpen, setSplitOpen,
    actionError,
    showPublishModal, setShowPublishModal,
    openPublishModal: () => setShowPublishModal(true),
    handleConfirmPublish,
    exitDialog, setExitDialog, handleExitDiscard,
    requestClose: bridge.close,
    handleToggleActive: () => { setActionError(null); void runLifecycle(station.toggleActive); },
  };
}

export type AccountDrawerController = ReturnType<typeof useAccountDrawerController>;
