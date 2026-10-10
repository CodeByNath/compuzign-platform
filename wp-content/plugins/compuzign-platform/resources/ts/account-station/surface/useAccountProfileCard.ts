// Account Profile card — the read boundary for the presentation wall.
//
// One item, always — the singleton has no scope/filter. This is a SEPARATE
// read from the drawer's own (AccountDrawerHost), the same two-instance rule
// every other Station's wall/drawer pair keeps, so a drawer save refreshes
// only the wall that opened it.

import { useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { fetchAccountDetail } from '../api';
import { toAccountProfileCard } from './cardAdapter';
import { useRetainedCollection } from '@/station-manager/useRetainedCollection';
import type { CategoryGroupCardItem } from '@/admin-station/presentation/category-groups/types';

export interface AccountProfileCardResult {
  items: CategoryGroupCardItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAccountProfileCard(): AccountProfileCardResult {
  const { data, loading, error, refetch } = useApi(fetchAccountDetail);

  const projected = useMemo(() => (data ? [toAccountProfileCard(data)] : []), [data]);

  const retained = useRetainedCollection(projected, loading);

  return { items: retained.items, loading: retained.loading, error, refetch };
}
