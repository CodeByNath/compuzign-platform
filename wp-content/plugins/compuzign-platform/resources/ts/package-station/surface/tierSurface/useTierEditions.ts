// Tier Edition state and mutations — scoped to ONE occupant (tierInstanceId +
// tierId/slot). An Edition is an independently addressed, independently
// lifecycled child record nested inside that occupant, not a TIER_MODULES
// entry and not a second Tier — see docs/code-map/tiers.md and
// PackageSchema's SECTION: TIER_EDITION.
//
// This hook owns only Edition-scoped local state and the seven Edition
// endpoints (create, one consolidated 'overview' module draft/settle/
// revert, the one engine-transition /status endpoint, restore, and guarded
// delete). It does not read or write the parent occupant's own Overview/
// Features/FAQs modules — usePackageStation remains sole authority there.
// There is no default-Edition pointer: the occupant's own declaration is
// the permanent Default and is never represented by a row here.
//
// Every mutation response carries the server's full authoritative Edition
// row (drafts/module_status included), so local state replaces the whole
// row rather than patching drafts separately the way usePackageStation's
// patchModule does for the parent occupant — that narrower patch exists
// there because a module-draft response deliberately omits the occupant's
// other settled fields; an Edition's own response has no such omission.

import { useCallback, useEffect, useState } from 'preact/hooks';
import type { TierEdition, TierEditionBinEntry, TierEditionOverviewDraft } from '../../types';
import {
  createTierEdition,
  saveTierEditionModule,
  settleTierEditionModule,
  revertTierEditionModule,
  updateTierEditionStatus,
  restoreTierEdition,
  deleteTierEdition,
  moveTierEditionToBinCommand,
  restoreTierEditionFromBin,
  trashTierEditionBinEntry,
  deleteTierEditionBinEntry,
} from '../../api';
import { draftPreferredEdition } from '../../drawer/tier/tierEditionModel';

export interface TierEditionsController {
  // Raw editions, as persisted (settled fields only) — existence/id/ordering
  // checks read this directly. Anything DISPLAYED (title, price, selections)
  // must go through editionView() instead, the same draft-preferred/raw
  // split usePackageStation keeps between its own station state and
  // tierView(). Never read a raw row's content fields for presentation.
  editions:           TierEdition[];
  editionBin:         TierEditionBinEntry[];
  // Draft-preferred single-Edition read, mirroring usePackageStation's own
  // tierView(tierId) — a pending drafts.overview always wins over the
  // last-settled content fields, so a just-Saved (not yet Published) Edition
  // displays and re-edits its own fresh draft immediately, exactly like the
  // Tier occupant already does. null for an unknown id.
  editionView:        (editionId: string) => TierEdition | null;
  saving:             boolean;
  error:              string | null;
  create:             (draft: Partial<TierEditionOverviewDraft> & { title: string }) => Promise<TierEdition | null>;
  saveDraft:          (editionId: string, draft: TierEditionOverviewDraft) => Promise<boolean>;
  settle:             (editionId: string) => Promise<boolean>;
  revert:             (editionId: string) => Promise<boolean>;
  publish:            (editionId: string) => Promise<boolean>;
  archive:            (editionId: string) => Promise<boolean>;
  trash:              (editionId: string) => Promise<boolean>;
  disable:            (editionId: string) => Promise<boolean>;
  enable:             (editionId: string) => Promise<boolean>;
  restore:            (editionId: string) => Promise<boolean>;
  remove:             (editionId: string) => Promise<boolean>;
  // Phase 6 — the occupant-owned Edition bin. Deliberately decoupled from
  // archive/trash above: moveToBin only relocates an already archived/
  // trashed Edition, it never itself changes platform_status.
  moveToBin:          (editionId: string) => Promise<boolean>;
  restoreFromBin:     (binId: string) => Promise<boolean>;
  trashBinEntry:      (binId: string) => Promise<boolean>;
  deleteBinEntry:     (binId: string) => Promise<boolean>;
}

/**
 * @param editions          The occupant's current tier_editions[] (from the
 *                          already-loaded SurfaceTierDetail — this hook does
 *                          not fetch independently).
 * @param editionBin        The occupant's current tier_edition_bin[] (Phase 6),
 *                          same already-loaded-detail contract as editions.
 * @param onMutated         Invoked after every successful mutation so the
 *                          owning usePackageStation-backed view re-reads the
 *                          authoritative occupant — the same onRefresh
 *                          contract usePackageStation's own actions use.
 */
