import type { PackageFamilyListItem } from '@/api/types/admin';

/** Package-owned relationship facts consumed by cross-station read adapters. */
export interface PackageFamilyRelationship {
  id:         string;
  name:       string;
  serviceIds: number[];
}

export function toPackageFamilyRelationship(item: PackageFamilyListItem): PackageFamilyRelationship {
  return {
    id:         item.group_id,
    name:       item.label,
    serviceIds: item.related_service_ids,
  };
}

export function packageFamiliesForService(
  relationships: PackageFamilyRelationship[],
  serviceId: number,
): Array<{ id: string; name: string }> {
  return relationships
    .filter((family) => family.serviceIds.includes(serviceId))
    .map((family) => ({ id: family.id, name: family.name }));
}
