// PackageSummaryTransitView — Transit lifecycle for the Package Summary module.
//
// Catalog lifecycle  → Commercial tab package card with tier count and inline management (ServiceCatalogWorkstation)
// Transit lifecycle  → compact per-tier routing cards with values only and View action (this component)
//
// Both lifecycles share resolvePackageStatus, resolveTierStatus, and renderModuleStatus from utils/moduleStatus.

import type { SurfacePackageSummary } from '@/api/types/admin';
import { resolvePackageStatus, resolveTierStatus, renderModuleStatus } from '@/components/admin/utils/moduleStatus';

const TIER_ORDER = ['basic', 'standard', 'premium', 'enterprise'];

interface Props {
  pkg: SurfacePackageSummary | null;
  onView?: () => void;
}

function formatPrice(price: number | null, billingCycle: string | null): string {
  if (price === null) return 'Contact for pricing';
  const cycle = billingCycle ? ` / ${billingCycle}` : '';
  return `$${price}${cycle}`;
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
            <div>{renderModuleStatus(pkgStatus)}</div>
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

  return (
    <div class="cz-req-detail__section cz-sv-section--no-border">
      {tiers.map(({ id, tier }) => (
        <div class="cz-sv-module" key={id}>
          <div class="cz-sv-module-header">
            <p class="cz-req-detail__section-title">Tier Summary</p>
            <div>{renderModuleStatus(resolveTierStatus(tier))}</div>
          </div>
          <div class="cz-sv-module-body cz-sp-transit__body">
            <p class="cz-sp-transit__label">{tier.label}</p>
            <p class="cz-sp-transit__price">{formatPrice(tier.price, tier.billing_cycle)}</p>
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
      ))}
    </div>
  );
}
