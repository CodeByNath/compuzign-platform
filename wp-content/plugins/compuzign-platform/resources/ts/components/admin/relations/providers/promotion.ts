import type { PromotionTier } from '@/api/types/admin';
import type {
  ReadOnlyRelationProvider,
  StationManagerScope,
} from '../types';

// ── Promotion relation provider ───────────────────────────────────────────────
// Promotions are a first-class Package Manager workspace beside Packages. This
// adapter owns tab discovery only;
// PromotionManagerWorkspace owns the single UI runtime and lifecycle actions.

export type PromotionRelationScope = StationManagerScope & {
  kind: 'connection-graph';
  stationContext: { type: 'service'; id: number };
};

export interface PromotionRelationReadModel {
  promotions: PromotionTier[];
}

// Instance travel state collapsed to the presentation vocabulary — the same
// draft→Pending rule the list cards apply (Presentation Status Contract).
function promotionRowStatus(status: string): string {
  if (status === 'active') return 'active';
  if (status === 'disabled' || status === 'archived' || status === 'trashed') return 'disabled';
  return 'pending-full';
}

export const promotionRelationProvider: ReadOnlyRelationProvider<
  PromotionRelationScope,
  PromotionRelationReadModel,
  PromotionTier,
  string
> = {
  key: 'promotion',
  label: 'Promotions',
  stationType: 'service',
  access: 'read-only',
  capabilities: { fields: [] },

  profile: (scope) => ({
    applicable: scope.kind === 'connection-graph'
      && scope.stationContext.type === 'service'
      && typeof scope.stationContext.id === 'number',
    access: 'read-only',
    capabilities: { fields: [] },
  }),

  appliesTo: (scope): scope is PromotionRelationScope => (
    scope.kind === 'connection-graph'
    && scope.stationContext.type === 'service'
    && typeof scope.stationContext.id === 'number'
    && Number.isInteger(scope.stationContext.id)
    && scope.stationContext.id > 0
  ),

  async load(_scope, signal) {
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    return { promotions: [] };
  },

  rows: (readModel) => readModel.promotions,

  identity: (row) => row.id,

  identityKey: (identity) => identity,

  display: (row) => ({
    label: row.name || '(unnamed)',
    description: 'Promotion',
  }),

  health: (row) => {
    const status = promotionRowStatus(row.status);
    return {
      state: { status, notes: [] },
      notes: [],
    };
  },


  manager: {
    order: 200,
    sections: [],
  },
};
