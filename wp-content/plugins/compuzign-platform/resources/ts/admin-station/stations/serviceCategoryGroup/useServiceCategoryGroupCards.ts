// Service Category Group cards — the read boundary.
//
// The one place the Admin Station fetches Service Category Groups for the
// presentation region. It reads the current-scope list route, maps each record
// through the pure card adapter, and returns the collection state the card grid
// already consumes ({ items, loading, error, refetch }). Cards stay pure — this
// hook is what AdminStationBody swaps in for the temporary mock.
//
// Bundle boundary: `useApi` and `fetchAdminServiceCategoryGroups` are both pure
// data/transport (the endpoint value-imports only apiClient), so nothing from the
// old admin UI tree crosses into the Admin Station bundle. The backend row type
// is type-only. This mirrors how the old entity-table sources read the same list
// route, without pulling any renderer.

import { useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { fetchAdminServiceCategoryGroups } from '@/api/endpoints/admin';
import { toCategoryGroupCard } from './cardAdapter';
import type { CategoryGroupCardItem } from '../../presentation/category-groups/types';

export interface ServiceCategoryGroupCardsResult {
  items:   CategoryGroupCardItem[];
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

/**
 * Read the current Service Category Groups as cards.
 *
 * No argument: the list route defaults to the current scope (active/disabled) —
 * archived and trashed belong to the body/archive surfaces, not the presentation
 * wall. The mapping is memoised on the raw response so re-renders don't rebuild
 * the card array.
 */
export function useServiceCategoryGroupCards(): ServiceCategoryGroupCardsResult {
  const { data, loading, error, refetch } = useApi(() => fetchAdminServiceCategoryGroups());

  const items = useMemo(
    () => (data?.category_groups ?? []).map(toCategoryGroupCard),
    [data],
  );

  return { items, loading, error, refetch };
}
