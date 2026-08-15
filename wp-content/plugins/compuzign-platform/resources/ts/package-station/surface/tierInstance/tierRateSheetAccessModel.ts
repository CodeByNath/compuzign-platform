// Tier-system Rate Sheet access — pure read/edit/save projection.
// Parent access uses `rate_sheet_id`; nested access uses the exact
// `(rate_sheet_id, group_id)` pair. Empty lists are explicit, never grants.

import type { PackageRateSheet, TierInstanceRecord, TierRateSheetGroupAccess } from '../../types';

export type TierRateSheetAccessStatus = PackageRateSheet['status'] | 'unresolved';
export interface TierRateSheetAccessGroupRow { accessKey: string; rateSheetId: string; groupId: string; title: string; allowed: boolean; resolved: boolean; }
export interface TierRateSheetAccessRow { rateSheetId: string; title: string; status: TierRateSheetAccessStatus; allowed: boolean; groups: TierRateSheetAccessGroupRow[]; }
export interface TierRateSheetAccessProjection {
  activeCount: number; allowedCount: number; allowedActiveCount: number; allowedGroupCount: number;
  unresolvedCount: number; unresolvedGroupCount: number; needsReview: boolean; summary: string;
  rows: TierRateSheetAccessRow[];
}
export interface TierRateSheetAccessDraft { allowedRateSheetIds: string[]; allowedRateSheetGroups: TierRateSheetGroupAccess[]; }

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export function tierRateSheetGroupAccessKey(rateSheetId: string, groupId: string): string {
  return `group:${encodeURIComponent(rateSheetId)}:${encodeURIComponent(groupId)}`;
}

function uniqueGroupAccess(groups: readonly TierRateSheetGroupAccess[]): TierRateSheetGroupAccess[] {
  const seen = new Set<string>();
  return groups.flatMap((group) => {
    const rateSheetId = group.rate_sheet_id.trim();
    const groupId = group.group_id.trim();
    const key = tierRateSheetGroupAccessKey(rateSheetId, groupId);
    if (!rateSheetId || !groupId || seen.has(key)) return [];
    seen.add(key);
    return [{ rate_sheet_id: rateSheetId, group_id: groupId }];
  });
}

export function projectTierRateSheetAccess(record: TierInstanceRecord, rateSheets: readonly PackageRateSheet[]): TierRateSheetAccessProjection {
  const storedIds = uniqueIds(record.allowed_rate_sheet_ids);
  const storedGroups = uniqueGroupAccess(record.allowed_rate_sheet_groups ?? []);
  const allowed = new Set(storedIds);
  const allowedGroups = new Set(storedGroups.map((group) => tierRateSheetGroupAccessKey(group.rate_sheet_id, group.group_id)));
  const activeSheets = rateSheets.filter((sheet) => sheet.status === 'active');
  const activeIds = new Set(activeSheets.map((sheet) => sheet.rate_sheet_id));
  const byId = new Map(rateSheets.map((sheet) => [sheet.rate_sheet_id, sheet]));
  const projectGroups = (sheet: PackageRateSheet | undefined, rateSheetId: string): TierRateSheetAccessGroupRow[] => {
    const knownIds = new Set(sheet?.groups.map((group) => group.group_id) ?? []);
    const known = (sheet?.groups ?? []).map((group) => ({
      accessKey: tierRateSheetGroupAccessKey(rateSheetId, group.group_id), rateSheetId, groupId: group.group_id,
      title: group.label.trim() || 'Untitled Group', allowed: allowedGroups.has(tierRateSheetGroupAccessKey(rateSheetId, group.group_id)), resolved: true,
    }));
    const unresolved = storedGroups.filter((group) => group.rate_sheet_id === rateSheetId && !knownIds.has(group.group_id)).map((group) => ({
      accessKey: tierRateSheetGroupAccessKey(rateSheetId, group.group_id), rateSheetId, groupId: group.group_id,
      title: 'Unresolved Group', allowed: true, resolved: false,
    }));
    return [...known, ...unresolved];
  };
  const activeRows: TierRateSheetAccessRow[] = activeSheets.map((sheet) => ({
    rateSheetId: sheet.rate_sheet_id, title: sheet.title.trim() || 'Untitled Rate Sheet', status: sheet.status,
    allowed: allowed.has(sheet.rate_sheet_id), groups: projectGroups(sheet, sheet.rate_sheet_id),
  }));
  const storedRows: TierRateSheetAccessRow[] = storedIds.filter((id) => !activeIds.has(id)).map((id) => {
    const sheet = byId.get(id);
    return { rateSheetId: id, title: sheet?.title.trim() || (sheet ? 'Untitled Rate Sheet' : 'Unresolved Rate Sheet'),
      status: sheet?.status ?? 'unresolved', allowed: true, groups: projectGroups(sheet, id) };
  });
  const rows = [...activeRows, ...storedRows];
  const unresolvedCount = rows.filter((row) => row.status === 'unresolved').length;
  const unresolvedGroupCount = rows.flatMap((row) => row.groups).filter((group) => group.allowed && !group.resolved).length;
  const allowedActiveCount = activeRows.filter((row) => row.allowed).length;
  return {
    activeCount: activeSheets.length, allowedCount: storedIds.length, allowedActiveCount, allowedGroupCount: storedGroups.length,
    unresolvedCount, unresolvedGroupCount, needsReview: unresolvedCount + unresolvedGroupCount > 0,
    summary: storedIds.length === 0 ? 'No Rate Sheets allowed yet' : `${allowedActiveCount} active of ${storedIds.length} explicitly allowed`, rows,
  };
}

export function tierRateSheetAccessDraft(projection: TierRateSheetAccessProjection): TierRateSheetAccessDraft {
  return {
    allowedRateSheetIds: projection.rows.filter((row) => row.allowed).map((row) => row.rateSheetId),
    allowedRateSheetGroups: projection.rows.flatMap((row) => row.groups).filter((group) => group.allowed)
      .map((group) => ({ rate_sheet_id: group.rateSheetId, group_id: group.groupId })),
  };
}
export function tierRateSheetAccessPayload(draft: TierRateSheetAccessDraft): string[] { return uniqueIds(draft.allowedRateSheetIds); }
export function tierRateSheetGroupAccessPayload(draft: TierRateSheetAccessDraft): TierRateSheetGroupAccess[] {
  const allowedParents = new Set(tierRateSheetAccessPayload(draft));
  return uniqueGroupAccess(draft.allowedRateSheetGroups).filter((group) => allowedParents.has(group.rate_sheet_id));
}
export function tierRateSheetAccessIsDirty(draft: TierRateSheetAccessDraft, record: TierInstanceRecord): boolean {
  const beforeIds = uniqueIds(record.allowed_rate_sheet_ids).sort();
  const afterIds = tierRateSheetAccessPayload(draft).sort();
  const beforeGroups = uniqueGroupAccess(record.allowed_rate_sheet_groups ?? []).map((group) => tierRateSheetGroupAccessKey(group.rate_sheet_id, group.group_id)).sort();
  const afterGroups = tierRateSheetGroupAccessPayload(draft).map((group) => tierRateSheetGroupAccessKey(group.rate_sheet_id, group.group_id)).sort();
  return beforeIds.length !== afterIds.length || beforeIds.some((id, i) => id !== afterIds[i])
    || beforeGroups.length !== afterGroups.length || beforeGroups.some((key, i) => key !== afterGroups[i]);
}
