// Shared module status utilities.
// Used by both the Catalog lifecycle (ServiceViewStep) and Transit lifecycles (ServiceOverviewTransitView, PackageSummaryTransitView).

import type { ServiceItem } from '@/api/types/cost-builder';
import type { SurfacePackageSummary } from '@/api/types/admin';

// Structural minimum for tier status resolution.
// Satisfied by both SurfaceTierSummary (transit) and SurfaceTierDetail (catalog/management).
export interface TierLike {
  enabled:       boolean;
  price:         number | null;
  billing_cycle: string | null;
  contact?:      boolean; // available in SurfaceTierDetail; absent in SurfaceTierSummary
}

// ── Status resolver ───────────────────────────────────────────────────────────

export interface OverviewStatusOpts {
  isDisabled:      boolean;
  isPublished:     boolean;
  pendingModules?: Set<string>;
}

export function resolveOverviewStatus(service: ServiceItem, opts: OverviewStatusOpts): string {
  const { isDisabled, isPublished, pendingModules = new Set() } = opts;
  if (isDisabled) return 'disabled';
  const hasData = !!(
    service.title.trim() ||
    service.excerpt.trim() ||
    service.categories.length > 0 ||
    service.content.trim()
  );
  if (!hasData) return 'not-configured';
  const complete = !!(
    service.title.trim() &&
    service.excerpt.trim() &&
    service.categories.length > 0 &&
    service.content.trim()
  );
  if (!complete) return 'pending-dim';
  if (!isPublished || pendingModules.has('overview')) return 'pending-full';
  return 'active';
}

// ── Status pill renderer ──────────────────────────────────────────────────────

const STATUS_PILL_MAP: Record<string, { dot: string; cls: string; label: string }> = {
  'active':         { dot: 'var(--admin-success)',    cls: 'cz-status-pill--active',   label: 'Active'         },
  'disabled':       { dot: 'var(--admin-error)',      cls: 'cz-status-pill--inactive', label: 'Disabled'       },
  'pending-dim':    { dot: 'var(--admin-warning)',    cls: 'cz-status-pill--pending',  label: 'Pending'        },
  'pending-full':   { dot: 'var(--admin-warning)',    cls: 'cz-status-pill--pending',  label: 'Pending'        },
  'not-configured': { dot: 'var(--admin-text-faint)', cls: 'cz-status-pill--draft',   label: 'Not configured' },
};

export function resolvePackageStatus(pkg: SurfacePackageSummary | null): string {
  if (!pkg) return 'not-configured';
  return pkg.post_status === 'publish' ? 'active' : 'disabled';
}

export interface TierStatusOpts {
  pkgPublished: boolean;
}

export function resolveTierStatus(tier: TierLike | undefined, opts: TierStatusOpts): string {
  if (!tier) return 'not-configured';
  if (!tier.enabled) return 'disabled';
  const hasPrice = tier.price !== null || !!tier.contact;
  const hasCycle = !!tier.billing_cycle;
  if (!hasPrice && !hasCycle) return 'not-configured';
  if (!hasPrice || !hasCycle) return 'pending-dim';
  return opts.pkgPublished ? 'active' : 'pending-full';
}

export function statusDotColor(status: string): string {
  return STATUS_PILL_MAP[status]?.dot ?? 'var(--admin-text-faint)';
}

export function renderModuleStatus(status: string) {
  const pill = STATUS_PILL_MAP[status]
    ?? { dot: 'var(--admin-text-faint)', cls: 'cz-status-pill--draft', label: 'Not configured' };
  return (
    <>
      <span class="cz-admin-status-dot" style={`color:${pill.dot}`} />
      <span class={`cz-status-pill ${pill.cls}`}>{pill.label}</span>
    </>
  );
}
