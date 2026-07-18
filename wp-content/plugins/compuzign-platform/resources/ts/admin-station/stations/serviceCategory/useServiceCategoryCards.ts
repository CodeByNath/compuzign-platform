import { useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { fetchAdminCategories } from '@/api/endpoints/admin';
import { useRetainedCollection } from '../useRetainedCollection';
import { categoryOverviewModule, evaluateModule } from '@/components/admin/utils/moduleNotifications';
import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';

export interface ServiceCategoryCardItem {
  id: number;
  label: string;
  assignedServiceCount: number;
  status: string;
  notifications: ModuleNote[];
}

export function useServiceCategoryCards() {
  const { data, loading, error, refetch } = useApi(() => fetchAdminCategories());
  const projected = useMemo<ServiceCategoryCardItem[]>(
    () => (data?.categories ?? []).map((category) => {
      const module = evaluateModule(categoryOverviewModule, {
        name: category.name,
        description: category.description,
        slug: category.slug,
      }, {
        platformStatus: category.platform_status,
        moduleTransition: category.module_status.overview,
        hasDraft: category.has_draft,
      });
      return {
        id: category.id,
        label: category.name,
        assignedServiceCount: category.assigned_count,
        status: module.status,
        notifications: module.notes,
      };
    }),
    [data],
  );
  const retained = useRetainedCollection(projected, loading);
  return { items: retained.items, loading: retained.loading, error, refetch };
}
