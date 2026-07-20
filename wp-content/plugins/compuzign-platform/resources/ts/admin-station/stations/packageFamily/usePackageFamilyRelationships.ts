// Package Family relationship read boundary.
//
// Combines every lifecycle scope because an archived or trashed Family remains
// a real commercial relationship until Package authority permits deletion.
// Catalogue consumers receive native Family and Service identities unchanged.

import { useMemo } from 'preact/hooks';
import { fetchPackageFamilies } from '@/api/endpoints/admin';
import { useApi } from '@/hooks/useApi';
import {
  toPackageFamilyRelationship,
  type PackageFamilyRelationship,
} from './relationships';

export interface PackageFamilyRelationshipsResult {
  items:   PackageFamilyRelationship[];
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function usePackageFamilyRelationships(): PackageFamilyRelationshipsResult {
  const { data, loading, error, refetch } = useApi(async () => {
    const [current, archived, trashed] = await Promise.all([
      fetchPackageFamilies(),
      fetchPackageFamilies('archived'),
      fetchPackageFamilies('trashed'),
    ]);

    return [
      ...current.package_category_groups,
      ...archived.package_category_groups,
      ...trashed.package_category_groups,
    ];
  });

  const items = useMemo(
    () => (data ?? []).map(toPackageFamilyRelationship),
    [data],
  );

  return { items, loading, error, refetch };
}
