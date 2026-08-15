// Tier-system Rate Sheet access — pure read/edit/save projection.
//
// `allowed_rate_sheet_ids` belongs to one Tier instance and is explicit:
// an empty list means NO Rate Sheets are configured yet — never every active
// sheet. A Tier system is independent Package-owned capability; access is a
// deliberate later admin decision, not something creation or Family
// assignment grants implicitly. An occupant gains a NEW candidate only once
// its own Tier system's allow-list names that sheet; its own already-bound
// sheet stays visible regardless (see `selectableRateSheets`). Missing or
// archived stored ids remain visible and removable rather than being
// silently substituted.
//
// (Corrected 2026-08-15: this file previously treated `[]` as "all active
// sheets" — see docs/code-map/package-settings.md and
// docs/architecture/PackageCapabilityAssignments-v1.md for the same
// correction to their own prior statements of that reversed contract.)

import type { PackageRateSheet, TierInstanceRecord } from '../../types';

export type TierRateSheetAccessStatus = PackageRateSheet['status'] | 'unresolved';

export interface TierRateSheetAccessRow {
  rateSheetId: string;
  title: string;
  status: TierRateSheetAccessStatus;
  allowed: boolean;
}

export interface TierRateSheetAccessProjection {
  activeCount: number;
  allowedCount: number;
  allowedActiveCount: number;
  unresolvedCount: number;
  /**
   * A stored id that no longer resolves to a known Rate Sheet — the one real
   * problem this projection reports. Having nothing allowed yet is the
   * ordinary, valid default state for an unconfigured Tier system, not a
   * defect, so it is deliberately NOT part of this flag.
   */
  needsReview: boolean;
  summary: string;
  rows: TierRateSheetAccessRow[];
}

export interface TierRateSheetAccessDraft {
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
  const activeSheets = rateSheets.filter((sheet) => sheet.status === 'active');
  const activeIds = new Set(activeSheets.map((sheet) => sheet.rate_sheet_id));
  const byId = new Map(rateSheets.map((sheet) => [sheet.rate_sheet_id, sheet]));
  // Every active sheet is a CANDIDATE the admin may choose from, independent
  // of whether it is currently allowed — the candidate pool never shrinks
  // just because the allow-list is empty or narrow.
  const activeRows: TierRateSheetAccessRow[] = activeSheets.map((sheet) => ({
      rateSheetId: sheet.rate_sheet_id,
      title: sheet.title.trim() || 'Untitled Rate Sheet',
      status: sheet.status,
      allowed: allowed.has(sheet.rate_sheet_id),
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
  return {
    activeCount: activeSheets.length,
    allowedCount: storedIds.length,
    allowedActiveCount,
    unresolvedCount,
    needsReview: unresolvedCount > 0,
    summary: storedIds.length === 0
      ? 'No Rate Sheets allowed yet'
      : `${allowedActiveCount} active of ${storedIds.length} explicitly allowed`,
    rows,
  };
}

export function tierRateSheetAccessDraft(
  projection: TierRateSheetAccessProjection,
): TierRateSheetAccessDraft {
  return { allowedRateSheetIds: projection.rows.filter((row) => row.allowed).map((row) => row.rateSheetId) };
}

export function tierRateSheetAccessPayload(draft: TierRateSheetAccessDraft): string[] {
  return uniqueIds(draft.allowedRateSheetIds);
}

export function tierRateSheetAccessIsDirty(
  draft: TierRateSheetAccessDraft,
  record: TierInstanceRecord,
): boolean {
  const before = uniqueIds(record.allowed_rate_sheet_ids).sort();
  const after = tierRateSheetAccessPayload(draft).sort();
  return before.length !== after.length || before.some((id, index) => id !== after[index]);
}
