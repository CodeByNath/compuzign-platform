import { useEffect, useMemo, useState } from 'preact/hooks';
import { providerHasManagementCapability } from './types';
import type { StationManagerScope } from './types';
import { relationProvidersFor } from './registry';

export function DynamicStationManager({ scope }: { scope: StationManagerScope }) {
  const providers = useMemo(
    () => relationProvidersFor(scope),
    [scope.stationType, scope.stationId],
  );
  const [loadedCount, setLoadedCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoadedCount(0);
    setErrors([]);
    setLoading(true);

    Promise.all(providers.map(async (provider) => {
      if (!provider.appliesTo(scope)) return;
      try {
        await provider.load(scope, controller.signal);
        if (!controller.signal.aborted) setLoadedCount((count) => count + 1);
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrors((current) => [
          ...current,
          error instanceof Error ? error.message : `Could not load ${provider.label}.`,
        ]);
      }
    })).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [providers, scope]);

  const writableCount = providers.filter(providerHasManagementCapability).length;

  return (
    <section aria-labelledby="dynamic-station-manager-title">
      <h3 id="dynamic-station-manager-title">Manager</h3>
      <p class="cz-sp-tier-table__muted">
        {providers.length} {providers.length === 1 ? 'provider' : 'providers'} available
        {' · '}{writableCount} writable
        {' · '}{loadedCount} loaded
      </p>
      {loading && <p>Loading provider workspace…</p>}
      {errors.length > 0 && (
        <div class="cz-admin-error-msg" role="alert">
          {errors.map((message) => <p key={message}>{message}</p>)}
        </div>
      )}
      {!loading && errors.length === 0 && (
        <p>Provider management controls will appear here as their workspaces migrate.</p>
      )}
    </section>
  );
}
