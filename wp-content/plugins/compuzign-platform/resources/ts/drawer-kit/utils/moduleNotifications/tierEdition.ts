// Tier Edition module rules — the Edition's own single consolidated
// `overview` module (mirrors packageFamilyOverviewModule's single-module
// shape, not the parent Tier occupant's three-module Overview/Features/FAQs
// split — see docs/code-map/tier-edition.md). Edition Overview and Edition
// Inclusions are two visual cards over the SAME module: both read the
// identical ModuleState (see the binding-builder that calls evaluateModule
// once and hands the result to both), not two independently resolved ones.

import type { ModuleDefinition, ModuleNote, NoteContext } from './shared';

export interface TierEditionOverviewLike {
  title:         string;
  price:         number | null;
  contact:       boolean;
  billing_cycle: string | null;
}

function tierEditionHasPrice(e: TierEditionOverviewLike | undefined): boolean {
  return !!e && (e.price !== null || e.contact);
}
function tierEditionHasCycle(e: TierEditionOverviewLike | undefined): boolean {
  return !!e && !!e.billing_cycle;
}
function tierEditionIsEmpty(e: TierEditionOverviewLike | undefined): boolean {
  return !tierEditionHasPrice(e) && !tierEditionHasCycle(e);
}
function tierEditionProblems(e: TierEditionOverviewLike | undefined): ModuleNote[] {
  return (!tierEditionHasPrice(e) || !tierEditionHasCycle(e))
    ? [{
        id:      'tier-edition-overview.pricing.incomplete',
        message: 'Add price and billing cycle to complete this Edition.',
        type:    'error',
      }]
    : [];
}

// Archived/trashed reads the same as any other non-active settled state —
// pending-full — mirroring packageFamilyOverviewModule exactly: the 5-state
// pill vocabulary has no distinct Archived/Trashed value. That distinction
// is the record-level lifecycle presentation's job (tierEditionStatusLabel,
// the lifecycle grammar), not this module pill's.
export const tierEditionOverviewModule: ModuleDefinition<TierEditionOverviewLike> = {
  key:                'tier-edition-overview',
  emptyPrompt:         'Edit and configure this Edition.',
  isEmpty:             tierEditionIsEmpty,
  problems:            tierEditionProblems,
  includeDraftInTail:  true,
  resolveStatus: (e, ctx: NoteContext) => {
    if (ctx.moduleTransition === 'not-configured' || tierEditionIsEmpty(e)) return 'pending-dim';
    if (ctx.moduleTransition === 'pending') return 'pending-full';
    return ctx.platformStatus === 'active' ? 'active' : 'pending-full';
  },
};
