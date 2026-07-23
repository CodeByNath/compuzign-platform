// Service cards — the read boundary for the Service presentation wall.
//
// The one place the Admin Station reads the Service catalogue for a presentation
// region. It reads the current-scope catalogue route, maps each row through the
// pure card adapter, and returns the collection state every template kit
// consumes ({ items, loading, error, refetch }).
//
// Bundle boundary: `useApi` and `fetchAdminCatalog` are pure data/transport, and
// the card adapter is a pure projection. Nothing from the Command Centre tree is
// pulled in — notably NOT ServiceCatalogStation, which owns the same read in the
// legacy tree.

import { useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { fetchAdminCatalog } from '@/service-station';
import { toServiceCard } from './serviceCardAdapter';
import { useRetainedCollection } from '@/admin-station/stations/useRetainedCollection';
import type { CategoryGroupCardItem } from '@/admin-station/presentation/category-groups/types';

export interface ServiceCardsResult {
  items:   CategoryGroupCardItem[];
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

/**
 * Read the current Services as cards.
 *
 * No argument: the catalogue route defaults to the current scope
 * (active/disabled) — archived and trashed belong to the Bin surface, not the
 * presentation wall. The mapping is memoised on the raw response so re-renders
 * don't rebuild the card array.
 *
 * `refetch` is the handle this wall hands to the drawer it opens, so a saved
 * service refreshes THIS wall. The collection is retained across that reload, so
 * the cards update in place instead of blanking (see useRetainedCollection).
 */
export function useServiceCards(): ServiceCardsResult {
  const { data, loading, error, refetch } = useApi(() => fetchAdminCatalog());

  const projected = useMemo(
    () => (data?.stations ?? []).map(toServiceCard),
    [data],
  );

  const retained = useRetainedCollection(projected, loading);

  return { items: retained.items, loading: retained.loading, error, refetch };
}
