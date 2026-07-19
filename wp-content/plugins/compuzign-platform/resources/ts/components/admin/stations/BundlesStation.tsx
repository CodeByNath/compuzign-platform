import { useEffect } from 'preact/hooks';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { AsyncLoading, AsyncError } from '@/drawer-kit/ui/AsyncSection';
import { Station } from '../shell/Station';
import type { CostBuilderResponse } from '@/api/types/cost-builder';

interface Props {
  refreshKey: number;
}

export function BundlesStation({ refreshKey }: Props) {
  const { data, loading, error, refetch } = useCostBuilder();

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  if (loading) return <AsyncLoading label="Loading bundles…" />;

  if (error) return <AsyncError error={error} onRetry={refetch} />;

  const resp = data as CostBuilderResponse | null;
  const allServices = resp?.services_by_category.flatMap((g) => g.services) ?? [];
  const bundled = allServices.filter((s) => s.pricing?.bundle?.price !== null && s.pricing?.bundle?.price !== undefined);

  return (
    <Station>
      <Station.Header className="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Bundles</h2>
          <p class="cz-ws-subtitle">
            {bundled.length} service{bundled.length !== 1 ? 's' : ''} with bundle pricing configured
          </p>
        </div>
      </Station.Header>

      <Station.Content>
      {bundled.length === 0 ? (
        <div class="cz-admin-empty">
          <p>
            No bundle pricing configured yet. Bundle pricing is defined per-service in the
            XLSX catalog under the <strong>bundle</strong> columns.
          </p>
        </div>
      ) : (
        <div class="cz-bundle-grid">
          {bundled.map((service) => {
            const bundle = service.pricing.bundle;
            return (
              <div key={service.id} class="cz-bundle-card">
                <div class="cz-bundle-card__header">
                  <p class="cz-bundle-card__service">{service.title}</p>
                  <span class="cz-bundle-card__category">{service.categories[0]?.name ?? '—'}</span>
                </div>
                {bundle.title && (
                  <p class="cz-bundle-card__title">{bundle.title}</p>
                )}
                {bundle.description && (
                  <p class="cz-bundle-card__description">{bundle.description}</p>
                )}
                <div class="cz-bundle-card__price">
                  <span class="cz-bundle-card__price-label">Bundle price</span>
                  <span class="cz-bundle-card__price-value">
                    ${bundle.price!.toLocaleString()}
                    <span class="cz-bundle-card__price-cycle">/{service.meta?.billing_cycle ?? 'mo'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </Station.Content>
    </Station>
  );
}
