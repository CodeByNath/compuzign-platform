// PackageSummaryTransitView — Transit lifecycle for the Service Package module.
//
// Catalog lifecycle  → Commercial tab Package Summary card (ServiceCatalogWorkstation)
// Transit lifecycle  → compact per-tier routing cards with status and View action (this component)
//
// Status resolver and pill renderer are shared from utils/moduleStatus.

import type { SurfacePackageSummary } from '@/api/types/admin';
import { resolvePackageStatus, resolveTierStatus, renderModuleStatus } from '@/components/admin/utils/moduleStatus';

const TIER_ORDER  = ['basic', 'standard', 'premium', 'enterprise'];
const TIER_LABELS: Record<string, string> = {
  basic: 'Basic', standard: 'Standard', premium: 'Premium', enterprise: 'Enterprise',
};

interface Props {
  pkg: SurfacePackageSummary | null;
  onView?: () => void;
}

function tierDesc(status: string): string {
  if (status === 'not-configured') return 'View Tier Overview and manage pricing.';
  if (status === 'disabled')       return 'View Tier Overview and manage tier status.';
  return 'Tier Overview includes a full summary view of the tier.';
}

export function PackageSummaryTransitView({ pkg, onView }: Props) {
  const pkgStatus = resolvePackageStatus(pkg);

  const tiers = pkg
    ? TIER_ORDER.map((k) => ({ id: k, tier: pkg.tiers[k] })).filter(({ tier }) => tier != null)
    : [];

  if (!pkg || tiers.length === 0) {
    return (
      <div class="cz-req-detail__section cz-sv-section--no-border">
        <div class="cz-sv-module">
          <div class="cz-sv-module-header">
            <p class="cz-req-detail__section-title">Package Summary</p>
            <span class="cz-sv-overview-block__status">{renderModuleStatus(pkgStatus)}</span>
          </div>
          <div class="cz-sv-module-body cz-sp-transit__body">
            <p class="cz-sp-transit__empty">No tiers configured.</p>
          </div>
          <div class="cz-sv-module-footer">
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled>
              View
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pkgPublished = pkg.post_status === 'publish';

  return (
    <div class="cz-req-detail__section cz-sv-section--no-border">
      {tiers.map(({ id, tier }) => {
        const status      = resolveTierStatus(tier, { pkgPublished });
        const showData    = status !== 'not-configured';
        const isPopular   = showData && pkg.popular_tier === id;
        const priceOk     = tier.price !== null;
        const cycleOk     = !!tier.billing_cycle;
        const priceText   = priceOk ? `$${tier.price!.toFixed(2)}` : '$0.00';
        const cycleText   = cycleOk ? tier.billing_cycle! : 'Not available';
        const inclCount   = tier.inclusion_count ?? 0;
        const faqCount    = tier.faq_count ?? 0;
        const inclLabel   = `${inclCount} ${inclCount === 1 ? 'inclusion' : 'inclusions'}`;
        const faqLabel    = `${faqCount} ${faqCount === 1 ? 'Common Question' : 'Common Questions'}`;

        return (
          <div class="cz-sv-module" key={id}>
            <div class="cz-sv-module-header">
              <p class="cz-req-detail__section-title">Tier Summary</p>
              <span
                class="cz-sv-overview-block__status"
                style={status === 'pending-dim' ? 'opacity:0.45' : undefined}
              >
                {renderModuleStatus(status)}
              </span>
            </div>

            <div class="cz-sv-module-body cz-sp-transit__body">
              <p class="cz-sp-transit__label">Package {TIER_LABELS[id]}</p>

              {tier.label.trim() && (
                <p class="cz-sp-transit__sublabel">{tier.label}</p>
              )}

              {showData && (
                <p class="cz-sp-transit__price">
                  <span style={priceOk ? undefined : 'color:var(--admin-warning)'}>{priceText}</span>
                  {' · '}
                  <span style={cycleOk ? undefined : 'color:var(--admin-warning)'}>{cycleText}</span>
                </p>
              )}

              {isPopular && (
                <span class="cz-tier-badge cz-tier-badge--popular">
                  {pkg.popular_label || 'Popular'}
                </span>
              )}

              <p class="cz-sp-transit__desc">{tierDesc(status)}</p>
              <p class="cz-sp-transit__counts">{inclLabel} | {faqLabel}</p>
            </div>

            <div class="cz-sv-module-footer">
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                onClick={onView}
                disabled={!onView}
              >
                View
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
