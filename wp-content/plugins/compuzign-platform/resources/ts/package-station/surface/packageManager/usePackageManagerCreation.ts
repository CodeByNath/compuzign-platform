// Package Manager — atomic creation of the pool records Settings can create.
//
// One record per call, and nothing else. Creating a Package Family does not mint
// or assign a Tier system; creating a Rate Sheet does not grant a Tier access to
// it or seed it with groups; creating a group does not connect it to a Tier. Each
// function returns the record the backend actually stored, identified by the id
// the backend actually minted, so a caller can select what it just created
// without re-reading a label.
//
// It adds no endpoint, no storage and no id minting:
//   - Families go through the existing `createPackageFamily` route.
//   - Rate Sheets and groups are edits to the ONE Package Manager document, mapped
//     by the Rate Sheet tool's pure model and committed through the same
//     `savePackageStationManager` partial-upsert contract that tool uses. The
//     backend mints `rs_…`; `createEditorGroup` mints `rate_group_…` exactly as
//     the tool's own Create Group does.
//
// Tier systems are absent here on purpose: `useTierInstances.createInstance`
// already owns that mutation, and wrapping it would only add a second name for
// the same write.
//
// The Package Manager is addressed by a host-Service id (there is no standalone
// manager route) — the same host the Tier workspace already resolved. A null host
// or an unloaded manager makes the sheet and group functions no-ops rather than
// guesses.

import { useCallback, useState } from 'preact/hooks';
import { createPackageFamily, savePackageStationManager } from '../../api';
import type {
  PackageFamilyItem,
  PackageManagerGroup,
  PackageManagerReadModel,
  PackageRateSheet,
} from '../../types';
import {
  buildManagerSavePayload,
  createEditorGroup,
  createEditorSheet,
  toRateSheetEditorList,
} from '../rateSheetTool/rateSheetToolModel';

export interface PackageManagerCreationState {
  saving: boolean;
  error:  string | null;
  /** Creates the Family only. It joins the Family pool unassigned and unconnected. */
  createFamily:    (name: string, description: string) => Promise<PackageFamilyItem | null>;
  /** Creates the sheet only. No Tier is granted access and no group is seeded. */
  createRateSheet: (title: string) => Promise<PackageRateSheet | null>;
  /** Creates the group inside the sheet that stores it. It binds to no Tier. */
  createGroup:     (rateSheetId: string, label: string) => Promise<PackageManagerGroup | null>;
}

interface Input {
  hostServiceId:  number | null;
  manager:        PackageManagerReadModel | null;
  /** Hands back the saved manager so the surface re-reads the authoritative pool. */
  onManagerSaved: (manager: PackageManagerReadModel) => void;
  /** Signals that the Family pool changed and must be re-read. */
  onFamilyCreated: () => void;
}

export function usePackageManagerCreation({
  hostServiceId,
  manager,
  onManagerSaved,
  onFamilyCreated,
}: Input): PackageManagerCreationState {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const createFamily = useCallback(async (
    name: string,
    description: string,
  ): Promise<PackageFamilyItem | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    setSaving(true);
    setError(null);
    try {
      const response = await createPackageFamily({ name: trimmed, description: description.trim() });
      if (!response.success || response.group === null) {
        setError(response.message || 'Could not create the Package Family.');
        return null;
      }
      onFamilyCreated();
      return response.group;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the Package Family.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [onFamilyCreated]);

  /**
   * Commit one edited sheet collection and hand back the saved manager. The
   * payload is rebuilt from the loaded read model, so everything the caller did
   * not touch round-trips unchanged — this is the Rate Sheet tool's own save,
   * without its editor.
   */
  const commit = useCallback(async (
    sheets: ReturnType<typeof toRateSheetEditorList>,
    failure: string,
  ): Promise<PackageManagerReadModel | null> => {
    if (manager === null || hostServiceId === null) return null;
    setSaving(true);
    setError(null);
    try {
      const response = await savePackageStationManager(
        hostServiceId,
        buildManagerSavePayload(manager, sheets, [], manager.sources),
      );
      if (!response.success) {
        setError(response.message || failure);
        return null;
      }
      onManagerSaved(response.manager);
      return response.manager;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : failure);
      return null;
    } finally {
      setSaving(false);
    }
  }, [hostServiceId, manager, onManagerSaved]);

  const createRateSheet = useCallback(async (title: string): Promise<PackageRateSheet | null> => {
    const trimmed = title.trim();
    if (!trimmed || manager === null) return null;
    // The backend mints `rs_…` on save, so the created sheet is the one id the
    // saved collection holds that the loaded one did not. Never matched by title:
    // two sheets may legitimately share a title, and a title is not identity.
    const before = new Set(manager.rate_sheets.map((sheet) => sheet.rate_sheet_id));
    const saved = await commit(
      [...toRateSheetEditorList(manager), createEditorSheet(trimmed)],
      'Could not create the Rate Sheet.',
    );
    return saved?.rate_sheets.find((sheet) => !before.has(sheet.rate_sheet_id)) ?? null;
  }, [commit, manager]);

  const createGroup = useCallback(async (
    rateSheetId: string,
    label: string,
  ): Promise<PackageManagerGroup | null> => {
    const trimmed = label.trim();
    if (!trimmed || manager === null) return null;
    const sheets = toRateSheetEditorList(manager);
    const target = sheets.find((sheet) => sheet.id === rateSheetId);
    if (!target) {
      setError('That Rate Sheet is no longer stored.');
      return null;
    }
    // `createEditorGroup` mints the `rate_group_…` id client-side, exactly as the
    // Rate Sheet tool does, so the id to look for after the save is already known.
    const edited = createEditorGroup(target, trimmed);
    const created = edited.groups[edited.groups.length - 1];
    if (!created || target.groups.some((group) => group.id === created.id)) return null;
    const saved = await commit(
      sheets.map((sheet) => (sheet.id === rateSheetId ? edited : sheet)),
      'Could not create the group.',
    );
    return saved?.rate_sheets
      .find((sheet) => sheet.rate_sheet_id === rateSheetId)?.groups
      .find((group) => group.group_id === created.id) ?? null;
  }, [commit, manager]);

  return { saving, error, createFamily, createRateSheet, createGroup };
}