export function useTierEditions(
  serviceId:        number,
  tierInstanceId:   string | null,
  tierId:           string | null,
  editions:         TierEdition[],
  editionBin:       TierEditionBinEntry[] = [],
  onMutated?:       () => void,
): TierEditionsController {
  const [localEditions, setLocalEditions] = useState<TierEdition[]>(editions);
  const [localEditionBin, setLocalEditionBin] = useState<TierEditionBinEntry[]>(editionBin);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  useEffect(() => { setLocalEditionBin(editionBin); }, [editionBin]);

  // The caller's editions are the source of truth once the authoritative
  // occupant re-read lands (onMutated's refetch, or a parent navigation to a
  // different occupant); local state only bridges the gap between
  // "mutation succeeded" and that re-read arriving, exactly like
  // usePackageStation's own patch-then-refresh actions.
  useEffect(() => { setLocalEditions(editions); }, [editions]);

  const replaceEdition = useCallback((next: TierEdition) => {
    setLocalEditions((prev) => {
      const idx = prev.findIndex((e) => e.id === next.id);
      if (idx === -1) return [...prev, next];
      const out = prev.slice();
      out[idx] = next;
      return out;
    });
  }, []);

  const editionView = useCallback((editionId: string): TierEdition | null => {
    const edition = localEditions.find((e) => e.id === editionId) ?? null;
    return edition ? draftPreferredEdition(edition) : null;
  }, [localEditions]);

  const removeEdition = useCallback((editionId: string) => {
    setLocalEditions((prev) => prev.filter((e) => e.id !== editionId));
  }, []);

  const run = useCallback(async <T,>(op: () => Promise<T>, onSuccess: (result: T) => boolean): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const result = await op();
      const ok = onSuccess(result);
      if (ok) onMutated?.();
      else setError('The request did not succeed.');
      return ok;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The request failed.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [onMutated]);

  const create = useCallback(async (draft: Partial<TierEditionOverviewDraft> & { title: string }) => {
    if (tierInstanceId === null || tierId === null) return null;
    let created: TierEdition | null = null;
    await run(
      () => createTierEdition(serviceId, tierInstanceId, tierId, draft),
      (res) => {
        if (res.success && res.edition) {
          replaceEdition(res.edition);
          created = res.edition;
          return true;
        }
        return false;
      },
    );
    return created;
  }, [serviceId, tierInstanceId, tierId, run, replaceEdition]);

  const saveDraft = useCallback((editionId: string, draft: TierEditionOverviewDraft) => {
    if (tierInstanceId === null || tierId === null) return Promise.resolve(false);
    return run(
      () => saveTierEditionModule(serviceId, tierInstanceId, tierId, editionId, draft),
      (res) => { if (res.success && res.edition) { replaceEdition(res.edition); return true; } return false; },
    );
  }, [serviceId, tierInstanceId, tierId, run, replaceEdition]);

  const settle = useCallback((editionId: string) => {
    if (tierInstanceId === null || tierId === null) return Promise.resolve(false);
    return run(
      () => settleTierEditionModule(serviceId, tierInstanceId, tierId, editionId),
      (res) => { if (res.success && res.edition) { replaceEdition(res.edition); return true; } return false; },
    );
  }, [serviceId, tierInstanceId, tierId, run, replaceEdition]);

  const revert = useCallback((editionId: string) => {
    if (tierInstanceId === null || tierId === null) return Promise.resolve(false);
    return run(
      () => revertTierEditionModule(serviceId, tierInstanceId, tierId, editionId),
      (res) => { if (res.success && res.edition) { replaceEdition(res.edition); return true; } return false; },
    );
  }, [serviceId, tierInstanceId, tierId, run, replaceEdition]);

  const applyStatus = useCallback((editionId: string, change: Parameters<typeof updateTierEditionStatus>[4]) => {
    if (tierInstanceId === null || tierId === null) return Promise.resolve(false);
    return run(
      () => updateTierEditionStatus(serviceId, tierInstanceId, tierId, editionId, change),
      (res) => { if (res.success && res.edition) { replaceEdition(res.edition); return true; } return false; },
    );
  }, [serviceId, tierInstanceId, tierId, run, replaceEdition]);

  const publish = useCallback((editionId: string) => applyStatus(editionId, { platform_status: 'active' }), [applyStatus]);
  const archive = useCallback((editionId: string) => applyStatus(editionId, { platform_status: 'archived' }), [applyStatus]);
  const trash   = useCallback((editionId: string) => applyStatus(editionId, { platform_status: 'trashed' }),  [applyStatus]);
  const disable = useCallback((editionId: string) => applyStatus(editionId, { action: 'disable' }), [applyStatus]);
  const enable  = useCallback((editionId: string) => applyStatus(editionId, { action: 'enable' }),  [applyStatus]);

  const restoreAction = useCallback((editionId: string) => {
    if (tierInstanceId === null || tierId === null) return Promise.resolve(false);
    return run(
      () => restoreTierEdition(serviceId, tierInstanceId, tierId, editionId),
      (res) => { if (res.success && res.edition) { replaceEdition(res.edition); return true; } return false; },
    );
  }, [serviceId, tierInstanceId, tierId, run, replaceEdition]);

  const remove = useCallback((editionId: string) => {
    if (tierInstanceId === null || tierId === null) return Promise.resolve(false);
    return run(
      () => deleteTierEdition(serviceId, tierInstanceId, tierId, editionId),
      (res) => { if (res.success) { removeEdition(editionId); return true; } return false; },
    );
  }, [serviceId, tierInstanceId, tierId, run, removeEdition]);

  // Phase 6 — every bin mutation's response carries the full authoritative
  // tier_editions[]/tier_edition_bin[] pair (not one patched row), so local
  // state replaces both arrays wholesale, the same full-row-replace contract
  // every action above already uses for a single Edition.
  //
  // Edition lifecycle/Bin UX cleanup — moveToBin now drives the atomic
  // admin-intent command (moveTierEditionToBinCommand), not the narrow
  // "already archived/trashed only" endpoint: the server composes the trash
  // transition and the bin relocation into one request/one persist when the
  // Edition isn't binnable yet, so this is the ONE action the footer needs
  // regardless of the Edition's current status — no frontend branching, no
  // two-request sequence, no partial-failure boundary left exposed here.
  const moveToBin = useCallback((editionId: string) => {
    if (tierInstanceId === null || tierId === null) return Promise.resolve(false);
    return run(
      () => moveTierEditionToBinCommand(serviceId, tierInstanceId, tierId, editionId),
      (res) => {
        if (res.success && res.tier_editions && res.tier_edition_bin) {
          setLocalEditions(res.tier_editions);
          setLocalEditionBin(res.tier_edition_bin);
          return true;
        }
        return false;
      },
    );
  }, [serviceId, tierInstanceId, tierId, run]);

  const restoreFromBin = useCallback((binId: string) => {
    if (tierInstanceId === null || tierId === null) return Promise.resolve(false);
    return run(
      () => restoreTierEditionFromBin(serviceId, tierInstanceId, tierId, binId),
      (res) => {
        if (res.success && res.tier_editions && res.tier_edition_bin) {
          setLocalEditions(res.tier_editions);
          setLocalEditionBin(res.tier_edition_bin);
          return true;
        }
        return false;
      },
    );
  }, [serviceId, tierInstanceId, tierId, run]);

  const trashBinEntry = useCallback((binId: string) => {
    if (tierInstanceId === null || tierId === null) return Promise.resolve(false);
    return run(
      () => trashTierEditionBinEntry(serviceId, tierInstanceId, tierId, binId),
      (res) => {
        if (res.success && res.tier_edition_bin) {
          setLocalEditionBin(res.tier_edition_bin);
          return true;
        }
        return false;
      },
    );
  }, [serviceId, tierInstanceId, tierId, run]);

  const deleteBinEntry = useCallback((binId: string) => {
    if (tierInstanceId === null || tierId === null) return Promise.resolve(false);
    return run(
      () => deleteTierEditionBinEntry(serviceId, tierInstanceId, tierId, binId),
      (res) => {
        if (res.success && res.tier_edition_bin) {
          setLocalEditionBin(res.tier_edition_bin);
          return true;
        }
        return false;
      },
    );
  }, [serviceId, tierInstanceId, tierId, run]);

  return {
    editions: localEditions,
    editionBin: localEditionBin,
    editionView,
    saving,
    error,
    create,
    saveDraft,
    settle,
    revert,
    publish,
    archive,
    trash,
    disable,
    enable,
    restore: restoreAction,
    remove,
    moveToBin,
    restoreFromBin,
    trashBinEntry,
    deleteBinEntry,
  };
}
