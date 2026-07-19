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

export function getTierNotes(tier: TierLike | undefined, ctx: NoteContext): ModuleNote[] {
  return evaluateModuleNotes(tierModule, tier, ctx);
}
