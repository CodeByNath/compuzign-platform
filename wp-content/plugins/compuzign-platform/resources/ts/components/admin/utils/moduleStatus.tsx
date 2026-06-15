// Shared module status utilities.
// Used by both the Catalog lifecycle (ServiceViewStep) and Transit lifecycles
// (ServiceOverviewTransitView, PackageSummaryTransitView).

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

// ── Status resolvers ──────────────────────────────────────────────────────────

export interface OverviewStatusOpts {
  platformStatus:   string;  // 'active' | 'disabled' | 'archived' | 'trashed'
  moduleTransition: string;  // 'settled' | 'pending'
}

export function resolveOverviewStatus(service: ServiceItem, opts: OverviewStatusOpts): string {
  const { platformStatus, moduleTransition } = opts;

  // Rule 2: platform_status gates all module display.
  if (platformStatus !== 'active') return 'disabled';

  // Rule 4: empty and incomplete both → pending-dim (orange 0.45 opacity).
  const complete = !!(
    service.title.trim() &&
    service.excerpt.trim() &&
    service.categories.length > 0 &&
    service.content.trim()
  );
  if (!complete) return 'pending-dim';

  // Rule 7: complete but edited since last activation → pending-full.
  if (moduleTransition === 'pending') return 'pending-full';

  return 'active';
}

export function resolvePackageStatus(pkg: SurfacePackageSummary | null): string {
  if (!pkg) return 'pending-dim';
  return pkg.platform_status === 'active' ? 'active' : 'disabled';
}

export interface TierStatusOpts {
  pkgStatus: string;  // 'active' | 'disabled' | ...
}

export function resolveTierStatus(tier: TierLike | undefined, opts: TierStatusOpts): string {
  if (!tier) return 'pending-dim';
  if (!tier.enabled) return 'disabled';
  const hasPrice = tier.price !== null || !!tier.contact;
  const hasCycle = !!tier.billing_cycle;
  if (!hasPrice || !hasCycle) return 'pending-dim';
  return opts.pkgStatus === 'active' ? 'active' : 'pending-full';
}

// ── Status pill renderer ──────────────────────────────────────────────────────

const STATUS_PILL_MAP: Record<string, { dot: string; cls: string; label: string }> = {
  'active':       { dot: 'var(--admin-success)',    cls: 'cz-status-pill--active',   label: 'Active'   },
  'disabled':     { dot: 'var(--admin-error)',      cls: 'cz-status-pill--inactive', label: 'Disabled' },
  'pending-dim':  { dot: 'var(--admin-warning)',    cls: 'cz-status-pill--pending',  label: 'Pending'  },
  'pending-full': { dot: 'var(--admin-warning)',    cls: 'cz-status-pill--pending',  label: 'Pending'  },
};

export function statusDotColor(status: string): string {
  return STATUS_PILL_MAP[status]?.dot ?? 'var(--admin-text-faint)';
}

export function renderModuleStatus(status: string) {
  const pill = STATUS_PILL_MAP[status]
    ?? { dot: 'var(--admin-text-faint)', cls: 'cz-status-pill--draft', label: 'Pending' };
  return (
    <>
      <span class="cz-admin-status-dot" style={`color:${pill.dot}`} />
      <span class={`cz-status-pill ${pill.cls}`}>{pill.label}</span>
    </>
  );
}
