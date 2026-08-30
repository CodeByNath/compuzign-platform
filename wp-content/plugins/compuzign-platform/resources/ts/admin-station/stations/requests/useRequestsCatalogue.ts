// CRM-1B: Requests list data source — reads the durable RequestRepository
// (via fetchAdminRequests()) exclusively. No quote transient is read here or
// anywhere downstream of it; the backend route this calls already made that
// switch (see AdminRequestsController::listRequests()).

import { useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { fetchAdminRequests } from '@/api/endpoints/admin';
import { useRetainedCollection } from '@/station-manager/useRetainedCollection';
import type { RequestSummary } from '@/api/types/admin';
import type { SurfaceCollection } from '@/station-manager/registry/dataSources';

export function useRequestsCatalogue(): SurfaceCollection<RequestSummary> {
  const api = useApi(() => fetchAdminRequests());

  const items = useMemo<RequestSummary[]>(() => api.data?.requests ?? [], [api.data]);
  const retained = useRetainedCollection(items, api.loading);

  return {
    items:   retained.items,
    loading: retained.loading,
    error:   api.error,
    refetch: api.refetch,
  };
}
