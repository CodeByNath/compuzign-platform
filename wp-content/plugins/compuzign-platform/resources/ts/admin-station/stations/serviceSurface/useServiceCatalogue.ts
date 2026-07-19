// Service Home catalogue data source.
//
// Reads current Services for the browse table and archived Services for the
// overview count, then projects both through one presentation adapter. The
// archived rows remain count-only in the kit, preserving the documented Bin /
// travel boundary while still matching Home's operational summary.

import { useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { fetchAdminCatalog } from '../service';
import { useRetainedCollection } from '../useRetainedCollection';
import { toServiceCatalogueItem } from './serviceCatalogueAdapter';
import type { ServiceCatalogueItem } from '../../presentation/service-catalogue/types';

export interface ServiceCatalogueResult {
  items:   ServiceCatalogueItem[];
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function useServiceCatalogue(): ServiceCatalogueResult {
  const current  = useApi(() => fetchAdminCatalog());
  const archived = useApi(() => fetchAdminCatalog('archived'));

  const projected = useMemo<ServiceCatalogueItem[]>(() => [
    ...(current.data?.stations ?? []).map((summary) => toServiceCatalogueItem(summary, 'current')),
    ...(archived.data?.stations ?? []).map((summary) => toServiceCatalogueItem(summary, 'archived')),
  ], [current.data, archived.data]);

  const loading = current.loading || archived.loading;
  const retained = useRetainedCollection(projected, loading);

  return {
    items:   retained.items,
    loading: retained.loading,
    error:   current.error ?? archived.error,
    refetch: () => {
      current.refetch();
      archived.refetch();
    },
  };
}
