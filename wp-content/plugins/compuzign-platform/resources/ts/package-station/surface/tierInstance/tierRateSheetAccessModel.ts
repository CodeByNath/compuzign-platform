// Tier-system Rate Sheet access — pure read/edit/save projection.
//
// `allowed_rate_sheet_ids` belongs to one Tier instance. An empty list means all
// active sheets; an explicit list is limited access. Missing or archived stored
// ids remain visible and removable rather than being silently substituted.

import type { PackageRateSheet, TierInstanceRecord } from '../../types';

export type TierRateSheetAccessStatus = PackageRateSheet['status'] | 'unresolved';

export interface TierRateSheetAccessRow {
  rateSheetId: string;
  title: string;
  status: TierRateSheetAccessStatus;
  allowed: boolean;
}

export interface TierRateSheetAccessProjection {
  unrestricted: boolean;
  activeCount: number;
  allowedCount: number;
  allowedActiveCount: number;
  unresolvedCount: number;
  needsReview: boolean;
  summary: string;
  rows: TierRateSheetAccessRow[];
}

export interface TierRateSheetAccessDraft {
  mode: 'all-active' | 'limited';
  allowedRateSheetIds: string[];
}

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export function projectTierRateSheetAccess(
  record: TierInstanceRecord,
  rateSheets: readonly PackageRateSheet[],
): TierRateSheetAccessProjection {
  const storedIds = uniqueIds(record.allowed_rate_sheet_ids);
  const allowed = new Set(storedIds);
  const unrestricted = storedIds.length === 0;
  const activeSheets = rateSheets.filter((sheet) => sheet.status === 'active');
  const activeIds = new Set(activeSheets.map((sheet) => sheet.rate_sheet_id));
  const byId = new Map(rateSheets.map((sheet) => [sheet.rate_sheet_id, sheet]));
  const activeRows: TierRateSheetAccessRow[] = activeSheets.map((sheet) => ({
      rateSheetId: sheet.rate_sheet_id,
      title: sheet.title.trim() || 'Untitled Rate Sheet',
      status: sheet.status,
      allowed: unrestricted || allowed.has(sheet.rate_sheet_id),
    }));
  const storedRows: TierRateSheetAccessRow[] = storedIds
    .filter((id) => !activeIds.has(id))
    .map((id) => {
      const sheet = byId.get(id);
      return {
        rateSheetId: id,
        title: sheet?.title.trim() || (sheet ? 'Untitled Rate Sheet' : 'Unresolved Rate Sheet'),
        status: sheet?.status ?? 'unresolved',
        allowed: true,
      };
    });
  const rows = [...activeRows, ...storedRows];
  const unresolvedCount = rows.filter((row) => row.status === 'unresolved').length;
  const allowedActiveCount = activeRows.filter((row) => row.allowed).length;
  const allowedCount = unrestricted ? activeSheets.length : storedIds.length;
  const needsReview = activeSheets.length === 0
    || allowedActiveCount === 0
    || unresolvedCount > 0;
  return {
    unrestricted,
    activeCount: activeSheets.length,
    allowedCount,
    allowedActiveCount,
    unresolvedCount,
    needsReview,
    summary: unrestricted
      ? `All ${activeSheets.length} active Rate Sheets`
      : `${allowedActiveCount} active of ${storedIds.length} explicitly allowed`,
    rows,
  };
}

export function tierRateSheetAccessDraft(
  projection: TierRateSheetAccessProjection,
): TierRateSheetAccessDraft {
  return projection.unrestricted
    ? { mode: 'all-active', allowedRateSheetIds: [] }
    : { mode: 'limited', allowedRateSheetIds: projection.rows.filter((row) => row.allowed).map((row) => row.rateSheetId) };
}

export function tierRateSheetAccessPayload(draft: TierRateSheetAccessDraft): string[] {
  return draft.mode === 'all-active' ? [] : uniqueIds(draft.allowedRateSheetIds);
}

export function tierRateSheetAccessIsValid(
  draft: TierRateSheetAccessDraft,
  projection: TierRateSheetAccessProjection,
): boolean {
  if (draft.mode === 'all-active') return true;
  const activeIds = new Set(projection.rows.filter((row) => row.status === 'active').map((row) => row.rateSheetId));
  return tierRateSheetAccessPayload(draft).some((id) => activeIds.has(id));
}

export function tierRateSheetAccessIsDirty(
  draft: TierRateSheetAccessDraft,
  record: TierInstanceRecord,
): boolean {
  const before = uniqueIds(record.allowed_rate_sheet_ids).sort();
  const after = tierRateSheetAccessPayload(draft).sort();
  return before.length !== after.length || before.some((id, index) => id !== after[index]);
}
