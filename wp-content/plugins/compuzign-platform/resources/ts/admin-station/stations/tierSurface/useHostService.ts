// The Package Station's host service — one resolution rule, shared.
//
// A Package Station is addressed by its PARENT SERVICE id: there is no
// standalone "tier" route. So any Admin Station surface that shows tiers must
// first say which service's package station it is showing.
//
// The rule is not invented here. It is the same one the Command Centre
// catalogue uses to pick its manager host: prefer the first service referenced
// by the first surface package, and fall back to the first catalogue row. Both
// hosts therefore land on the same station, which is what keeps the Tier wall
// and the Command Centre's Packages surface describing the same records.

import { useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { fetchAdminCatalog } from '@/service-station';
import type { ServiceSummary } from '@/service-station';

export interface HostServiceResult {
  service: ServiceSummary | null;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function useHostService(): HostServiceResult {
  const { data, loading, error, refetch } = useApi(() => fetchAdminCatalog());
  const { data: packagesData } = useSurfacePackages();

  const service = useMemo(() => {
    const stations = data?.stations ?? [];
    const preferredId = packagesData?.packages?.[0]?.service_refs?.[0];
    return stations.find((s) => s.id === preferredId) ?? stations[0] ?? null;
  }, [data, packagesData]);

  return { service, loading, error, refetch };
}
