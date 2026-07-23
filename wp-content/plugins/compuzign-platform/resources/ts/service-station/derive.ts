// Service station derivations — pure projections of the station's fetched and
// seeded state. No component state, no requests, no rendering: useServiceStation
// composes these per render, so the hook file holds only load/state/actions.
//
// Like the sibling files, this module lives inside the station's own dependency
// graph: it imports './types' and the neutral drawer-kit resolvers directly,
// never the station barrel (which would close a cycle through useServiceStation).

import type { TierId } from '@/api/types/cost-builder';
import type { SurfacePackageSummary } from '@/package-station';
import { resolvePackageStatus } from '@/drawer-kit/utils/moduleStatus';
import type { ServiceInclusionItem, ServiceFaqItem } from './types';

const TIER_KEYS: TierId[] = ['basic', 'standard', 'premium', 'enterprise', 'ultimate'];

// ── Module status (inclusions / FAQs) ─────────────────────────────────────────
// The service overview resolves through resolveOverviewStatus (draft-aware);
// these two list modules resolve locally: not-configured/empty/incomplete →
// pending-dim, complete-but-unsettled (or platform inactive) → pending-full,
// settled + active → active.

export function resolveInclusionsStatus(
  inclusions: ServiceInclusionItem[],
  transition: string,
  isActive: boolean,
): string {
  if (transition === 'not-configured') return 'pending-dim';
  if (inclusions.length === 0) return 'pending-dim';
  const allComplete = inclusions.every(inc => !!inc.label?.trim());
  if (!allComplete) return 'pending-dim';
  if (transition === 'pending') return 'pending-full';
  if (!isActive) return 'pending-full';
  return 'active';
}

export function resolveFaqsStatus(
  faqs: ServiceFaqItem[],
  transition: string,
  isActive: boolean,
): string {
  if (transition === 'not-configured') return 'pending-dim';
  if (faqs.length === 0) return 'pending-dim';
  const allComplete = faqs.every(faq => !!(faq.question?.trim()) && !!(faq.answer?.trim()));
  if (!allComplete) return 'pending-dim';
  if (transition === 'pending') return 'pending-full';
  if (!isActive) return 'pending-full';
  return 'active';
}

// ── Module registry projections ───────────────────────────────────────────────

export function derivePendingModules(
  moduleStatus: Record<string, string> | undefined,
  isActive: boolean,
): { hasPendingModules: boolean; pendingModuleNames: string[] } {
  const hasPendingModules = isActive && (
    moduleStatus?.overview   === 'pending' ||
    moduleStatus?.inclusions === 'pending' ||
    moduleStatus?.faqs       === 'pending'
  );
  const pendingModuleNames = [
    moduleStatus?.overview   === 'pending' ? 'Service Overview'  : null,
    moduleStatus?.inclusions === 'pending' ? 'Included Features' : null,
    moduleStatus?.faqs       === 'pending' ? 'Common Questions'  : null,
  ].filter((n): n is string => n !== null);
  return { hasPendingModules, pendingModuleNames };
}

// A saved inclusions/FAQ draft is an independent publish enabler — but only for an
// already-active service (settling a module change). For a new/incomplete service we
// must not allow Publish off a content draft while the overview is still incomplete.
export function deriveCanPublish(args: {
  overviewStatus:   string;
  inclusionsStatus: string;
  faqsStatus:       string;
  isActive:         boolean;
  hasContentDraft:  boolean;
}): boolean {
  const hasModulePendingChanges =
    args.inclusionsStatus === 'pending-full' || args.inclusionsStatus === 'pending-dim' ||
    args.faqsStatus === 'pending-full' || args.faqsStatus === 'pending-dim';

  return (
    args.overviewStatus === 'pending-full' ||
    (args.overviewStatus === 'active' && hasModulePendingChanges) ||
    (args.isActive && args.hasContentDraft)
  );
}

// ── Surface layer (package summary card) ──────────────────────────────────────

export interface PackageSummaryDerivation {
  configuredTierCount:   number;
  pkgSummaryStatus:      string;
  pkgSummaryCount:       string;
  pkgSummaryDesc:        string;
  pkgSummaryDescPending: boolean;
}

export function derivePackageSummary(
  relatedPkg: SurfacePackageSummary | null,
  isActive: boolean,
): PackageSummaryDerivation {
  // Count the tiers actually live in the package — configured (has a price/cycle
  // or overrides) AND enabled. `relatedPkg.tiers[t]` is always a present summary
  // object for every tier key (empty shells included), so a bare presence check
  // always returned 4; disabling or clearing a tier must move this number.
  const configuredTierCount = relatedPkg
    ? TIER_KEYS.filter((t) => relatedPkg.tiers[t]?.configured && relatedPkg.tiers[t]?.enabled).length
    : 0;

  const pkgSummaryStatus = resolvePackageStatus(relatedPkg);

  const allTiersEnabled = relatedPkg != null &&
    TIER_KEYS.every((t) => relatedPkg.tiers[t]?.enabled === true);

  const pkgSummaryCount = relatedPkg
    ? `${configuredTierCount} tier${configuredTierCount !== 1 ? 's' : ''} configured`
    : '0 tiers configured';

  const pkgSummaryDesc = pkgSummaryStatus === 'active'
    ? 'Package Overview includes a full summary view of pricing and tiers.'
    : isActive && !relatedPkg
      ? 'View Package Overview and manage pricing and tiers.'
      : 'Pricing and tiers not available.';

  const pkgSummaryDescPending = isActive && pkgSummaryStatus === 'active' && !allTiersEnabled;

  return { configuredTierCount, pkgSummaryStatus, pkgSummaryCount, pkgSummaryDesc, pkgSummaryDescPending };
}

// ── Publish modal summaries ───────────────────────────────────────────────────

const pluralCount = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

export function deriveInclusionsSummary(
  inclusions: ServiceInclusionItem[],
  inclusionsStatus: string,
): { text: string; orange: boolean } {
  if (inclusionsStatus === 'pending-dim') return {
    text: inclusions.length === 0
      ? '0 included features added'
      : `${pluralCount(inclusions.length, 'included feature', 'included features')} pending`,
    orange: true,
  };
  const complete = inclusions.filter(inc => !!inc.label?.trim()).length;
  return { text: `${pluralCount(complete, 'included feature', 'included features')} added`, orange: false };
}

export function deriveFaqsSummary(
  faqs: ServiceFaqItem[],
  faqsStatus: string,
): { text: string; orange: boolean } {
  if (faqsStatus === 'pending-dim') return {
    text: faqs.length === 0
      ? '0 common questions added'
      : `${pluralCount(faqs.length, 'common question', 'common questions')} pending`,
    orange: true,
  };
  const complete = faqs.filter(faq => !!(faq.question?.trim()) && !!(faq.answer?.trim())).length;
  return { text: `${pluralCount(complete, 'common question', 'common questions')} added`, orange: false };
}
