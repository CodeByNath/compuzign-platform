// Tier-system Rate Sheet access. Parent candidates come from rate_sheets[];
// nested candidates come ONLY from that sheet's direct bundles[] collection.
// This projection never inspects groups[], items[], or compiled Bundle rows.

import type { PackageRateSheet, TierInstanceRecord, TierRateSheetBundleAccess } from '../../types';

export type TierRateSheetAccessStatus = PackageRateSheet['status'] | 'unresolved';
export interface TierRateSheetBundleAccessRow {
  accessKey: string;
  rateSheetId: string;
  bundleId: string;
  platformId: string;
  title: string;
  status: TierRateSheetAccessStatus;
  allowed: boolean;
  resolved: boolean;
}
export interface TierRateSheetAccessRow {
  rateSheetId: string;
  platformId: string;
  title: string;
  status: TierRateSheetAccessStatus;
  allowed: boolean;
  bundles: TierRateSheetBundleAccessRow[];
}
export interface TierRateSheetAccessProjection {
  activeCount: number;
  allowedCount: number;
  allowedActiveCount: number;
  allowedBundleCount: number;
  unresolvedCount: number;
  unresolvedBundleCount: number;
  needsReview: boolean;
  summary: string;
  rows: TierRateSheetAccessRow[];
}
export interface TierRateSheetAccessDraft {
  allowedRateSheetIds: string[];
  allowedRateSheetBundles: TierRateSheetBundleAccess[];
}

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}
export function tierRateSheetBundleAccessKey(rateSheetId: string, bundleId: string): string {
  return `bundle:${encodeURIComponent(rateSheetId)}:${encodeURIComponent(bundleId)}`;
}
function uniqueBundleAccess(access: readonly TierRateSheetBundleAccess[]): TierRateSheetBundleAccess[] {
  const seen = new Set<string>();
  return access.flatMap((entry) => {
    const rateSheetId = entry.rate_sheet_id.trim();
    const bundleId = entry.bundle_id.trim();
    const key = tierRateSheetBundleAccessKey(rateSheetId, bundleId);
    if (!rateSheetId || !bundleId || seen.has(key)) return [];
    seen.add(key);
    return [{ rate_sheet_id: rateSheetId, bundle_id: bundleId }];
  });
}

