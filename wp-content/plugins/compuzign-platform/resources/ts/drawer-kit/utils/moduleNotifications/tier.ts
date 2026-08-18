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

// Per-module occupant status: independent of the whole-tier pill. The explicit
// Disable mask and the parent gate are already handled by evaluateModule
// before resolveStatus runs (shared.ts), so this only decides between the
// remaining four outcomes from THIS module's own completeness/transition —
// own draft/pending reads Pending full; incomplete reads Pending dim; settled-
// but-unpublished reads Pending full (with publication guidance); settled and
// published reads Active. Mirrors resolvePackageManagerItemStatus's ordering.
function resolveTierModuleStatus(complete: boolean, ctx: NoteContext): string {
  if (ctx.moduleTransition === 'not-configured' || !complete) return 'pending-dim';
  if (ctx.moduleTransition === 'pending') return 'pending-full';
  return ctx.platformStatus === 'active' ? 'active' : 'pending-full';
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
  key:                 'tier-overview',
  emptyPrompt:         'Edit and configure this tier.',
  isEmpty:             tierIsEmpty,
  problems:            (t) => tierPricingProblems('tier-overview', t),
  includeDraftInTail:  true,
  resolveStatus: (t, ctx) => {
    const hasPrice = !!t && (t.price !== null || !!t.contact);
    const hasCycle = !!t && !!t.billing_cycle;
    return resolveTierModuleStatus(hasPrice && hasCycle, ctx);
  },
};

export const tierFeaturesModule: ModuleDefinition<{ count: number }> = {
  key:                'tier-features',
  requiresParent:     true,
  emptyPrompt:        'Edit and add features.',
  isEmpty:            ({ count }) => count === 0,
  problems:           () => [],
  includeDraftInTail: true,
  resolveStatus:      ({ count }, ctx) => resolveTierModuleStatus(count > 0, ctx),
};

export const tierFaqsModule: ModuleDefinition<{ count: number }> = {
  key:                'tier-faqs',
  requiresParent:     true,
  emptyPrompt:        'Edit and add questions.',
  isEmpty:            ({ count }) => count === 0,
  problems:           () => [],
  includeDraftInTail: true,
  resolveStatus:      ({ count }, ctx) => resolveTierModuleStatus(count > 0, ctx),
};

// Commercial Schedule (Phase 2) is unlike Features/FAQs above: it is entirely
// OPTIONAL. Simple Mode — zero commercial legs, the vast majority of Tiers —
// is a complete, valid, unremarkable state, never "incomplete." isEmpty
// always false / problems always [] so it never earns an error badge or an
// "add something" prompt purely for having no legs; its own resolveStatus
// (deliberately not resolveTierModuleStatus, whose `!complete` branch would
// force every never-touched Tier to read Pending dim forever) treats
// not-configured the same as settled-empty — only a genuine pending draft
// mid-edit ever reads differently. See docs/code-map/tier-edition.md.
export const tierCommercialScheduleModule: ModuleDefinition<{ count: number }> = {
  key:                'tier-commercial-schedule',
  requiresParent:     true,
  isEmpty:            () => false,
  problems:           () => [],
  includeDraftInTail: true,
  resolveStatus:      (_data, ctx) => (
    ctx.moduleTransition === 'pending' ? 'pending-full' : (ctx.platformStatus === 'active' ? 'active' : 'pending-full')
  ),
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

// A pending Tier System (not yet published) has no lifecycle behind it yet:
// it is not waiting on a parent, it holds no draft, and its only
// incompleteness is the title the backend requires. This module serves the
// SAME Overview once persisted, too — Tier System registration is the
// pending state of this one lifecycle, not a separate module, which is why a
// titled-but-unpublished system and a published one share one resolver
// rather than one being a reuse of the occupant modules above (which all
// describe a Tier that already exists inside an instance).
export const tierSystemOverviewModule: ModuleDefinition<{ titled: boolean }> = {
  key: 'tier-system-overview',
  problems: ({ titled }) => titled
    ? []
    : [{
        id:      'tier-system-overview.title.required',
        message: 'A Tier system needs a title before it can be published.',
        type:    'error',
      }],
  // The 5-state presentation vocabulary, like every other module: an untitled
  // system reads Pending (dim), a titled one Pending until the platform
  // reports it active. `settled`/`not-configured` are module TRANSITION
  // values and were never pill statuses — they only reached a Pending pill
  // through the unknown-status fallback, which also left a published system
  // reading Pending forever.
  resolveStatus: ({ titled }, ctx) => !titled
    ? 'pending-dim'
    : (ctx.platformStatus === 'active' ? 'active' : 'pending-full'),
};

// Rate Sheet access is instance-level configuration. It never inherits the
// parent instance lifecycle as its module status; the projected access policy
// alone reports whether anything is allowed yet and whether stored references
// need review. Zero allowed is the ordinary default for an unconfigured Tier
// system — informational, not an error — so it never counts toward the
// module's error badge; an unresolved reference is the one real problem.
export const tierRateSheetAccessModule: ModuleDefinition<{
  allowedActiveCount: number;
  activeCount: number;
  unresolvedCount: number;
}> = {
  key: 'tier-rate-sheet-access',
  problems: ({ allowedActiveCount, unresolvedCount }) => [
    ...(allowedActiveCount === 0 ? [{
      id: 'tier-rate-sheet-access.none.configured',
      message: 'Edit and activate ratesheets',
      type: 'info' as const,
    }] : []),
    ...(unresolvedCount > 0 ? [{
      id: 'tier-rate-sheet-access.references.unresolved',
      message: 'Remove or replace unresolved Rate Sheet references.',
      type: 'error' as const,
    }] : []),
  ],
  resolveStatus: ({ allowedActiveCount, unresolvedCount }) =>
    allowedActiveCount === 0 || unresolvedCount > 0
      ? 'pending-full'
      : 'active',
};
