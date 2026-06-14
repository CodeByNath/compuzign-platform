// Shared module status utilities.
// Used by both the Catalog lifecycle (ServiceViewStep) and Transit lifecycles (ServiceOverviewTransitView, PackageSummaryTransitView).

import type { ServiceItem } from '@/api/types/cost-builder';
import type { SurfacePackageSummary, SurfaceTierSummary } from '@/api/types/admin';

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

export function resolveTierStatus(tier: SurfaceTierSummary | undefined): string {
  if (!tier) return 'not-configured';
  return tier.enabled ? 'active' : 'disabled';
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
