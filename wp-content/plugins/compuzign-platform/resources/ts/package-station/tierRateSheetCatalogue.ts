import type {
  PackageManagerItem,
  PackageRateSheet,
  TierRateSheetBundleAccess,
  TierResolvedRateSheetSelection,
} from './types';
import { relationshipDisplayLabel } from './rateSheetLabels';
import type { InclusionItem } from '@/api/types/pools';

/**
 * Resolve the occupant's selected Rate Sheet access. Ordinary rows retain the
 * existing source_item_id relationship resolver. Compiled Bundle rows are
 * admitted only through an exact selected (rate_sheet_id, bundle_id) pair and
 * the Bundle's existing compiled-row Platform ID.
 */
export function buildOccupantRateSheetCatalogue(
  svc: { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] },
  rateSheetIds: string[] | undefined,
  rateSheetBundles: TierRateSheetBundleAccess[] | undefined,
  legacyRateSheetId: string | null,
  existingSelections: TierResolvedRateSheetSelection[],
): TierResolvedRateSheetSelection[] {
  const relationshipLabels = new Map(svc.package_relationships.map((item) => [item.item_id, relationshipDisplayLabel(item)]));
  const relationshipsById = new Map(svc.package_relationships.map((item) => [item.item_id, item]));
  const selectedBundles = rateSheetBundles ?? [];
  const selectedBundleKeys = new Set(selectedBundles.map((entry) => `${entry.rate_sheet_id}\u0000${entry.bundle_id}`));
  // Existing occupants are normalized with rate_sheet_ids: [] even though
  // their established binding still lives in rate_sheet_id. An empty array
  // must therefore retain that legacy binding; otherwise every existing
  // occupant loses its normal Rate Sheet catalogue on read.
  const selectedSheetIds = new Set((rateSheetIds?.length ?? 0) > 0
    ? rateSheetIds
    : (legacyRateSheetId ? [legacyRateSheetId] : []));
  for (const entry of selectedBundles) selectedSheetIds.add(entry.rate_sheet_id);

  const catalogue: TierResolvedRateSheetSelection[] = [];
  for (const sheet of svc.rate_sheets) {
    if (!selectedSheetIds.has(sheet.rate_sheet_id)) continue;
    const compiledBundlesByPlatformId = new Map((sheet.bundles ?? [])
      .filter((bundle) => bundle.compiled_item_platform_id)
      .map((bundle) => [bundle.compiled_item_platform_id as string, bundle]));

    for (const item of sheet.items) {
      const bundle = item.platform_id ? compiledBundlesByPlatformId.get(item.platform_id) : undefined;
      if (bundle) {
        if (bundle.status !== 'active' || !selectedBundleKeys.has(`${sheet.rate_sheet_id}\u0000${bundle.bundle_id}`)) continue;
        catalogue.push({
          item_id: item.item_id,
          source_type: null,
          source_id: null,
          quantity: 1,
          resolved: true,
          label: item.label?.trim() || bundle.title || '(untitled Bundle)',
          unit_price: item.unit_price,
          per: item.per,
          group_id: item.group_id,
          line_total: item.unit_price,
          price_options: item.price_options,
          default_price_label: item.default_price_label,
          includes: item.includes ?? [],
        });
        continue;
      }

      catalogue.push({
        item_id: item.item_id,
        source_type: relationshipsById.get(item.source_item_id)?.source_type ?? null,
        source_id: relationshipsById.get(item.source_item_id)?.source_id ?? null,
        quantity: 1,
        resolved: relationshipLabels.has(item.source_item_id),
        label: relationshipLabels.get(item.source_item_id) ?? '(unresolved Rate Sheet item)',
        unit_price: item.unit_price,
        per: item.per,
        group_id: item.group_id,
        line_total: item.unit_price,
        price_options: item.price_options,
        default_price_label: item.default_price_label,
      });
    }
  }
  for (const selected of existingSelections) {
    if (!catalogue.some((item) => item.item_id === selected.item_id)) catalogue.push(selected);
  }
  return catalogue;
}

/**
 * Resolve the Tier's inclusion list while leaving commercial selection and
 * pricing on the Rate Sheet row. Normal rows keep their established mapping;
 * a selected compiled Bundle contributes only inclusion-type children through
 * each child's existing source_item_id relationship.
 */
export function resolveOccupantInclusions(
  selections: TierResolvedRateSheetSelection[],
  relationships: PackageManagerItem[],
): InclusionItem[] {
  const relationshipsById = new Map(relationships.map((item) => [item.item_id, item]));
  const resolved: InclusionItem[] = [];
  const seen = new Set<string>();
  const append = (item: InclusionItem) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    resolved.push(item);
  };

  for (const selection of selections) {
    if (selection.source_type === 'inclusion') {
      append({ id: selection.item_id, label: selection.label, missing: !selection.resolved });
    }
    for (const child of selection.includes ?? []) {
      const relationship = relationshipsById.get(child.source_item_id);
      const projectedSourceId = child.source_type === 'inclusion' && child.connection_resolved
        ? child.source_id ?? ''
        : '';
      if (
        projectedSourceId === ''
        && (!relationship
          || relationship.source_type !== 'inclusion'
          || relationship.missing
          || relationship.resolved === null
          || relationship.source_id === '')
      ) continue;
      append({
        id: projectedSourceId || relationship!.source_id,
        label: child.resolved_label || (relationship ? relationshipDisplayLabel(relationship) : child.label),
      });
    }
  }
  return resolved;
}
