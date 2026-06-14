// Shared module status utilities.
// Used by both the Catalog lifecycle (ServiceViewStep) and Transit lifecycle (ServiceOverviewTransitView).

import type { ServiceItem } from '@/api/types/cost-builder';

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
