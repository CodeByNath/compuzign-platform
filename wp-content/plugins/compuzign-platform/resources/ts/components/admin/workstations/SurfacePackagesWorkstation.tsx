import { useEffect } from 'preact/hooks';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { Spinner } from '@/components/ui/Spinner';
import type { SurfacePackageSummary } from '@/api/types/admin';

interface Props {
  refreshKey: number;
}

const TIERS = ['basic', 'standard', 'premium', 'enterprise'] as const;
const TIER_LABELS: Record<string, string> = {
  basic: 'Basic', standard: 'Standard', premium: 'Premium', enterprise: 'Enterprise',
};

function fmtPrice(v: number | null): string {
  return v !== null ? `$${v.toLocaleString()}` : 'Contact';
}

function PackageCard({ pkg }: { pkg: SurfacePackageSummary }) {
  const serviceNames = pkg.services.map((s) => s.title).join(', ') || '(no service linked)';

  return (
    <div class="cz-ws-card" style="margin-bottom:16px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px">
        <div>
          <p class="cz-ws-card__title" style="margin:0 0 2px">{pkg.title}</p>
          <p style="margin:0;font-size:12px;color:var(--admin-text-muted)">{serviceNames}</p>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          {pkg.migration_complete && (
            <span class="cz-status-pill cz-status-pill--active" style="font-size:11px">Migrated</span>
          )}
          <span class="cz-tier-badge" style="font-size:11px;text-transform:capitalize">{pkg.package_type.replace(/_/g, ' ')}</span>
        </div>
      </div>

      <div class="cz-pricing-table-wrap">
        <table class="cz-pricing-table">
          <thead>
            <tr>
              <th>Tier</th>
              <th style="text-align:right">Price</th>
              <th style="text-align:center">Cycle</th>
              <th style="text-align:center">Inclusions</th>
              <th style="text-align:center">Popular</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map((tierId) => {
              const tier      = pkg.tiers[tierId];
              const isPopular = pkg.popular_tier === tierId;
              return (
                <tr key={tierId}>
                  <td class="cz-pricing-table__name">
                    <span>{TIER_LABELS[tierId]}</span>
                  </td>
                  <td style="text-align:right">
                    <span class={`cz-price-tag${tier?.price != null ? ' cz-price-tag--has-price' : ''}`}>
                      {tier ? fmtPrice(tier.price) : '—'}
                    </span>
                  </td>
                  <td style="text-align:center;font-size:12px;color:var(--admin-text-muted)">
                    {tier?.billing_cycle ?? '—'}
                  </td>
                  <td style="text-align:center;font-size:12px">
                    {tier ? tier.inclusion_count : '—'}
                  </td>
                  <td style="text-align:center">
                    {isPopular ? (
                      <span class="cz-tier-badge cz-tier-badge--popular" style="font-size:11px">Popular</span>
                    ) : (
                      <span style="color:var(--admin-text-faint);font-size:12px">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pkg.faq_refs.length > 0 && (
        <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">
          <span style="font-size:11px;color:var(--admin-text-muted);margin-right:2px">FAQs:</span>
          {pkg.faq_refs.map((ref) => (
            <span key={ref} style="font-size:11px;background:var(--admin-surface-2,#f3f4f6);border-radius:4px;padding:2px 7px;color:var(--admin-text-muted)">
              {ref}
            </span>
          ))}
        </div>
      )}

      {pkg.display_contexts.length > 0 && (
        <div style="margin-top:8px;display:flex;gap:6px;align-items:center">
          <span style="font-size:11px;color:var(--admin-text-muted);margin-right:2px">Contexts:</span>
          {pkg.display_contexts.map((ctx) => (
            <span key={ctx} style="font-size:11px;background:var(--admin-surface-2,#f3f4f6);border-radius:4px;padding:2px 7px;color:var(--admin-text-muted)">
              {ctx}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function SurfacePackagesWorkstation({ refreshKey }: Props) {
  const { data, loading, error, refetch } = useSurfacePackages();

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  if (loading) {
    return (
      <div class="cz-admin-loading">
        <Spinner label="Loading surface packages…" />
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

  const packages = data?.packages ?? [];

  return (
    <div>
      <div class="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Surface Packages</h2>
          <p class="cz-ws-subtitle">
            {packages.length} package{packages.length !== 1 ? 's' : ''} — tier configurations overlaid on Service Core
          </p>
        </div>
      </div>

      {packages.length === 0 ? (
        <div class="cz-admin-empty">
          <p>No surface packages found. Run the MEP seed to create the first package.</p>
        </div>
      ) : (
        packages.map((pkg) => <PackageCard key={pkg.post_id} pkg={pkg} />)
      )}
    </div>
  );
}
