// Shared module status utilities.
// Used by the Catalog lifecycle (ServiceViewStep) and the shared drawer modules.

import type { ServiceItem, PlatformStatus } from '@/api/types/cost-builder';
import type { OverviewDraftData, SurfacePackageSummary } from '@/api/types/admin';

// Structural minimum for tier status resolution.
// Satisfied by both SurfaceTierSummary (transit) and SurfaceTierDetail (catalog/management).
export interface TierLike {
  enabled:       boolean;
  price:         number | null;
  billing_cycle: string | null;
  contact?:      boolean; // available in SurfaceTierDetail; absent in SurfaceTierSummary
}

// ── Status resolvers ──────────────────────────────────────────────────────────

// ── Completeness helpers ──────────────────────────────────────────────────────
// Used by both the pill resolvers and the notification generators so the
// field-completeness rule lives in exactly one place.

export interface OverviewCompleteness {
  title:    boolean;
  excerpt:  boolean;
  category: boolean;
  content:  boolean;
  complete: boolean;
}

export function checkOverviewCompleteness(service: ServiceItem): OverviewCompleteness {
  const title    = !!service.title.trim();
  const excerpt  = !!service.excerpt?.trim();
  const category = service.categories.length > 0;
  const content  = !!service.content.trim();
  // excerpt temporarily excluded from completeness gate
  return { title, excerpt, category, content, complete: title && category && content };
}

export function checkOverviewCompletenessFromDraft(draft: OverviewDraftData): OverviewCompleteness {
  const title    = !!draft.title.trim();
  const excerpt  = !!draft.excerpt.trim();
  const category = draft.category_ids.length > 0;
  const content  = !!draft.content.trim();
  // excerpt temporarily excluded from completeness gate
  return { title, excerpt, category, content, complete: title && category && content };
}

// ── Status resolvers ──────────────────────────────────────────────────────────

export interface OverviewStatusOpts {
  platformStatus:   string;  // 'active' | 'disabled' | 'archived' | 'trashed'
  moduleTransition: string;  // 'settled' | 'pending' | 'not-configured'
}

export function resolveOverviewStatus(
  service: ServiceItem,
  opts: OverviewStatusOpts,
  draft?: OverviewDraftData | null,
): string {
  const { platformStatus, moduleTransition } = opts;

  // not-configured: module has no content and no draft — always dim.
  if (moduleTransition === 'not-configured') return 'pending-dim';

  // Prefer draft completeness when a draft exists; fall back to canonical.
  const { complete } = draft
    ? checkOverviewCompletenessFromDraft(draft)
    : checkOverviewCompleteness(service);

  if (!complete) return 'pending-dim';

  // Complete + pending (draft exists) → pending-full.
  if (moduleTransition === 'pending') return 'pending-full';

  // Complete + settled, but service is not yet active → still pending-full (not disabled).
  if (platformStatus !== 'active') return 'pending-full';

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

// ── Station commercial summary (list-view display) ─────────────────────────────
// Pure derivation of the at-a-glance commercial status shown in the Service Catalog
// row, reusing the same surface-package data and resolvers the drawer uses. No fetch.
//
// Known limitation: surface-package-derived only. Services whose tiers live in the
// new cz_service_package_station meta have no matching surface package, so they
// resolve to pending-dim — consistent with what the drawer reveals today.

export const COMMERCIAL_TIER_KEYS = ['basic', 'standard', 'premium', 'enterprise'] as const;
export type CommercialTierKey = typeof COMMERCIAL_TIER_KEYS[number];

export interface StationCommercialSummary {
  tiers:       Record<CommercialTierKey, string>;  // 5-state per tier
  promoStatus: string;                              // 5-state for promotions
}

export function resolveStationCommercialSummary(
  serviceId: number,
  packages:  SurfacePackageSummary[],
): StationCommercialSummary {
  const pkg = packages.find((p) => p.service_refs.includes(serviceId)) ?? null;
  const pkgStatus = pkg?.platform_status ?? 'disabled';

  const tiers = {} as Record<CommercialTierKey, string>;
  for (const key of COMMERCIAL_TIER_KEYS) {
    tiers[key] = resolveTierStatus(pkg?.tiers[key], { pkgStatus });
  }

  // Promotions — same rule the drawer uses (useServiceStation).
  const promotionCount = pkg?.promotion_tiers.length ?? 0;
  const promoStatus = !pkg || promotionCount === 0
    ? 'pending-dim'
    : pkg.platform_status === 'active' ? 'active' : 'pending-full';

  return { tiers, promoStatus };
}

// ── Status pill renderer ──────────────────────────────────────────────────────

export const STATUS_PILL_MAP: Record<string, { dot: string; cls: string; label: string }> = {
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

// ── Station summary resolver ──────────────────────────────────────────────────

export interface ServiceStationRowSummary {
  id:             number;
  title:          string;
  resolvedStatus: string;         // 'active' | 'pending-full' | 'pending-dim'
  platformStatus: PlatformStatus;
  categoryLabel:  string;
}

export function resolveServiceStationRowSummary(service: ServiceItem): ServiceStationRowSummary {
  const platformStatus: PlatformStatus = service.meta?.platform_status ?? 'disabled';
  const moduleTransition = service.meta?.module_status?.overview ?? 'not-configured';
  const resolvedStatus   = resolveOverviewStatus(service, { platformStatus, moduleTransition });
  const categoryLabel    = service.categories[0]?.name ?? 'Uncategorised';

  return {
    id:             service.id,
    title:          service.title,
    resolvedStatus,
    platformStatus,
    categoryLabel,
  };
}
