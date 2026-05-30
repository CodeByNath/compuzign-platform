import { useEffect } from 'preact/hooks';
import { useSurfacePackages } from '@/hooks/useSurfacePackages';
import { Spinner } from '@/components/ui/Spinner';
import type { ActionConfig, StepContext } from '../ActionShell';
import type { SurfacePackageSummary, PromotionTier } from '@/api/types/admin';

interface Props {
  refreshKey: number;
  openAction: (config: ActionConfig) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BASED_ON_LABELS: Record<string, string> = {
  basic: 'Basic', standard: 'Standard', premium: 'Premium', enterprise: 'Enterprise',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(v: number | null): string {
  return v !== null ? `$${v.toLocaleString()}` : '—';
}

function fmtDate(s: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return s;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusPillClass(status: string): string {
  if (status === 'active')   return 'cz-status-pill cz-status-pill--active';
  if (status === 'archived') return 'cz-status-pill cz-status-pill--archived';
  return 'cz-status-pill cz-status-pill--draft';
}

// ── PromotionManageStep — drawer step ─────────────────────────────────────────

export function PromotionManageStep({ ctx }: { ctx: StepContext }) {
  const promo       = ctx.stepData.promo as PromotionTier;
  const serviceName = ctx.stepData.serviceName as string;

  if (!promo) {
    return <div class="cz-admin-error-msg">Promotion data not available.</div>;
  }

  return (
    <div class="cz-tf-form">

      {/* ── Pending notice ─────────────────────────────────────────────── */}
      <div class="cz-admin-notice cz-admin-notice--pending">
        <strong>Read-only.</strong> Write routes for create, edit, and archive are not yet
        implemented. The fields below reflect the stored data for this promotion tier.
      </div>

      {/* ── Section 1: Service ─────────────────────────────────────────── */}
      {serviceName && (
        <div class="cz-tf-section">
          <p class="cz-tf-section-title">Service</p>
          <p class="cz-tf-service-title">{serviceName}</p>
        </div>
      )}

      {/* ── Section 2: Promotion Identity ─────────────────────────────── */}
      <div class="cz-tf-section">
        <p class="cz-tf-section-title">Promotion Identity</p>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Name</label>
          <input type="text" class="cz-tf-input" value={promo.name} disabled />
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Status</label>
          <div>
            <span class={statusPillClass(promo.status)}>{capitalize(promo.status)}</span>
          </div>
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Based on</label>
          <input
            type="text"
            class="cz-tf-input"
            value={promo.based_on ? (BASED_ON_LABELS[promo.based_on] ?? promo.based_on) : 'Custom (not based on a core tier)'}
            disabled
          />
          <p class="cz-tf-hint">Authoring context only — no runtime inheritance.</p>
        </div>

        {promo.headline && (
          <div class="cz-tf-field">
            <label class="cz-tf-label">Headline</label>
            <input type="text" class="cz-tf-input" value={promo.headline} disabled />
          </div>
        )}

        {promo.description && (
          <div class="cz-tf-field">
            <label class="cz-tf-label">Description</label>
            <textarea class="cz-tf-textarea" disabled rows={3} value={promo.description} />
          </div>
        )}
      </div>

      {/* ── Section 3: Pricing ────────────────────────────────────────── */}
      <div class="cz-tf-section">
        <p class="cz-tf-section-title">Pricing</p>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Price</label>
          <input type="text" class="cz-tf-input" value={fmtPrice(promo.price)} disabled />
        </div>

        {promo.billing_label && (
          <div class="cz-tf-field">
            <label class="cz-tf-label">Billing label</label>
            <input type="text" class="cz-tf-input" value={promo.billing_label} disabled />
          </div>
        )}

        {promo.badge && (
          <div class="cz-tf-field">
            <label class="cz-tf-label">Badge</label>
            <input type="text" class="cz-tf-input" value={promo.badge} disabled />
          </div>
        )}
      </div>

      {/* ── Section 4: Content ────────────────────────────────────────── */}
      {(promo.inclusions.length > 0 || promo.features.length > 0 || promo.exclusions.length > 0) && (
        <div class="cz-tf-section">
          <p class="cz-tf-section-title">Content</p>

          {promo.inclusions.length > 0 && (
            <div class="cz-tf-field">
              <label class="cz-tf-label">Inclusions ({promo.inclusions.length})</label>
              <div class="cz-promo-item-list">
                {promo.inclusions.map((inc) => (
                  <div key={inc.id} class="cz-promo-item-list__row">{inc.label}</div>
                ))}
              </div>
            </div>
          )}

          {promo.features.length > 0 && (
            <div class="cz-tf-field">
              <label class="cz-tf-label">Features ({promo.features.length})</label>
              <div class="cz-promo-item-list">
                {promo.features.map((f, i) => (
                  <div key={i} class="cz-promo-item-list__row">{f}</div>
                ))}
              </div>
            </div>
          )}

          {promo.exclusions.length > 0 && (
            <div class="cz-tf-field">
              <label class="cz-tf-label">Exclusions ({promo.exclusions.length})</label>
              <div class="cz-promo-item-list">
                {promo.exclusions.map((e, i) => (
                  <div key={i} class="cz-promo-item-list__row cz-promo-item-list__row--excluded">{e}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Section 5: Campaign ───────────────────────────────────────── */}
      <div class="cz-tf-section">
        <p class="cz-tf-section-title">Campaign</p>

        {promo.campaign_label && (
          <div class="cz-tf-field">
            <label class="cz-tf-label">Campaign label</label>
            <input type="text" class="cz-tf-input" value={promo.campaign_label} disabled />
          </div>
        )}

        <div class="cz-tf-field">
          <label class="cz-tf-label">Valid from</label>
          <input type="text" class="cz-tf-input" value={fmtDate(promo.starts_at)} disabled />
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Valid until</label>
          <input type="text" class="cz-tf-input" value={fmtDate(promo.ends_at)} disabled />
        </div>

        <div class="cz-tf-field">
          <label class="cz-tf-label">Sort priority</label>
          <input type="text" class="cz-tf-input" value={String(promo.priority)} disabled />
        </div>

        <label class="cz-tf-check-row">
          <input type="checkbox" checked={promo.is_featured} disabled />
          <span>Featured promotion</span>
        </label>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div class="cz-tf-footer">
        <div class="cz-tf-footer__spacer" />
        <button type="button" class="cz-admin-btn cz-admin-btn--ghost" onClick={ctx.close}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── PromotionPackageCard ──────────────────────────────────────────────────────

interface CardProps {
  pkg: SurfacePackageSummary;
  openAction: (config: ActionConfig) => void;
}

function PromotionPackageCard({ pkg, openAction }: CardProps) {
  const serviceNames = pkg.services.map((s) => s.title).join(', ') || '(no service linked)';
  const promos       = pkg.promotion_tiers;
  const isEnabled    = pkg.post_status === 'publish';

  const handleManage = (promo: PromotionTier) => {
    openAction({
      id:   `promo-manage-${pkg.post_id}-${promo.id}`,
      mode: 'drawer',
      title: `${promo.name || 'Promotion'} — ${serviceNames}`,
      initialStepData: {
        packageId:   pkg.post_id,
        promoId:     promo.id,
        promo,
        serviceName: serviceNames,
      },
      steps: [{ id: 'promo-view', title: promo.name || 'Promotion', component: PromotionManageStep }],
    });
  };

  return (
    <div class={`cz-ws-card${!isEnabled ? ' cz-ws-card--disabled' : ''}`}>

      {/* ── Package header ────────────────────────────────────────────── */}
      <div class="cz-sp-pkg-header">
        <div class="cz-sp-pkg-header__left">
          <p class="cz-sp-pkg-header__title">
            {pkg.title}
            {!isEnabled && (
              <span class="cz-status-pill cz-status-pill--inactive">Disabled</span>
            )}
          </p>
          <p class="cz-sp-pkg-header__service">{serviceNames}</p>
        </div>
        <div class="cz-sp-pkg-header__actions">
          <span class="cz-promo-count-pill">
            {promos.length} promotion{promos.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Promotions section header ─────────────────────────────────── */}
      <div class="cz-sp-tiers-header">
        <p class="cz-sp-tiers-header__label">Promotion Tiers</p>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
          disabled
          title="Create endpoint pending — Phase 2"
        >
          + Add Promotion
        </button>
      </div>

      {/* ── Promotions table ─────────────────────────────────────────── */}
      {promos.length === 0 ? (
        <p class="cz-sp-empty-tiers">
          No promotion tiers on this package yet.
        </p>
      ) : (
        <div class="cz-promo-table-wrap">
          <table class="cz-promo-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Based On</th>
                <th>Price</th>
                <th>Status</th>
                <th>Campaign</th>
                <th>Start</th>
                <th>End</th>
                <th class="cz-promo-table__center">Featured</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {promos.map((promo) => (
                <tr
                  key={promo.id}
                  class={promo.status === 'archived' ? 'cz-promo-row--archived' : ''}
                >
                  <td class="cz-promo-table__name">
                    <div class="cz-promo-table__name-inner">
                      <span>{promo.name || '(unnamed)'}</span>
                      {promo.badge && (
                        <span class="cz-tier-badge">{promo.badge}</span>
                      )}
                    </div>
                  </td>
                  <td class="cz-promo-table__muted">
                    {promo.based_on
                      ? BASED_ON_LABELS[promo.based_on] ?? promo.based_on
                      : <span style="color:var(--admin-text-faint)">Custom</span>}
                  </td>
                  <td>
                    <span class={`cz-price-tag${promo.price !== null ? ' cz-price-tag--has-price' : ''}`}>
                      {fmtPrice(promo.price)}
                    </span>
                  </td>
                  <td>
                    <span class={statusPillClass(promo.status)}>
                      {capitalize(promo.status)}
                    </span>
                  </td>
                  <td class="cz-promo-table__muted">{promo.campaign_label || '—'}</td>
                  <td class="cz-promo-table__muted">{fmtDate(promo.starts_at)}</td>
                  <td class="cz-promo-table__muted">{fmtDate(promo.ends_at)}</td>
                  <td class="cz-promo-table__center">
                    {promo.is_featured
                      ? <span class="cz-tier-badge cz-tier-badge--popular">★</span>
                      : <span style="color:var(--admin-text-faint)">—</span>}
                  </td>
                  <td class="cz-promo-table__actions">
                    <button
                      type="button"
                      class="cz-admin-btn cz-admin-btn--ghost cz-admin-btn--sm"
                      onClick={() => handleManage(promo)}
                    >
                      Manage
                    </button>
                    <button
                      type="button"
                      class="cz-admin-btn cz-admin-btn--ghost cz-admin-btn--sm"
                      disabled
                      title="Archive endpoint pending — Phase 2"
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main workstation ──────────────────────────────────────────────────────────

export function PromotionsWorkstation({ refreshKey, openAction }: Props) {
  const { data, loading, error, refetch } = useSurfacePackages();

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  if (loading) {
    return (
      <div class="cz-admin-loading">
        <Spinner label="Loading promotions…" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div class="cz-admin-error-msg">{error}</div>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary"
          style="margin-top:12px"
          onClick={refetch}
        >
          Retry
        </button>
      </div>
    );
  }

  const packages    = data?.packages ?? [];
  const totalPromos = packages.reduce((sum, p) => sum + p.promotion_tiers.length, 0);

  return (
    <div>
      <div class="cz-ws-header">
        <div>
          <h2 class="cz-ws-title">Promotions</h2>
          <p class="cz-ws-subtitle">
            {totalPromos} promotion tier{totalPromos !== 1 ? 's' : ''} across{' '}
            {packages.length} package{packages.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div class="cz-admin-notice cz-admin-notice--pending">
        <strong>Phase 1 — Read-only view.</strong> Create, edit, and archive routes are not yet
        wired. Stored promotion tiers are displayed below. Write routes will live at{' '}
        <code>POST /admin/surface-packages/&#123;id&#125;/promotion-tiers</code>.
      </div>

      {packages.length === 0 ? (
        <div class="cz-admin-empty">
          <p>No surface packages found. Run the MEP seed to create the first package.</p>
        </div>
      ) : (
        packages.map((pkg) => (
          <PromotionPackageCard
            key={pkg.post_id}
            pkg={pkg}
            openAction={openAction}
          />
        ))
      )}
    </div>
  );
}
