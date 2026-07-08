import { useEffect } from 'preact/hooks';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { AsyncLoading, AsyncError } from '@/components/admin/ui/AsyncSection';
import { Workstation } from '../shell/Workstation';
import type { CostBuilderResponse } from '@/api/types/cost-builder';

interface Props {
  refreshKey: number;
}

const TIER_LABELS: Record<string, string> = {
  basic: 'Basic', standard: 'Standard', premium: 'Premium', enterprise: 'Enterprise', ultimate: 'Ultimate',
};

export function FeaturedWorkstation({ refreshKey }: Props) {
  const { data, loading, error, refetch } = useCostBuilder();

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  if (loading) return <AsyncLoading label="Loading featured controls…" />;

  if (error) return <AsyncError error={error} onRetry={refetch} />;

  const resp = data as CostBuilderResponse | null;
  const allServices = resp?.services_by_category.flatMap((g) => g.services) ?? [];

  const sorted = [...allServices].sort((a, b) =>
    (a.meta?.sort_order ?? 0) - (b.meta?.sort_order ?? 0)
  );

  return (
    <Workstation>
      <Workstation.Header className="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Featured Controls</h2>
          <p class="cz-ws-subtitle">
            Sort order, popular tier, and active status across all {allServices.length} services
          </p>
        </div>
      </Workstation.Header>

      <Workstation.Content>
      {sorted.length === 0 ? (
        <div class="cz-admin-empty">
          <p>No services in catalog. Import via the Service Catalog workstation first.</p>
        </div>
      ) : (
        <div class="cz-ws-card" style="padding:0;overflow:hidden">
          <div class="cz-featured-table-wrap">
            <table class="cz-featured-table">
              <thead>
                <tr>
                  <th style="text-align:center;width:56px">Order</th>
                  <th>Service</th>
                  <th>Category</th>
                  <th style="text-align:center">Popular Tier</th>
                  <th style="text-align:center">Status</th>
                  <th style="text-align:center">Available</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((service) => {
                  const popularTier = service.meta?.popular_tier;
                  const isActive = service.meta?.platform_status === 'active';
                  const isAvailable = service.availability?.is_available === true;
                  return (
                    <tr key={service.id}>
                      <td style="text-align:center;color:var(--admin-text-faint);font-size:13px;font-variant-numeric:tabular-nums">
                        {service.meta?.sort_order ?? 0}
                      </td>
                      <td class="cz-featured-table__name">{service.title}</td>
                      <td style="color:var(--admin-text-muted);font-size:12px">{service.categories[0]?.name ?? '—'}</td>
                      <td style="text-align:center">
                        {popularTier ? (
                          <span class="cz-tier-badge cz-tier-badge--popular">
                            {TIER_LABELS[popularTier] ?? popularTier}
                          </span>
                        ) : (
                          <span style="color:var(--admin-text-faint);font-size:12px">—</span>
                        )}
                      </td>
                      <td style="text-align:center">
                        <span class={`cz-module-status-pill cz-module-status-pill--${isActive ? 'active' : 'inactive'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style="text-align:center">
                        <span class={`cz-module-status-pill cz-module-status-pill--${isAvailable ? 'active' : 'inactive'}`}>
                          {isAvailable ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </Workstation.Content>
    </Workstation>
  );
}
