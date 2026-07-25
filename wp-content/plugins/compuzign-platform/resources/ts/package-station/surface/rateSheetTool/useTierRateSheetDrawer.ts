// The focused Tier's Rate Sheet connection — read/edit scope for the
// `tier-rate-sheet` and `tier-rate-sheet-group` drawers.
//
// It composes two Package-owned readers and adds NO third:
//
//   useRateSheetTool()  — the Rate Sheet collection controller. It supplies the
//                         addressed sheet, its groups and rows, every row/group
//                         edit, and the one Package Manager save. This drawer
//                         adds no editor and no endpoint of its own.
//   usePackageStation() — the addressed Tier instance. It supplies the slot's
//                         own `rate_sheet_id` binding and its selected
//                         `item_id`s, which are the ONLY thing that scopes the
//                         grid.
//
// Resolution fails closed. The sheet is opened by its stored id, never by
// title; the group is looked up by its stored `group_id`, never by label; and if
// the addressed slot no longer binds the addressed sheet, the drawer reports the
// connection as gone rather than showing another sheet's rows.

import { useEffect, useMemo } from 'preact/hooks';
import type { TierRateSheetScope } from '../../drawer/tier-rate-sheet/tierRateSheetDrawerTypes';
import { usePackageStation } from '../../usePackageStation';
import type { PackageRateSheetUnit } from '../../types';
import { useRateSheetTool } from './useRateSheetTool';
import type { RateSheetToolController } from './useRateSheetTool';
import { rateSheetRowsWithKeys } from './rateSheetToolModel';
import type {
  RateSheetEditorGroup,
  RateSheetEditorRow,
  RateSheetEditorValue,
} from './rateSheetToolModel';

export interface TierRateSheetDrawerState {
  loading:   boolean;
  /** A terminal state to render instead of the scope: load failure, or a connection that no longer exists. */
  unavailable: string | null;
  /** The addressed sheet, from the Rate Sheet tool's own working copy. */
  sheet:     RateSheetEditorValue | null;
  /** The addressed group, for a group scope. */
  group:     RateSheetEditorGroup | null;
  /** The focused Tier's connected rows, restricted to the scope. */
  scopedRows: readonly RateSheetEditorRow[];
  /** Every row the focused Tier connects to in this sheet, before the group restriction. */
  connectedRows: readonly RateSheetEditorRow[];
  units:     readonly PackageRateSheetUnit[];
  /** Row and group edit commands, plus save/discard — all the Rate Sheet tool's own. */
  tool:      RateSheetToolController | null;
  dirty:     boolean;
  saving:    boolean;
  saveError: string | null;
}

export function useTierRateSheetDrawer(
  instanceId: string,
  slotId: string,
  rateSheetId: string,
  scope: TierRateSheetScope,
  onMutationComplete: () => void,
): TierRateSheetDrawerState {
  const { items, loading, error } = useRateSheetTool();
  const tool = items[0] ?? null;

  // The Rate Sheet tool already resolved the host Service; reading it back keeps
  // this drawer to one catalogue read rather than a second, competing one.
  const pkg = usePackageStation(tool?.hostServiceId ?? 0, instanceId, onMutationComplete);

  // Address the sheet by its stored id. For a stored sheet the tool's working key
  // IS the `rate_sheet_id`, so this selects exactly the addressed sheet and never
  // matches on title. A save clears the tool's selection, so this also re-opens
  // the same sheet on the refreshed read model.
  useEffect(() => {
    if (tool && tool.selectedKey !== rateSheetId) tool.openSheet(rateSheetId);
  }, [tool, rateSheetId]);

  const view = pkg.tierView(slotId);
  const boundRateSheetId = view?.detail.rate_sheet_id ?? null;
  const selectedItemIds = useMemo(
    () => new Set((view?.detail.rate_sheet_items ?? []).map((selection) => selection.item_id)),
    [view],
  );

  const sheet = tool?.selected?.id === rateSheetId ? tool.selected : null;
  const connectedRows = useMemo(
    () => (sheet ? rateSheetRowsWithKeys(sheet, selectedItemIds) : []),
    [sheet, selectedItemIds],
  );
  const group = useMemo(
    () => (sheet && scope.kind === 'group'
      ? sheet.groups.find((candidate) => candidate.id === scope.groupId) ?? null
      : null),
    [sheet, scope],
  );
  const scopedRows = useMemo(
    () => (scope.kind === 'group'
      ? connectedRows.filter((row) => row.groupId === scope.groupId)
      : connectedRows),
    [connectedRows, scope],
  );

  const stationLoading = tool !== null && tool.hostServiceId !== null && !pkg.detailLoaded;
  const stillLoading = loading || stationLoading;

  let unavailable: string | null = null;
  if (!stillLoading) {
    if (error) unavailable = error;
    else if (tool === null) unavailable = 'The Package Station needs a host Service before its Rate Sheets can be read.';
    else if (sheet === null) unavailable = 'This Rate Sheet is no longer part of the Package Station.';
    else if (boundRateSheetId !== rateSheetId) unavailable = 'This Tier no longer connects to this Rate Sheet.';
    else if (scope.kind === 'group' && group === null) unavailable = 'This Rate Sheet no longer holds this group.';
  }

  return {
    loading: stillLoading,
    unavailable,
    sheet,
    group,
    scopedRows,
    connectedRows,
    units: tool?.units ?? [],
    tool,
    dirty:     tool?.dirty ?? false,
    saving:    tool?.saving ?? false,
    saveError: tool?.saveError ?? null,
  };
}
