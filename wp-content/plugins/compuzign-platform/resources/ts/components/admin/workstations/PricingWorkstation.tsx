import { useEffect, useState } from 'preact/hooks';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { Spinner } from '@/components/ui/Spinner';
import type { CostBuilderResponse, ServiceItem } from '@/api/types/cost-builder';

interface Props {
  refreshKey: number;
}

const TIERS = ['basic', 'standard', 'premium', 'enterprise'] as const;
const TIER_LABELS: Record<string, string> = {
  basic: 'Basic', standard: 'Standard', premium: 'Premium', enterprise: 'Enterprise',
};

export function PricingWorkstation({ refreshKey }: Props) {
  const { data, loading, error, refetch } = useCostBuilder();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  useEffect(() => {
    const resp = data as CostBuilderResponse | null;
    if (resp && activeCategory === null && resp.categories.length > 0) {
      setActiveCategory(resp.categories[0].slug);
    }
  }, [data]);

  if (loading) {
    return (
      <div class="cz-admin-loading">
        <Spinner label="Loading pricing…" />
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

  const resp = data as CostBuilderResponse | null;
  if (!resp) return null;

  const allServices = resp.services_by_category.flatMap((g) => g.services);
  const activeGroup = resp.services_by_category.find((g) => g.category_slug === activeCategory)
    ?? resp.services_by_category[0];

  const services: ServiceItem[] = activeGroup?.services ?? [];

  const fmt = (v: number | null) => v !== null ? `$${v.toLocaleString()}` : '—';

  return (
    <div>
      <div class="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Pricing</h2>
          <p class="cz-ws-subtitle">
            {allServices.length} service{allServices.length !== 1 ? 's' : ''} across {resp.categories.length} categories — read-only view
          </p>
        </div>
      </div>

      <div class="cz-pricing-category-tabs">
        {resp.categories.map((cat) => (
          <button
            key={cat.slug}
            type="button"
            class={`cz-pricing-tab${activeCategory === cat.slug ? ' cz-pricing-tab--active' : ''}`}
            onClick={() => setActiveCategory(cat.slug)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {services.length === 0 ? (
        <div class="cz-admin-empty">
          <p>No services in this category yet.</p>
        </div>
      ) : (
        <div class="cz-ws-card" style="padding:0;overflow:hidden">
          <div class="cz-pricing-table-wrap">
            <table class="cz-pricing-table">
              <thead>
                <tr>
                  <th>Service</th>
                  {TIERS.map((tier) => (
                    <th key={tier} style="text-align:right">{TIER_LABELS[tier]}</th>
                  ))}
                  <th style="text-align:center">Popular Tier</th>
                  <th style="text-align:center">Status</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => {
                  const tiers = service.pricing?.tiers;
                  const popularTier = service.meta?.popular_tier;
                  const isActive = service.meta?.platform_status === 'active';
                  return (
                    <tr key={service.id}>
                      <td class="cz-pricing-table__name">
                        <span>{service.title}</span>
                        {service.meta?.billing_cycle && (
                          <span class="cz-pricing-table__cycle">/{service.meta.billing_cycle}</span>
                        )}
                      </td>
                      {TIERS.map((tier) => {
                        const price = tiers?.[tier]?.price ?? null;
                        return (
                          <td key={tier} style="text-align:right">
                            <span class={`cz-price-tag${price !== null ? ' cz-price-tag--has-price' : ''}`}>
                              {fmt(price)}
                            </span>
                          </td>
                        );
                      })}
                      <td style="text-align:center">
                        {popularTier ? (
                          <span class="cz-tier-badge cz-tier-badge--popular">{TIER_LABELS[popularTier] ?? popularTier}</span>
                        ) : (
                          <span style="color:var(--admin-text-faint);font-size:12px">—</span>
                        )}
                      </td>
                      <td style="text-align:center">
                        <span class={`cz-module-status-pill cz-module-status-pill--${isActive ? 'active' : 'inactive'}`}>
                          {isActive ? 'Active' : 'Inactive'}
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
    </div>
  );
}
