import { useEffect } from 'preact/hooks';
import { useAdminOverview } from '@/hooks/useAdminOverview';
import { Spinner } from '@/components/ui/Spinner';

interface Props {
  refreshKey: number;
}

export function OverviewWorkstation({ refreshKey }: Props) {
  const { data, loading, error, refetch } = useAdminOverview();

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  if (loading) {
    return (
      <div class="cz-admin-loading">
        <Spinner label="Loading overview…" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div class="cz-admin-error-msg">{error}</div>
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary" style="margin-top:12px" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const allHealthy = Object.values(data.health).every(Boolean);

  return (
    <div>
      <div class="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Command Centre</h2>
          <p class="cz-ws-subtitle">Platform overview and system status</p>
        </div>
      </div>

      <div class="cz-overview-stats">
        <div class="cz-stat-tile">
          <span class="cz-stat-tile__label">Published Services</span>
          <span class="cz-stat-tile__value">{data.services_published}</span>
          <span class="cz-stat-tile__sub">in catalog</span>
        </div>
        <div class="cz-stat-tile">
          <span class="cz-stat-tile__label">Draft Services</span>
          <span class="cz-stat-tile__value">{data.services_draft}</span>
          <span class="cz-stat-tile__sub">unpublished</span>
        </div>
        <div class="cz-stat-tile">
          <span class="cz-stat-tile__label">System Status</span>
          <span class="cz-stat-tile__value" style={allHealthy ? 'color:var(--admin-success)' : 'color:var(--admin-error)'}>
            {allHealthy ? 'Healthy' : 'Degraded'}
          </span>
          <span class="cz-stat-tile__sub">{Object.keys(data.health).length} checks</span>
        </div>
        {data.platform_version && (
          <div class="cz-stat-tile">
            <span class="cz-stat-tile__label">Version</span>
            <span class="cz-stat-tile__value" style="font-size:20px">v{data.platform_version}</span>
            <span class="cz-stat-tile__sub">platform</span>
          </div>
        )}
      </div>

      <div class="cz-ws-card">
        <p class="cz-ws-card__title">Module Health</p>
        <div class="cz-health-grid">
          {Object.entries(data.health).map(([name, ok]) => (
            <div key={name} class={`cz-health-pill cz-health-pill--${ok ? 'ok' : 'fail'}`}>
              <span>{ok ? '✓' : '✕'}</span>
              <span>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
