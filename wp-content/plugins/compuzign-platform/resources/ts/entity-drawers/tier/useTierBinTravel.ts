// Tier occupant bin travel (engine D4) — archive the open tier's occupant and
// run the bin's restore / trash / delete flows, including the D3 restore
// conflicts (target_occupied → Swap/retarget, origin_unknown → retarget,
// pending_drafts → confirm discard and retry) surfaced through binPrompt.
// The shell never travels; the occupant does. Every mutation goes through the
// authoritative usePackageStation.

import { useState } from 'preact/hooks';
import type { PackageStation } from '@/package-station';
import { useInlineConfirm } from '@/hooks/useInlineConfirm';
import type { TierBinPrompt } from './tierDrawerTypes';

export interface TierBinTravelArgs {
  pkg:           PackageStation;
  editingTierId: string | null;
  // Archive is offered from the footer's split dropdown; a run collapses it and
  // clears any open confirm modal ('archive-discard' is raised on conflict).
  setSplitOpen:    (open: boolean) => void;
  setConfirmModal: (modal: 'publish' | 'archive-discard' | null) => void;
  setSaveErr: (err: string | null) => void;
  setSaveOk:  (ok: boolean) => void;
}

export function useTierBinTravel({
  pkg, editingTierId, setSplitOpen, setConfirmModal, setSaveErr, setSaveOk,
}: TierBinTravelArgs) {
  const [binPrompt, setBinPrompt] = useState<TierBinPrompt | null>(null);
  const binDeleteConfirm = useInlineConfirm<string>();

  const handleArchive = async (discardDrafts = false) => {
    if (!editingTierId) return;
    setSplitOpen(false);
    setConfirmModal(null);
    setSaveErr(null);
    const res = await pkg.archiveTier(editingTierId, discardDrafts);
    if (res?.success) { setSaveOk(true); return; }
    if (res?.code === 'pending_drafts') setConfirmModal('archive-discard');
    else setSaveErr(res?.message ?? 'Archive failed.');
  };

  const handleRestoreBin = async (binId: string, mode?: 'swap' | 'retarget', targetTier?: string, discardDrafts = false) => {
    setSaveErr(null);
    const res = await pkg.restoreOccupant(binId, { mode, targetTier, discardDrafts });
    if (res?.success) { setBinPrompt(null); return; }
    const code = res?.code;
    if (code === 'target_occupied' || code === 'origin_unknown' || code === 'pending_drafts') {
      setBinPrompt({ binId, code, mode, targetTier });
    } else {
      setBinPrompt(null);
      setSaveErr(res?.message ?? 'Restore failed.');
    }
  };

  const handleTrashBin = async (binId: string) => {
    setSaveErr(null);
    const res = await pkg.trashBinEntry(binId);
    if (res && !res.success) setSaveErr(res.message ?? 'Move to Trash failed.');
  };

  const handleDeleteBin = async (binId: string) => {
    binDeleteConfirm.cancel();
    setSaveErr(null);
    const res = await pkg.deleteBinEntry(binId);
    if (res && !res.success) setSaveErr(res.message ?? 'Delete failed.');
  };

  return {
    binPrompt, setBinPrompt, binDeleteConfirm,
    handleArchive, handleRestoreBin, handleTrashBin, handleDeleteBin,
  };
}

export type TierBinTravel = ReturnType<typeof useTierBinTravel>;
