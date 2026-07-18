import { useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { fetchAdminCategories } from '@/api/endpoints/admin';
import { useRetainedCollection } from '../useRetainedCollection';

export interface ServiceCategoryCardItem {
  id: number;
  label: string;
}

export function useServiceCategoryCards() {
  const { data, loading, error, refetch } = useApi(() => fetchAdminCategories());
  const projected = useMemo<ServiceCategoryCardItem[]>(
    () => (data?.categories ?? []).map((category) => ({ id: category.id, label: category.name })),
    [data],
  );
  const retained = useRetainedCollection(projected, loading);
  return { items: retained.items, loading: retained.loading, error, refetch };
}
