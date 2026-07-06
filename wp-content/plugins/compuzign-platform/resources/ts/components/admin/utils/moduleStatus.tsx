// Shared module status utilities.
// Used by the Catalog lifecycle (ServiceViewStep) and the shared drawer modules.

import type { ServiceItem, PlatformStatus } from '@/api/types/cost-builder';
import type { OverviewDraftData, StationSummary, SurfacePackageSummary } from '@/api/types/admin';
import {
  PILL_META,
  PRESENTATION_PILL,
  STATUS_DOT_COLOR,
  STATUS_DOT_FAINT_COLOR,
  STATUS_DOT_CLASS,
  STATUS_DOT_FAINT_CLASS,
  LEGACY_UNKNOWN_PILL,
} from '@/components/admin/schema/presentation';
import type { PillMeta } from '@/components/admin/schema/presentation';

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
  const hasPrice = tier.price !== null || !!tier.contact;
  const hasCycle = !!tier.billing_cycle;
  // Fully unconfigured shell — including one whose occupant travelled to the
  // bin (archive empties the shell, E1) — reads not-configured, never Disabled.
  if (!hasPrice && !hasCycle) return 'pending-dim';
  if (!tier.enabled) return 'disabled';
  if (!hasPrice || !hasCycle) return 'pending-dim';
  return opts.pkgStatus === 'active' ? 'active' : 'pending-full';
}

// ── Promotion summary resolver (engine E1) ────────────────────────────────────
// Lifecycle-derived: the pill reflects the promotion instances' own travel
// states, not the parent package status. ≥1 active instance → active; else any
// authoring/publishable instance (draft | disabled) → pending-full; else (no
// instances, or bin-only archived/trashed) → pending-dim. currentCount counts
// the non-binned instances — what "configured" means to the summaries.
export function resolvePromotionSummary(
  instances: Array<{ status?: string }>,
): { status: string; currentCount: number } {
  let hasActive = false;
  let currentCount = 0;
  for (const inst of instances) {
    const s = inst.status ?? 'draft';
    if (s === 'archived' || s === 'trashed') continue;
    currentCount += 1;
    if (s === 'active') hasActive = true;
  }
  const status = hasActive ? 'active' : currentCount > 0 ? 'pending-full' : 'pending-dim';
  return { status, currentCount };
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

  // Promotions — lifecycle-derived (E1), same resolver the drawer uses.
  const promoStatus = resolvePromotionSummary(pkg?.promotion_tiers ?? []).status;

  return { tiers, promoStatus };
}

// ── Status pill renderer ──────────────────────────────────────────────────────
// Pill/dot metadata is owned by schema/presentation.ts (the Presentation Status
// Contract chokepoint — S1a). This file keeps the resolver + renderer layer and
// re-exports the combined map for existing consumers.

export const STATUS_PILL_MAP: Record<string, { dot: string; cls: string; label: string }> =
  Object.fromEntries(
    Object.entries(PILL_META).map(([status, meta]) => [
      status,
      { dot: STATUS_DOT_COLOR[status] ?? STATUS_DOT_FAINT_COLOR, ...meta },
    ]),
  );

export function statusDotColor(status: string): string {
  return STATUS_DOT_COLOR[status] ?? STATUS_DOT_FAINT_COLOR;
}

// Token-based status-dot modifier class (mirrors statusDotColor) so tables can use
// the reusable .cz-admin-status-dot--* classes instead of inline colour styles.
export function statusDotClass(status: string): string {
  return STATUS_DOT_CLASS[status] ?? STATUS_DOT_FAINT_CLASS;
}

export function renderModuleStatus(status: string) {
  const pill = STATUS_PILL_MAP[status] ?? LEGACY_UNKNOWN_PILL;
  return (
    <>
      <span class="cz-admin-status-dot" style={`color:${pill.dot}`} />
      <span class={`cz-module-status-pill ${pill.cls}`}>{pill.label}</span>
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

// ── Catalog station status (list rows) ────────────────────────────────────────
// Moved from ServiceCatalogWorkstation in S3b so the catalog TableSchema can
// project it. Filter buckets and the display pill stay separate on purpose:
// the bucket drives filtering; the label distinguishes a live service with
// unsettled changes without altering which bucket it filters into.

export type StationStatus = 'active' | 'pending' | 'drafts' | 'disabled';

// Pill metadata delegates to the Presentation Status Contract chokepoint (S1a);
// the station filter buckets 'pending' and 'drafts' both present as Pending.
export const STATION_STATUS_PILL: Record<StationStatus, PillMeta> = {
  'active':   PRESENTATION_PILL.active,
  'pending':  PRESENTATION_PILL.pending,
  'drafts':   PRESENTATION_PILL.pending,
  'disabled': PRESENTATION_PILL.disabled,
};

export function resolveStationStatus(station: StationSummary): StationStatus {
  if (station.platform_status === 'disabled') {
    // Never-published: overview not yet settled — show Pending, not Disabled.
    // Disabled is reserved for services that were once live and explicitly turned off.
    if ((station.module_status as Record<string, string>)?.overview !== 'settled') return 'pending';
    return 'disabled';
  }
  if (station.has_drafts) return 'drafts';
  if (Object.values(station.module_status).some((v) => v === 'pending')) return 'pending';
  return 'active';
}

// Display-only pill (label + class). Decoupled from resolveStationStatus (which stays
// the filter bucket) so the label can distinguish a live service with unsettled changes
// from a never-published one — without altering filtering. Frontend visibility is
// gated only by platform_status; "Active · changes pending" still means the service
// is live on the public Cost Builder.
export function stationStatusLabel(station: StationSummary): PillMeta {
  if (station.platform_status === 'disabled') {
    return (station.module_status as Record<string, string>)?.overview !== 'settled'
      ? STATION_STATUS_PILL.pending
      : STATION_STATUS_PILL.disabled;
  }
  const hasUnsettled =
    station.has_drafts ||
    Object.values(station.module_status).some((v) => v === 'pending');
  return hasUnsettled
    ? { cls: STATION_STATUS_PILL.active.cls, label: 'Active · changes pending' }
    : STATION_STATUS_PILL.active;
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
