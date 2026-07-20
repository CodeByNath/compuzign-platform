import type {
  PackageManagerItem,
  PackageRateSheet,
  PackageSourceRelationship,
  SurfaceTierDetail,
} from '@/api/types/admin';
import type { StationConditions } from '../../navigation/destinations';
import type { TierOccupant } from '@/entity-drawers/shared/tierOccupants';

export interface TierCollectionScopeData {
  packageSources: PackageSourceRelationship[];
  packageRelationships: PackageManagerItem[];
  rateSheet: PackageRateSheet | null;
}
/** Resolve current Service/Family conditions to the Package-owned Service ids. */
export function tierScopeServiceIds(
  conditions: StationConditions | undefined,
  packageSources: PackageSourceRelationship[],
): Set<number> | null {
  const explicitService = typeof conditions?.serviceId === 'number'
    ? new Set([conditions.serviceId])
    : null;

  const familyServices = conditions?.packageFamilyId
    ? new Set(packageSources.flatMap((source) => (
        source.provider_key === 'service'
        && source.entity_type === 'service'
        && source.category_group_id === conditions.packageFamilyId
        && typeof source.entity_id === 'number'
          ? [source.entity_id]
          : []
      )))
    : null;

  if (explicitService && familyServices) {
    return new Set([...explicitService].filter((serviceId) => familyServices.has(serviceId)));
  }
  return explicitService ?? familyServices;
}

/**
 * Filter settled occupants through existing Rate Sheet and supplying-Service
 * provenance. Slot ids are inspected only to retain the mutation context on
 * the returned occupant; occupant_id remains the identity.
 */
export function filterTierOccupantsByConditions<T extends SurfaceTierDetail>(
  occupants: TierOccupant<T>[],
  conditions: StationConditions | undefined,
  data: TierCollectionScopeData,
): TierOccupant<T>[] {
  const serviceIds = tierScopeServiceIds(conditions, data.packageSources);
  if (serviceIds === null) return occupants;
  if (serviceIds.size === 0) return [];

  const supplyingServiceByItem = new Map<string, number>();
  for (const relationship of data.packageRelationships) {
    if (typeof relationship.source_service_id === 'number') {
      supplyingServiceByItem.set(relationship.item_id, relationship.source_service_id);
    }
  }

  const sourceItemByRateItem = new Map(
    (data.rateSheet?.items ?? []).map((item) => [item.item_id, item.source_item_id]),
  );

  return occupants.filter(({ detail }) => detail.rate_sheet_items.some((selection) => {
    const sourceItemId = sourceItemByRateItem.get(selection.item_id);
    const serviceId = sourceItemId ? supplyingServiceByItem.get(sourceItemId) : undefined;
    return serviceId !== undefined && serviceIds.has(serviceId);
  }));
}
