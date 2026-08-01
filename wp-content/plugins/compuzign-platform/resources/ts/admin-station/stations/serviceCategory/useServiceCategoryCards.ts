import { useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { fetchAdminCategories } from '@/api/endpoints/admin';
import { useRetainedCollection } from '@/station-manager/useRetainedCollection';
import { categoryOverviewModule, evaluateModule } from '@/drawer-kit/utils/moduleNotifications';
import type { ModuleNote } from '@/drawer-kit/utils/moduleNotifications';

export interface ServiceCategoryCardItem {
  id: number;
  label: string;
  modules: Array<
    | { id: 'overview'; label: 'Overview'; status: string; notifications: ModuleNote[] }
    | { id: 'services'; label: 'Services'; count: number }
  >;
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
        modules: [
          { id: 'overview', label: 'Overview', status: module.status, notifications: module.notes },
          { id: 'services', label: 'Services', count: category.assigned_count },
        ],
      };
    }),
    [data],
  );
  const retained = useRetainedCollection(projected, loading);
  return { items: retained.items, loading: retained.loading, error, refetch };
}
