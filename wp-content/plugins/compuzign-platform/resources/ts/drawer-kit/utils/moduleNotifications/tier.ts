// Tier / pricing module rules — the whole-tier card plus the individual
// Package (Tier) sub-modules assembled by the tier drawer.

import { resolveTierStatus } from '../moduleStatus';
import type { TierLike } from '../moduleStatus';
import type { ModuleDefinition, ModuleNote, NoteContext } from './shared';
import { evaluateModuleNotes } from './shared';

// Shared completeness for a single tier's pricing (price + billing cycle).

function tierIsEmpty(t: TierLike | undefined): boolean {
  const hasPrice = !!t && (t.price !== null || !!t.contact);
  const hasCycle = !!t && !!t.billing_cycle;
  return !t || (!hasPrice && !hasCycle);
}

function tierPricingProblems(key: string, t: TierLike | undefined): ModuleNote[] {
  const hasPrice = !!t && (t.price !== null || !!t.contact);
  const hasCycle = !!t && !!t.billing_cycle;
  return (!hasPrice || !hasCycle)
    ? [{ id: `${key}.pricing.incomplete`, message: 'Add price and billing cycle to complete this tier.', type: 'error' }]
    : [];
}

// Whole-tier card used by the Package Overview list.
export const tierModule: ModuleDefinition<TierLike | undefined> = {
  key:           'tier',
  emptyPrompt:   'Edit and configure this tier.',
  isEmpty:       tierIsEmpty,
  problems:      (t) => tierPricingProblems('tier', t),
  resolveStatus: (t, ctx) => resolveTierStatus(t, { pkgStatus: ctx.platformStatus }),
};

// Individual Package (Tier) sub-modules — assembled by the tier drawer.
// Tier Overview owns the tier's pricing; Features and FAQs gate on it via parentReady.
// When the parent (Tier Overview) is not complete they resolve to pending-dim with
// a "Waiting for Tier Overview." info note (supplied via ctx.parentLabel).

export const tierOverviewModule: ModuleDefinition<TierLike | undefined> = {
  key:           'tier-overview',
  emptyPrompt:   'Edit and configure this tier.',
  isEmpty:       tierIsEmpty,
  problems:      (t) => tierPricingProblems('tier-overview', t),
  resolveStatus: (t, ctx) => resolveTierStatus(t, { pkgStatus: ctx.platformStatus }),
};

export const tierFeaturesModule: ModuleDefinition<{ count: number }> = {
  key:            'tier-features',
  requiresParent: true,
  emptyPrompt:    'Edit and add features.',
  isEmpty:        ({ count }) => count === 0,
  problems:       () => [],
  resolveStatus:  ({ count }, ctx) =>
    count === 0 ? 'pending-dim' : (ctx.platformStatus === 'active' ? 'active' : 'pending-full'),
};

export const tierFaqsModule: ModuleDefinition<{ count: number }> = {
  key:            'tier-faqs',
  requiresParent: true,
  emptyPrompt:    'Edit and add questions.',
  isEmpty:        ({ count }) => count === 0,
  problems:       () => [],
  resolveStatus:  ({ count }, ctx) =>
    count === 0 ? 'pending-dim' : (ctx.platformStatus === 'active' ? 'active' : 'pending-full'),
};

// One inclusion as a single Tier uses it — the module behind the Inclusion
// drawer's Overview. Its truth is the selection's own resolution: a selection
// whose Rate Sheet row and Service source both resolve is complete; one that
// does not is an error, because the Tier is committing quantity and price to a
// row that no longer exists. Deliberately NOT tierFeaturesModule: that module's
// truth is a count across the whole module, which would misreport one row.
export const tierInclusionModule: ModuleDefinition<{ resolved: boolean }> = {
  key:      'tier-inclusion',
  // A quantity change writes the Tier's features DRAFT; it is not published
  // until the Tier settles. Surface the shared draft tail so the record never
  // reads as live when a pending change is sitting behind it.
  includeDraftInTail: true,
  problems: ({ resolved }) => resolved
    ? []
    : [{
        id:      'tier-inclusion.source.unresolved',
        message: 'This inclusion no longer resolves to a live Rate Sheet row and Service source.',
        type:    'error',
      }],
  resolveStatus: ({ resolved }, ctx) => !resolved
    ? 'pending-full'
    : (ctx.platformStatus === 'active' ? 'active' : 'pending-full'),
};

// One stored relationship of that inclusion (Service, Category, Rate Sheet).
// An absent relationship is not an error and not a gap to fill from here: it is
// simply unavailable, so it resolves to `disabled` — the Presentation Status
// Contract's own vocabulary for an item that cannot be acted on — and carries
// the read-only note. Nothing is fabricated to stand in for it.
export const tierInclusionConnectionModule: ModuleDefinition<{ configured: boolean }> = {
  key:         'tier-inclusion-connection',
  emptyPrompt: 'Not configured.',
  isEmpty:     ({ configured }) => !configured,
  problems:    () => [],
  resolveStatus: ({ configured }, ctx) => !configured
    ? 'disabled'
    : (ctx.platformStatus === 'active' ? 'active' : 'pending-full'),
};

export function getTierNotes(tier: TierLike | undefined, ctx: NoteContext): ModuleNote[] {
  return evaluateModuleNotes(tierModule, tier, ctx);
}

// Rate Sheet access is instance-level configuration. It never inherits the
// parent instance lifecycle as its module status; the projected access policy
// alone reports whether usable active sheets and stored references need review.
export const tierRateSheetAccessModule: ModuleDefinition<{
  allowedActiveCount: number;
  activeCount: number;
  unresolvedCount: number;
}> = {
  key: 'tier-rate-sheet-access',
  problems: ({ allowedActiveCount, activeCount, unresolvedCount }) => [
    ...(activeCount === 0 || allowedActiveCount === 0 ? [{
      id: 'tier-rate-sheet-access.active.required',
      message: 'Allow at least one active Rate Sheet for this Tier system.',
      type: 'error' as const,
    }] : []),
    ...(unresolvedCount > 0 ? [{
      id: 'tier-rate-sheet-access.references.unresolved',
      message: 'Remove or replace unresolved Rate Sheet references.',
      type: 'error' as const,
    }] : []),
  ],
  resolveStatus: ({ activeCount, allowedActiveCount, unresolvedCount }) =>
    activeCount === 0 || allowedActiveCount === 0 || unresolvedCount > 0
      ? 'pending-full'
      : 'active',
};
