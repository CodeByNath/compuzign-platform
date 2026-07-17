// Entity travel sources — runtime row loaders and lifecycle handlers for the
// generic entity-table engine (EntityTableStation).
//
// These live at the STATION REGISTRATION boundary, because the registration is
// the owning surface (S5). They are attached to an `entity-table` StationSurface
// in schema/stations.ts. They are deliberately NOT on the entity manifest:
// manifests stay declaration-only (EntitySchema describes; it never loads,
// mutates, or calls endpoints). The engine reads the TableSchema from the
// manifest and the runtime source from the registration, and holds no
// per-entity branch of its own.
//
// Identity stays numeric end-to-end: every handler passes `row.id` (a post id or
// taxonomy term_id) straight to the endpoint — never a stringified display key.

import { useAdminCatalog } from '@/hooks/useAdminCatalog';
import { useApi } from '@/hooks/useApi';
import { restoreService, trashService, permanentDeleteService } from '@/admin-station/stations/service';
import {
  fetchAdminCategories,
  restoreCategory,
  updateCategoryStatus,
  permanentDeleteCategory,
  fetchAdminServiceCategoryGroups,
  restoreServiceCategoryGroup,
  updateServiceCategoryGroupStatus,
  permanentDeleteServiceCategoryGroup,
} from '@/api/endpoints/admin';

export type TravelScope = 'archived' | 'trashed';

export interface TravelRows {
  rows: unknown[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// The one runtime contract the registration supplies to the engine. `useRows` is
// a hook (called once per mounted surface); `handlers` maps a TableSchema action
// id to its transition. The engine wraps handler rejections in a generic error
// affordance, so a handler may reject (e.g. a 409 dependency guard) without its
// own try/catch.
export interface EntityTravelSource {
  useRows: (scope: TravelScope) => TravelRows;
  handlers: (refetch: () => void) => Record<string, (row: any) => Promise<void>>;
}

export const serviceTravelSource: EntityTravelSource = {
  useRows(scope) {
    const { data, loading, error, refetch } = useAdminCatalog({ platformStatus: scope });
    return { rows: data?.stations ?? [], loading, error, refetch };
  },
  handlers(refetch) {
    return {
      restore: async (s) => { await restoreService(s.id);         refetch(); },
      trash:   async (s) => { await trashService(s.id);           refetch(); },
      delete:  async (s) => { await permanentDeleteService(s.id); refetch(); },
    };
  },
};

export const categoryTravelSource: EntityTravelSource = {
  useRows(scope) {
    const { data, loading, error, refetch } = useApi(() => fetchAdminCategories(scope));
    return { rows: data?.categories ?? [], loading, error, refetch };
  },
  handlers(refetch) {
    return {
      restore: async (c) => { await restoreCategory(c.id);                 refetch(); },
      trash:   async (c) => { await updateCategoryStatus(c.id, 'trashed'); refetch(); },
      // Permanent delete may 409 (assigned-service guard). The engine surfaces
      // the backend message; no local catch needed.
      delete:  async (c) => { await permanentDeleteCategory(c.id);         refetch(); },
    };
  },
};

export const serviceCategoryGroupTravelSource: EntityTravelSource = {
  useRows(scope) {
    const { data, loading, error, refetch } = useApi(() => fetchAdminServiceCategoryGroups(scope));
    return { rows: data?.category_groups ?? [], loading, error, refetch };
  },
  handlers(refetch) {
    return {
      restore: async (g) => { await restoreServiceCategoryGroup(g.id);                 refetch(); },
      trash:   async (g) => { await updateServiceCategoryGroupStatus(g.id, 'trashed'); refetch(); },
      // Permanent delete may 409 (assigned-category guard) — same as Category.
      delete:  async (g) => { await permanentDeleteServiceCategoryGroup(g.id);         refetch(); },
    };
  },
};
