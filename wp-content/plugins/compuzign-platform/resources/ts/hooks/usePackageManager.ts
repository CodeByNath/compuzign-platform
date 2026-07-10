import { useCallback, useEffect, useState } from 'preact/hooks';
import { fetchPackageStationManager } from '@/api/endpoints/admin';
import type { PackageManagerReadModel } from '@/api/types/admin';

// ── usePackageManager ───────────────────────────────────────────────────────
//
// Phase B: read-only. No drafts, no saves, no transitions, no navigation
// state — those are Phase D concerns, added only once save/settle/revert
// routes exist. Mirrors usePackageStation's load-on-mount shape, minimised.

export interface PackageManager {
  readModel: PackageManagerReadModel | null;
  loading:   boolean;
  error:     string | null;
  refetch:   () => void;
}

export function usePackageManager(serviceId: number): PackageManager {
  const [readModel, setReadModel] = useState<PackageManagerReadModel | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchPackageStationManager(serviceId)
      .then(res => {
        if (res.success) {
          setReadModel(res.manager);
        } else {
          setReadModel(null);
          setError('Could not load the Package Manager.');
        }
      })
      .catch(() => { setReadModel(null); setError('Could not load the Package Manager.'); })
      .finally(() => setLoading(false));
  }, [serviceId]);

  useEffect(() => { load(); }, [load]);

  return { readModel, loading, error, refetch: load };
}