export function projectTierRateSheetAccess(record: TierInstanceRecord, rateSheets: readonly PackageRateSheet[]): TierRateSheetAccessProjection {
  const storedIds = uniqueIds(record.allowed_rate_sheet_ids);
  const storedBundles = uniqueBundleAccess(record.allowed_rate_sheet_bundles ?? []);
  const allowedIds = new Set(storedIds);
  const allowedBundles = new Set(storedBundles.map((entry) => tierRateSheetBundleAccessKey(entry.rate_sheet_id, entry.bundle_id)));
  const activeSheets = rateSheets.filter((sheet) => sheet.status === 'active');
  const activeIds = new Set(activeSheets.map((sheet) => sheet.rate_sheet_id));
  const byId = new Map(rateSheets.map((sheet) => [sheet.rate_sheet_id, sheet]));

  const projectBundles = (sheet: PackageRateSheet | undefined, rateSheetId: string): TierRateSheetBundleAccessRow[] => {
    const directBundles = sheet?.bundles ?? [];
    const activeBundles = directBundles.filter((bundle) => bundle.status === 'active');
    const activeBundleIds = new Set(activeBundles.map((bundle) => bundle.bundle_id));
    const byBundleId = new Map(directBundles.map((bundle) => [bundle.bundle_id, bundle]));
    const active = activeBundles.map((bundle) => ({
      accessKey: tierRateSheetBundleAccessKey(rateSheetId, bundle.bundle_id),
      rateSheetId,
      bundleId: bundle.bundle_id,
      platformId: bundle.platform_id ?? '',
      title: bundle.title.trim() || 'Untitled Bundle',
      status: bundle.status,
      allowed: allowedBundles.has(tierRateSheetBundleAccessKey(rateSheetId, bundle.bundle_id)),
      resolved: true,
    }));
    const retained = storedBundles
      .filter((entry) => entry.rate_sheet_id === rateSheetId && !activeBundleIds.has(entry.bundle_id))
      .map((entry) => {
        const bundle = byBundleId.get(entry.bundle_id);
        return {
        accessKey: tierRateSheetBundleAccessKey(rateSheetId, entry.bundle_id),
        rateSheetId,
        bundleId: entry.bundle_id,
        platformId: bundle?.platform_id ?? '',
        title: bundle?.title.trim() || (bundle ? 'Untitled Bundle' : 'Unresolved Bundle'),
        status: bundle?.status ?? 'unresolved' as const,
        allowed: true,
        resolved: bundle !== undefined,
      };
      });
    return [...active, ...retained];
  };

  const activeRows: TierRateSheetAccessRow[] = activeSheets.map((sheet) => ({
    rateSheetId: sheet.rate_sheet_id,
    platformId: sheet.platform_id ?? '',
    title: sheet.title.trim() || 'Untitled Rate Sheet',
    status: sheet.status,
    allowed: allowedIds.has(sheet.rate_sheet_id),
    bundles: projectBundles(sheet, sheet.rate_sheet_id),
  }));
  const storedRows: TierRateSheetAccessRow[] = storedIds.filter((id) => !activeIds.has(id)).map((id) => {
    const sheet = byId.get(id);
    return {
      rateSheetId: id,
      platformId: sheet?.platform_id ?? '',
      title: sheet?.title.trim() || (sheet ? 'Untitled Rate Sheet' : 'Unresolved Rate Sheet'),
      status: sheet?.status ?? 'unresolved',
      allowed: true,
      bundles: projectBundles(sheet, id),
    };
  });
  const rows = [...activeRows, ...storedRows];
  const unresolvedCount = rows.filter((row) => row.status === 'unresolved').length;
  const unresolvedBundleCount = rows.flatMap((row) => row.bundles).filter((bundle) => bundle.allowed && !bundle.resolved).length;
  const allowedActiveCount = activeRows.filter((row) => row.allowed).length;
  return {
    activeCount: activeSheets.length,
    allowedCount: storedIds.length,
    allowedActiveCount,
    allowedBundleCount: storedBundles.length,
    unresolvedCount,
    unresolvedBundleCount,
    needsReview: unresolvedCount + unresolvedBundleCount > 0,
    summary: storedIds.length === 0 ? 'No Rate Sheets allowed yet' : `${allowedActiveCount} active of ${storedIds.length} explicitly allowed`,
    rows,
  };
}

export function tierRateSheetAccessDraft(projection: TierRateSheetAccessProjection): TierRateSheetAccessDraft {
  return {
    allowedRateSheetIds: projection.rows.filter((row) => row.allowed).map((row) => row.rateSheetId),
    allowedRateSheetBundles: projection.rows.flatMap((row) => row.bundles).filter((bundle) => bundle.allowed)
      .map((bundle) => ({ rate_sheet_id: bundle.rateSheetId, bundle_id: bundle.bundleId })),
  };
}
export function tierRateSheetAccessPayload(draft: TierRateSheetAccessDraft): string[] {
  return uniqueIds(draft.allowedRateSheetIds);
}
export function tierRateSheetBundleAccessPayload(draft: TierRateSheetAccessDraft): TierRateSheetBundleAccess[] {
  const allowedParents = new Set(tierRateSheetAccessPayload(draft));
  return uniqueBundleAccess(draft.allowedRateSheetBundles).filter((entry) => allowedParents.has(entry.rate_sheet_id));
}
export function tierRateSheetAccessIsDirty(draft: TierRateSheetAccessDraft, record: TierInstanceRecord): boolean {
  const beforeIds = uniqueIds(record.allowed_rate_sheet_ids).sort();
  const afterIds = tierRateSheetAccessPayload(draft).sort();
  const beforeBundles = uniqueBundleAccess(record.allowed_rate_sheet_bundles ?? [])
    .map((entry) => tierRateSheetBundleAccessKey(entry.rate_sheet_id, entry.bundle_id)).sort();
  const afterBundles = tierRateSheetBundleAccessPayload(draft)
    .map((entry) => tierRateSheetBundleAccessKey(entry.rate_sheet_id, entry.bundle_id)).sort();
  return beforeIds.length !== afterIds.length || beforeIds.some((id, index) => id !== afterIds[index])
    || beforeBundles.length !== afterBundles.length || beforeBundles.some((key, index) => key !== afterBundles[index]);
}
