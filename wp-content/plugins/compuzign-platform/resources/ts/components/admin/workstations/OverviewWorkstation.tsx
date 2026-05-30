import { useEffect } from 'preact/hooks';
import { useAdminOverview } from '@/hooks/useAdminOverview';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { Spinner } from '@/components/ui/Spinner';

interface Props {
  refreshKey: number;
}

export function OverviewWorkstation({ refreshKey }: Props) {
  const { data, loading, error, refetch } = useAdminOverview();
  const { data: pkgData } = useSurfacePackages();

  const activePromoCount = pkgData?.packages.reduce(
    (sum, pkg) => sum + pkg.promotion_tiers.filter((p) => p.status === 'active').length,
    0,
  ) ?? 0;

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

  return (
    <div>
      <div class="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Command Centre</h2>
          <p class="cz-ws-subtitle">Service management overview</p>
        </div>
      </div>

      <div class="cz-overview-stats">
        <div class="cz-stat-tile">
          <span class="cz-stat-tile__label">Published Services</span>
          <span class="cz-stat-tile__value">{data.services_published}</span>
          <span class="cz-stat-tile__sub">in catalog</span>
        </div>
        <div class="cz-stat-tile">
          <span class="cz-stat-tile__label">Current Promotions</span>
          <span class="cz-stat-tile__value">{activePromoCount}</span>
          <span class="cz-stat-tile__sub">active offers</span>
        </div>
      </div>
    </div>
  );
}
