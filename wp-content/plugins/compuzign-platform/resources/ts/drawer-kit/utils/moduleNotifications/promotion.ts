// Promotion module rules — individual Promotion sub-modules (engine C4),
// assembled by usePromotionStation. The travelling instance is the station-like
// unit here, so ctx.platformStatus carries the INSTANCE's travel status
// (draft/active/disabled/archived/trashed), not the service's. Promotion
// Overview owns the instance's identity + pricing; Features and FAQs gate on it
// via parentReady, exactly like the tier trio.

import type { ModuleDefinition, ModuleNote } from './shared';

export interface PromotionOverviewLike {
  name:          string;
  price:         number | null;
  billing_label: string;
}

function promotionOverviewProblems(key: string, p: PromotionOverviewLike | undefined): ModuleNote[] {
  if (!p) return [];
  const notes: ModuleNote[] = [];
  if (!p.name.trim()) {
    notes.push({ id: `${key}.name.missing`, message: 'Promotion name is required', type: 'error' });
  }
  if (p.price !== null && !p.billing_label.trim()) {
    notes.push({ id: `${key}.billing.missing`, message: 'Add a billing label for the price', type: 'error' });
  }
  return notes;
}

export const promotionOverviewModule: ModuleDefinition<PromotionOverviewLike | undefined> = {
  key:                'promotion-overview',
  emptyPrompt:        'Edit and configure this promotion.',
  isEmpty:            (p) => !p || (!p.name.trim() && p.price === null),
  problems:           (p) => promotionOverviewProblems('promotion-overview', p),
  includeDraftInTail: true,
  resolveStatus:      (p, ctx) => {
    if (!p || !p.name.trim()) return 'pending-dim';
    if (ctx.moduleTransition === 'not-configured') return 'pending-dim';
    // A travel-disabled instance reads Disabled (mirrors resolveTierStatus's
    // !enabled → 'disabled'), so the pill agrees with the drawer's Enable footer
    // action instead of contradicting it with a Pending pill.
    if (ctx.platformStatus === 'disabled') return 'disabled';
    if (ctx.moduleTransition === 'pending') return 'pending-full';
    return ctx.platformStatus === 'active' ? 'active' : 'pending-full';
  },
};
