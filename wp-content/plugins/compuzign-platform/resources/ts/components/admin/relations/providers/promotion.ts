import { fetchServicePromotionStation } from '@/api/endpoints/admin';
import type { PromotionTier } from '@/api/types/admin';
import { resolvePromotionSummary } from '@/components/admin/utils/moduleStatus';
import type {
  ReadOnlyRelationProvider,
  StationManagerScope,
} from '../types';

// ── Promotion relation provider ───────────────────────────────────────────────
// Promotions are a child collection of the independent Package Station, so they
// join the Manager as a managed commercial relationship next to Packages. The
// provider is read-only presentation: it contributes the Promotion Transit Card
// (a subject summary in the shared grid) whose destination opens the existing
// Promotion list/drawer runtime (ServicePromotionStep) — the Manager never edits
// promotion content or lifecycle inline.

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

  async load(scope, signal) {
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    const response = await fetchServicePromotionStation(scope.stationContext.id);
    if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
    if (!response.success) throw new Error('Could not load the Promotion relation provider.');
    return { promotions: response.promotions };
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
      destinationAvailable: true,
      notes: [],
    };
  },

  // Individual promotions open through the Transit Card's list destination;
  // the Manager itself never deep-links a single instance.
  destination: () => null,

  manager: {
    order: 200,
    // The Promotion Transit Card — one summary card for the whole collection,
    // preserving the Commercial-tab card's vocabulary (count + lifecycle pill
    // from resolvePromotionSummary; binned instances neither colour the pill
    // nor count as configured).
    subjectSummaries: (readModel) => {
      const summary = resolvePromotionSummary(readModel.promotions);
      const binned = readModel.promotions.length - summary.currentCount;
      return [{
        ref: { type: 'promotion', id: 'all' },
        label: 'Promotions',
        title: 'Promotion Configuration',
        subtitle: 'Campaign offers built on the Package Station tiers.',
        status: { status: summary.status, notes: [] },
        fields: [
          {
            id: 'current',
            label: 'Current',
            values: [`${summary.currentCount} promotion${summary.currentCount === 1 ? '' : 's'} configured`],
          },
          {
            id: 'bin',
            label: 'Bin',
            values: [binned > 0
              ? `${binned} archived or trashed`
              : 'No archived or trashed promotions'],
          },
        ],
      }];
    },
    // Single destination — View enters the existing Promotion list; create,
    // edit, lifecycle, and bin actions all live inside that runtime.
    destinationActions: () => [{ id: 'open-current', label: 'View' }],
    sections: [],
  },
};
